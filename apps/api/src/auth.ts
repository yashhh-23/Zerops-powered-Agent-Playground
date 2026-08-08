import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '@playground/db';

export interface AuthenticatedRequest extends FastifyRequest {
  session?: {
    id: string;
    name: string;
    template: string;
  };
}

export function registerAuth(fastify: FastifyInstance) {
  fastify.addHook('preHandler', async (request: FastifyRequest, reply: FastifyReply) => {
    const url = request.routeOptions.url || '';
    const method = request.method;

    // Public endpoints whitelist:
    // - GET /health
    // - GET /api/health/db
    // - POST /api/sessions (Creating the first session)
    if (
      url === '/health' ||
      url === '/api/health/db' ||
      (url === '/api/sessions' && method === 'POST') ||
      (url === '/api/sessions/batch' && method === 'POST')
    ) {
      return;
    }

    let apiKey = request.headers['x-api-key'];
    if (!apiKey && request.query && typeof request.query === 'object') {
      apiKey = (request.query as Record<string, any>).apiKey;
    }

    if (!apiKey || typeof apiKey !== 'string') {
      return reply.status(401).send({
        error: 'Unauthorized',
        message: 'Missing API key header (X-API-Key).',
      });
    }

    const session = await prisma.playgroundSession.findUnique({
      where: { apiKey },
    });

    if (!session) {
      return reply.status(401).send({
        error: 'Unauthorized',
        message: 'Invalid API key.',
      });
    }

    // Attach validated session to request object
    (request as AuthenticatedRequest).session = {
      id: session.id,
      name: session.name,
      template: session.template,
    };
  });
}
