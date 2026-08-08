import Fastify, { FastifyRequest, FastifyReply } from 'fastify';
import cors from '@fastify/cors';
import fastifyRateLimit from '@fastify/rate-limit';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config();
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });

import { prisma } from '@playground/db';
import { taskQueue } from './queue';
import { handleAgentTask } from './worker';
import { deployToZerops } from './zerops';
import { registerAuth } from './auth';
import { AppError } from './errors';
import { registerErrorHandler } from './error-handler';
import {
  CreateSessionSchema,
  SessionParamsSchema,
  SessionTasksParamsSchema,
  CreateTaskSchema,
  TaskParamsSchema,
} from './schemas';

const fastify = Fastify({
  logger: true,
  ajv: {
    customOptions: {
      removeAdditional: true, // Remove unknown properties
      coerceTypes: false,     // Strict validation
    },
  },
});

// Configure CORS
fastify.register(cors, {
  origin: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
});

// Register Rate Limiting
fastify.register(fastifyRateLimit, {
  global: false, // Apply per route
  max: 100,
  timeWindow: '1 minute',
  allowList: ['127.0.0.1', 'localhost'],
  keyGenerator: (request) => {
    const apiKey = request.headers['x-api-key'] as string;
    return apiKey || request.ip;
  },
  errorResponseBuilder: (request, context: any) => {
    return {
      error: 'RATE_LIMIT_EXCEEDED',
      message: `Too many requests. Try again in ${Math.ceil(context.ttl / 1000)} seconds`,
      limit: context.max,
      reset: context.ttl,
    };
  },
  addHeaders: {
    'x-ratelimit-limit': true,
    'x-ratelimit-remaining': true,
    'x-ratelimit-reset': true,
  },
});

// Register Auth Middleware
registerAuth(fastify);

// Centralized Error Handler
registerErrorHandler(fastify);

// Fastify lifecycle hooks for Queue
fastify.addHook('onReady', async () => {
  await taskQueue.init();
  taskQueue.registerHandler(handleAgentTask);
  taskQueue.startProcessing();
});

fastify.addHook('onClose', async () => {
  await taskQueue.close();
});

// Auth / Ownership Helpers
async function getOwnedSession(id: string, apiKey: string, includeTasks = false) {
  const session = await prisma.playgroundSession.findFirst({
    where: { id, apiKey },
    ...(includeTasks ? {
      include: {
        agentTasks: {
          orderBy: { createdAt: 'asc' }
        }
      }
    } : {})
  });
  if (!session) {
    throw new AppError('Session not found', 404);
  }
  return session;
}

async function getOwnedTask(id: string, apiKey: string) {
  const task = await prisma.agentTask.findFirst({
    where: {
      id,
      session: { apiKey },
    },
  });
  if (!task) {
    throw new AppError('Task not found', 404);
  }
  return task;
}

// Basic Health Check (Phase 0)
fastify.get('/health', async () => {
  return { status: 'ok', service: 'api' };
});

// Database Health Check (Phase 1)
fastify.get('/api/health/db', async () => {
  await prisma.$queryRaw`SELECT 1`;
  return { status: 'ok', db: 'connected' };
});

// Create a new playground session
fastify.post('/api/sessions', {
  config: {
    rateLimit: {
      max: 10,
      timeWindow: '1 minute',
    },
  },
  schema: {
    body: CreateSessionSchema,
  },
}, async (request, reply) => {
  const { name, template } = request.body as { name: string; template: string };
  const session = await prisma.playgroundSession.create({
    data: {
      name,
      template,
      status: 'active',
    },
  });
  return session;
});

