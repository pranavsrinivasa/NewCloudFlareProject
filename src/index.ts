import { ResearchWorkflow } from './workflow';
import { HTML } from './html';

export { ResearchWorkflow };

export default {
  async fetch(request: Request, env: any, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === 'GET' && url.pathname === '/') {
      return new Response(HTML, { headers: { 'Content-Type': 'text/html' } });
    }

    if (request.method === 'POST' && url.pathname === '/api/chat') {
      const { message, conversationId } = await request.json();

      // 1. Store memory in KV (100% Free)
      let history = [];
      try {
        const stored = await env.KV_MEMORY.get(conversationId, { type: 'json' });
        if (stored) history = stored;
      } catch (e) {}
      history.push({ role: 'user', content: message });
      await env.KV_MEMORY.put(conversationId, JSON.stringify(history));

      const instanceId = \inv_\\;
      const workflowInstance = await env.RESEARCH_WORKFLOW.create({
        id: instanceId,
        params: { query: message }
      });

      const { readable, writable } = new TransformStream();
      const writer = writable.getWriter();
      const encoder = new TextEncoder();

      ctx.waitUntil((async () => {
        try {
          await writer.write(encoder.encode(\data: \\n\n\));

          let status;
          do {
            await new Promise(r => setTimeout(r, 1000));
            status = await workflowInstance.status();
          } while (status.status !== 'complete' && status.status !== 'errored' && status.status !== 'terminated');

          if (status.status !== 'complete') {
            await writer.write(encoder.encode(\data: \\n\n\));
            await writer.write(encoder.encode('data: "[DONE]"\n\n'));
            return;
          }

          const researchData = status.output;
          await writer.write(encoder.encode(\data: \\n\n\));

          const responseStream = await env.AI.run('@cf/meta/llama-3.3-70b-instruct-fp8-fast', {
            messages: [
              { role: 'system', content: 'You are an AI Research & Decision Agent. Synthesize the findings into a clear, risk-adjusted view.' },
              { role: 'user', content: \User query: \\n\nResearch Context:\n\\ }
            ],
            stream: true
          });

          for await (const chunk of responseStream) {
            if (chunk.response) {
              await writer.write(encoder.encode(\data: \\n\n\));
            }
          }

          await writer.write(encoder.encode('data: "[DONE]"\n\n'));
        } catch (error) {
          await writer.write(encoder.encode(\data: \\n\n\));
          await writer.write(encoder.encode('data: "[DONE]"\n\n'));
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
