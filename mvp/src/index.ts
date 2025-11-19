#!/usr/bin/env node

import dotenv from 'dotenv';
import { SlackClient } from './slack/slack-client';
import { Summarizer } from './summarization/summarizer';
import { FileOutput } from './output/file-output';
import { Logger } from './utils/logger';

// Load environment variables
dotenv.config();

const logger = new Logger(process.env.LOG_LEVEL || 'info');

async function main(): Promise<void> {
  try {
    logger.info('Starting Kiran MVP - Slack Summarization');

    // Validate required environment variables
    const slackToken = process.env.SLACK_BOT_TOKEN;
    const channelIds = process.env.SLACK_CHANNEL_IDS?.split(',') || [];
    const lookbackHours = parseInt(process.env.SLACK_LOOKBACK_HOURS || '24', 10);
    const ollamaUrl = process.env.OLLAMA_BASE_URL || 'http://ollama:11434';
    const ollamaModel = process.env.OLLAMA_MODEL || 'llama3.2:1b';
    const outputDir = process.env.OUTPUT_DIR || '/app/output';
    const outputFilename = process.env.OUTPUT_FILENAME || 'slack-summary.txt';

    if (!slackToken) {
      throw new Error('SLACK_BOT_TOKEN environment variable is required');
    }

    if (channelIds.length === 0) {
      throw new Error('SLACK_CHANNEL_IDS environment variable is required');
    }

    logger.info(`Fetching messages from ${channelIds.length} channel(s)`);
    logger.info(`Lookback period: ${lookbackHours} hours`);

    // Fetch messages from Slack
    const slackClient = new SlackClient(slackToken, logger);
    const messages = await slackClient.fetchChannelMessages(channelIds, lookbackHours);

    if (messages.length === 0) {
      logger.warn('No messages found in the specified time period');
      process.exit(0);
    }

    logger.info(`Fetched ${messages.length} messages`);

    // Generate summary using Ollama
    logger.info(`Generating summary using model: ${ollamaModel}`);
    const summarizer = new Summarizer(ollamaUrl, ollamaModel, logger);
    const summary = await summarizer.summarize(messages);

    // Write summary to file
    logger.info(`Writing summary to ${outputDir}/${outputFilename}`);
    const fileOutput = new FileOutput(outputDir, logger);
    await fileOutput.writeSummary(summary, outputFilename);

    logger.info('Summary generation completed successfully');
    process.exit(0);
  } catch (error) {
    logger.error('Error during summary generation:', error);
    process.exit(1);
  }
}

// Run the application
main();

