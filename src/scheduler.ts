import { slackCollectorQueue } from './queue/queues';
import { Logger } from './utils/logger';

const logger = new Logger(process.env.LOG_LEVEL || 'info');

/**
 * Scheduler: Adds collection jobs to queues on a schedule
 * This runs periodically to trigger collectors
 */

async function scheduleCollections() {
  logger.info('[Scheduler] Scheduling collection jobs');

  try {
    // Schedule Slack collection
    if (process.env.SLACK_BOT_TOKEN && process.env.SLACK_CHANNEL_IDS) {
      const lookbackHours = parseInt(process.env.SLACK_LOOKBACK_HOURS || '24', 10);
      
      await slackCollectorQueue.add(
        'collect-slack',
        {
          source: 'slack',
          lookbackHours,
          scheduledAt: new Date().toISOString(),
        },
        {
          repeat: {
            pattern: '*/30 * * * *', // Every 30 minutes
          },
          jobId: 'slack-collection', // Single recurring job
        }
      );

      logger.info('[Scheduler] Slack collection scheduled (every 30 minutes)');
    }

    // TODO: Add Signal, Twitter, RSS schedulers here

  } catch (error) {
    logger.error('[Scheduler] Error scheduling jobs:', error);
    throw error;
  }
}

// Run scheduler
scheduleCollections()
  .then(() => {
    logger.info('[Scheduler] All collections scheduled successfully');
  })
  .catch((error) => {
    logger.error('[Scheduler] Scheduler failed:', error);
    process.exit(1);
  });

