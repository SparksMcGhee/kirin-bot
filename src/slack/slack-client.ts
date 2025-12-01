import { WebClient } from '@slack/web-api';
import { Logger } from '../utils/logger';

export interface SlackMessage {
  text: string;
  user: string;
  username?: string; // Resolved username
  timestamp: string;
  channel: string;
  threadTs?: string;
  isThreadReply?: boolean;
  replyCount?: number;
}

export class SlackClient {
  private client: WebClient;
  private logger: Logger;
  private userCache: Map<string, string> = new Map(); // userId -> username

  constructor(token: string, logger: Logger) {
    this.client = new WebClient(token);
    this.logger = logger;
  }

  /**
   * Resolve a user ID to a username (with caching)
   */
  private async resolveUsername(userId: string): Promise<string> {
    // Check cache first
    if (this.userCache.has(userId)) {
      return this.userCache.get(userId)!;
    }

    try {
      const result = await this.client.users.info({ user: userId });
      if (result.user && result.user.real_name) {
        const username = result.user.real_name as string;
        this.userCache.set(userId, username);
        return username;
      } else if (result.user && result.user.name) {
        const username = result.user.name as string;
        this.userCache.set(userId, username);
        return username;
      }
    } catch (error) {
      this.logger.debug(`Could not resolve user ${userId}:`, error);
    }

    // Fallback to user ID if resolution fails
    return userId;
  }

  /**
   * Fetch thread replies for a message
   */
  private async fetchThreadReplies(
    channelId: string,
    threadTs: string
  ): Promise<SlackMessage[]> {
    try {
      const result = await this.client.conversations.replies({
        channel: channelId,
        ts: threadTs,
        limit: 100,
      });

      if (!result.messages || result.messages.length <= 1) {
        // No replies (first message is the parent)
        return [];
      }

      const replies: SlackMessage[] = [];
      // Skip first message (it's the parent)
      for (let i = 1; i < result.messages.length; i++) {
        const message = result.messages[i];
        if (message.text && message.ts && message.user) {
          const username = await this.resolveUsername(message.user);
          replies.push({
            text: message.text,
            user: message.user,
            username: username,
            timestamp: message.ts,
            channel: channelId,
            threadTs: threadTs,
            isThreadReply: true,
          });
        }
      }

      return replies;
    } catch (error) {
      this.logger.debug(`Error fetching thread replies for ${threadTs}:`, error);
      return [];
    }
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
            // Resolve username
            const username = await this.resolveUsername(message.user);
            
            const slackMessage: SlackMessage = {
              text: message.text,
              user: message.user,
              username: username,
              timestamp: message.ts,
              channel: channelId,
              threadTs: message.thread_ts,
              isThreadReply: false,
              replyCount: message.reply_count ? (message.reply_count as number) : 0,
            };

            messages.push(slackMessage);

            // If this message has replies, fetch them
            if (message.reply_count && message.reply_count > 0 && message.ts) {
              this.logger.debug(`Fetching ${message.reply_count} thread replies for message ${message.ts}`);
              const replies = await this.fetchThreadReplies(channelId, message.ts);
              messages.push(...replies);
              this.logger.debug(`Fetched ${replies.length} thread replies`);
            }
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

    this.logger.info(`Total messages fetched (including threads): ${messages.length}`);

    return messages;
  }
}

