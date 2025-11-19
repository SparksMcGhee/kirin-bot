import { LLMClient } from '../models/llm-client';
import { OllamaClient } from '../models/ollama-client';
import { SlackMessage } from '../slack/slack-client';
import { Logger } from '../utils/logger';

export class Summarizer {
  private llmClient: LLMClient;
  private logger: Logger;

  constructor(ollamaUrl: string, ollamaModel: string, logger: Logger) {
    this.llmClient = new OllamaClient(ollamaUrl, ollamaModel, logger);
    this.logger = logger;
  }

  async summarize(messages: SlackMessage[]): Promise<string> {
    if (messages.length === 0) {
      throw new Error('Cannot summarize empty message list');
    }

    this.logger.debug(`Summarizing ${messages.length} messages`);

    // Convert SlackMessage format to format expected by LLM client
    const formattedMessages = messages.map((msg) => ({
      text: msg.text,
      user: msg.user,
      timestamp: msg.timestamp,
    }));

    const summary = await this.llmClient.summarize(formattedMessages);
    return summary;
  }
}

