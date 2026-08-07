"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateAgentResponse = generateAgentResponse;
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
// Resolve environment variables from the root folder
dotenv_1.default.config();
dotenv_1.default.config({ path: path_1.default.resolve(__dirname, '../../../.env') });
dotenv_1.default.config({ path: path_1.default.resolve(process.cwd(), '.env') });
dotenv_1.default.config({ path: path_1.default.resolve(process.cwd(), '../../.env') });
async function generateAgentResponse(prompt) {
    const apiKey = process.env.LLM_API_KEY;
    if (!apiKey || apiKey.trim() === '' || apiKey.startsWith('hf_placeholder')) {
        console.warn('[Agent] LLM_API_KEY is missing or placeholder. Falling back to mock response.');
        return getMockResponse(prompt);
    }
    try {
        console.log(`[Agent] Calling Hugging Face Inference API for prompt: "${prompt}"`);
        const model = 'Qwen/Qwen2.5-Coder-7B-Instruct';
        const response = await fetch('https://api-inference.huggingface.co/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model,
                messages: [
                    {
                        role: 'system',
                        content: `You are an expert full-stack developer and AI coding agent inside the Zerops Agent Playground.
Your job is to read the developer's request and suggest code modifications and infra updates.
Respond ONLY with a valid JSON object matching the following structure:
{
  "codeDiff": {
    "files": [
      {
        "path": "apps/api/src/index.ts",
        "diff": "string showing what changed (unified diff style)",
        "content": "string containing the full content or snippet",
        "action": "create" | "update" | "delete"
      }
    ]
  },
  "infraDiff": {
    "zeropsYaml": "string containing the entire or updated zerops.yaml"
  }
}
Do not write any markdown blocks or commentary. Output strict JSON only.`
                    },
                    {
                        role: 'user',
                        content: `Implement the following request: "${prompt}"`
                    }
                ],
                temperature: 0.1,
                max_tokens: 1500,
            }),
        });
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HF API error (${response.status}): ${errorText}`);
        }
        const data = await response.json();
        const content = data.choices?.[0]?.message?.content;
        if (!content) {
            throw new Error('No content returned from Hugging Face');
        }
        // Clean markdown blocks if LLM still returned them
        let cleanJson = content.trim();
        if (cleanJson.startsWith('```')) {
            cleanJson = cleanJson.replace(/^```json\s*/, '').replace(/```$/, '').trim();
        }
        const agentResult = JSON.parse(cleanJson);
        if (!agentResult.codeDiff || !agentResult.infraDiff) {
            throw new Error('JSON response does not contain required fields (codeDiff, infraDiff)');
        }
        return agentResult;
    }
    catch (error) {
        console.error('[Agent] LLM generation failed. Falling back to mocks. Error:', error);
        return getMockResponse(prompt);
    }
}
function getMockResponse(prompt) {
    return {
        codeDiff: {
            files: [
                {
                    path: 'apps/api/src/index.ts',
                    diff: `+ // Added endpoint based on prompt: "${prompt}" (Mock LLM Fallback)\n+ fastify.get('/api/sandbox/run', async () => {\n+   return { ok: true, prompt: "${prompt}" };\n+ });`,
                    action: 'update'
                }
            ]
        },
        infraDiff: {
            zeropsYaml: `# Generated Zerops Config (Mock LLM Fallback)\nzerops:\n  - setup: api\n    run:\n      ports:\n        - port: 8080\n          protocol: TCP`
        }
    };
}
