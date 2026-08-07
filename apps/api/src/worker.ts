import { prisma } from '@playground/db';
import { TaskPayload } from './queue';
import { generateAgentResponse } from './agent';

export async function handleAgentTask(payload: TaskPayload) {
  const { taskId, prompt } = payload;
  console.log(`[Worker] Starting task ${taskId} with prompt: "${prompt}"`);

  try {
    // 1. Update status to processing
    await prisma.agentTask.update({
      where: { id: taskId },
      data: { status: 'processing' },
    });

    // 2. Run LLM Agent generation (includes built-in fallback)
    const agentResult = await generateAgentResponse(prompt);

    // 3. Update status to completed
    await prisma.agentTask.update({
      where: { id: taskId },
      data: {
        status: 'completed',
        codeDiff: JSON.stringify(agentResult.codeDiff),
        infraDiff: JSON.stringify(agentResult.infraDiff),
        completedAt: new Date(),
      },
    });

    console.log(`[Worker] Completed task ${taskId}`);
  } catch (error) {
    console.error(`[Worker] Error processing task ${taskId}:`, error);
    try {
      await prisma.agentTask.update({
        where: { id: taskId },
        data: { status: 'failed' },
      });
    } catch (dbErr) {
      console.error(`[Worker] Failed to write failure status to DB:`, dbErr);
    }
  }
}
