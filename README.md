# 🦄 Kirin - Self-Hosted LLM Content Filter

**Version 0.2.0** - Production-Ready Job Queue Architecture

Kirin is a self-hosted content filtering system that uses local LLMs to intelligently process and summarize information from multiple sources (Slack, Signal, Twitter, RSS feeds, etc.).

## 🏗️ Architecture

Built on a modern job queue system with modular workers:

- **BullMQ** - Distributed task processing with Redis
- **PostgreSQL + pgvector** - Vector database for embeddings
- **Prisma ORM** - Type-safe database access & migrations
- **Ollama** - Self-hosted LLM inference
- **Express Dashboard** - Web-based monitoring (port 666) with REST API
- **Modular Workers** - Slack, Signal, Twitter collectors

### Database Configuration System

All settings are now stored in PostgreSQL and manageable via REST API:
- ✅ Collector configurations (schedule, rate limits, source settings)
- ✅ Processor settings (LLM model, prompts, parameters)
- ✅ User interests and preferences
- ✅ Job history and audit logs
- ✅ No redeployment needed for configuration changes

See [Database Configuration Guide](docs/DATABASE_CONFIGURATION.md) for details.

## 🚀 Quick Start

### Prerequisites

- Docker & Docker Compose
- Ansible (for deployment)
- SSH access to your target server
- Slack Bot Token (for Slack integration)

### 1. Clone and Configure

```bash
cd kirin-bot
cp .env_example .env
# Edit .env with your Slack token and configuration
```

### 2. Configure Environment Variables

Edit `.env` file with your settings:

```env
SLACK_BOT_TOKEN=xoxb-your-token-here
SLACK_CHANNEL_IDS=C1234567890,C0987654321
SLACK_LOOKBACK_HOURS=24

OLLAMA_BASE_URL=http://ollama:11434
OLLAMA_MODEL=qwen2.5:32b

REDIS_URL=redis://redis:6379
DATABASE_URL=postgresql://kirin:password@postgres:5432/kirin

DASHBOARD_PORT=666
```

### 3. Run with Docker Compose

```bash
docker-compose up -d
```

### 4. Access Dashboard

Visit `http://localhost:666` to view the dashboard and monitor queue status.

## 📦 Deployment

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

## 📊 Monitoring

- **Dashboard**: `http://your-server:666`
- **Queue Stats API**: `http://your-server:666/api/queues`
- **Health Check**: `http://your-server:666/api/health`

View worker logs:
```bash
docker logs kirin-collector-slack -f
docker logs kirin-processor -f
docker logs kirin-output -f
```

## 🔧 Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `SLACK_BOT_TOKEN` | Slack Bot User OAuth Token | Required |
| `SLACK_CHANNEL_IDS` | Comma-separated channel IDs | Required |
| `SLACK_LOOKBACK_HOURS` | Hours of history to fetch | `24` |
| `OLLAMA_BASE_URL` | Ollama API endpoint | `http://ollama:11434` |
| `OLLAMA_MODEL` | LLM model to use | `qwen2.5:32b` |
| `REDIS_URL` | Redis connection string | `redis://redis:6379` |
| `DATABASE_URL` | PostgreSQL connection | `postgresql://kirin:password@postgres:5432/kirin` |
| `DASHBOARD_PORT` | Dashboard web port | `666` |
| `OUTPUT_DIR` | Directory for summary files | `/app/output` |
| `LOG_LEVEL` | Logging verbosity | `info` |

## 🎯 Recommended LLM Models

With high memory capacity, you can run larger models:

**Recommended for summarization:**
- `qwen2.5:32b` - Excellent quality, ~18GB VRAM (default)
- `llama3.1:70b` - Maximum quality, ~40GB VRAM
- `llama3.1:8b` - Fast and efficient, ~4.7GB VRAM

**Smaller/faster options:**
- `llama3.2:3b` - Good quality, very fast, ~2GB VRAM
- `mistral:7b` - Great alternative, ~4.1GB VRAM

## 📚 Documentation

- [Full Architecture Guide](README_v2.md) - Detailed architecture and design
- [Deployment Checklist](DEPLOYMENT_CHECKLIST.md) - Step-by-step deployment
- [Deployment Success Report](DEPLOYMENT_SUCCESS_v0.2.0.md) - Latest deployment details
- [Change Log](CHANGES.md) - Version history
- [LangChain Integration Plan](docs/LANGCHAIN_INTEGRATION.md) - Future enhancements

## 🏗️ Project Structure

```
kirin-bot/
├── src/              # TypeScript source code
│   ├── queue/        # BullMQ queue definitions
│   ├── workers/      # Collector, processor, output workers
│   ├── slack/        # Slack API client
│   ├── models/       # LLM clients (Ollama)
│   └── utils/        # Logger, helpers
├── services/         # Docker service definitions
│   ├── collectors/   # Collector Dockerfiles
│   ├── processor/    # Processor Dockerfile
│   ├── output/       # Output Dockerfile
│   └── dashboard/    # Express dashboard
├── ansible/          # Deployment automation
└── docker-compose.yml # Service orchestration
```

## 🔮 Roadmap

### v0.3.0 - LangChain Integration
- RAG with pgvector
- Prompt versioning
- Topic extraction
- Relevance scoring

### v0.4.0 - Multi-User Support
- User authentication
- Per-user filtering preferences
- Feedback loops

### v0.5.0 - Additional Sources
- Signal collector
- Twitter/X collector
- RSS feed collector

## 🛠️ Development

### Local Setup

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Run specific workers
npm run worker:slack
```

### Project Commands

```bash
npm run build      # Build TypeScript
npm run dev        # Run in development mode
npm start          # Run main app (legacy)
npm run lint       # Lint code
```

## 🔍 Troubleshooting

### Common Issues

1. **"not_in_channel" error**
   - Invite your bot to the Slack channels

2. **Ollama connection errors**
   - Verify Ollama is running: `docker logs kirin-ollama`

3. **Queue not processing**
   - Check Redis: `docker logs kirin-redis`
   - Check worker logs: `docker logs kirin-collector-slack`

### View All Logs

```bash
docker-compose logs -f
```

## 🔒 Security

- **Slack Token**: Keep `.env` secure and never commit it
- **Local Processing**: All LLM processing happens locally
- **No Cloud**: No data leaves your infrastructure
- **Network Isolation**: Services communicate via Docker network

## 📄 License

MIT - See [LICENSE](LICENSE) for details

---

**Built for filtering signal from noise** 🦄

*Dashboard: http://your-server:666*
