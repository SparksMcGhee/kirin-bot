import { Worker, Job } from 'bullmq';
import { SlackClient } from '../slack/slack-client';
import { Logger } from '../utils/logger';
import { CollectorJobData, SourceMessage } from '../queue/types';
import { processingQueue } from '../queue/queues';
import { db } from '../utils/prisma';

const logger = new Logger(process.env.LOG_LEVEL || 'info');

const redisConnection = {
  host: process.env.REDIS_HOST || 'redis',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
};

// Slack collector worker
const slackWorker = new Worker<CollectorJobData, SourceMessage[]>(
  'slack-collector',
  async (job: Job<CollectorJobData>) => {
    logger.info(`[Slack Worker] Processing job ${job.id}`);
    
    try {
      // Load configuration from database
      const collectorConfig = await db.collector.findUnique({
        where: { name: 'slack' },
      });

      if (!collectorConfig) {
        throw new Error('Slack collector configuration not found in database');
      }

      if (!collectorConfig.enabled) {
        logger.info('[Slack Worker] Collector is disabled, skipping job');
        return [];
      }

      // Parse settings from database
      const settings = collectorConfig.settings as {
        channelIds: string[];
        lookbackHours: number;
        token: string;
      };

      const token = settings.token || process.env.SLACK_BOT_TOKEN;
      if (!token) {
        throw new Error('SLACK_BOT_TOKEN not found in config or environment');
      }

      const channelIds = settings.channelIds || process.env.SLACK_CHANNEL_IDS?.split(',') || [];
      if (channelIds.length === 0) {
        throw new Error('No Slack channels configured');
      }

      const lookbackHours = job.data.lookbackHours || 
        settings.lookbackHours || 
        parseInt(process.env.SLACK_LOOKBACK_HOURS || '24', 10);

      logger.info(`[Slack Worker] Fetching from ${channelIds.length} channels, ${lookbackHours}h lookback`);
      logger.debug(`[Slack Worker] Config from database: enabled=${collectorConfig.enabled}, schedule=${collectorConfig.schedulePattern}`);
      
      await job.updateProgress(10);

      // Create collector job record in database
      const dbJob = await db.collectorJob.create({
        data: {
          collectorId: collectorConfig.id,
          status: 'ACTIVE',
          data: job.data as any, // Cast to any for Prisma JSON type
          startedAt: new Date(),
        },
      });

      try {
        // Fetch messages
        const slackClient = new SlackClient(token, logger);
        const messages = await slackClient.fetchChannelMessages(channelIds, lookbackHours);

        await job.updateProgress(50);

        if (messages.length === 0) {
          logger.warn('[Slack Worker] No messages found');
          
          // Update database job as completed
          await db.collectorJob.update({
            where: { id: dbJob.id },
            data: {
              status: 'COMPLETED',
              completedAt: new Date(),
              result: { messageCount: 0 },
            },
          });
          
          return [];
        }

        logger.info(`[Slack Worker] Fetched ${messages.length} messages`);

        // Convert to SourceMessage format
        const sourceMessages: SourceMessage[] = messages.map((msg) => ({
          id: `slack-${msg.channel}-${msg.timestamp}`,
          source: 'slack' as const,
          text: msg.text,
          author: msg.username || msg.user, // Use resolved username if available
          timestamp: msg.timestamp,
          channelId: msg.channel,
          metadata: {
            threadTs: msg.threadTs,
            username: msg.username, // Store username in metadata
            isThreadReply: msg.isThreadReply,
            replyCount: msg.replyCount,
          },
        }));

        await job.updateProgress(75);

        // Queue for processing
        await processingQueue.add('process-slack-messages', {
          messages: sourceMessages,
          userId: 'default', // TODO: Multi-user support
          source: 'slack',
        });

        logger.info(`[Slack Worker] Queued ${sourceMessages.length} messages for processing`);
        
        // Update database job as completed
        await db.collectorJob.update({
          where: { id: dbJob.id },
          data: {
            status: 'COMPLETED',
            completedAt: new Date(),
            result: { messageCount: sourceMessages.length },
          },
        });
        
        await job.updateProgress(100);
        return sourceMessages;
        
      } catch (error) {
        // Update database job as failed
        await db.collectorJob.update({
          where: { id: dbJob.id },
          data: {
            status: 'FAILED',
            failedAt: new Date(),
            error: error instanceof Error ? error.message : String(error),
            attempts: dbJob.attempts + 1,
          },
        });
        throw error;
      }

    } catch (error) {
      logger.error('[Slack Worker] Error processing job:', error);
      throw error;
    }
  },
  {
    connection: redisConnection,
    concurrency: 1, // Process one collection at a time
    limiter: {
      max: 10, // Max 10 jobs
      duration: 60000, // per minute (respect Slack rate limits)
    },
  }
);

// Event handlers
slackWorker.on('completed', (job) => {
  logger.info(`[Slack Worker] Job ${job.id} completed`);
});

slackWorker.on('failed', (job, err) => {
  logger.error(`[Slack Worker] Job ${job?.id} failed:`, err);
});

slackWorker.on('error', (err) => {
  logger.error('[Slack Worker] Worker error:', err);
});

logger.info('[Slack Worker] Started and waiting for jobs...');

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('[Slack Worker] Shutting down...');
  await slackWorker.close();
  process.exit(0);
});

