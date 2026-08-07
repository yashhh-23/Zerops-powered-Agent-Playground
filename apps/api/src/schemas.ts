import { Type } from '@sinclair/typebox';

// Session schemas
export const CreateSessionSchema = Type.Object({
  name: Type.String({ 
    minLength: 1, 
    maxLength: 100,
    description: 'Session name (1-100 characters)'
  }),
  template: Type.Union([
    Type.Literal('node-api-basic'),
    Type.Literal('react-static-basic'),
    Type.Literal('python-api-basic')
  ], { description: 'Playground stack template' })
});

export const SessionParamsSchema = Type.Object({
  id: Type.String({ 
    description: 'Session ID' 
  }),
});

export const SessionTasksParamsSchema = Type.Object({
  sessionId: Type.String({ 
    description: 'Session ID for tasks' 
  }),
});

// Task schemas
export const CreateTaskSchema = Type.Object({
  prompt: Type.String({ 
    minLength: 1,
    description: 'Prompt description of changes to make' 
  }),
});

export const TaskParamsSchema = Type.Object({
  id: Type.String({ description: 'Task ID' }),
});
