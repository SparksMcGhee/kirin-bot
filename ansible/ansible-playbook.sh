#!/bin/bash
# Wrapper script to run Ansible playbooks with .env variables loaded

set -e

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
ENV_FILE="$PROJECT_ROOT/.env"

# Check if .env file exists
if [ ! -f "$ENV_FILE" ]; then
    echo "Error: .env file not found at $ENV_FILE"
    echo "Please copy .env_example to .env and configure it."
    exit 1
fi

# Source the .env file
set -a
source "$ENV_FILE"
set +a

# Change to ansible directory
cd "$SCRIPT_DIR"

# Install Ansible collections if requirements.yml exists
if [ -f "requirements.yml" ]; then
    echo "Installing Ansible collections..."
    ansible-galaxy collection install -r requirements.yml
fi

# Check if inventory.yml exists, if not, create from example
if [ ! -f "inventory.yml" ]; then
    if [ -f "inventory.yml.example" ]; then
        echo "Creating inventory.yml from inventory.yml.example..."
        cp inventory.yml.example inventory.yml
        echo "Please review and update inventory.yml if needed."
    else
        echo "Error: inventory.yml.example not found"
        exit 1
    fi
fi

# Run ansible-playbook with all passed arguments
exec ansible-playbook "$@"

