import { Queue, QueueOptions } from 'bullmq';

const redisConnection = {
  host: process.env.REDIS_HOST || 'redis',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
};

const defaultJobOptions: QueueOptions['defaultJobOptions'] = {
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 5000,
  },
  removeOnComplete: {
    count: 100,
    age: 24 * 3600, // 24 hours
  },
  removeOnFail: {
    count: 1000,
    age: 7 * 24 * 3600, // 7 days
  },
};

// Collector Queues
export const slackCollectorQueue = new Queue('slack-collector', {
  connection: redisConnection,
  defaultJobOptions,
});

export const signalCollectorQueue = new Queue('signal-collector', {
  connection: redisConnection,
  defaultJobOptions,
});

export const twitterCollectorQueue = new Queue('twitter-collector', {
  connection: redisConnection,
  defaultJobOptions,
});

// Processing Queue (for LLM analysis and filtering)
export const processingQueue = new Queue('kirin-processor', {
  connection: redisConnection,
  defaultJobOptions: {
    ...defaultJobOptions,
    priority: 1, // Higher priority than collectors
  },
});

// Output Queue (for storing filtered results)
export const outputQueue = new Queue('kirin-output', {
  connection: redisConnection,
  defaultJobOptions: {
    ...defaultJobOptions,
    removeOnComplete: {
      count: 1000,
      age: 30 * 24 * 3600, // Keep for 30 days
    },
  },
});

export const allQueues = [
  slackCollectorQueue,
  signalCollectorQueue,
  twitterCollectorQueue,
  processingQueue,
  outputQueue,
];

