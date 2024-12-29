import Groq from 'groq-sdk';
import { Message } from './types';
import { SECURITY_CHECK, TOOLS_PROMPT } from './prompt';

class LLM {
  private model: string;
  private groq: Groq;

  constructor(apiKey: string, model: string = "llama-3.3-70b-versatile") {
    this.model = model;
    this.groq = new Groq({ apiKey });
  }

  async callLLM(
    messages: Message[],
    options: { temperature?: number; model?: string, toolUse ?: boolean } = {}
  ): Promise<any> {
    const selectedModel = options.model || this.model;
    const toolUse = options.toolUse == undefined ? true : options.toolUse;
    
    const completion = await this.groq.chat.completions.create({
      model: selectedModel,
      messages: messages as any,
      temperature: options.temperature || 1.0,
      max_tokens: 1024,
      top_p: 1,
      tools: toolUse ? TOOLS_PROMPT as any : null,
      tool_choice: toolUse ? "auto" : "none",
      seed: 42
    });

    const msg = completion.choices[0].message;
    return msg;
  }

  private async simpleSecurityCheck(command: string): Promise<boolean> {
    const messages: Message[] = [
      { role: "system", content: SECURITY_CHECK },
      { role: "user", content: command }
    ];

    const completion = await this.callLLM(messages, { model: "llama-3.1-8b-instant", toolUse: false });
    const content = completion.content;

    return !(content.includes("Y") && !content.includes("N"));
  }

  private llamaGuardCheck(command: string): boolean {
    throw new Error("Method not implemented.");
  }

  async securityCheck(command: string): Promise<boolean> {
    return this.simpleSecurityCheck(command);
  }
}

export default LLM;
