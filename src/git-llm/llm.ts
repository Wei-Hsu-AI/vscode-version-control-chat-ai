import axios from 'axios';
import { Message } from './types';

// TODO: Change this to the actual API URL
const API_ENDPOINT = 'http://localhost:5001';

export default class LLM {
  async callLLM(
    messages: Message[],
    options: { temperature?: number; model?: string; toolUse?: boolean } = {}
  ): Promise<any> {
    const toolUse = options.toolUse === undefined ? true : options.toolUse;

    const response = await axios.post(`${API_ENDPOINT}/call-llm`, {
      messages,
      temperature: options.temperature || 1.0,
      toolUse
    });

    return response.data;
  }

  async securityCheck(command: string): Promise<boolean> {
    const response = await axios.post(`${API_ENDPOINT}/security-check`, {
      command
    });
    return response.data.is_safe;
  }
}
