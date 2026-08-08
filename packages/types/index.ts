export interface PlaygroundSession {
  id: string;
  name: string;
  template: string; // 'node-api-basic' | 'react-static-basic' | 'python-api-basic'
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

export interface TemplateOption {
  key: string;
  icon: string;
  title: string;
  desc: string;
}

export const TEMPLATE_OPTIONS: TemplateOption[] = [
  {
    key: 'node-api-basic',
    icon: '🟢',
    title: 'Node.js API',
    desc: 'Fastify backend, Postgres DB, port 8080'
  },
  {
    key: 'react-static-basic',
    icon: '⚛️',
    title: 'React Static',
    desc: 'Vite frontend app, static files, port 3000'
  },
  {
    key: 'python-api-basic',
    icon: '🐍',
    title: 'Python API',
    desc: 'FastAPI backend application, port 8000'
  }
];

export function templateLabel(t: string): string {
  const match = TEMPLATE_OPTIONS.find(o => o.key === t);
  return match ? match.title : t;
}
