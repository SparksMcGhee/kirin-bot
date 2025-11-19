# This page lists instructions for AI agents making contributions to this repository

# High-level description
This repository contains the MVP implementation of Kiran, a self-hosted AI-powered content filtering and summarization system. The MVP focuses on proving that open-source LLMs running on DJX Spark hardware can sufficiently summarize Hackerspace Slack conversations. The project uses Docker Compose for containerized services and Ansible for infrastructure management, enabling deployment from the repository with minimal additional setup.

# Development approach
- Agents may make changes to code, configuration files, Dockerfiles, and Ansible playbooks as deemed necessary
- Agents may NOT make changes to the host machine being developed from outside of altering files in this repository
- All infrastructure changes must be reflected in Ansible playbooks and roles
- All application changes must be containerized via Docker and orchestrated via docker-compose.yml
- Agents should test changes locally using Docker Compose before committing

# Critical requirements 
- **Secrets and Configuration**: All secrets, API keys, and sensitive configuration must be declared in the project's `.env` file and referenced as variables. The `.env` file should be gitignored, with `.env.example` provided as a template
- **Self-Hosted First**: All components must work without cloud dependencies. Local LLM inference via Ollama is required
- **Modular Architecture**: Code should be structured to support future modular feed integrations. Each social media platform integration should be a separate, pluggable module
- **Docker-First**: All services must be containerized and deployable via Docker Compose
- **Ansible for Infrastructure**: Server setup, SSL certificates, firewall rules, and system-level configuration must be managed via Ansible roles
- **TypeScript**: All Node.js code must be written in TypeScript with proper type definitions
- **No Breaking Changes**: Agents should not make changes to AgentInstructions.md, but may suggest changes via comments or pull requests

# Key limitations 
- **Hardware Constraints**: The MVP must run on DJX Spark hardware. Model selection and inference must be optimized for this hardware's capabilities
- **Slack API Only**: The MVP focuses exclusively on Slack integration. Other social media integrations are out of scope for MVP but architecture should support future additions
- **Local LLM Only**: The MVP must use open-source models running locally via Ollama. No cloud-based LLM APIs (OpenAI, Anthropic, etc.) should be used
- **Single User**: The MVP is designed for single-user deployment. Multi-user support is out of scope for MVP
- **No Virtual Android**: The Android emulation layer is explicitly out of scope for MVP. Only direct API access (Slack API) should be used

# Project Goals 

## MVP Goals
The MVP must demonstrate:
1. **Slack Integration**: Successfully fetch messages from a Slack workspace using the official Slack API
2. **Local LLM Summarization**: Run open-source LLM inference on DJX Spark hardware to generate coherent summaries
3. **Single-Run Execution**: Generate a summary once on deployment/startup, then exit. No scheduling or continuous operation required
4. **Text File Output**: Write the generated summary to a text file in a mounted volume or output directory
5. **Deployment Automation**: Deploy the entire system from the repository using Docker Compose and Ansible with minimal manual setup

## Architecture Requirements
- **Docker Compose**: All services (application, Ollama) must be defined in docker-compose.yml. Database and Redis are not required for MVP
- **Ansible Roles**: Infrastructure setup (Docker installation, SSL, firewall, etc.) must be automated via Ansible roles
- **Modular Design**: Code structure must support adding new feed modules (Reddit, Mastodon, etc.) in the future without major refactoring
- **Single Execution**: Application runs once on container start, generates summary, writes to file, then exits
- **No Persistence Required**: No database or job queue needed for MVP. All data processing is in-memory during execution
- **Type Safety**: Full TypeScript coverage with proper interfaces for modules and services

## Deployment Requirements
- **One-Command Deploy**: The system should be deployable with a single command after initial server setup
- **Environment Variables**: All configuration via .env file (no hardcoded secrets or IPs)
- **Output Volume**: Mount a volume or directory for summary text file output
- **Logging**: Structured logging (Pino or Winston) with proper log levels to stdout/stderr
- **Update Process**: Updates should be achievable via `docker-compose pull && docker-compose up` or equivalent Ansible playbook
- **Exit on Completion**: Container should exit cleanly after summary generation (exit code 0 on success)

