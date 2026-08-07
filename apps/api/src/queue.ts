import { prisma } from '@playground/db';

export interface TaskPayload {
  sessionId: string;
  taskId: string;
  prompt: string;
}

type TaskHandler = (payload: TaskPayload) => Promise<void>;

export class TaskQueue {
  private handlers: TaskHandler[] = [];
  private isProcessing = false;
  private pollInterval: NodeJS.Timeout | null = null;
  private isPolling = false;

  async init() {
    console.log('Using database queue (PostgreSQL).');
  }

  registerHandler(handler: TaskHandler) {
    this.handlers.push(handler);
  }

  async publish(payload: TaskPayload): Promise<string> {
    const queueJob = await prisma.queueJob.create({
      data: {
        type: 'generate',
        payload: payload as any,
      },
    });
    console.log(`Enqueued task in database: ${queueJob.id}`, payload);
    return queueJob.id;
  }

  async claimJob(): Promise<{ id: string; type: string; payload: any; attempts: number } | null> {
    try {
      // Use raw query with FOR UPDATE SKIP LOCKED
      const jobs = await prisma.$queryRaw<Array<{ id: string; type: string; payload: any; attempts: number }>>`
        WITH next_job AS (
          SELECT id
          FROM "QueueJob"
          WHERE status = 'pending'
            AND "scheduledAt" <= NOW()
          ORDER BY "createdAt" ASC
          LIMIT 1
          FOR UPDATE SKIP LOCKED
        )
        UPDATE "QueueJob"
        SET status = 'processing',
            attempts = attempts + 1
        FROM next_job
        WHERE "QueueJob".id = next_job.id
        RETURNING "QueueJob".id, "QueueJob".type, "QueueJob".payload, "QueueJob".attempts
      `;

      return jobs[0] || null;
    } catch (error) {
      console.error('Error claiming job from Postgres queue:', error);
      return null;
    }
  }

  async completeJob(jobId: string): Promise<void> {
    await prisma.queueJob.update({
      where: { id: jobId },
      data: { status: 'completed' },
    });
  }

  async failJob(jobId: string, error: string): Promise<void> {
    try {
      const job = await prisma.queueJob.findUnique({
        where: { id: jobId },
      });

      if (!job) return;

      const shouldRetry = job.attempts < job.maxAttempts;

      await prisma.queueJob.update({
        where: { id: jobId },
        data: {
          status: shouldRetry ? 'pending' : 'failed',
          error,
          scheduledAt: shouldRetry 
            ? new Date(Date.now() + 5000 * job.attempts) // Exponential backoff (5s, 10s...)
            : undefined,
        },
      });
    } catch (err) {
      console.error(`Failed to record failure for job ${jobId}:`, err);
    }
  }

  startProcessing(): void {
    if (this.pollInterval) {
      console.warn('Queue already processing');
      return;
    }

    this.isProcessing = true;

    const process = async () => {
      if (!this.isProcessing || this.isPolling) return;
      this.isPolling = true;

      try {
        const job = await this.claimJob();
        if (!job) return;

        console.log(`Processing job ${job.id} (type: ${job.type})`);
        const payload = job.payload as unknown as TaskPayload;

        try {
          // Process job
          for (const handler of this.handlers) {
            await handler(payload);
          }
          await this.completeJob(job.id);
          console.log(`Job ${job.id} completed successfully`);
        } catch (error: any) {
          console.error(`Job ${job.id} failed:`, error.message);
          await this.failJob(job.id, error.message);
        }
      } catch (error) {
        console.error('Queue processing error:', error);
      } finally {
        this.isPolling = false;
      }
    };

    // Poll every 2 seconds
    this.pollInterval = setInterval(process, 2000);
  }

  stopProcessing(): void {
    this.isProcessing = false;
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }

  async close() {
    this.stopProcessing();
  }
}

export const taskQueue = new TaskQueue();
