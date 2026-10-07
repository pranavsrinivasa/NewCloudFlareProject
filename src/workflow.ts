import { WorkflowEntrypoint, WorkflowStep, WorkflowEvent } from 'cloudflare:workers';

type Env = {
  AI: any;
};

type Params = {
  query: string;
};

export class ResearchWorkflow extends WorkflowEntrypoint<Env, Params> {
  async run(event: WorkflowEvent<Params>, step: WorkflowStep) {
    const query = event.payload.query;

    // Step 1: Gather real-time information via Web Search (DuckDuckGo Lite)
    const searchResults = await step.do('web-search', async () => {
      const formData = new URLSearchParams();
      formData.append('q', query);
      const res = await fetch('https://lite.duckduckgo.com/lite/', {
        method: 'POST',
        body: formData,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'Mozilla/5.0'
        }
      });
      
      const text = await res.text();
      
      const snippets = [];
      const regex = /<a[^>]*href="([^"]+)"[^>]*class='result-link'>([^<]+)<\/a>[\s\S]*?<td class='result-snippet'>\s*(.*?)\s*<\/td>/g;
      
      let match;
      while ((match = regex.exec(text)) !== null && snippets.length < 5) {
          const url = match[1];
          const title = match[2];
          const snippetText = match[3].replace(/<\/?[^>]+(>|$)/g, "");
          snippets.push(`Source: [${title}](${url})\nSnippet: ${snippetText}`);
      }
      
      return snippets.length > 0 ? snippets.join('\n\n') : "No relevant search results found.";
    });

    // Step 2: Perform sentiment/risk analysis
    const analysis = await step.do('sentiment-analysis', async () => {
      const response = await this.env.AI.run('@cf/meta/llama-3.3-70b-instruct-fp8-fast', {
        messages: [
          { role: 'system', content: 'You are a risk analyst. Perform a concise sentiment and risk analysis on the following real-time search data.' },
          { role: 'user', content: searchResults }
        ]
      });
      return response.response;
    });

    return { searchResults, analysis };
  }
}
