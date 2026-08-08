export interface PlaygroundSession {
  id: string;
  name: string;
  template: string;
  status: string; // 'active' | 'completed' | 'failed'
  apiKey?: string;
  zeropsProjectId?: string | null;
  createdAt: string;
  updatedAt: string;
  agentTasks?: AgentTask[];
}

export interface AgentTask {
  id: string;
  sessionId: string;
  prompt: string;
  status: string; // 'pending' | 'processing' | 'completed' | 'failed'
  deployStatus?: 'pending' | 'packaging' | 'uploading' | 'deploying' | 'deployed' | 'failed' | null;
  codeDiff: string | null;
  infraDiff: string | null;
  createdAt: string;
  completedAt: string | null;
  approved?: boolean | null;
}

export interface FileDiff {
  path: string;
  diff: string;
  content?: string;
  action?: 'create' | 'update' | 'delete';
}

export interface CodeDiffPayload {
  files: FileDiff[];
}

export interface InfraDiffPayload {
  zeropsYaml: string;
}
