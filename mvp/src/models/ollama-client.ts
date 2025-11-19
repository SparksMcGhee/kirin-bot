import { LLMClient } from './llm-client';
import { Logger } from '../utils/logger';

interface OllamaResponse {
  response: string;
  done: boolean;
}

export class OllamaClient implements LLMClient {
  private baseUrl: string;
  private model: string;
  private logger: Logger;

  constructor(baseUrl: string, model: string, logger: Logger) {
    this.baseUrl = baseUrl;
    this.model = model;
    this.logger = logger;
  }

  async summarize(messages: Array<{ text: string; user: string; timestamp: string }>): Promise<string> {
    const prompt = this.buildPrompt(messages);

    this.logger.debug(`Sending request to Ollama: ${this.baseUrl}/api/generate`);
    this.logger.debug(`Model: ${this.model}`);

    try {
      const response = await fetch(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          prompt: prompt,
          stream: false,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Ollama API error: ${response.status} ${errorText}`);
      }

      const data: OllamaResponse = await response.json();
      return data.response.trim();
    } catch (error) {
      this.logger.error('Error calling Ollama API:', error);
      throw error;
    }
  }

  private buildPrompt(messages: Array<{ text: string; user: string; timestamp: string }>): string {
    const messagesText = messages
      .map((msg) => {
        const date = new Date(parseFloat(msg.timestamp) * 1000).toISOString();
        return `[${date}] ${msg.user}: ${msg.text}`;
      })
      .join('\n');

    return `You are a helpful assistant that summarizes Slack conversations. 
Please provide a concise summary of the following conversation, highlighting:
- Key topics discussed
- Important decisions or action items
- Notable events or announcements
- Any questions that need answers

Conversation:
${messagesText}

Summary:`;
  }
}

