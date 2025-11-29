import { WebClient } from '@slack/web-api';
import { Logger } from '../utils/logger';

export interface SlackMessage {
  text: string;
  user: string;
  timestamp: string;
  channel: string;
  threadTs?: string;
}

export class SlackClient {
  private client: WebClient;
  private logger: Logger;

  constructor(token: string, logger: Logger) {
    this.client = new WebClient(token);
    this.logger = logger;
  }

  async fetchChannelMessages(
    channelIds: string[],
    lookbackHours: number
  ): Promise<SlackMessage[]> {
    const messages: SlackMessage[] = [];
    const lookbackTime = Date.now() / 1000 - lookbackHours * 3600;

    for (const channelId of channelIds) {
      try {
        this.logger.debug(`Fetching messages from channel: ${channelId}`);

        const result = await this.client.conversations.history({
          channel: channelId,
          oldest: lookbackTime.toString(),
          limit: 1000,
        });

        if (!result.messages || result.messages.length === 0) {
          this.logger.debug(`No messages found in channel ${channelId}`);
          continue;
        }

        for (const message of result.messages) {
          if (message.text && message.ts && message.user) {
            messages.push({
              text: message.text,
              user: message.user,
              timestamp: message.ts,
              channel: channelId,
              threadTs: message.thread_ts,
            });
          }
        }

        this.logger.debug(`Fetched ${result.messages.length} messages from channel ${channelId}`);
      } catch (error) {
        this.logger.error(`Error fetching messages from channel ${channelId}:`, error);
        throw error;
      }
    }

    // Sort messages by timestamp (oldest first)
    messages.sort((a, b) => parseFloat(a.timestamp) - parseFloat(b.timestamp));

    return messages;
  }
}

