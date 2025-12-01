# 🦒 Kirin - Ad-block for the post-human internet
(Kirin means 🦒 in Japanese!)

Kirin is a self-hosted content filtering system that uses local LLMs to intelligently process and summarize information from multiple sources (Slack, Signal, Twitter, RSS feeds, etc.).

It's a 🤖, written by 🤖, to filter out 🤖. Clearly this is the best timeline. 

![dashboard](./pictures/dashbord.png)
![interests](./pictures/interests.png)

## Why Kirin? 
**fights for the user**: You tell Kiran what you care about and Kiran monitors your socials for that. Full stop. No advertisers tipping the scale to sell you shit, no data scientists optimizing feeds for addiction, no evil recomendation algorythm, no enshitification, no phones being blown up at 2am (unless Kirin knows you'd want in on the meme-off).

**Only watches**: It will never spam or bother your friends, humiliate you, or otherwise contribute to the Dead-Internet problems it exists to solve. At-most it will reach out to you privately when it thinks you should know something. 

**Own your data**: It is designed to run entirely on self-hosted equipment. All data it collects never leaves your direct ownership and soverenty. Everything you feed Kiran is still yours!

## Why do you need 🦒?

For most of human history the biggest challenge we faced was getting enough food. We wired ourselves to consume all the greese, salt, carbs, and sugar we could cram into our mouths so we had something to survive on during the hard times. 

Then, in an evolutionary blink of the eye the hard times ended. Developed nations didn't just have enough food, we had too much food. Suddenly the biggest killer and threat to our wellbeing wasn't starving, it was obesity, diabetes, and heart problems... suddenly success wasn't eating enough, it was eating right. 

It took us years of experimenting with scientific reserch, fad diets, public education campaigns, regulation, and finally GLP-1 drugs to functionally patch our brain's wiring for the new era.

Our natural curiosity and need for knowledge and closeness is in many ways just like hunger. Knowledge and social closeness increases our evolutionary advantage and for most of human history we were starving and scratching for every tidbit. 

Then, in an evolutionary blink of the eye the whole game changed. Suddenly the Internet allowed us to hook a firehose of all humanitites knowledge and every banial thought and infinite volume of empty mental junkfood directly up to our eyeballs 24/7/365. Suddenly becoming wise, informed, and healthy means consuming the right information. 

Since Facebook, Twitter, Bluesky, Mastadon, RSS feeds, Slack, Discord, IRC, SMS, Signal, Telegram, WeChat, Email.... all of them, seem intent on blasting your eyeballs with infinite volumes of ever-enshittifying garbage Kirin exists to be your filter. You can eat your metaphorical information-burger but leave as much fat and salt as you want on the table! 

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

Yes please! 

## 📄 License

MIT

---

**🤖 responsibly,  my friends**

