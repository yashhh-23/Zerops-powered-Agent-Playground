# Zerops-powered Coding Agent Playground

<p align="center">
  <img src="https://img.shields.io/badge/Platform-Zerops%20%7C%20Postgres-0ea5e9?style=for-the-badge&logo=react" alt="Platform" />
  <img src="https://img.shields.io/badge/Stack-Node.js%20%7C%20Fastify-339933?style=for-the-badge&logo=node.js" alt="Stack" />
  <img src="https://img.shields.io/badge/License-MIT-green?style=for-the-badge" alt="License" />
</p>

An interactive, high-fidelity developer playground designed to test, preview, and deploy LLM coding agent changes directly to cloud infrastructure. Driven by **Zerops**, this platform compiles code changes, registers application versions, and automates builds inside sandboxed runtimes.

---

## ⚡ Key Features

* **Custom Developer-IDE Branding:** Clean, dark visual interface leveraging `JetBrains Mono` typography, hardened geometries, and responsive CSS variables.
* **SSE Health Status Monitor:** A dynamic, real-time monitor that streams database and API connectivity over a Server-Sent Events (SSE) channel, changing status indicator dots live without page refreshes.
* **Interactive Sandbox Templates:** Choose between specialized environments (Node.js API, React Static, or Python FastAPI) with descriptive metadata cards.
* **Code & Infra Diff Viewers:** Collapsible syntax-highlighted git-diff sections that capture code updates and automatically generate `zerops.yaml` infrastructure setups.
* **Linear Deployment Pipeline:** Real-time progress bar detailing the deployment status step-by-step (`Packaging` ➔ `Uploading` ➔ `Deploying` ➔ `Done`).
* **Robust Session Recovery:** Displays session API keys securely with click-to-copy animations, permitting users to import and recover playground configurations instantly.

---

## 🏗️ Architecture

```mermaid
graph TD
    A[Frontend Client] -- 1. Submit Prompt --> B[Fastify API Backend]
    B -- 2. Queue Asynchronous Job --> C[(Postgres DB Queue)]
    B -- 3. SSE Stream Live Health & State --> A
    C -- 4. Process Job & Generate Diffs --> D[LLM Coding Agent]
    D -- 5. Return Code & Infra Diffs --> B
    A -- 6. Click Approve & Deploy --> B
    B -- 7. Package ZIP & Register App Version --> E[Zerops Cloud Platform]
    E -- 8. Trigger Build & Container Deploy --> F[Active Runtime Service]
```

---

## ⚙️ Prerequisites

* **Node.js** (v20 or higher)
* **PostgreSQL** database (Supabase or managed instance)
* **Zerops CLI (`zcli`)** installed locally for triggers
* Valid **Zerops API Token** & **Client ID** inside variables

---

## 🚀 Getting Started

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/yashhh-23/Zerops-powered-Agent-Playground.git
cd Zerops-powered-Agent-Playground
npm install
```

### 2. Configure Environment Variables
Create a `.env` file in the root directory:
```env
# Database Settings
DATABASE_URL="postgresql://username:password@db.supabase.co:5432/postgres"

# Zerops Settings
ZEROPS_API_TOKEN="zerops_token_..."
ZEROPS_CLIENT_ID="client_id_..."
ZEROPS_API_BASE="https://api.app-prg1.zerops.io/api/rest/public"

# LLM API Settings (Optional - omit or use placeholder to run against the mock agent)
LLM_API_KEY="hf_token_..."
```

### 3. Synchronize Database Schema
```bash
npx prisma db push --schema=packages/db/schema.prisma
```

### 4. Run Development Servers
Start backend API and frontend Vite dev servers concurrently:
```bash
npm run dev
```
* **Frontend:** `http://localhost:3000`
* **API Backend:** `http://localhost:8080`

---

## 📦 Deployment to Zerops

> [!NOTE]
> This command deploys the **playground application itself** to Zerops. Once the playground is running, the application's internal "Approve & Deploy" button handles the deployment of the generated code to your Zerops project automatically via the Zerops REST API — no local CLI involvement is needed for that loop.

You can deploy the playground directly onto Zerops using `zcli`:

```bash
# Log in to Zerops CLI
zcli login <your-token>

# Push deployment to Zerops project
zcli push zcp --projectId A49DkiwWRgSJBUQwYBUxLw --setup api
```

The server automatically compiles dependencies, runs Prisma generators, builds workspaces, and serves the static production bundle concurrently.

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.
