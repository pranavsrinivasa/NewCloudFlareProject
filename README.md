# Cloudflare AI Research & Decision Agent 🧠

This is a standalone, AI-powered application built natively on Cloudflare to demonstrate a **Research and Decision Agent** architecture. It is designed specifically to fulfill the Cloudflare AI agent assignment requirements on the **Free Tier**.

## 🌟 Features
- **Llama 3.3 Integration**: Uses Cloudflare Workers AI (@cf/meta/llama-3.3-70b-instruct-fp8-fast) for reasoning and final synthesis.
- **Persistent Memory (Free)**: Uses **Cloudflare Workers KV** to persistently store conversation history across sessions natively on the edge without requiring a paid plan.
- **Complex Coordination**: Uses **Cloudflare Workflows** to orchestrate background steps, including fetching **real-time Google Search data** using DuckDuckGo Lite and performing intermediate sentiment analysis.
- **Sleek Chat UI**: Natively serves a responsive, modern HTML/CSS chat interface directly from the Worker.
- **Real-Time Streaming**: Implements **Server-Sent Events (SSE)** to stream workflow execution statuses and the final AI synthesis tokens back to the chat UI instantly.

## 🚀 Architecture Flow
1. **User Request**: The user submits a research query (e.g., *"Should I invest in NVIDIA?"*) via the chat UI.
2. **Memory Storage**: The Worker intercepts the POST request and saves the prompt into a KV namespace instance.
3. **Workflow Orchestration**: The Worker kicks off the ResearchWorkflow, which scrapes real-time search results and analyzes risk.
4. **Streaming Response**: The Worker uses SSE to stream updates. Once the Workflow completes, the Worker streams the final LLM synthesis directly back to the UI.

## 🛠️ Deployment Instructions (100% Free)

You can run this entirely for free since it uses Workers KV and Workflows Beta.

### 1. Link your Cloudflare Account
\\\ash
npx wrangler login
\\\

### 2. Create the KV Namespace
Run the following command to create a free KV namespace for your memory:
\\\ash
npx wrangler kv:namespace create KV_MEMORY
\\\
It will print out a binding configuration block. Copy the \id\ value from that block and paste it into the \wrangler.jsonc\ file where it currently says "id": "mock-id-for-dev".

### 3. Deploy to the Edge
\\\ash
npx wrangler deploy
\\\
Wrangler will output a live URL (e.g., \https://decision-agent.<your-subdomain>.workers.dev\). Open it in your browser to interact with your live AI Decision Agent!