// List all playground sessions associated with the X-API-Key
fastify.get('/api/sessions', {
  config: {
    rateLimit: {
      max: 30,
      timeWindow: '1 minute',
    },
  },
}, async (request: FastifyRequest, reply: FastifyReply) => {
  const apiKey = request.headers['x-api-key'] as string;
  const sessions = await prisma.playgroundSession.findMany({
    where: { apiKey },
    select: {
      id: true,
      name: true,
      template: true,
      status: true,
      createdAt: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
  return sessions;
});

// Get session details by ID (Scoped by API Key)
fastify.get('/api/sessions/:id', {
  config: {
    rateLimit: {
      max: 30,
      timeWindow: '1 minute',
    },
  },
  schema: {
    params: SessionParamsSchema,
  },
}, async (request: FastifyRequest, reply: FastifyReply) => {
  const { id } = request.params as { id: string };
  const apiKey = request.headers['x-api-key'] as string;

  const session = await getOwnedSession(id, apiKey, true);
  return session;
});

// SSE events endpoint (Scoped by API Key in header/query)
fastify.get('/api/sessions/:id/events', {
  schema: {
    params: SessionParamsSchema,
    query: {
      type: 'object',
      properties: {
        apiKey: { type: 'string' },
      },
    },
  },
}, async (request: FastifyRequest, reply: FastifyReply) => {
  const { id: sessionId } = request.params as { id: string };
  // SECURITY WARNING: We extract apiKey from query string if headers are not available.
  // Transmitting credentials in the query string is vulnerable to leakage via server logs and browser history.
  // This is acceptable here only because EventSource does not support custom headers natively.
  const apiKey = (request.headers['x-api-key'] || (request.query as any)?.apiKey) as string;

  const session = await getOwnedSession(sessionId, apiKey);

  // Set SSE headers with manual CORS configuration to prevent browser blocking due to raw write bypass
  const origin = request.headers.origin;
  reply.raw.writeHead(200, {
    'Access-Control-Allow-Origin': origin || '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Credentials': 'true',
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no', // Disable buffering on Nginx/Zerops
  });

  // Write initial connection success
  reply.raw.write('event: open\ndata: connected\n\n');

  // Keep-alive heartbeat interval to avoid timeout (e.g. 15s)
  const heartbeat = setInterval(() => {
    reply.raw.write(': heartbeat\n\n');
  }, 15000);

  let tickCount = 0;
  let lastTimestamp = new Date();
  let lastSessionUpdatedAt = session.updatedAt;
  let isPolling = false;

  const pollInterval = setInterval(async () => {
    if (isPolling) return;
    isPolling = true;
    let dbStatus = 'ok';
    try {
      if (reply.raw.destroyed) {
        clearInterval(pollInterval);
        clearInterval(heartbeat);
        return;
      }

      // 1. Fetch session updates
      const currentSession = await prisma.playgroundSession.findUnique({
        where: { id: sessionId },
      });
      if (currentSession && currentSession.updatedAt > lastSessionUpdatedAt) {
        reply.raw.write(`event: session-update\ndata: ${JSON.stringify(currentSession)}\n\n`);
        lastSessionUpdatedAt = currentSession.updatedAt;
      }

      // 2. Fetch task updates
      const tasks = await prisma.agentTask.findMany({
        where: {
          sessionId,
          updatedAt: { gt: lastTimestamp },
        },
        orderBy: { updatedAt: 'asc' },
      });

      for (const task of tasks) {
        reply.raw.write(`event: task-update\ndata: ${JSON.stringify(task)}\n\n`);
        lastTimestamp = new Date(Math.max(lastTimestamp.getTime(), task.updatedAt.getTime()));
      }
    } catch (error) {
      console.error('[SSE] Error polling session/task updates:', error);
      dbStatus = 'error';
    } finally {
      isPolling = false;
      // Send dynamic health status event to client
      if (tickCount % 5 === 0 || dbStatus === 'error') {
        reply.raw.write(`event: health-update\ndata: ${JSON.stringify({ db: dbStatus })}\n\n`);
      }
      tickCount++;
    }
  }, 1000);

  reply.sent = true;

  return new Promise<void>((resolve) => {
    request.raw.on('close', () => {
      clearInterval(pollInterval);
      clearInterval(heartbeat);
      console.log(`[SSE] Connection closed for session ${sessionId}`);
      resolve();
    });
  });
});

// Create a new task in a playground session (Scoped by API Key)
fastify.post('/api/sessions/:sessionId/tasks', {
  config: {
    rateLimit: {
      max: 5, // 5 tasks per minute per API key
      timeWindow: '1 minute',
    },
  },
  schema: {
    params: SessionTasksParamsSchema,
    body: CreateTaskSchema,
  },
}, async (request: FastifyRequest, reply: FastifyReply) => {
  const { sessionId } = request.params as { sessionId: string };
  const { prompt } = request.body as { prompt: string };
  const apiKey = request.headers['x-api-key'] as string;

  await getOwnedSession(sessionId, apiKey);

  const task = await prisma.agentTask.create({
    data: {
      sessionId,
      prompt,
      status: 'pending',
    },
  });

  await taskQueue.publish({
    sessionId,
    taskId: task.id,
    prompt,
  });

  return task;
});

// List tasks for a specific session (Scoped by API Key)
fastify.get('/api/sessions/:sessionId/tasks', {
  schema: {
    params: SessionTasksParamsSchema,
  },
}, async (request: FastifyRequest, reply: FastifyReply) => {
  const { sessionId } = request.params as { sessionId: string };
  const apiKey = request.headers['x-api-key'] as string;

  await getOwnedSession(sessionId, apiKey);

  const tasks = await prisma.agentTask.findMany({
    where: { sessionId },
    orderBy: { createdAt: 'asc' },
  });
  return tasks;
});

// Get detailed information of a single task (Scoped by API Key)
fastify.get('/api/tasks/:id', {
  schema: {
    params: TaskParamsSchema,
  },
}, async (request: FastifyRequest, reply: FastifyReply) => {
  const { id } = request.params as { id: string };
  const apiKey = request.headers['x-api-key'] as string;

  const task = await getOwnedTask(id, apiKey);
  return task;
});

// Approve a task (Awaits deployment trigger)
fastify.post('/api/tasks/:id/approve', {
  config: {
    rateLimit: {
      max: 10,
      timeWindow: '1 minute',
    },
  },
  schema: {
    params: TaskParamsSchema,
  },
}, async (request: FastifyRequest, reply: FastifyReply) => {
  const { id } = request.params as { id: string };
  const apiKey = request.headers['x-api-key'] as string;

  const task = await getOwnedTask(id, apiKey);

  const updatedTask = await prisma.agentTask.update({
    where: { id },
    data: { 
      approved: true,
      deployStatus: 'deploying'
    },
  });

  // Await deployment and persist result
  deployToZerops(task.sessionId, updatedTask)
    .then(async (success) => {
      await prisma.agentTask.update({
        where: { id },
        data: { deployStatus: success ? 'deployed' : 'failed', deployError: success ? null : 'Deployment process failed' },
      });
      // Force trigger session updatedAt to update SSE listeners
      await prisma.playgroundSession.update({
        where: { id: task.sessionId },
        data: { updatedAt: new Date() },
      });
      console.log(`[Zerops] Deployment complete for task ${id}, success: ${success}`);
    })
    .catch(async (err: any) => {
      console.error(`[Zerops] Deployment failed for task ${id}:`, err);
      await prisma.agentTask.update({
        where: { id },
        data: { deployStatus: 'failed', deployError: err.message },
      });
      await prisma.playgroundSession.update({
        where: { id: task.sessionId },
        data: { updatedAt: new Date() },
      });
    });

  return { status: 'approved', message: 'Applied diffs and triggered Zerops deployment' };
});

// Reject a task (Scoped by API Key)
fastify.post('/api/tasks/:id/reject', {
  schema: {
    params: TaskParamsSchema,
  },
}, async (request: FastifyRequest, reply: FastifyReply) => {
  const { id } = request.params as { id: string };
  const apiKey = request.headers['x-api-key'] as string;

  const task = await getOwnedTask(id, apiKey);

  await prisma.agentTask.update({
    where: { id },
    data: { approved: false },
  });

  await prisma.playgroundSession.update({
    where: { id: task.sessionId },
    data: { updatedAt: new Date() },
  });

  return { status: 'rejected' };
});

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 8080;
const HOST = '0.0.0.0';

const start = async () => {
  try {
    await fastify.listen({ port: PORT, host: HOST });
    console.log(`Server listening on http://localhost:${PORT}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
