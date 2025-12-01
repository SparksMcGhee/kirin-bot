import { Worker, Job } from 'bullmq';
import { Summarizer } from '../summarization/summarizer';
import { Logger } from '../utils/logger';
import { ProcessingJobData, FilteredOutput } from '../queue/types';
import { outputQueue } from '../queue/queues';
import { db } from '../utils/prisma';

const logger = new Logger(process.env.LOG_LEVEL || 'info');

const redisConnection = {
  host: process.env.REDIS_HOST || 'redis',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
};

// Processing worker
const processorWorker = new Worker<ProcessingJobData, FilteredOutput>(
  'kirin-processor',
  async (job: Job<ProcessingJobData>) => {
    logger.info(`[Processor] Processing ${job.data.messages.length} messages from ${job.data.source}`);

    try {
      const ollamaUrl = process.env.OLLAMA_BASE_URL || 'http://ollama:11434';
      const ollamaModel = process.env.OLLAMA_MODEL || 'llama3.1:8b';

      await job.updateProgress(10);

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

      // Generate summary
      const summarizer = new Summarizer(ollamaUrl, ollamaModel, logger);
      const summary = await summarizer.summarize(slackMessages);

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

