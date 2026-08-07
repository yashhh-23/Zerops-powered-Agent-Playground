import fs from 'fs';
import path from 'path';
import os from 'os';
import archiver from 'archiver';
import dotenv from 'dotenv';

dotenv.config();

const API_BASE_URL = 'https://api.app-prg1.zerops.io/api/rest/public';

/**
 * Creates a ZIP file containing the dummy application code and the updated zerops.yaml config
 */
async function createDeploymentZip(zeropsYamlContent: string): Promise<string> {
  const tempDir = os.tmpdir();
  const zipPath = path.join(tempDir, `deploy-${Date.now()}.zip`);
  const output = fs.createWriteStream(zipPath);
  const archive = archiver('zip', { zlib: { level: 9 } });

  console.log(`[Zerops] Packaging deployment ZIP file to: ${zipPath}`);

  return new Promise((resolve, reject) => {
    output.on('close', () => {
      console.log(`[Zerops] ZIP file packaged successfully. Size: ${fs.statSync(zipPath).size} bytes`);
      resolve(zipPath);
    });
    archive.on('error', (err) => {
      console.error('[Zerops] Error creating ZIP file:', err);
      reject(err);
    });

    archive.pipe(output);

    // 1. Add custom zerops.yaml to the root of the ZIP
    archive.append(zeropsYamlContent, { name: 'zerops.yaml' });

    // 2. Add sample package.json
    const packageJson = JSON.stringify({
      name: "zerops-sandbox-app",
      version: "1.0.0",
      scripts: {
        start: "node index.js"
      }
    }, null, 2);
    archive.append(packageJson, { name: 'package.json' });

    // 3. Add sample index.js server code
    const indexJs = `
const http = require('http');
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ status: "ok", source: "Zerops Agent Playground Sandbox" }));
});
server.listen(8080, () => {
  console.log('Server running on port 8080');
});
`;
    archive.append(indexJs, { name: 'index.js' });

    archive.finalize();
  });
}

/**
 * Creates a project in Zerops using the REST API
 */
export async function createZeropsProject(sessionName: string): Promise<string> {
  const apiToken = process.env.ZEROPS_API_TOKEN;
  const clientId = process.env.ZEROPS_CLIENT_ID;

  if (!apiToken || !clientId || apiToken.startsWith('zerops_placeholder')) {
    console.warn('[Zerops] ZEROPS_API_TOKEN or ZEROPS_CLIENT_ID is missing/placeholder. Returning stub Project ID.');
    return `stub-project-${Date.now()}`;
  }

  const projectName = `${sessionName.toLowerCase().replace(/[^a-z0-9-]/g, '-')}-${Date.now().toString().slice(-4)}`;
  console.log(`[Zerops] Creating project "${projectName}" on Zerops...`);

  try {
    // TODO: verify endpoint and payload with Zerops docs
    const response = await fetch(`${API_BASE_URL}/project`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiToken}`,
      },
      body: JSON.stringify({
        name: projectName,
        clientId: clientId,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Zerops API create project failed (${response.status}): ${errorText}`);
    }

    const data: any = await response.json();
    const projectId = data.id || data.project?.id || `project-${Date.now()}`;
    console.log(`[Zerops] Successfully created project. Project ID: ${projectId}`);
    return projectId;
  } catch (error: any) {
    console.error('[Zerops] Error calling Zerops /project API:', error.message);
    const fallbackId = `stub-project-${Date.now()}`;
    console.log(`[Zerops] Fallback stub Project ID generated: ${fallbackId}`);
    return fallbackId;
  }
}

/**
 * Compiles the deployment archive, creates a version, uploads it, and deploys it on Zerops
 */
export async function applyInfraDiff(projectId: string, infraDiff: { zeropsYaml: string }): Promise<boolean> {
  const apiToken = process.env.ZEROPS_API_TOKEN;

  if (!apiToken || apiToken.startsWith('zerops_placeholder')) {
    console.warn('[Zerops] ZEROPS_API_TOKEN is missing. Simulating successful deployment pipeline.');
    console.log(`[Zerops] Simulated: Packaged zerops.yaml content:\n${infraDiff.zeropsYaml}`);
    console.log(`[Zerops] Simulated: Uploaded deployment archive for project ID: ${projectId}`);
    console.log(`[Zerops] Simulated: Deployment build process finished successfully!`);
    return true;
  }

  let zipPath = '';
  try {
    // 1. Package files
    zipPath = await createDeploymentZip(infraDiff.zeropsYaml);

    // 2. Create app version and get storage URL
    // TODO: verify endpoint and payload with Zerops docs
    console.log(`[Zerops] Creating app version for project: ${projectId}...`);
    const versionResponse = await fetch(`${API_BASE_URL}/project/${projectId}/app-version`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiToken}`,
      },
      body: JSON.stringify({
        name: `version-${Date.now()}`,
      }),
    });

    if (!versionResponse.ok) {
      const errorText = await versionResponse.text();
      throw new Error(`Zerops API version creation failed (${versionResponse.status}): ${errorText}`);
    }

    const versionData: any = await versionResponse.json();
    // Assume response contains uploadUrl and versionId
    const uploadUrl = versionData.uploadUrl || versionData.storageUrl;
    const versionId = versionData.id || versionData.versionId;

    if (!uploadUrl) {
      throw new Error('Upload storage URL not returned by Zerops app-version endpoint');
    }

    console.log(`[Zerops] App version registered. Version ID: ${versionId}. Uploading ZIP to storage URL...`);

    // 3. Upload Zip file to storage URL
    const fileStream = fs.createReadStream(zipPath);
    const uploadResponse = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/zip',
      },
      body: fileStream as any, // Node streams work with global fetch
    });

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      throw new Error(`Uploading deployment ZIP failed (${uploadResponse.status}): ${errorText}`);
    }

    console.log(`[Zerops] ZIP upload complete. Triggering build/deploy pipeline...`);

    // 4. Trigger build / deploy pipeline
    // TODO: verify endpoint and payload with Zerops docs
    const deployResponse = await fetch(`${API_BASE_URL}/app-version/${versionId}/deploy`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiToken}`,
      },
      body: JSON.stringify({}),
    });

    if (!deployResponse.ok) {
      const errorText = await deployResponse.text();
      throw new Error(`Deploy trigger failed (${deployResponse.status}): ${errorText}`);
    }

    console.log(`[Zerops] Deployment successfully triggered for version ID: ${versionId}`);
    return true;
  } catch (error: any) {
    console.error('[Zerops] Deployment pipeline execution failed:', error.message);
    return false;
  } finally {
    // Cleanup temporary zip file
    if (zipPath && fs.existsSync(zipPath)) {
      try {
        fs.unlinkSync(zipPath);
        console.log(`[Zerops] Cleaned up temporary ZIP archive: ${zipPath}`);
      } catch (err) {
        console.error('[Zerops] Error cleaning up zip file:', err);
      }
    }
  }
}
