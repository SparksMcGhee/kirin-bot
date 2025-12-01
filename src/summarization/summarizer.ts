import { OllamaClient } from '../models/ollama-client';
import { Logger } from '../utils/logger';

interface Message {
  text: string;
  user: string;
  username?: string;
  timestamp: string;
  channel?: string;
  threadTs?: string;
  isThreadReply?: boolean;
}

export class Summarizer {
  private llmClient: OllamaClient;
  private logger: Logger;

  constructor(ollamaUrl: string, model: string, logger: Logger) {
    this.llmClient = new OllamaClient(ollamaUrl, model, logger);
    this.logger = logger;
  }

  async summarize(messages: Message[]): Promise<string> {
    this.logger.info(`Summarizing ${messages.length} messages`);

    if (messages.length === 0) {
      throw new Error('No messages to summarize');
    }

    try {
      // Use Ollama directly for now
      // TODO: Implement LangChain.js for advanced RAG and prompt management
      const summary = await this.llmClient.summarize(messages);
      return summary;
    } catch (error) {
      this.logger.error('Error generating summary:', error);
      throw error;
    }
  }
}
