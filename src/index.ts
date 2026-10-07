import { AgentMemory } from './memory';
import { ResearchWorkflow } from './workflow';
import { HTML } from './html';

export { AgentMemory, ResearchWorkflow };

export default {
  async fetch(request: Request, env: any, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === 'GET' && url.pathname === '/') {
      return new Response(HTML, { headers: { 'Content-Type': 'text/html' } });
    }

    if (request.method === 'POST' && url.pathname === '/api/chat') {
      const { message, conversationId } = await request.json();

      // 1. Store memory in Durable Object
      const id = env.MEMORY.idFromName(conversationId);
      const memoryStub = env.MEMORY.get(id);
      await memoryStub.fetch(new Request('http://do/messages', {
        method: 'POST',
        body: JSON.stringify({ role: 'user', content: message })
      }));

      // 2. Start a Workflow that coordinates multiple steps (gathering, reasoning, risk analysis)
      const instanceId = `inv_${Date.now()}`;
      const workflowInstance = await env.RESEARCH_WORKFLOW.create({
        id: instanceId,
        params: { query: message }
      });

      // 3. We use Server-Sent Events to stream status and the final synthesized answer back to the user
      const { readable, writable } = new TransformStream();
      const writer = writable.getWriter();
      const encoder = new TextEncoder();

      ctx.waitUntil((async () => {
        try {
          await writer.write(encoder.encode(`data: Starting research workflow [${instanceId}]...\\n\\n`));

          // 4. Poll the workflow until it finishes gathering and reasoning
          let status;
          do {
            await new Promise(r => setTimeout(r, 1000));
            status = await workflowInstance.status();
          } while (status.status !== 'complete' && status.status !== 'errored' && status.status !== 'terminated');

          if (status.status !== 'complete') {
            await writer.write(encoder.encode(`data: Workflow failed with status: ${status.status}\\n\\n`));
            await writer.write(encoder.encode('data: [DONE]\\n\\n'));
            return;
          }

          const researchData = status.output;
          await writer.write(encoder.encode(`data: Research complete! Synthesizing final answer...\\n\\n`));

          // 5. Ask the LLM to synthesize the findings and stream the final answer back to the user
          const responseStream = await env.AI.run('@cf/meta/llama-3.3-70b-instruct-fp8-fast', {
            messages: [
              { role: 'system', content: 'You are an AI Research & Decision Agent. Synthesize the findings into a clear, risk-adjusted view.' },
              { role: 'user', content: `User query: ${message}\\n\\nResearch Context:\\n${JSON.stringify(researchData)}` }
            ],
            stream: true
          });

          // 6. Stream tokens back directly to the chat UI
          for await (const chunk of responseStream) {
            if (chunk.response) {
              // Cloudflare AI streaming sends tokens. We can safely JSON encode the chunk to avoid SSE newline breaks.
              const safeText = JSON.stringify(chunk.response);
              await writer.write(encoder.encode(`data: ${safeText}\n\n`));
            }
          }

          await writer.write(encoder.encode('data: "[DONE]"\n\n'));
        } catch (error) {
          await writer.write(encoder.encode(`data: Error during processing.\\n\\n`));
          await writer.write(encoder.encode('data: [DONE]\\n\\n'));
        } finally {
          await writer.close();
        }
      })());

      return new Response(readable, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        }
      });
    }

    return new Response('Not Found', { status: 404 });
  }
};
