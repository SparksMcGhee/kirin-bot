import { Worker, Job } from 'bullmq';
import { Logger } from '../utils/logger';
import { FilteredOutput } from '../queue/types';
import { FileOutput } from '../output/file-output';
import * as fs from 'fs/promises';
import * as path from 'path';

const logger = new Logger(process.env.LOG_LEVEL || 'info');

const redisConnection = {
  host: process.env.REDIS_HOST || 'redis',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
};

// Output storage worker
const outputWorker = new Worker<FilteredOutput, void>(
  'kirin-output',
  async (job: Job<FilteredOutput>) => {
    logger.info(`[Output Worker] Storing output from ${job.data.source}`);

    try {
      const outputDir = process.env.OUTPUT_DIR || '/app/output';
      
      // Write to file
      const fileOutput = new FileOutput(outputDir, logger);
      const filename = `${job.data.source}-${Date.now()}.txt`;
      await fileOutput.writeSummary(job.data.summary, filename);

      // Also maintain a "latest" file for each source
      const latestFilename = `${job.data.source}-latest.txt`;
      await fileOutput.writeSummary(job.data.summary, latestFilename);

      // Store metadata in JSON for dashboard
      const metadataPath = path.join(outputDir, `${job.data.source}-metadata.json`);
      await fs.writeFile(
        metadataPath,
        JSON.stringify({
          ...job.data,
          summary: job.data.summary.substring(0, 200) + '...', // Truncate for metadata
          processedAt: new Date().toISOString(),
        }, null, 2),
        'utf-8'
      );

      logger.info(`[Output Worker] Stored output: ${filename}`);

    } catch (error) {
      logger.error('[Output Worker] Error storing output:', error);
      throw error;
    }
  },
  {
    connection: redisConnection,
    concurrency: 5,
  }
);

// Event handlers
outputWorker.on('completed', (job) => {
  logger.info(`[Output Worker] Job ${job.id} completed`);
});

outputWorker.on('failed', (job, err) => {
  logger.error(`[Output Worker] Job ${job?.id} failed:`, err);
});

logger.info('[Output Worker] Started and waiting for jobs...');

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('[Output Worker] Shutting down...');
  await outputWorker.close();
  process.exit(0);
});

