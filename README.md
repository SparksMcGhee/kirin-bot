# 🦒 Kirin - Self-Hosted LLM Content Filter

**Version 0.2.0** - Job Queue Architecture with Web Dashboard

Kirin is a self-hosted content filtering system that uses local LLMs to intelligently process and summarize information from multiple sources (Slack, Signal, Twitter, RSS feeds, etc.).

## 🏗️ Architecture

### Core Components

- **BullMQ Job Queue** - Distributed task processing with Redis backend
- **Collector Workers** - Modular data collectors (Slack, Signal, Twitter, RSS)
- **Processor Worker** - LLM-powered content analysis and filtering
- **Output Worker** - Storage and export of filtered results
- **Web Dashboard** - Real-time monitoring with Bull Board integration
- **PostgreSQL + pgvector** - Vector database for embeddings
- **Ollama** - Self-hosted LLM inference

### Data Flow

```
┌──────────────┐
│  Collectors  │  ──→  Fetch messages from sources
└──────┬───────┘
       │
       ↓ (BullMQ)
┌──────────────┐
│  Processor   │  ──→  LLM analysis & filtering
└──────┬───────┘
       │
       ↓ (BullMQ)
┌──────────────┐
│    Output    │  ──→  Store results & metadata
└──────────────┘
```

## 🚀 Quick Start

### Prerequisites

- Docker & Docker Compose
- Ansible (for deployment)
- SSH access to your target server

### Local Development

1. **Clone and configure**:
```bash
cd mvp
cp .env_example .env
# Edit .env with your configuration
```

2. **Start all services**:
```bash
docker-compose up -d
```

3. **Access the dashboard**:
```
http://localhost:666
```

## 📊 Dashboard

The Kirin dashboard provides:
- **Queue Monitor** (`/api/queues`) - Real-time BullMQ job monitoring
- **Job Status** - View active, completed, and failed jobs
- **Worker Health** - Monitor collector and processor workers
- **Output Review** - Browse filtered content and provide feedback

Default port: **666** (configurable via `DASHBOARD_PORT`)

## 🔧 Configuration

### Environment Variables

```bash
# Slack Configuration
SLACK_BOT_TOKEN=xoxb-your-token
SLACK_CHANNEL_IDS=C123456,C789012
SLACK_LOOKBACK_HOURS=24

# Ollama LLM
OLLAMA_BASE_URL=http://ollama:11434
OLLAMA_MODEL=qwen2.5:32b

# Redis (Job Queue)
REDIS_URL=redis://redis:6379

# PostgreSQL (Vector DB)
DATABASE_URL=postgresql://kirin:password@postgres:5432/kirin

# Dashboard
DASHBOARD_PORT=666

# Logging
LOG_LEVEL=info
```

## 📦 Services

### Collector Workers

Modular collectors run as independent workers:

- **Slack Collector** - Fetches messages from Slack channels
- **Signal Collector** (TODO) - Fetches Signal messages
- **Twitter Collector** (TODO) - Fetches tweets

Each collector:
- Runs on a schedule (cron-like)
- Respects source API rate limits
- Queues messages for processing

### Processor Worker

The processor worker:
- Receives messages from collectors
- Sends to LLM for analysis/summarization
- Extracts topics and relevance scores
- Queues filtered output for storage

### Output Worker

The output worker:
- Stores filtered content to files
- Saves metadata to PostgreSQL
- Maintains "latest" files per source

## 🎯 Adding New Collectors

To add a new source:

1. Create `services/collectors/[source]/Dockerfile`
2. Implement worker in `src/workers/[source]-worker.ts`
3. Add queue in `src/queue/queues.ts`
4. Update `docker-compose.yml`
5. Add to dashboard in `services/dashboard/src/lib/bullBoard.ts`

## 🚢 Deployment

### Deploy to Server

```bash
cd ansible
./ansible-playbook.sh playbooks/deploy.yml
```

### Update Deployment

```bash
cd ansible
./ansible-playbook.sh playbooks/update.yml
```

### Verify Deployment

```bash
cd scripts
./verify-deployment.sh
```

## 🧪 Testing

```bash
# Run tests (TODO)
npm test

# Check queue status
docker exec -it kirin-redis redis-cli
> KEYS bull:*

# View worker logs
docker logs kirin-collector-slack -f
docker logs kirin-processor -f
docker logs kirin-output -f
```

## 📈 Monitoring

### Queue Metrics

Access Bull Board at `http://your-server:666/api/queues` to see:
- Job counts (waiting, active, completed, failed)
- Processing times
- Retry attempts
- Error logs

### Worker Status

```bash
# Check all containers
docker ps

# View specific worker logs
docker logs kirin-collector-slack
docker logs kirin-processor
docker logs kirin-output
```

## 🔮 Roadmap

### v0.3.0 - LangChain Integration
- [ ] RAG with pgvector
- [ ] Prompt versioning
- [ ] Topic extraction
- [ ] Relevance scoring

### v0.4.0 - Multi-User Support
- [ ] User authentication
- [ ] Per-user filtering preferences
- [ ] Feedback loops for relevance tuning

### v0.5.0 - Additional Sources
- [ ] Signal collector
- [ ] Twitter/X collector
- [ ] RSS feed collector
- [ ] Email collector

## 📝 Architecture Notes

### Why BullMQ?

- **Reliability**: At-least-once delivery with Redis persistence
- **Scalability**: Horizontal scaling of workers
- **Observability**: Built-in metrics and Bull Board UI
- **Rate Limiting**: Respect API limits per collector
- **Retries**: Automatic retry with exponential backoff

### Why Next.js for Dashboard?

- **Modern**: React with server components
- **Fast**: Optimized builds and caching
- **Integrated**: Bull Board adaptor for queue UI
- **Extensible**: Easy to add custom dashboard pages

### Why PostgreSQL + pgvector?

- **Vectors**: Native support for embeddings (future RAG)
- **Relational**: Structured metadata storage
- **Performant**: Efficient queries with indexes
- **Proven**: Battle-tested reliability

## 🛠️ Development

### Project Structure

```
/
├── src/
│   ├── queue/           # BullMQ queue definitions
│   ├── workers/         # Collector, processor, output workers
│   ├── slack/           # Slack API client
│   ├── models/          # LLM clients
│   ├── summarization/   # Summarization logic
│   ├── output/          # File output handlers
│   └── utils/           # Logger, helpers
├── services/
│   ├── collectors/      # Collector Dockerfiles
│   ├── processor/       # Processor Dockerfile
│   ├── output/          # Output Dockerfile
│   └── dashboard/       # Next.js dashboard
├── ansible/             # Deployment automation
└── docker-compose.yml   # Service orchestration
```

## 📚 Documentation

- [Deployment Checklist](DEPLOYMENT_CHECKLIST.md)
- [LangChain Integration Plan](docs/LANGCHAIN_INTEGRATION.md)
- [Change Log](CHANGES.md)

## 🤝 Contributing

This is a personal project, but feedback and suggestions are welcome!

## 📄 License

MIT

---

**Built with ❤️ for filtering signal from noise**

