# Pre-Deployment Checklist

Use this checklist before deploying the Kirin Bot MVP to ensure a smooth deployment.

## Prerequisites

### On Deployment Server
- [ ] Ubuntu/Debian-based Linux server (or compatible)
- [ ] SSH access with sudo privileges
- [ ] Python 3.x installed (for Ansible)
- [ ] Sufficient disk space (at least 20GB for Docker images and Ollama models)
- [ ] Sufficient RAM (recommend 8GB+, 16GB+ for larger models)

### On Local Machine
- [ ] Ansible installed (`pip install ansible`)
- [ ] Ansible community.docker collection (auto-installed by wrapper script)
- [ ] SSH key configured for server access

## Configuration Steps

### 1. Environment Configuration
- [ ] Copy `.env_example` to `.env`
- [ ] Set `SLACK_BOT_TOKEN` with your Slack bot token
- [ ] Set `SLACK_CHANNEL_IDS` with comma-separated channel IDs
- [ ] Configure `SLACK_LOOKBACK_HOURS` (default: 24)
- [ ] Set `OLLAMA_MODEL` (default: `llama3.1:8b`, recommend this or `qwen2.5:32b`)
- [ ] Set `ANSIBLE_HOST` to your server IP address
- [ ] Set `ANSIBLE_USER` to your SSH username
- [ ] Set `ANSIBLE_SSH_KEY` to path to your SSH private key

### 2. Slack Setup
- [ ] Create Slack app at https://api.slack.com/apps
- [ ] Add bot scopes: `channels:history`, `channels:read`
- [ ] Install app to workspace
- [ ] Copy Bot User OAuth Token (starts with `xoxb-`)
- [ ] Invite bot to channels you want to monitor (`/invite @your-bot-name`)
- [ ] Get channel IDs from URL (https://workspace.slack.com/archives/C1234567890)

### 3. First Deployment
- [ ] Review `ansible/inventory.yml.example`
- [ ] Test SSH connection: `ssh -i ~/.ssh/your_key user@server-ip`
- [ ] Run deployment: `cd ansible && ./ansible-playbook.sh playbooks/deploy.yml`
- [ ] Monitor deployment logs for errors
- [ ] Wait for Ollama model download (first run only, may take 10-30 minutes)

### 4. Verify Deployment
- [ ] Check Docker containers are running: `docker ps`
- [ ] Check Ollama container logs: `docker logs kirin-ollama`
- [ ] Check app container logs: `docker logs kirin-bot-mvp`
- [ ] Verify summary file exists: `cat /opt/kirin-bot//output/slack-summary.txt`
- [ ] Review summary for quality and accuracy

## Common Issues & Solutions

### Issue: Ollama fails to download model
**Solution**: Large models take time to download. Check logs with `docker logs kirin-ollama -f`. 
The app will retry up to 5 times with 5-second delays.

### Issue: No messages found
**Possible causes**:
- Bot not invited to channels
- Channel IDs incorrect
- `SLACK_LOOKBACK_HOURS` too short
- No messages in time period

**Solution**: Verify channel IDs, increase lookback hours, ensure bot is in channels.

### Issue: Slack API authentication failed
**Solution**: Verify `SLACK_BOT_TOKEN` is correct and bot has required scopes.

### Issue: Docker Compose fails to start
**Solution**: Ensure Docker and Docker Compose are installed. Check with `docker --version` and `docker compose version`.

### Issue: Ansible playbook fails
**Solution**: 
- Verify SSH access: `ssh -i ~/.ssh/your_key user@server-ip`
- Check Python is installed on server: `ssh user@server-ip python3 --version`
- Ensure community.docker collection is installed: `ansible-galaxy collection install community.docker`

## Post-Deployment

### Re-running Summarization
To generate a new summary, simply restart the app container:
```bash
ssh user@server-ip
cd /opt/kirin-bot/mvp
docker compose up app
```

Or use the update playbook:
```bash
cd ansible
./ansible-playbook.sh playbooks/update.yml
```

### Changing Configuration
1. Edit `.env` file on server: `ssh user@server-ip nano /opt/kirin-bot//.env`
2. Restart services: `ssh user@server-ip "cd /opt/kirin-bot/mvp && docker compose restart"`

### Monitoring
- Container logs: `docker logs -f kirin-bot-mvp`
- Ollama logs: `docker logs -f kirin-ollama`
- Summary output: `cat /opt/kirin-bot//output/slack-summary.txt`

## MVP Limitations

This MVP is intentionally limited to:
- ✅ Single-run execution (no scheduling)
- ✅ Text file output only
- ✅ Slack integration only
- ✅ Single user deployment
- ❌ No web UI
- ❌ No database persistence
- ❌ No continuous monitoring
- ❌ No Slack posting capabilities

For production use, consider implementing scheduling (cron), web interface, and database persistence.

