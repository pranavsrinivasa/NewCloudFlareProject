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

      let history = [];
      try {
        const stored = await env.KV_MEMORY.get(conversationId, { type: 'json' });
        if (stored) history = stored;
      } catch (e) {}

      history.push({ role: 'user', content: message });
      await env.KV_MEMORY.put(conversationId, JSON.stringify(history));

      const instanceId = `inv_${Date.now()}`;
      const workflowInstance = await env.RESEARCH_WORKFLOW.create({
        id: instanceId,
        params: { query: message }
      });

      const { readable, writable } = new TransformStream();
      const writer = writable.getWriter();
      const encoder = new TextEncoder();

      ctx.waitUntil((async () => {
        try {
          await writer.write(encoder.encode(`data: ${JSON.stringify("Starting research workflow [" + instanceId + "]...")}\n\n`));

          let status;
          do {
            await new Promise(r => setTimeout(r, 1000));
            status = await workflowInstance.status();
          } while (status.status !== 'complete' && status.status !== 'errored' && status.status !== 'terminated');

          if (status.status !== 'complete') {
            await writer.write(encoder.encode(`data: ${JSON.stringify("Workflow failed with status: " + status.status)}\n\n`));
            await writer.write(encoder.encode('data: "[DONE]"\n\n'));
            return;
          }

          const researchData = status.output;
          await writer.write(encoder.encode(`data: ${JSON.stringify("Research complete! Synthesizing final answer...")}\n\n`));

          // Prepare memory context for the LLM
          const systemPrompt = { 
            role: 'system', 
            content: 'You are an AI Research & Decision Agent. Synthesize findings into a clear, risk-adjusted view. Use Markdown formatting. **Crucially**, explicitly cite sources using Markdown links (e.g. [Name](url)) based on the provided Research Context.' 
          };
          
          // Map history (limit to last 10 messages to save tokens)
          const recentHistory = history.slice(-10);
          
          // Append the secret context block to the LAST user message
          const lastMsg = recentHistory[recentHistory.length - 1];
          lastMsg.content = `User query: ${lastMsg.content}\n\n[SYSTEM INJECTION: Use this real-time web search data for your answer]:\n${JSON.stringify(researchData)}`;

          const responseStream = await env.AI.run('@cf/meta/llama-3.3-70b-instruct-fp8-fast', {
            messages: [systemPrompt, ...recentHistory],
            stream: true,
            max_tokens: 2048
          });

          const aiReader = responseStream.getReader();
          const textDecoder = new TextDecoder();
          let fullAIResponse = "";
          let buffer = "";

          while (true) {
            const { done, value } = await aiReader.read();
            if (done) break;
            await writer.write(value);
            
            // Parse stream locally to save the AI response to memory
            buffer += textDecoder.decode(value, { stream: true });
            let lines = buffer.split('\n');
            buffer = lines.pop() || '';
            for (const line of lines) {
                if (line.startsWith('data: ') && line.trim() !== 'data: [DONE]') {
                    try {
                        const data = JSON.parse(line.slice(6).trim());
                        if (data.response) fullAIResponse += data.response;
                    } catch(e) {}
                }
            }
          }
          
          // Remove the injected secret research data from the history before saving it to KV, 
          // so we don't permanently bloat the memory with old search results!
          lastMsg.content = message; 
          history.push({ role: 'assistant', content: fullAIResponse });
          await env.KV_MEMORY.put(conversationId, JSON.stringify(history));

        } catch (error) {
          await writer.write(encoder.encode(`data: ${JSON.stringify("Error during processing.")}\n\n`));
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
