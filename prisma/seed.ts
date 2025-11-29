import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create default user profile
  const defaultUser = await prisma.userProfile.upsert({
    where: { username: 'default' },
    update: {},
    create: {
      username: 'default',
      email: process.env.ADMIN_EMAIL || 'admin@kirin.local',
      notifications: {
        email: true,
        slack: false,
      },
    },
  });

  console.log('✅ Created default user profile:', defaultUser.username);

  // Add default interests
  await prisma.interest.upsert({
    where: {
      userId_keyword: {
        userId: defaultUser.id,
        keyword: 'Helen Pumpkin Pie',
      },
    },
    update: {},
    create: {
      userId: defaultUser.id,
      keyword: 'Helen Pumpkin Pie',
      weight: 1.5,
    },
  });

  await prisma.interest.upsert({
    where: {
      userId_keyword: {
        userId: defaultUser.id,
        keyword: 'stuffing',
      },
    },
    update: {},
    create: {
      userId: defaultUser.id,
      keyword: 'stuffing',
      weight: 1.2,
    },
  });

  console.log('✅ Created default interests');

  // Create Slack collector config
  const slackCollector = await prisma.collector.upsert({
    where: { name: 'slack' },
    update: {},
    create: {
      name: 'slack',
      displayName: 'Slack Collector',
      enabled: true,
      schedulePattern: '*/30 * * * *', // Every 30 minutes
      concurrency: 1,
      rateLimitMax: 10,
      rateLimitMs: 60000,
      settings: {
        channelIds: process.env.SLACK_CHANNEL_IDS?.split(',') || [],
        lookbackHours: parseInt(process.env.SLACK_LOOKBACK_HOURS || '24', 10),
        token: process.env.SLACK_BOT_TOKEN || '',
      },
    },
  });

  console.log('✅ Created Slack collector:', slackCollector.displayName);

  // Create Signal collector config (disabled by default)
  const signalCollector = await prisma.collector.upsert({
    where: { name: 'signal' },
    update: {},
    create: {
      name: 'signal',
      displayName: 'Signal Collector',
      enabled: false,
      schedulePattern: '*/60 * * * *', // Every hour
      concurrency: 1,
      rateLimitMax: 5,
      rateLimitMs: 60000,
      settings: {
        phoneNumber: process.env.SIGNAL_PHONE_NUMBER || '',
        groupIds: [],
      },
    },
  });

  console.log('✅ Created Signal collector:', signalCollector.displayName);

  // Create Twitter collector config (disabled by default)
  const twitterCollector = await prisma.collector.upsert({
    where: { name: 'twitter' },
    update: {},
    create: {
      name: 'twitter',
      displayName: 'Twitter/X Collector',
      enabled: false,
      schedulePattern: '*/15 * * * *', // Every 15 minutes
      concurrency: 2,
      rateLimitMax: 15,
      rateLimitMs: 900000, // 15 minutes
      settings: {
        apiKey: process.env.TWITTER_API_KEY || '',
        apiSecret: process.env.TWITTER_API_SECRET || '',
        accessToken: process.env.TWITTER_ACCESS_TOKEN || '',
        accessTokenSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET || '',
        searchTerms: [],
      },
    },
  });

  console.log('✅ Created Twitter collector:', twitterCollector.displayName);

  // Create default processor config
  const processorConfig = await prisma.processorConfig.upsert({
    where: { name: 'default' },
    update: {},
    create: {
      name: 'default',
      ollamaModel: process.env.OLLAMA_MODEL || 'qwen2.5:32b',
      ollamaUrl: process.env.OLLAMA_BASE_URL || 'http://ollama:11434',
      temperature: 0.7,
      enabled: true,
      concurrency: 2,
      batchSize: 100,
      systemPrompt: `You are a helpful assistant that summarizes conversations. 
Please provide a concise summary highlighting:
- Key topics discussed
- Important decisions or action items
- Notable events or announcements
- Any questions that need answers
- The user is interested in "Helen Pumpkin Pie" and various stuffings.`,
      userPrompts: {
        slack: 'Focus on actionable items and technical discussions.',
        signal: 'Focus on personal and group conversations.',
        twitter: 'Focus on trending topics and public sentiment.',
      },
    },
  });

  console.log('✅ Created processor config:', processorConfig.name);

  // Create system config entries
  await prisma.systemConfig.upsert({
    where: { key: 'dashboard_port' },
    update: {},
    create: {
      key: 'dashboard_port',
      value: parseInt(process.env.DASHBOARD_PORT || '666', 10),
      description: 'Port for the web dashboard',
    },
  });

  await prisma.systemConfig.upsert({
    where: { key: 'log_level' },
    update: {},
    create: {
      key: 'log_level',
      value: process.env.LOG_LEVEL || 'info',
      description: 'Application logging level',
    },
  });

  await prisma.systemConfig.upsert({
    where: { key: 'output_dir' },
    update: {},
    create: {
      key: 'output_dir',
      value: process.env.OUTPUT_DIR || '/app/output',
      description: 'Directory for output files',
    },
  });

  console.log('✅ Created system config entries');

  console.log('🎉 Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

