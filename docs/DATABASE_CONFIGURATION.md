# 🗄️ Kirin Database Configuration System

## Overview

Kirin now uses PostgreSQL + Prisma to store and manage all configuration settings, making them editable via the web dashboard without redeployment.

## What's Stored in the Database

### 1. **Collector Configurations**
- Slack, Signal, Twitter collector settings
- Enable/disable status
- Schedule patterns (cron)
- Rate limits and concurrency
- Source-specific settings (tokens, channel IDs, etc.)

### 2. **Processor Configuration**
- LLM model selection
- Ollama URL
- Temperature and other parameters
- System prompts (customizable per source)
- Batch sizes and concurrency

### 3. **User Preferences**
- User interests and keywords
- Interest weights for relevance scoring
- Notification preferences

### 4. **Content & Summaries**
- Generated summaries with metadata
- Source messages (JSON)
- Relevance scores and extracted topics
- User feedback (relevant/irrelevant/maybe)

### 5. **Job History**
- Collector job records
- Job status tracking
- Success/failure logs
- Performance metrics

### 6. **System Configuration**
- Dashboard port
- Log levels
- Output directories
- Other system-wide settings

### 7. **Audit Log**
- All configuration changes
- Who made the change
- When it was made
- What was changed

## Database Schema Management

### Prisma Schema Location
```
prisma/
├── schema.prisma          # Main schema definition
├── migrations/            # Migration history (git-tracked)
│   └── 00000000000000_init/
│       └── migration.sql
└── seed.ts               # Initial data seeding
```

### Version Control

**✅ Source Controlled:**
- `prisma/schema.prisma` - Single source of truth
- `prisma/migrations/` - All migration files
- `prisma/seed.ts` - Seed data script

**❌ NOT Source Controlled:**
- `node_modules/@prisma/client/` - Generated code
- Database data itself

### Creating Migrations

```bash
# After changing schema.prisma
npm run prisma:migrate -- --name add_new_field

# This creates:
# - New migration file in prisma/migrations/
# - Updates Prisma Client types
# - Applies migration to database
```

### Deployment Process

The `db-init` service automatically:
1. Waits for PostgreSQL to be ready
2. Runs `prisma migrate deploy` (applies all migrations)
3. Runs `prisma/seed.ts` (creates initial data)
4. Exits successfully

Other services wait for `db-init` to complete before starting.

## API Endpoints

### Collectors Management

```bash
# List all collectors
GET /api/collectors

# Get specific collector
GET /api/collectors/slack

# Update collector config
PUT /api/collectors/slack
{
  "schedulePattern": "*/15 * * * *",
  "settings": {
    "channelIds": ["C123", "C456"],
    "lookbackHours": 48
  }
}

# Toggle enabled/disabled
POST /api/collectors/slack/toggle
```

### Processor Configuration

```bash
# Get processor config
GET /api/processor/config

# Update processor config
PUT /api/processor/config
{
  "ollamaModel": "qwen2.5:32b",
  "temperature": 0.8,
  "systemPrompt": "You are a helpful assistant..."
}
```

### User Interests

```bash
# List interests
GET /api/interests

# Add new interest
POST /api/interests
{
  "keyword": "machine learning",
  "weight": 1.5
}

# Delete interest
DELETE /api/interests/:id
```

### Summaries

```bash
# List summaries
GET /api/summaries?source=slack&limit=20&offset=0

# Get specific summary
GET /api/summaries/:id
```

### Audit Log

```bash
# View recent changes
GET /api/audit?limit=50&offset=0
```

## Example Usage

### Update Slack Schedule via API

```bash
# Change to run every 15 minutes instead of 30
curl -X PUT http://localhost:666/api/collectors/slack \
  -H "Content-Type: application/json" \
  -d '{
    "schedulePattern": "*/15 * * * *"
  }'
```

### Change LLM Model

```bash
# Switch to llama3.1:70b
curl -X PUT http://localhost:666/api/processor/config \
  -H "Content-Type: application/json" \
  -d '{
    "ollamaModel": "llama3.1:70b",
    "temperature": 0.7
  }'
```

### Disable a Collector

```bash
# Temporarily disable Twitter collector
curl -X POST http://localhost:666/api/collectors/twitter/toggle
```

