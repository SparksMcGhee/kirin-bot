#!/bin/bash
# Deployment verification script for Kirin Bot MVP

set -e

DEPLOY_DIR="/opt/kirin-bot/mvp"
OUTPUT_DIR="$DEPLOY_DIR/output"
SUMMARY_FILE="$OUTPUT_DIR/slack-summary.txt"

echo "===== Kirin Bot MVP Deployment Verification ====="
echo ""

# Check if Docker is installed
echo "1. Checking Docker installation..."
if command -v docker &> /dev/null; then
    echo "   ✓ Docker is installed: $(docker --version)"
else
    echo "   ✗ Docker is not installed"
    exit 1
fi

# Check if Docker Compose is installed
echo "2. Checking Docker Compose installation..."
if docker compose version &> /dev/null; then
    echo "   ✓ Docker Compose is installed: $(docker compose version)"
else
    echo "   ✗ Docker Compose is not installed"
    exit 1
fi

# Check if project directory exists
echo "3. Checking project directory..."
if [ -d "$DEPLOY_DIR" ]; then
    echo "   ✓ Project directory exists: $DEPLOY_DIR"
else
    echo "   ✗ Project directory not found: $DEPLOY_DIR"
    exit 1
fi

# Check if .env file exists
echo "4. Checking .env configuration..."
if [ -f "$DEPLOY_DIR/.env" ]; then
    echo "   ✓ .env file exists"
    
    # Check for required variables (without showing values)
    if grep -q "SLACK_BOT_TOKEN=" "$DEPLOY_DIR/.env"; then
        echo "   ✓ SLACK_BOT_TOKEN is set"
    else
        echo "   ✗ SLACK_BOT_TOKEN is not set"
    fi
    
    if grep -q "SLACK_CHANNEL_IDS=" "$DEPLOY_DIR/.env"; then
        echo "   ✓ SLACK_CHANNEL_IDS is set"
    else
        echo "   ✗ SLACK_CHANNEL_IDS is not set"
    fi
else
    echo "   ✗ .env file not found"
    exit 1
fi

# Check Docker containers
echo "5. Checking Docker containers..."
cd "$DEPLOY_DIR"

if docker ps -a | grep -q "kirin-ollama"; then
    OLLAMA_STATUS=$(docker ps --filter "name=kirin-ollama" --format "{{.Status}}")
    if echo "$OLLAMA_STATUS" | grep -q "Up"; then
        echo "   ✓ Ollama container is running: $OLLAMA_STATUS"
    else
        echo "   ⚠ Ollama container exists but is not running: $OLLAMA_STATUS"
    fi
else
    echo "   ✗ Ollama container not found"
fi

if docker ps -a | grep -q "kirin-bot-mvp"; then
    APP_STATUS=$(docker ps -a --filter "name=kirin-bot-mvp" --format "{{.Status}}")
    echo "   ℹ App container status: $APP_STATUS"
    echo "     (App should exit after generating summary - this is normal)"
else
    echo "   ✗ App container not found"
fi

# Check Ollama health
echo "6. Checking Ollama API..."
if curl -s -f http://localhost:11434/api/tags > /dev/null 2>&1; then
    echo "   ✓ Ollama API is responding"
else
    echo "   ⚠ Ollama API is not responding (may still be starting up)"
fi

# Check output directory and file
echo "7. Checking output..."
if [ -d "$OUTPUT_DIR" ]; then
    echo "   ✓ Output directory exists: $OUTPUT_DIR"
    
    if [ -f "$SUMMARY_FILE" ]; then
        FILE_SIZE=$(stat -f%z "$SUMMARY_FILE" 2>/dev/null || stat -c%s "$SUMMARY_FILE" 2>/dev/null)
        FILE_DATE=$(stat -f%Sm "$SUMMARY_FILE" 2>/dev/null || stat -c%y "$SUMMARY_FILE" 2>/dev/null)
        echo "   ✓ Summary file exists: $SUMMARY_FILE"
        echo "     Size: $FILE_SIZE bytes"
        echo "     Modified: $FILE_DATE"
        echo ""
        echo "   Preview of summary (first 10 lines):"
        echo "   ----------------------------------------"
        head -10 "$SUMMARY_FILE" | sed 's/^/   /'
        echo "   ----------------------------------------"
    else
        echo "   ⚠ Summary file not found: $SUMMARY_FILE"
        echo "     The app may still be running or encountered an error"
    fi
else
    echo "   ✗ Output directory not found: $OUTPUT_DIR"
fi

# Check recent logs
echo ""
echo "8. Recent app logs (last 20 lines)..."
echo "   ----------------------------------------"
docker logs --tail 20 kirin-bot-mvp 2>&1 | sed 's/^/   /'
echo "   ----------------------------------------"

echo ""
echo "===== Verification Complete ====="
echo ""
echo "To view full logs:"
echo "  docker logs kirin-bot-mvp"
echo "  docker logs kirin-ollama"
echo ""
echo "To view full summary:"
echo "  cat $SUMMARY_FILE"
echo ""
echo "To regenerate summary:"
echo "  cd $DEPLOY_DIR && docker compose up app"

