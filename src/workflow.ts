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

    // Step 1: Gather Information
    const news = await step.do('gather-news', async () => {
      // Mock gathering news based on query
      return `Recent news mentions positive growth and upcoming product launches related to ${query}. Financials show a 20% YoY revenue increase.`;
    });

    // Step 2: Perform sentiment/risk analysis
    const analysis = await step.do('sentiment-analysis', async () => {
      const response = await this.env.AI.run('@cf/meta/llama-3.3-70b-instruct-fp8-fast', {
        messages: [
          { role: 'system', content: 'You are a risk analyst. Perform a quick sentiment and risk analysis on the following data.' },
          { role: 'user', content: news }
        ]
      });
      return response.response;
    });

    // Step 3: Synthesize Findings
    const synthesis = await step.do('synthesize', async () => {
      const response = await this.env.AI.run('@cf/meta/llama-3.3-70b-instruct-fp8-fast', {
        messages: [
          { role: 'system', content: 'You are an AI Research & Decision Agent. Synthesize the findings into a clear, risk-adjusted view.' },
          { role: 'user', content: `Original Query: ${query}\n\nGathered News: ${news}\n\nRisk Analysis: ${analysis}` }
        ]
      });
      return response.response;
    });

    return { synthesis };
  }
}
