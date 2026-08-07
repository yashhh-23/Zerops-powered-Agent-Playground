import { test, expect, beforeAll } from 'vitest';
import { createZeropsProject, applyInfraDiff } from './zerops';

beforeAll(() => {
  process.env.ZEROPS_API_TOKEN = 'zerops_placeholder_token';
  process.env.ZEROPS_CLIENT_ID = 'zerops_placeholder_client_id';
});

test('createZeropsProject fallback mode', async () => {
  const projectId = await createZeropsProject('test-session');
  expect(projectId).toContain('stub-project-');
});

test('applyInfraDiff fallback mode', async () => {
  const success = await applyInfraDiff('stub-project-123', { zeropsYaml: 'setup: web\n' });
  expect(success).toBe(true);
});
