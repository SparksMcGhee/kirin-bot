# 🦒 Kirin v0.2.0 - BullMQ Architecture Deployment

## Deployment Summary

Successfully deployed Kirin with a complete job queue architecture to DJX Spark server on **November 27, 2025**.

## What Was Built

### Core Architecture

1. **BullMQ Job Queue System**
   - Redis-backed distributed task processing
   - Modular worker design for horizontal scaling
   - Automatic retry with exponential backoff
   - Job persistence and monitoring

2. **Infrastructure Services**
   - **Redis** (port 6379) - Job queue backend
   - **PostgreSQL + pgvector** (port 5432) - Vector database for future RAG
   - **Ollama** (port 11434) - Self-hosted LLM inference
   - **Dashboard** (port 666) - Web-based monitoring interface

3. **Worker Services**
   - **Slack Collector** - Fetches messages from Slack channels
   - **Processor** - LLM-powered content analysis and summarization
   - **Output** - Stores filtered results to files

### Dashboard

Access at: **http://x.x.x.x:666**

Features:
- Homepage with architecture overview
- `/api/queues` - Real-time queue statistics (JSON)
- `/api/health` - Health check endpoint

## How It Works

```
┌─────────────────┐
│ Slack Collector │ ──→ Fetches messages every 30 minutes
└────────┬────────┘
         │ (BullMQ: slack-collector queue)
         ↓
┌────────────────┐
│   Processor    │ ──→ LLM analysis & summarization (Qwen 2.5:32b)
└────────┬───────┘
         │ (BullMQ: kirin-processor queue)
         ↓
┌────────────────┐
│     Output     │ ──→ Stores to /opt/kirin-bot/output/
└────────────────┘
```

## Running Services

All services are running and healthy:

```
✅ kirin-redis             - Job queue backend
✅ kirin-postgres          - Vector database
✅ kirin-ollama            - LLM inference engine
✅ kirin-dashboard         - Web dashboard (port 666)
✅ kirin-collector-slack   - Slack message collector
✅ kirin-processor         - Content processor
✅ kirin-output            - Output storage
```

## Configuration

The dashboard port is configured via `.env`:

```bash
DASHBOARD_PORT=666  # Default: 666 (as requested!)
```

All other environment variables remain the same as v0.1.0.

## Testing

### View Dashboard
```bash
curl http://x.x.x.x
```

### Check Queue Stats
```bash
curl http://x.x.x.xapi/queues | jq .
```

### Monitor Worker Logs
```bash
ssh sparks@x.x.x.x
docker logs kirin-collector-slack -f
docker logs kirin-processor -f
docker logs kirin-output -f
```

### Trigger Manual Collection
Currently, the Slack collector runs on a 30-minute schedule. To trigger manually, you can:

```bash
# SSH into the server
ssh sparks@x.x.x.x

# Use redis-cli to add a job
docker exec -it kirin-redis redis-cli
> LPUSH bull:slack-collector:wait '{"data":{"source":"slack","lookbackHours":24,"scheduledAt":"2025-11-27T23:00:00Z"}}'
```

## Future Enhancements

### v0.3.0 - LangChain Integration
- RAG with pgvector for conversation context
- Prompt versioning and A/B testing
- Topic extraction and relevance scoring
- User feedback loops

### v0.4.0 - Additional Collectors
- Signal collector
- Twitter/X collector
- RSS feed collector
- Email collector

### v0.5.0 - Enhanced Dashboard
- Bull Board integration for visual queue management
- Real-time job monitoring
- User authentication
- Per-user filtering preferences

## Architecture Benefits

### Why BullMQ?

- **Reliability**: At-least-once delivery with Redis persistence
- **Scalability**: Easy horizontal scaling of workers
- **Observability**: Built-in metrics and monitoring
- **Rate Limiting**: Respect API limits per collector
- **Retries**: Automatic retry with exponential backoff

### Why Modular Workers?

- **Isolation**: Each collector runs independently
- **Scalability**: Scale specific workers based on load
- **Maintainability**: Easy to add new collectors
- **Resilience**: One failing worker doesn't affect others

## Deployment Notes

### What Changed from v0.1.0

1. **Added Services**:
   - Redis for job queue
   - PostgreSQL + pgvector for vector storage
   - Dashboard on port 666
   - Separate worker containers

2. **Refactored Architecture**:
   - Slack integration now runs as a BullMQ worker
   - Processing pipeline split into distinct stages
   - Each stage is a separate worker with its own queue

3. **Infrastructure**:
   - Legacy `app` service moved to `profiles: [legacy]` (only runs when explicitly requested)
   - All services use health checks where appropriate
   - Proper dependency management between services

### Files Added

```
/
├── src/
│   ├── queue/
│   │   ├── queues.ts          # BullMQ queue definitions
│   │   └── types.ts           # TypeScript types for jobs
│   ├── workers/
│   │   ├── slack-worker.ts    # Slack collector worker
│   │   ├── processor-worker.ts # LLM processor worker
│   │   └── output-worker.ts   # Output storage worker
│   ├── scheduler.ts           # Job scheduler (cron-like)
│   └── summarization/
│       └── summarizer.ts      # Refactored summarization logic
├── services/
│   ├── collectors/
│   │   └── slack/
│   │       └── Dockerfile     # Slack collector container
│   ├── processor/
│   │   └── Dockerfile         # Processor container
│   ├── output/
│   │   └── Dockerfile         # Output container
│   └── dashboard/
│       ├── Dockerfile         # Dashboard container
│       ├── package.json       # Dashboard dependencies
│       └── index.js           # Express-based dashboard
├── docs/
│   └── LANGCHAIN_INTEGRATION.md # Future LangChain.js plans
└── README_v2.md               # Updated architecture documentation
```

## Known Issues

None currently! All services deployed successfully and are running smoothly.

## Next Steps

1. **Test the full pipeline**: Wait for the 30-minute schedule to trigger, or manually add a job to Redis
2. **Monitor output**: Check `/opt/kirin-bot/output/` for generated summaries
3. **Review queue stats**: Use the dashboard API to monitor job progress
4. **Plan v0.3.0**: Begin LangChain.js integration for advanced RAG capabilities

## Commands

### Redeploy
```bash
cd /home/sparks/Documents/dev/kirin-bot//ansible
./ansible-playbook.sh playbooks/deploy.yml
```

### View All Logs
```bash
ssh sparks@x.x.x.x
docker-compose -f /opt/kirin-bot/docker-compose.yml logs -f
```

### Stop All Services
```bash
ssh sparks@x.x.x.x
cd /opt/kirin-bot
docker-compose down
```

### Start All Services
```bash
ssh sparks@x.x.x.x
cd /opt/kirin-bot
docker-compose up -d
```

---

**Built with ❤️ for filtering signal from noise**

*Dashboard available at: http://x.x.x.x:666*

