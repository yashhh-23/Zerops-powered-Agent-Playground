import { connect, NatsConnection, JSONCodec } from 'nats';

export interface TaskPayload {
  sessionId: string;
  taskId: string;
  prompt: string;
}

type TaskHandler = (payload: TaskPayload) => Promise<void>;

class TaskQueue {
  private natsConn: NatsConnection | null = null;
  private jc = JSONCodec<TaskPayload>();
  private inMemoryQueue: TaskPayload[] = [];
  private handlers: TaskHandler[] = [];
  private intervalId: NodeJS.Timeout | null = null;

  async init(natsUrl?: string) {
    if (natsUrl) {
      try {
        console.log(`Connecting to NATS at ${natsUrl}...`);
        this.natsConn = await connect({ servers: natsUrl, timeout: 2000 });
        console.log('NATS connection established!');
        
        // Subscribe to topic
        const sub = this.natsConn.subscribe('agent.tasks');
        (async () => {
          for await (const m of sub) {
            try {
              const payload = this.jc.decode(m.data);
              console.log(`Received task via NATS:`, payload);
              await this.triggerHandlers(payload);
            } catch (err) {
              console.error('Error processing NATS message:', err);
            }
          }
        })();
        return;
      } catch (err) {
        console.warn(`Failed to connect to NATS (${err}). Falling back to in-memory queue.`);
        this.natsConn = null;
      }
    } else {
      console.log('No NATS_URL provided. Using in-memory queue.');
    }

    // Setup in-memory polling worker
    this.intervalId = setInterval(async () => {
      if (this.inMemoryQueue.length > 0) {
        const payload = this.inMemoryQueue.shift();
        if (payload) {
          console.log(`Processing task via in-memory queue:`, payload);
          await this.triggerHandlers(payload);
        }
      }
    }, 1000);
  }

  registerHandler(handler: TaskHandler) {
    this.handlers.push(handler);
  }

  private async triggerHandlers(payload: TaskPayload) {
    for (const handler of this.handlers) {
      try {
        await handler(payload);
      } catch (err) {
        console.error('Error in task handler:', err);
      }
    }
  }

  async publish(payload: TaskPayload) {
    if (this.natsConn) {
      this.natsConn.publish('agent.tasks', this.jc.encode(payload));
      console.log(`Published task to NATS topic 'agent.tasks':`, payload);
    } else {
      this.inMemoryQueue.push(payload);
      console.log(`Enqueued task in-memory:`, payload);
    }
  }

  async close() {
    if (this.intervalId) clearInterval(this.intervalId);
    if (this.natsConn) {
      await this.natsConn.drain();
    }
  }
}

export const taskQueue = new TaskQueue();
