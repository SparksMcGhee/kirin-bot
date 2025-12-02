import { Worker, Job } from 'bullmq';
import { Summarizer } from '../summarization/summarizer';
import { SummarizeContext } from '../models/llm-client';
import { Logger } from '../utils/logger';
import { ProcessingJobData, FilteredOutput } from '../queue/types';
import { outputQueue } from '../queue/queues';
import { db } from '../utils/prisma';

const logger = new Logger(process.env.LOG_LEVEL || 'info');

const redisConnection = {
  host: process.env.REDIS_HOST || 'redis',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
};

/**
 * Build interest prompt from user's active interests
 */
function buildInterestPrompt(interests: Array<{ keyword: string; weight: number }>): string {
  if (interests.length === 0) {
    return '';
  }
  
  const interestLines = interests.map(i => `- ${i.keyword} (priority: ${i.weight})`);
  return `The user is especially interested in the following topics. Please highlight any content related to these interests:\n${interestLines.join('\n')}`;
}

// Processing worker
const processorWorker = new Worker<ProcessingJobData, FilteredOutput>(
  'kirin-processor',
  async (job: Job<ProcessingJobData>) => {
    logger.info(`[Processor] Processing ${job.data.messages.length} messages from ${job.data.source}`);

    try {
      await job.updateProgress(5);

      // Load processor configuration from database
      const processorConfig = await db.processorConfig.findUnique({
        where: { name: 'default' },
      });

      // Use config from DB or fall back to environment variables
      const ollamaUrl = processorConfig?.ollamaUrl || process.env.OLLAMA_BASE_URL || 'http://ollama:11434';
      const ollamaModel = processorConfig?.ollamaModel || process.env.OLLAMA_MODEL || 'llama3.1:8b';

      logger.info(`[Processor] Using model: ${ollamaModel} at ${ollamaUrl}`);

      await job.updateProgress(10);

      // Load user profile and interests from database
      // Note: job.data.userId is currently the username ('default'), not the UUID
      // We look up by username for now until the slack-worker is updated to pass the UUID
      const userProfile = await db.userProfile.findUnique({
        where: { username: job.data.userId },
        include: {
          interests: {
            where: { isActive: true },
            orderBy: { weight: 'desc' },
          },
        },
      });

      // Build the summarization context from DB config and user interests
      const interestPrompt = userProfile?.interests 
        ? buildInterestPrompt(userProfile.interests)
        : '';

      // Get source-specific prompt if available
      const userPrompts = processorConfig?.userPrompts as Record<string, string> | null;
      const sourcePrompt = userPrompts?.[job.data.source] || '';

      const summarizeContext: SummarizeContext = {
        systemPrompt: processorConfig?.systemPrompt || '',
        sourcePrompt,
        interestPrompt,
      };

      if (userProfile?.interests?.length) {
        logger.info(`[Processor] Loaded ${userProfile.interests.length} interests for user ${job.data.userId}`);
      } else {
        logger.info(`[Processor] No interests found for user ${job.data.userId}`);
      }

      await job.updateProgress(15);

      // Convert messages to format expected by Summarizer
      const slackMessages = job.data.messages.map((msg) => ({
        text: msg.text,
        user: msg.author,
        username: (msg.metadata as any)?.username, // Pass through resolved username
        timestamp: msg.timestamp,
        channel: msg.channelId,
        isThreadReply: (msg.metadata as any)?.isThreadReply,
      }));

      await job.updateProgress(30);

      // Generate summary with context (interests + system prompt from DB)
      const summarizer = new Summarizer(ollamaUrl, ollamaModel, logger);
      const summary = await summarizer.summarize(slackMessages, summarizeContext);

      await job.updateProgress(80);

      // Create filtered output
      const output: FilteredOutput = {
        messageIds: job.data.messages.map((m) => m.id),
        summary,
        relevanceScore: 0.8, // TODO: Implement actual relevance scoring
        topics: [], // TODO: Extract topics with LangChain
        source: job.data.source,
        timestamp: new Date().toISOString(),
        userId: job.data.userId,
      };

      // Save summary to database
      const summaryRecord = await db.summary.create({
        data: {
          source: job.data.source,
          summary: summary,
          rawMessages: job.data.messages as any, // Cast to any for JSON compatibility
          messageIds: job.data.messages.map(msg => msg.id),
          userId: job.data.userId,
          topics: [], // TODO: Implement topic extraction
          relevanceScore: 0.8, // TODO: Implement relevance scoring
        },
      });

      logger.info(`[Processor] Saved summary to database with ID: ${summaryRecord.id}`);

      // Queue output for file storage
      await outputQueue.add('store-output', {
        ...output,
        summaryId: summaryRecord.id,
      });

      await job.updateProgress(100);
      logger.info(`[Processor] Completed processing for ${job.data.source}`);
      
      return output;

    } catch (error) {
      logger.error('[Processor] Error processing job:', error);
      throw error;
    }
  },
  {
    connection: redisConnection,
    concurrency: 2, // Process 2 jobs in parallel (Ollama can handle it)
  }
);

// Event handlers
processorWorker.on('completed', (job) => {
  logger.info(`[Processor] Job ${job.id} completed`);
});

processorWorker.on('failed', (job, err) => {
  logger.error(`[Processor] Job ${job?.id} failed:`, err);
});

logger.info('[Processor] Started and waiting for jobs...');

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('[Processor] Shutting down...');
  await processorWorker.close();
  process.exit(0);
});

