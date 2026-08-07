"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createZeropsProject = createZeropsProject;
exports.applyInfraDiff = applyInfraDiff;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const os_1 = __importDefault(require("os"));
const archiver_1 = __importDefault(require("archiver"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const API_BASE_URL = 'https://api.app-prg1.zerops.io/api/rest/public';
/**
 * Creates a ZIP file containing the dummy application code and the updated zerops.yaml config
 */
async function createDeploymentZip(zeropsYamlContent) {
    const tempDir = os_1.default.tmpdir();
    const zipPath = path_1.default.join(tempDir, `deploy-${Date.now()}.zip`);
    const output = fs_1.default.createWriteStream(zipPath);
    const archive = (0, archiver_1.default)('zip', { zlib: { level: 9 } });
    console.log(`[Zerops] Packaging deployment ZIP file to: ${zipPath}`);
    return new Promise((resolve, reject) => {
        output.on('close', () => {
            console.log(`[Zerops] ZIP file packaged successfully. Size: ${fs_1.default.statSync(zipPath).size} bytes`);
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
async function createZeropsProject(sessionName) {
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
        const data = await response.json();
        const projectId = data.id || data.project?.id || `project-${Date.now()}`;
        console.log(`[Zerops] Successfully created project. Project ID: ${projectId}`);
        return projectId;
    }
    catch (error) {
        console.error('[Zerops] Error calling Zerops /project API:', error.message);
        const fallbackId = `stub-project-${Date.now()}`;
        console.log(`[Zerops] Fallback stub Project ID generated: ${fallbackId}`);
        return fallbackId;
    }
}
/**
 * Compiles the deployment archive, creates a version, uploads it, and deploys it on Zerops
 */
async function applyInfraDiff(projectId, infraDiff) {
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
        const versionData = await versionResponse.json();
        // Assume response contains uploadUrl and versionId
        const uploadUrl = versionData.uploadUrl || versionData.storageUrl;
        const versionId = versionData.id || versionData.versionId;
        if (!uploadUrl) {
            throw new Error('Upload storage URL not returned by Zerops app-version endpoint');
        }
        console.log(`[Zerops] App version registered. Version ID: ${versionId}. Uploading ZIP to storage URL...`);
        // 3. Upload Zip file to storage URL
        const fileStream = fs_1.default.createReadStream(zipPath);
        const uploadResponse = await fetch(uploadUrl, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/zip',
            },
            body: fileStream, // Node streams work with global fetch
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
    }
    catch (error) {
        console.error('[Zerops] Deployment pipeline execution failed:', error.message);
        return false;
    }
    finally {
        // Cleanup temporary zip file
        if (zipPath && fs_1.default.existsSync(zipPath)) {
            try {
                fs_1.default.unlinkSync(zipPath);
                console.log(`[Zerops] Cleaned up temporary ZIP archive: ${zipPath}`);
            }
            catch (err) {
                console.error('[Zerops] Error cleaning up zip file:', err);
            }
        }
    }
}
