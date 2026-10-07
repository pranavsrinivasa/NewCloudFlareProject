# Cloudflare AI Research & Decision Agent 🧠

This is a standalone, AI-powered application built natively on Cloudflare to demonstrate a **Research and Decision Agent** architecture. It is designed specifically to fulfill the Cloudflare AI agent assignment requirements.

## 🌟 Features
- **Llama 3.3 Integration**: Uses Cloudflare Workers AI (@cf/meta/llama-3.3-70b-instruct-fp8-fast) for reasoning and final synthesis.
- **Persistent Memory**: Implements **Cloudflare Durable Objects** to persistently store conversation history and user session state.
- **Complex Coordination**: Uses **Cloudflare Workflows** (via WorkflowEntrypoint) to coordinate multi-step background tasks, including gathering simulated news and performing intermediate sentiment analysis.
- **Sleek Chat UI**: Natively serves a responsive, modern HTML/CSS chat interface directly from the Worker.
- **Real-Time Streaming**: Implements **Server-Sent Events (SSE)** to stream both workflow execution statuses and the final AI synthesis tokens back to the chat UI instantly.

## 🚀 Architecture Flow
1. **User Request**: The user submits a research query (e.g., *"Should I invest in NVIDIA?"*) via the chat UI.
2. **Memory Storage**: The Worker intercepts the POST request and saves the prompt into a Durable Object instance.
3. **Workflow Orchestration**: The Worker kicks off the ResearchWorkflow, which executes the research steps in the background.
4. **Streaming Response**: The Worker uses SSE to stream updates (e.g. *"Starting workflow..."*). Once the Workflow completes, the Worker streams the final LLM synthesis directly back to the UI.

## 🛠️ Local Development

You can run this entire architecture (Worker, Durable Object, Workflow, and AI) locally!

### 1. Install Dependencies
Make sure you have Node.js installed, then run:
\\\ash
npm install
\\\

### 2. Start the Development Server
Run the Cloudflare local development simulator (Miniflare/Wrangler):
\\\ash
npx wrangler dev
\\\

### 3. Open the UI
Open your browser and navigate to the URL provided in your terminal (usually http://localhost:8787). Type in a query and watch the AI research your request!

## ☁️ Deployment

To deploy this agent live to Cloudflare's Edge network:

1. Authenticate with your Cloudflare account:
   \\\ash
   npx wrangler login
   \\\

2. Deploy the project:
   \\\ash
   npx wrangler deploy
   \\\

3. Once deployed, Wrangler will output a live URL (e.g., \https://decision-agent.<your-subdomain>.workers.dev\). Open it in your browser to interact with your live AI Decision Agent!

> **Note**: This project utilizes Cloudflare Workflows, Durable Objects, and Workers AI. Ensure that your Cloudflare plan supports these features (Durable Objects require a Paid plan, though this project uses 
ew_sqlite_classes for local simulation testing).
