const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { Queue } = require('bullmq');
const { PrismaClient } = require('@prisma/client');

const app = express();
const port = parseInt(process.env.DASHBOARD_PORT || '666', 10);
const prisma = new PrismaClient();

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

const redisConnection = {
  host: process.env.REDIS_HOST || 'redis',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
};

// Create queue clients
const queues = {
  'slack-collector': new Queue('slack-collector', { connection: redisConnection }),
  'signal-collector': new Queue('signal-collector', { connection: redisConnection }),
  'twitter-collector': new Queue('twitter-collector', { connection: redisConnection }),
  'kirin-processor': new Queue('kirin-processor', { connection: redisConnection }),
  'kirin-output': new Queue('kirin-output', { connection: redisConnection }),
};

// ============================================
// UI ROUTES
// ============================================

// Serve the web interface
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

// ============================================
// API ROUTES - Health
// ============================================

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    services: {
      redis: 'connected',
      postgres: 'connected',
      dashboard: 'running',
    }
  });
});

// ============================================
// API ROUTES - Queues
// ============================================

app.get('/api/queues', async (req, res) => {
  try {
    const stats = await Promise.all(
      Object.entries(queues).map(async ([name, queue]) => {
        const [waiting, active, completed, failed, delayed] = await Promise.all([
          queue.getWaitingCount(),
          queue.getActiveCount(),
          queue.getCompletedCount(),
          queue.getFailedCount(),
          queue.getDelayedCount(),
        ]);

        return {
          name,
          waiting,
          active,
          completed,
          failed,
          delayed,
          total: waiting + active + completed + failed + delayed,
        };
      })
    );

    res.json({ queues: stats, timestamp: new Date().toISOString() });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// API ROUTES - Collectors
// ============================================

// Get all collectors
app.get('/api/collectors', async (req, res) => {
  try {
    const collectors = await prisma.collector.findMany({
      orderBy: { name: 'asc' },
    });
    res.json(collectors);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get specific collector
app.get('/api/collectors/:name', async (req, res) => {
  try {
    const collector = await prisma.collector.findUnique({
      where: { name: req.params.name },
      include: {
        jobs: {
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    
    if (!collector) {
      return res.status(404).json({ error: 'Collector not found' });
    }
    
    res.json(collector);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update collector config
app.put('/api/collectors/:name', async (req, res) => {
  try {
    const { schedulePattern, concurrency, rateLimitMax, rateLimitMs, settings } = req.body;
    
    const updated = await prisma.collector.update({
      where: { name: req.params.name },
      data: {
        ...(schedulePattern && { schedulePattern }),
        ...(concurrency && { concurrency }),
        ...(rateLimitMax && { rateLimitMax }),
        ...(rateLimitMs && { rateLimitMs }),
        ...(settings && { settings }),
      },
    });
    
    // Log to audit log
    await prisma.auditLog.create({
      data: {
        entity: 'collector',
        entityId: updated.id,
        action: 'UPDATE',
        changes: req.body,
        ipAddress: req.ip,
      },
    });
    
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Toggle collector enabled/disabled
app.post('/api/collectors/:name/toggle', async (req, res) => {
  try {
    const collector = await prisma.collector.findUnique({
      where: { name: req.params.name },
    });
    
    if (!collector) {
      return res.status(404).json({ error: 'Collector not found' });
    }
    
    const updated = await prisma.collector.update({
      where: { name: req.params.name },
      data: { enabled: !collector.enabled },
    });
    
    // Log to audit log
    await prisma.auditLog.create({
      data: {
        entity: 'collector',
        entityId: updated.id,
        action: 'UPDATE',
        changes: { enabled: updated.enabled },
        ipAddress: req.ip,
      },
    });
    
    res.json({ message: `Collector ${updated.enabled ? 'enabled' : 'disabled'}`, collector: updated });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Trigger collector to run immediately
app.post('/api/collectors/:name/trigger', async (req, res) => {
  try {
    const collector = await prisma.collector.findUnique({
      where: { name: req.params.name },
    });
    
    if (!collector) {
      return res.status(404).json({ error: 'Collector not found' });
    }
    
    if (!collector.enabled) {
      return res.status(400).json({ error: 'Collector is disabled' });
    }
    
    // Get the appropriate queue
    const queueName = `${req.params.name}-collector`;
    const queue = queues[queueName];
    
    if (!queue) {
      return res.status(404).json({ error: 'Queue not found' });
    }
    
    // Parse settings
    const settings = collector.settings;
    const now = Date.now();
    const lookbackHours = settings.lookbackHours || 24;
    const oldestTimestamp = (now - lookbackHours * 60 * 60 * 1000) / 1000;
    
    // Add job to queue
    let jobData = {};
    if (req.params.name === 'slack') {
      jobData = {
        channelIds: settings.channelIds || [],
        latestTimestamp: (now / 1000).toString(),
        oldestTimestamp: oldestTimestamp.toString(),
        lookbackHours: lookbackHours,
      };
    }
    
    const job = await queue.add(`manual-trigger-${Date.now()}`, jobData, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000,
      },
    });
    
    res.json({ 
      message: `${collector.displayName} triggered successfully`,
      jobId: job.id 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// API ROUTES - Processor Config
// ============================================

app.get('/api/processor/config', async (req, res) => {
  try {
    const config = await prisma.processorConfig.findUnique({
      where: { name: 'default' },
    });
    res.json(config);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/processor/config', async (req, res) => {
  try {
    const { ollamaModel, temperature, systemPrompt, concurrency, batchSize } = req.body;
    
    const updated = await prisma.processorConfig.update({
      where: { name: 'default' },
      data: {
        ...(ollamaModel && { ollamaModel }),
        ...(temperature !== undefined && { temperature }),
        ...(systemPrompt && { systemPrompt }),
        ...(concurrency && { concurrency }),
        ...(batchSize && { batchSize }),
      },
    });
    
    // Log to audit log
    await prisma.auditLog.create({
      data: {
        entity: 'processor_config',
        entityId: updated.id,
        action: 'UPDATE',
        changes: req.body,
        ipAddress: req.ip,
      },
    });
    
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// API ROUTES - Summaries
// ============================================

app.get('/api/summaries', async (req, res) => {
  try {
    const { source, limit = 20, offset = 0 } = req.query;
    
    const summaries = await prisma.summary.findMany({
      where: source ? { source } : undefined,
      take: parseInt(limit),
      skip: parseInt(offset),
      orderBy: { generatedAt: 'desc' },
      include: {
        feedbacks: true,
      },
    });
    
    res.json(summaries);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// API ROUTES - Interests
// ============================================

app.get('/api/interests', async (req, res) => {
  try {
    const user = await prisma.userProfile.findUnique({
      where: { username: 'default' },
      include: {
        interests: {
          where: { isActive: true },
          orderBy: { weight: 'desc' },
        },
      },
    });
    
    res.json(user?.interests || []);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/interests', async (req, res) => {
  try {
    const { keyword, weight = 1.0 } = req.body;
    
    if (!keyword) {
      return res.status(400).json({ error: 'keyword is required' });
    }
    
    const user = await prisma.userProfile.findUnique({
      where: { username: 'default' },
    });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const interest = await prisma.interest.create({
      data: {
        userId: user.id,
        keyword,
        weight,
      },
    });
    
    res.json(interest);
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Interest already exists' });
    }
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/interests/:id', async (req, res) => {
  try {
    await prisma.interest.delete({
      where: { id: req.params.id },
    });
    
    res.json({ message: 'Interest deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// API ROUTES - Audit Log
// ============================================

app.get('/api/audit', async (req, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query;
    
    const logs = await prisma.auditLog.findMany({
      take: parseInt(limit),
      skip: parseInt(offset),
      orderBy: { createdAt: 'desc' },
    });
    
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// START SERVER
// ============================================

app.listen(port, '0.0.0.0', () => {
  console.log(`🦄 Kirin Dashboard running on port ${port}`);
  console.log(`📊 Queue Monitor: http://localhost:${port}/api/queues`);
  console.log(`🔧 Collectors API: http://localhost:${port}/api/collectors`);
  console.log(`⚙️ Processor API: http://localhost:${port}/api/processor/config`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('🛑 Shutting down dashboard...');
  await prisma.$disconnect();
  process.exit(0);
});