### Add User Interest

```bash
# Add new keyword to filter for
curl -X POST http://localhost:666/api/interests \
  -H "Content-Type: application/json" \
  -d '{
    "keyword": "artificial intelligence",
    "weight": 1.3
  }'
```

## Worker Integration

Workers now load configuration from the database:

```typescript
// In slack-worker.ts
const collectorConfig = await db.collector.findUnique({
  where: { name: 'slack' }
});

if (!collectorConfig.enabled) {
  logger.info('Collector is disabled');
  return;
}

const settings = collectorConfig.settings as SlackSettings;
// Use settings.channelIds, settings.lookbackHours, etc.
```

## Benefits

### ✅ **No Redeployment Required**
- Change settings via API
- Workers pick up changes on next job
- Restart workers to apply immediately

### ✅ **Audit Trail**
- All changes logged
- Who, what, when tracked
- Easy to revert if needed

### ✅ **Multi-Environment**
- Same codebase
- Different configs per environment
- Environment variables for secrets only

### ✅ **Type Safety**
- Prisma generates TypeScript types
- Compile-time checking
- IDE autocomplete

### ✅ **Version Control**
- Schema changes tracked in git
- Migrations are reviewable
- Rollback capability

## Environment Variables

### Required for Database
```bash
# PostgreSQL connection
DATABASE_URL=postgresql://kirin:password@postgres:5432/kirin
POSTGRES_USER=kirin
POSTGRES_PASSWORD=kirin_dev_password
POSTGRES_DB=kirin

# Initial seed data (optional, can be configured via API later)
SLACK_BOT_TOKEN=xoxb-your-token
SLACK_CHANNEL_IDS=C123,C456
SLACK_LOOKBACK_HOURS=24
OLLAMA_MODEL=qwen2.5:32b
DASHBOARD_PORT=666
```

### Secrets Management

**Store in Database:**
- Collector schedules
- Rate limits
- Feature flags
- User preferences

**Keep in Environment Variables:**
- API tokens/secrets
- Database credentials
- Service URLs

Secrets can still be loaded from environment variables as fallbacks, but the database is the primary source for configuration.

## Migration Strategy

### From Environment Variables → Database

1. **Initial Deployment**: Seed script reads env vars and creates DB records
2. **Future Deployments**: DB settings take precedence
3. **Env Vars**: Used as fallbacks only

### Adding New Settings

1. Update `prisma/schema.prisma`
2. Run `npm run prisma:migrate -- --name add_new_setting`
3. Update seed script if needed
4. Update workers to read new setting
5. Update API endpoints to expose new setting
6. Deploy

## Troubleshooting

### Database Not Initialized

```bash
# Check db-init logs
docker logs kirin-db-init

# Manually run migrations
docker exec -it kirin-db-init sh
npx prisma migrate deploy
npm run prisma:seed
```

### Workers Not Using DB Config

```bash
# Check if worker has DATABASE_URL
docker exec -it kirin-collector-slack env | grep DATABASE_URL

# Restart worker to pick up changes
docker restart kirin-collector-slack
```

### Schema Changes Not Applied

```bash
# Generate Prisma Client
npm run prisma:generate

# Rebuild services
docker-compose build
```

## Future Enhancements

### Planned Features
- [ ] Web UI for settings management (currently API-only)
- [ ] Real-time config updates (webhook to workers)
- [ ] Config export/import (backup/restore)
- [ ] Per-user collector configurations
- [ ] Advanced scheduling (day/time specific)
- [ ] A/B testing different prompts

## Files Created/Modified

### New Files
```
prisma/
├── schema.prisma           # Database schema
├── seed.ts                 # Seed script
└── migrations/             # Migration files

services/
└── db-init/
    ├── Dockerfile          # DB initialization container
    └── entrypoint.sh       # Migration runner

src/utils/
└── prisma.ts              # Prisma client helper
```

### Modified Files
```
package.json                # Added Prisma dependencies
docker-compose.yml          # Added db-init service
src/workers/slack-worker.ts # Now reads from database
services/dashboard/index.js  # Added settings API
ansible/playbooks/deploy.yml # Wait for db-init
```

---

**🎉 Configuration management is now production-ready!**

Access the dashboard at `http://your-server:666` and start managing your settings via API.

