"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleAgentTask = handleAgentTask;
const db_1 = require("@playground/db");
const agent_1 = require("./agent");
async function handleAgentTask(payload) {
    const { taskId, prompt } = payload;
    console.log(`[Worker] Starting task ${taskId} with prompt: "${prompt}"`);
    try {
        // 1. Update status to processing
        await db_1.prisma.agentTask.update({
            where: { id: taskId },
            data: { status: 'processing' },
        });
        // 2. Run LLM Agent generation (includes built-in fallback)
        const agentResult = await (0, agent_1.generateAgentResponse)(prompt);
        // 3. Update status to completed
        await db_1.prisma.agentTask.update({
            where: { id: taskId },
            data: {
                status: 'completed',
                codeDiff: JSON.stringify(agentResult.codeDiff),
                infraDiff: JSON.stringify(agentResult.infraDiff),
                completedAt: new Date(),
            },
        });
        console.log(`[Worker] Completed task ${taskId}`);
    }
    catch (error) {
        console.error(`[Worker] Error processing task ${taskId}:`, error);
        try {
            await db_1.prisma.agentTask.update({
                where: { id: taskId },
                data: { status: 'failed' },
            });
        }
        catch (dbErr) {
            console.error(`[Worker] Failed to write failure status to DB:`, dbErr);
        }
    }
}
