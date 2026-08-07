import Fastify from 'fastify';
import cors from '@fastify/cors';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from local and root directory paths
dotenv.config();
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });

import { prisma } from '@playground/db';
import { taskQueue } from './queue';
import { handleAgentTask } from './worker';
import { createZeropsProject, applyInfraDiff } from './zerops';


const fastify = Fastify({
  logger: true,
});

// Register CORS
fastify.register(cors, {
  origin: '*',
});

// Basic Health Check (Phase 0)
fastify.get('/health', async (request, reply) => {
  return { status: 'ok', service: 'api' };
});

// Database Health Check (Phase 1)
fastify.get('/api/health/db', async (request, reply) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { status: 'ok', db: 'connected' };
  } catch (error: any) {
    return reply.status(500).send({
      status: 'error',
      db: 'disconnected',
      message: error?.message || 'Database connection error',
    });
  }
});

// Create a new playground session
fastify.post('/api/sessions', async (request, reply) => {
  const { name, template } = request.body as { name: string; template: string };
  if (!name || !template) {
    return reply.status(400).send({ error: 'Missing name or template' });
  }
  try {
    const session = await prisma.playgroundSession.create({
      data: {
        name,
        template,
        status: 'active',
      },
    });
    return session;
  } catch (error: any) {
    fastify.log.error(error);
    return reply.status(500).send({ error: 'Failed to create session', message: error.message });
  }
});

// List all playground sessions
fastify.get('/api/sessions', async (request, reply) => {
  try {
    const sessions = await prisma.playgroundSession.findMany({
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
  } catch (error: any) {
    fastify.log.error(error);
    return reply.status(500).send({ error: 'Failed to list sessions', message: error.message });
  }
});

// Get session details by ID
fastify.get('/api/sessions/:id', async (request, reply) => {
  const { id } = request.params as { id: string };
  try {
    const session = await prisma.playgroundSession.findUnique({
      where: { id },
      include: {
        agentTasks: {
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    });
    if (!session) {
      return reply.status(404).send({ error: 'Session not found' });
    }
    return session;
  } catch (error: any) {
    fastify.log.error(error);
    return reply.status(500).send({ error: 'Failed to fetch session details', message: error.message });
  }
});

// Create a new task in a playground session
fastify.post('/api/sessions/:sessionId/tasks', async (request, reply) => {
  const { sessionId } = request.params as { sessionId: string };
  const { prompt } = request.body as { prompt: string };
  if (!prompt) {
    return reply.status(400).send({ error: 'Missing prompt' });
  }
  try {
    const session = await prisma.playgroundSession.findUnique({
      where: { id: sessionId },
    });
    if (!session) {
      return reply.status(404).send({ error: 'Session not found' });
    }

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
  } catch (error: any) {
    fastify.log.error(error);
    return reply.status(500).send({ error: 'Failed to create task', message: error.message });
  }
});

// List tasks for a specific session
fastify.get('/api/sessions/:sessionId/tasks', async (request, reply) => {
  const { sessionId } = request.params as { sessionId: string };
  try {
    const tasks = await prisma.agentTask.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'asc' },
    });
    return tasks;
  } catch (error: any) {
    fastify.log.error(error);
    return reply.status(500).send({ error: 'Failed to list tasks', message: error.message });
  }
});

// Get detailed information of a single task
fastify.get('/api/tasks/:id', async (request, reply) => {
  const { id } = request.params as { id: string };
  try {
    const task = await prisma.agentTask.findUnique({
      where: { id },
    });
    if (!task) {
      return reply.status(404).send({ error: 'Task not found' });
    }
    return task;
  } catch (error: any) {
    fastify.log.error(error);
    return reply.status(500).send({ error: 'Failed to fetch task details', message: error.message });
  }
});

// Real function for Zerops deployment orchestration
async function deployToZerops(sessionId: string, task: any) {
  console.log(`[Zerops Integration] Triggering Zerops Deployment pipeline for session ${sessionId}, task ${task.id}`);
  
  try {
    const session = await prisma.playgroundSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      console.error(`[Zerops Integration] Session not found for ID: ${sessionId}`);
      return;
    }

    let projectId = session.zeropsProjectId;

    if (!projectId) {
      console.log(`[Zerops Integration] No existing Zerops project found for session. Creating a new one...`);
      projectId = await createZeropsProject(session.name);
      
      await prisma.playgroundSession.update({
        where: { id: sessionId },
        data: { zeropsProjectId: projectId },
      });
      console.log(`[Zerops Integration] Session updated with Zerops Project ID: ${projectId}`);
    } else {
      console.log(`[Zerops Integration] Found existing Zerops project ID: ${projectId}`);
    }

    if (task.infraDiff) {
      const infraDiff = JSON.parse(task.infraDiff);
      console.log(`[Zerops Integration] Applying infra diff for project: ${projectId}`);
      const success = await applyInfraDiff(projectId, infraDiff);
      if (success) {
        console.log(`[Zerops Integration] Deployment pipeline successfully executed for task ${task.id}`);
      } else {
        console.error(`[Zerops Integration] Deployment pipeline execution failed for task ${task.id}`);
      }
    } else {
      console.warn(`[Zerops Integration] No infraDiff payload found for task ${task.id}. Skipping deployment step.`);
    }
  } catch (error: any) {
    console.error(`[Zerops Integration] Fatal error in deployToZerops:`, error.message);
  }
}

// Approve a task
fastify.post('/api/tasks/:id/approve', async (request, reply) => {
  const { id } = request.params as { id: string };
  try {
    const task = await prisma.agentTask.findUnique({
      where: { id },
    });
    if (!task) {
      return reply.status(404).send({ error: 'Task not found' });
    }

    const updatedTask = await prisma.agentTask.update({
      where: { id },
      data: { approved: true },
    });

    deployToZerops(task.sessionId, updatedTask);

    return { status: 'approved', message: 'Would apply diffs and deploy to Zerops' };
  } catch (error: any) {
    fastify.log.error(error);
    return reply.status(500).send({ error: 'Failed to approve task', message: error.message });
  }
});

// Reject a task
fastify.post('/api/tasks/:id/reject', async (request, reply) => {
  const { id } = request.params as { id: string };
  try {
    const task = await prisma.agentTask.findUnique({
      where: { id },
    });
    if (!task) {
      return reply.status(404).send({ error: 'Task not found' });
    }

    await prisma.agentTask.update({
      where: { id },
      data: { approved: false },
    });

    return { status: 'rejected' };
  } catch (error: any) {
    fastify.log.error(error);
    return reply.status(500).send({ error: 'Failed to reject task', message: error.message });
  }
});

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 8080;
const HOST = '0.0.0.0';

const start = async () => {
  try {
    // Initialize task queue and worker
    await taskQueue.init(process.env.NATS_URL);
    taskQueue.registerHandler(handleAgentTask);

    await fastify.listen({ port: PORT, host: HOST });
    console.log(`Server listening on http://localhost:${PORT}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
