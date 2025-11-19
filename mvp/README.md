# Kiran Bot MVP

This is the Minimum Viable Product (MVP) implementation of Kiran, focused on proving that open-source LLMs running on DJX Spark hardware can sufficiently summarize Hackerspace Slack conversations.

## Features

- **Slack Integration**: Fetches messages from Slack channels using the official Slack API
- **Local LLM Summarization**: Uses Ollama to run open-source models locally (no cloud dependencies)
- **Single-Run Execution**: Generates a summary once on deployment, then exits
- **Text File Output**: Writes summaries to a text file in the `output/` directory
- **Docker-Based**: Fully containerized with Docker Compose
- **Ansible Automation**: Infrastructure setup and deployment automation

## Prerequisites

- Docker and Docker Compose installed
- Node.js 20+ (for local development)
- Slack Bot Token with required permissions:
  - `channels:history` - Read channel messages
  - `channels:read` - List channels
- Ollama running (either locally or in Docker)

## Quick Start

### 1. Clone and Configure

```bash
cd mvp
cp .env.example .env
# Edit .env with your Slack token and configuration
```

### 2. Configure Environment Variables

Edit `.env` file with your settings:

```env
SLACK_BOT_TOKEN=xoxb-your-token-here
SLACK_CHANNEL_IDS=C1234567890,C0987654321
SLACK_LOOKBACK_HOURS=24
OLLAMA_BASE_URL=http://ollama:11434
OLLAMA_MODEL=llama3.2:1b
```

### 3. Run with Docker Compose

```bash
docker-compose up
```

The application will:
1. Fetch messages from specified Slack channels
2. Generate a summary using Ollama
3. Write the summary to `output/slack-summary.txt`
4. Exit

### 4. Check Output

```bash
cat output/slack-summary.txt
```

## Development

### Local Development Setup

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Run locally (requires Ollama running separately)
npm run dev
```

### Project Structure

```
mvp/
├── src/                    # TypeScript source code
│   ├── models/            # LLM client interfaces
│   ├── slack/             # Slack API integration
│   ├── summarization/     # Summarization logic
│   ├── output/            # File output utilities
│   └── utils/             # Shared utilities
├── services/              # Docker service definitions
│   └── app/               # Application Dockerfile
├── ansible/               # Ansible automation
│   ├── playbooks/         # Deployment playbooks
│   └── roles/             # Ansible roles
├── output/                # Summary output directory (gitignored)
├── docker-compose.yml     # Service orchestration
└── package.json           # Node.js dependencies
```

## Deployment with Ansible

### 1. Configure Environment Variables

Add your Ansible deployment settings to your `.env` file:

```bash
# Add these to your .env file
ANSIBLE_HOST=your.server.ip.address
ANSIBLE_USER=your_username
ANSIBLE_SSH_KEY=~/.ssh/your_key
```

### 2. Create Inventory File

```bash
cd ansible
cp inventory.yml.example inventory.yml
# The inventory.yml will automatically use environment variables from .env
```

### 3. Deploy

**Option A: Using the wrapper script (recommended)**
```bash
cd ansible
./ansible-playbook.sh playbooks/deploy.yml
```

**Option B: Manual (source .env first)**
```bash
cd ansible
source ../.env
ansible-playbook playbooks/deploy.yml
```

The wrapper script automatically loads your `.env` file, so all your configuration stays in one place.

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `SLACK_BOT_TOKEN` | Slack Bot OAuth Token (required) | - |
| `SLACK_CHANNEL_IDS` | Comma-separated list of channel IDs (required) | - |
| `SLACK_LOOKBACK_HOURS` | Hours to look back for messages | 24 |
| `OLLAMA_BASE_URL` | Ollama API base URL | http://ollama:11434 |
| `OLLAMA_MODEL` | Ollama model to use | llama3.1:8b |
| `OUTPUT_DIR` | Directory for output files | /app/output |
| `OUTPUT_FILENAME` | Name of output file | slack-summary.txt |
| `LOG_LEVEL` | Logging level (debug/info/warn/error) | info |
| `ANSIBLE_HOST` | Server IP address for Ansible deployment | - |
| `ANSIBLE_USER` | SSH username for Ansible | - |
| `ANSIBLE_SSH_KEY` | Path to SSH private key | ~/.ssh/your_key |
| `ANSIBLE_PASSWORD` | SSH password (optional, not recommended) | - |

### Getting Slack Channel IDs

1. Open Slack in a web browser
2. Navigate to the channel
3. The channel ID is in the URL: `https://workspace.slack.com/archives/C1234567890`
4. Copy the ID after `/archives/`

### Getting a Slack Bot Token

1. Go to https://api.slack.com/apps
2. Create a new app or select existing app
3. Go to "OAuth & Permissions"
4. Add bot scopes: `channels:history`, `channels:read`
5. Install app to workspace
6. Copy the "Bot User OAuth Token" (starts with `xoxb-`)

## Model Selection

With 128GB of unified memory on DJX Spark, you can run high-quality models. Recommended models for summarization:

**Recommended (Best Quality):**
- `llama3.1:8b` - **Default** - Excellent quality, fast inference (~4.7GB VRAM)
- `llama3.1:70b` - Maximum quality, slower inference (~40GB VRAM, well within your capacity)
- `qwen2.5:14b` - Excellent for summarization tasks (~8GB VRAM)
- `qwen2.5:32b` - Very high quality (~18GB VRAM)

**Good Alternatives:**
- `mistral:7b` - Great alternative, well-tested (~4.1GB VRAM)
- `llama3.2:3b` - Good quality, very fast (~2GB VRAM)

**Lightweight (if you need speed over quality):**
- `llama3.2:1b` - Fastest but limited capability (~0.6GB VRAM)

For best summarization results, we recommend starting with `llama3.1:8b` (the default) or `llama3.1:70b` if you want maximum quality. To use a different model, set `OLLAMA_MODEL` in your `.env` file.

## Troubleshooting

### Ollama Connection Issues

If the app can't connect to Ollama:

1. Verify Ollama is running: `docker-compose ps`
2. Check Ollama logs: `docker-compose logs ollama`
3. Test Ollama API: `curl http://localhost:11434/api/tags`

### Slack API Issues

If Slack API calls fail:

1. Verify your bot token is correct
2. Check bot has required permissions
3. Verify channel IDs are correct
4. Check Slack API rate limits

### No Messages Found

If no messages are returned:

1. Verify channel IDs are correct
2. Check `SLACK_LOOKBACK_HOURS` - increase if needed
3. Verify bot has access to the channels
4. Check if channels have messages in the time period

## Architecture

The MVP follows a modular architecture:

- **Slack Client**: Handles Slack API interactions
- **LLM Client Interface**: Abstract interface for LLM providers
- **Ollama Client**: Implementation for Ollama
- **Summarizer**: Orchestrates summarization process
- **File Output**: Handles writing summaries to files

This architecture supports future additions:
- Additional LLM providers
- Other social media platforms
- Different output formats
- Database persistence

## Limitations (MVP Scope)

The MVP is intentionally limited:

- Single-run execution (no scheduling)
- Text file output only (no Slack posting, web UI)
- No database persistence
- No job queue
- Single user only
- Slack integration only

See `AgentInstructions.md` for full project scope and future considerations.

## License

See LICENSE file in the parent directory.