## Technical Stack (MVP)
- **Runtime**: Node.js 20+ (LTS)
- **Language**: TypeScript
- **LLM**: Ollama with local models (Llama 3.2, Mistral, or Phi-3)
- **Database**: None required for MVP (in-memory processing only)
- **Job Queue**: None required for MVP (single-run execution)
- **Slack SDK**: @slack/web-api
- **File I/O**: Node.js fs module for writing summary text files
- **Containerization**: Docker + Docker Compose
- **Infrastructure**: Ansible

# Style Guide 
- **Less is more**: Simpler code with fewer branches is strongly preferred. Avoid over-engineering for MVP
- **Fail fast**: Code should halt when it encounters unexpected situations rather than attempting to fix or route around issues
- **TypeScript strict mode**: Enable strict TypeScript checking. Prefer explicit types over `any`
- **Modular interfaces**: Define clear interfaces for feed modules, LLM clients, and storage layers
- **Error handling**: Use Result types or proper error propagation. Avoid silent failures
- **Documentation**: Inline comments for complex logic. JSDoc for public APIs
- **Testing**: Unit tests for core logic (summarization, message processing). Integration tests for API interactions
- **Git commits**: Clear, descriptive commit messages. Reference issues when applicable

# File Structure Requirements

The repository should follow this structure:

```
kirin-bot/
├── src/                          # TypeScript source code
│   ├── models/                   # LLM client interfaces and implementations
│   ├── slack/                    # Slack API integration
│   ├── summarization/            # Summarization logic and prompts
│   ├── output/                   # File output utilities
│   └── utils/                    # Shared utilities
├── services/                     # Docker service definitions
│   ├── app/                      # Main application Dockerfile
│   └── ollama/                   # Ollama service configuration
├── ansible/                      # Ansible infrastructure automation
│   ├── playbooks/
│   │   ├── deploy.yml           # Main deployment playbook
│   │   └── update.yml           # Update playbook
│   └── roles/
│       ├── docker/              # Docker installation
│       ├── nginx/               # Reverse proxy (if needed)
│       └── ssl/                 # SSL certificate management
├── output/                       # Mount point for summary text files (gitignored)
├── docker-compose.yml           # Service orchestration
├── .env.example                 # Environment variable template
├── .gitignore                   # Must include .env and output/
├── package.json                 # Node.js dependencies
├── tsconfig.json                # TypeScript configuration
└── README.md                    # User-facing documentation
```

# Deployment Workflow

1. **Initial Setup**: Run Ansible playbook to configure server (Docker, firewall, etc.)
2. **Configuration**: Copy `.env.example` to `.env` and fill in values (Slack API token, Ollama URL, etc.)
3. **Deploy**: Run `docker-compose up` (foreground) or `docker-compose up -d` (detached) or Ansible deployment playbook
4. **Execution**: Container fetches Slack messages, generates summary via Ollama, writes to text file in `output/` directory, then exits
5. **Verify**: Check `output/` directory for generated summary text file and container logs
6. **Re-run**: To generate a new summary, simply run `docker-compose up` again

# Future Considerations (Out of Scope for MVP)

The following features are explicitly out of scope for MVP but should be considered in architecture:
- Scheduled execution (cron, BullMQ, etc.) - MVP runs once on deploy
- Multiple social media platform integrations (Reddit, Mastodon, Twitter, etc.)
- Virtual Android layer for platforms without APIs
- Web GUI interface or Slack posting - MVP outputs to text file only
- Database persistence - MVP processes in-memory and outputs to file
- Job queues (BullMQ, Redis) - Not needed for single-run execution
- Multi-user support
- Interest filtering and "Dream System" (focus on summarization only for MVP)
- Vector embeddings and semantic search
- User preference management

