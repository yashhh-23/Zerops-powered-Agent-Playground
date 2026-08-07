"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fastify_1 = __importDefault(require("fastify"));
const cors_1 = __importDefault(require("@fastify/cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
// Load environment variables from local and root directory paths
dotenv_1.default.config();
dotenv_1.default.config({ path: path_1.default.resolve(__dirname, '../../../.env') });
dotenv_1.default.config({ path: path_1.default.resolve(process.cwd(), '.env') });
dotenv_1.default.config({ path: path_1.default.resolve(process.cwd(), '../../.env') });
const db_1 = require("@playground/db");
const queue_1 = require("./queue");
const worker_1 = require("./worker");
const zerops_1 = require("./zerops");
const fastify = (0, fastify_1.default)({
    logger: true,
});
// Register CORS
fastify.register(cors_1.default, {
    origin: '*',
});
// Basic Health Check (Phase 0)
fastify.get('/health', async (request, reply) => {
    return { status: 'ok', service: 'api' };
});
// Database Health Check (Phase 1)
fastify.get('/api/health/db', async (request, reply) => {
    try {
        await db_1.prisma.$queryRaw `SELECT 1`;
        return { status: 'ok', db: 'connected' };
    }
    catch (error) {
        return reply.status(500).send({
            status: 'error',
            db: 'disconnected',
            message: error?.message || 'Database connection error',
        });
    }
});
// Create a new playground session
fastify.post('/api/sessions', async (request, reply) => {
    const { name, template } = request.body;
    if (!name || !template) {
        return reply.status(400).send({ error: 'Missing name or template' });
    }
    try {
        const session = await db_1.prisma.playgroundSession.create({
            data: {
                name,
                template,
                status: 'active',
            },
        });
        return session;
    }
    catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({ error: 'Failed to create session', message: error.message });
    }
});
// List all playground sessions
fastify.get('/api/sessions', async (request, reply) => {
    try {
        const sessions = await db_1.prisma.playgroundSession.findMany({
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
    }
    catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({ error: 'Failed to list sessions', message: error.message });
    }
});
// Get session details by ID
fastify.get('/api/sessions/:id', async (request, reply) => {
    const { id } = request.params;
    try {
        const session = await db_1.prisma.playgroundSession.findUnique({
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
    }
    catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({ error: 'Failed to fetch session details', message: error.message });
    }
});
// Create a new task in a playground session
fastify.post('/api/sessions/:sessionId/tasks', async (request, reply) => {
    const { sessionId } = request.params;
    const { prompt } = request.body;
    if (!prompt) {
        return reply.status(400).send({ error: 'Missing prompt' });
    }
    try {
        const session = await db_1.prisma.playgroundSession.findUnique({
            where: { id: sessionId },
        });
        if (!session) {
            return reply.status(404).send({ error: 'Session not found' });
        }
        const task = await db_1.prisma.agentTask.create({
            data: {
                sessionId,
                prompt,
                status: 'pending',
            },
        });
        await queue_1.taskQueue.publish({
            sessionId,
            taskId: task.id,
            prompt,
        });
        return task;
    }
    catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({ error: 'Failed to create task', message: error.message });
    }
});
// List tasks for a specific session
fastify.get('/api/sessions/:sessionId/tasks', async (request, reply) => {
    const { sessionId } = request.params;
    try {
        const tasks = await db_1.prisma.agentTask.findMany({
            where: { sessionId },
            orderBy: { createdAt: 'asc' },
        });
        return tasks;
    }
    catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({ error: 'Failed to list tasks', message: error.message });
    }
});
// Get detailed information of a single task
fastify.get('/api/tasks/:id', async (request, reply) => {
    const { id } = request.params;
    try {
        const task = await db_1.prisma.agentTask.findUnique({
            where: { id },
        });
        if (!task) {
            return reply.status(404).send({ error: 'Task not found' });
        }
        return task;
    }
    catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({ error: 'Failed to fetch task details', message: error.message });
    }
});
// Real function for Zerops deployment orchestration
async function deployToZerops(sessionId, task) {
    console.log(`[Zerops Integration] Triggering Zerops Deployment pipeline for session ${sessionId}, task ${task.id}`);
    try {
        const session = await db_1.prisma.playgroundSession.findUnique({
            where: { id: sessionId },
        });
        if (!session) {
            console.error(`[Zerops Integration] Session not found for ID: ${sessionId}`);
            return;
        }
        let projectId = session.zeropsProjectId;
        if (!projectId) {
            console.log(`[Zerops Integration] No existing Zerops project found for session. Creating a new one...`);
            projectId = await (0, zerops_1.createZeropsProject)(session.name);
            await db_1.prisma.playgroundSession.update({
                where: { id: sessionId },
                data: { zeropsProjectId: projectId },
            });
            console.log(`[Zerops Integration] Session updated with Zerops Project ID: ${projectId}`);
        }
        else {
            console.log(`[Zerops Integration] Found existing Zerops project ID: ${projectId}`);
        }
        if (task.infraDiff) {
            const infraDiff = JSON.parse(task.infraDiff);
            console.log(`[Zerops Integration] Applying infra diff for project: ${projectId}`);
            const success = await (0, zerops_1.applyInfraDiff)(projectId, infraDiff);
            if (success) {
                console.log(`[Zerops Integration] Deployment pipeline successfully executed for task ${task.id}`);
            }
            else {
                console.error(`[Zerops Integration] Deployment pipeline execution failed for task ${task.id}`);
            }
        }
        else {
            console.warn(`[Zerops Integration] No infraDiff payload found for task ${task.id}. Skipping deployment step.`);
        }
    }
    catch (error) {
        console.error(`[Zerops Integration] Fatal error in deployToZerops:`, error.message);
    }
}
// Approve a task
fastify.post('/api/tasks/:id/approve', async (request, reply) => {
    const { id } = request.params;
    try {
        const task = await db_1.prisma.agentTask.findUnique({
            where: { id },
        });
        if (!task) {
            return reply.status(404).send({ error: 'Task not found' });
        }
        const updatedTask = await db_1.prisma.agentTask.update({
            where: { id },
            data: { approved: true },
        });
        deployToZerops(task.sessionId, updatedTask);
        return { status: 'approved', message: 'Would apply diffs and deploy to Zerops' };
    }
    catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({ error: 'Failed to approve task', message: error.message });
    }
});
// Reject a task
fastify.post('/api/tasks/:id/reject', async (request, reply) => {
    const { id } = request.params;
    try {
        const task = await db_1.prisma.agentTask.findUnique({
            where: { id },
        });
        if (!task) {
            return reply.status(404).send({ error: 'Task not found' });
        }
        await db_1.prisma.agentTask.update({
            where: { id },
            data: { approved: false },
        });
        return { status: 'rejected' };
    }
    catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({ error: 'Failed to reject task', message: error.message });
    }
});
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 8080;
const HOST = '0.0.0.0';
const start = async () => {
    try {
        // Initialize task queue and worker
        await queue_1.taskQueue.init(process.env.NATS_URL);
        queue_1.taskQueue.registerHandler(worker_1.handleAgentTask);
        await fastify.listen({ port: PORT, host: HOST });
        console.log(`Server listening on http://localhost:${PORT}`);
    }
    catch (err) {
        fastify.log.error(err);
        process.exit(1);
    }
};
start();
