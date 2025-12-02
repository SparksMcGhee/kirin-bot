import { LLMClient, SummarizeContext } from './llm-client';
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

  async summarize(
    messages: Array<{ 
      text: string; 
      user: string; 
      username?: string;
      timestamp: string;
      isThreadReply?: boolean;
    }>,
    context?: SummarizeContext
  ): Promise<string> {
    const prompt = this.buildPrompt(messages, context);

    this.logger.debug(`Sending request to Ollama: ${this.baseUrl}/api/generate`);
    this.logger.debug(`Model: ${this.model}`);

    const maxRetries = 5;
    const retryDelay = 5000; // 5 seconds

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // Add timeout to fetch request
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 minute timeout

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
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Ollama API error: ${response.status} ${errorText}`);
        }

        const data = await response.json() as OllamaResponse;
        this.logger.info(`Successfully generated summary on attempt ${attempt}`);
        return data.response.trim();
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        
        if (attempt < maxRetries) {
          this.logger.warn(
            `Ollama API call failed (attempt ${attempt}/${maxRetries}): ${errorMessage}. Retrying in ${retryDelay / 1000}s...`
          );
          await this.sleep(retryDelay);
        } else {
          this.logger.error(`Ollama API call failed after ${maxRetries} attempts:`, error);
          throw error;
        }
      }
    }

    throw new Error('Failed to connect to Ollama after maximum retries');
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private buildPrompt(
    messages: Array<{ 
      text: string; 
      user: string;
      username?: string;
      timestamp: string;
      isThreadReply?: boolean;
    }>,
    context?: SummarizeContext
  ): string {
    const messagesText = messages
      .map((msg) => {
        const date = new Date(parseFloat(msg.timestamp) * 1000).toISOString();
        const displayName = msg.username || msg.user;
        const prefix = msg.isThreadReply ? '  ↳ ' : '';  // Indent thread replies
        return `${prefix}[${date}] ${displayName}: ${msg.text}`;
      })
      .join('\n');

    // Use provided context or fall back to default prompt
    const defaultSystemPrompt = `You are a helpful assistant that summarizes conversations.
Please provide a concise summary of the following conversation, highlighting:
- Key topics discussed
- Important decisions or action items
- Any questions that need answers`;

    const systemPrompt = context?.systemPrompt || defaultSystemPrompt;
    const sourcePrompt = context?.sourcePrompt ? `\n\n${context.sourcePrompt}` : '';
    const interestPrompt = context?.interestPrompt ? `\n\n${context.interestPrompt}` : '';

    return `${systemPrompt}${sourcePrompt}${interestPrompt}

Note: Messages indented with "↳" are replies within conversation threads.

Conversation:
${messagesText}

Summary:`;
  }
}
