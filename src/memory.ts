import { DurableObject } from "cloudflare:workers";

export class AgentMemory extends DurableObject {
  private messages: { role: string; content: string }[] = [];

  constructor(ctx: DurableObjectState, env: any) {
    super(ctx, env);
    this.ctx.blockConcurrencyWhile(async () => {
      const stored = await this.ctx.storage.get<{ role: string; content: string }[]>("messages");
      if (stored) this.messages = stored;
    });
  }

  async fetch(request: Request) {
    const url = new URL(request.url);
    if (request.method === "POST") {
      const msg = await request.json();
      this.messages.push(msg as { role: string; content: string });
      await this.ctx.storage.put("messages", this.messages);
      return new Response("OK");
    } else if (request.method === "GET") {
      return new Response(JSON.stringify({ messages: this.messages }), {
        headers: { "Content-Type": "application/json" }
      });
    }
    return new Response("Not Found", { status: 404 });
  }
}
