# Kiran Implementation Guide

This document outlines frameworks, libraries, and approaches for implementing Kiran's core components.

## Architecture Overview

Kiran is a modular system with the following major components:
1. **Virtual Android Layer** - For notification feed capture
2. **Feed Ingestion Modules** - Pluggable modules for various social platforms
3. **Processing Engine** - Node.js-based content processing and interest matching
4. **Memory/Database Layer** - Relational database for user preferences and memories
5. **Dream System** - AI-powered interest extraction from user instructions
6. **GUI Interface** - Progressive Web App for user interaction

---

## 1. Virtual Android Layer

### Options for Android Emulation/Notification Capture

#### Option A: Android-x86 with VirtualBox/QEMU (Recommended for self-hosting)
- **Android-x86**: Open-source Android port for x86 systems
- **QEMU/KVM**: Lightweight virtualization (better for headless servers)
- **VirtualBox**: Easier setup, good for development
- **ADB (Android Debug Bridge)**: Capture notifications via `adb shell dumpsys notification`
- **Pros**: Full control, self-hosted, no cloud dependencies
- **Cons**: Resource-intensive, requires GPU passthrough for some apps

#### Option B: Genymotion Cloud/Desktop
- **Genymotion**: Professional Android emulator
- **API Access**: Can be automated via REST API
- **Pros**: More stable, better performance, cloud options
- **Cons**: Commercial license required for production, less self-hosted friendly

#### Option C: Appium + Real Device/Emulator
- **Appium**: Cross-platform mobile automation framework
- **Notification Listener Service**: Custom Android app to capture notifications
- **Pros**: Industry standard, well-documented, supports real devices
- **Cons**: Requires custom Android app development

#### Option D: Alternative Approach - Direct API Access (Where Available)
- **Official APIs**: Twitter API, Reddit API, Mastodon API, etc.
- **Webhooks**: Some platforms support webhooks for real-time updates
- **Pros**: More reliable, no emulation overhead, official support
- **Cons**: Limited availability, rate limits, some platforms don't offer APIs

### Recommended Implementation
**Hybrid Approach**: Use direct APIs where available, fall back to Android emulation for platforms without APIs.

**Libraries/Tools**:
- `adb` (Android Debug Bridge) - Command-line tool
- `node-adb` or `adbkit` - Node.js ADB client
- `qemu-system-x86_64` - For virtualization
- Custom Android app with NotificationListenerService (if using Appium approach)

---

## 2. Feed Ingestion Modules (Pluggable Architecture)

### Social Media API Clients

#### Mastodon/Fediverse
- **mastodon-api** (Node.js) - Official Mastodon API client
- **gotosocial** - Self-hosted ActivityPub server (if you want to run your own instance)
- **ActivityPub** protocol support for broader Fediverse compatibility

#### Twitter/X
- **twitter-api-v2** (Node.js) - Twitter API v2 client
- **twit** (Node.js) - Older but stable Twitter API client
- **Note**: Twitter API access is now paid/restricted

#### Reddit
- **snoowrap** (Node.js) - Reddit API wrapper
- **node-reddit-api** - Alternative Reddit client
- **Pros**: Reddit API is free and well-documented

#### RSS/Atom Feeds
- **rss-parser** (Node.js) - Universal RSS/Atom parser
- **feedparser** (Python alternative)
- **Pros**: Works for blogs, news sites, many platforms

#### Instagram
- **instagram-private-api** (Node.js) - Unofficial API (risky, may break)
- **Puppeteer/Playwright** - Browser automation for scraping
- **Note**: Instagram has strict anti-scraping measures

#### YouTube
- **youtube-api-v3** (Node.js) - Official YouTube Data API
- **ytdl-core** - For video metadata (not for feed ingestion)

#### Discord
- **discord.js** - Official Discord.js library
- **Pros**: Excellent API, real-time via WebSockets

#### Telegram
- **node-telegram-bot-api** - Telegram Bot API
- **telegram** (MTProto) - Full Telegram client

### Module Architecture Pattern

```javascript
// Example module interface
class FeedModule {
  constructor(config) {
    this.name = config.name;
    this.platform = config.platform;
  }
  
  async initialize() {}
  async fetchFeed() {}
  async processItem(item) {}
  async authenticate() {}
}
```

**Recommended Libraries**:
- **TypeScript** - For type-safe module interfaces
- **InversifyJS** or **Awilix** - Dependency injection for pluggable modules
- **EventEmitter** - For real-time feed updates

---

## 3. Processing Engine (Node.js)

### Content Processing

#### Natural Language Processing
- **Natural** (Node.js) - NLP toolkit with tokenization, stemming, etc.
- **compromise** - Lightweight NLP library
- **node-nlp** - More advanced NLP with language detection

#### Text Analysis
- **sentiment** - Sentiment analysis
- **keyword-extractor** - Extract keywords from text
- **text-statistics** - Readability and text metrics

#### AI/ML Integration
- **LangChain.js** - Framework for building LLM applications
- **LlamaIndex.js** - Data framework for LLM applications
- **OpenAI SDK** - For GPT-based content analysis
- **Hugging Face Transformers.js** - Run models in browser/Node.js

### Interest Matching Engine

#### Semantic Search
- **pgvector** (PostgreSQL extension) - Vector similarity search
- **Qdrant** - Vector database (alternative to pgvector)
- **Pinecone** - Managed vector database (cloud option)
- **Chroma** - Open-source vector database

#### Embedding Models
- **@xenova/transformers** - Run embedding models locally
- **OpenAI Embeddings API** - Cloud-based embeddings
- **Sentence Transformers** - For semantic similarity

#### Recommendation/Filtering
- **ml-matrix** - Matrix operations for collaborative filtering
- **brain.js** - Neural networks in JavaScript
- **tensorflow.js** - Full ML framework

**Recommended Stack**:
- **Express.js** or **Fastify** - Web framework
- **Bull** or **BullMQ** - Job queue for processing tasks
- **Redis** - Caching and job queue backend
- **Winston** or **Pino** - Logging

---

## 4. Database Layer

### Relational Database Options

#### PostgreSQL (Recommended)
- **pg** or **node-postgres** - PostgreSQL client
- **Prisma** - Modern ORM with excellent TypeScript support
- **TypeORM** - Mature ORM with decorators
- **Sequelize** - Older but stable ORM
- **pgvector** extension - For vector/semantic search
- **Pros**: Excellent JSON support, full-text search, extensible

#### SQLite (For lightweight deployments)
- **better-sqlite3** - Fast synchronous SQLite
- **Pros**: Zero configuration, single file, perfect for self-hosting
- **Cons**: Limited concurrency, no network access

#### MySQL/MariaDB
- **mysql2** - MySQL client
- **Pros**: Widely used, good performance
- **Cons**: Less feature-rich than PostgreSQL

### Database Schema Considerations

**Core Tables**:
- `users` - User accounts and preferences
- `interests` - User-defined interests (tags, keywords, semantic vectors)
- `memories` - Things user wants/don't want (with embeddings)
- `feed_items` - Cached feed items from various sources
- `notifications` - Generated notifications for user
- `feed_modules` - Configuration for each feed source
- `processing_jobs` - Queue of items to process

**Recommended**: **PostgreSQL + Prisma** for type safety and migrations

---

## 5. Dream System (Interest Extraction)

The "Dream System" processes user instructions and memories into structured interests.

### AI Framework Options

#### LangChain.js (Recommended)
- **Purpose**: Build LLM applications with chains, agents, and memory
- **Features**: 
  - Prompt templates
  - Memory management
  - Tool/function calling
  - Vector store integration
- **Use Case**: Process user instructions like "I want to see posts about climate change but not political debates"

#### LlamaIndex.js
- **Purpose**: Data framework for LLM applications
- **Features**:
  - Document indexing
  - Query engines
  - Data connectors
- **Use Case**: Index user memories and query for relevance

#### OpenAI Function Calling
- **Purpose**: Structured output from LLMs
- **Use Case**: Extract structured interest data from natural language

#### Local LLM Options
- **Ollama** - Run LLMs locally (Llama 2, Mistral, etc.)
- **llama.cpp** - C++ implementation for local inference
- **Transformers.js** - Run smaller models in Node.js

### Implementation Pattern

```javascript
// Dream system processes user input into structured interests
class DreamSystem {
  async processInstruction(instruction) {
    // 1. Parse instruction with LLM
    // 2. Extract interests, preferences, filters
    // 3. Generate embeddings for semantic matching
    // 4. Store in database
  }
  
  async matchContent(content, userInterests) {
    // 1. Generate embedding for content
    // 2. Compare against user interest embeddings
    // 3. Return relevance score
  }
}
```

**Recommended**: **LangChain.js + OpenAI API** (with option to use Ollama for local deployment)

---

## 6. GUI Interface (Progressive Web App)

### Frontend Framework Options

#### Next.js (Recommended)
- **Pros**: 
  - Server-side rendering
  - API routes built-in
  - Excellent TypeScript support
  - Great for PWAs
- **PWA Support**: `next-pwa` plugin

#### Remix
- **Pros**: Web standards focused, great DX
- **Cons**: Smaller ecosystem than Next.js

#### SvelteKit
- **Pros**: Lightweight, fast, great DX
- **Cons**: Smaller ecosystem

#### Vite + React/Vue
- **Pros**: Fast dev server, flexible
- **PWA Support**: `vite-plugin-pwa`

### UI Component Libraries

- **shadcn/ui** - Beautiful, accessible components (React)
- **Radix UI** - Unstyled, accessible primitives
- **Tailwind CSS** - Utility-first CSS
- **Headless UI** - Unstyled accessible components

### Real-time Updates

- **Socket.io** - WebSocket library for real-time notifications
- **Server-Sent Events (SSE)** - Simpler alternative for one-way updates
- **WebSockets (native)** - If you want to avoid Socket.io overhead

### PWA Features

- **Workbox** - Service worker library
- **Web Push API** - For browser notifications
- **IndexedDB** - Client-side storage for offline support

**Recommended Stack**: **Next.js + TypeScript + Tailwind CSS + shadcn/ui + Socket.io**

---

## 7. Additional Infrastructure Components

### Job Queue & Background Processing

- **Bull/BullMQ** - Redis-based job queue
- **Agenda** - MongoDB-based job scheduler
- **node-cron** - Simple cron jobs
- **Use Case**: Process feeds, generate embeddings, match content

### Caching

- **Redis** - In-memory cache
- **node-cache** - Simple in-memory cache (for single-instance)
- **Use Case**: Cache feed data, embeddings, API responses

### Authentication & Authorization

- **NextAuth.js** - Authentication for Next.js
- **Passport.js** - Authentication middleware
- **JWT** - Token-based auth
- **OAuth 2.0** - For social login (optional)

### Monitoring & Logging

- **Winston** or **Pino** - Logging
- **Sentry** - Error tracking
- **Prometheus + Grafana** - Metrics (for self-hosted)
- **Health checks** - For monitoring system status

### Deployment

- **Docker** - Containerization
- **Docker Compose** - Multi-container setup
- **Kubernetes** - For scaling (optional)
- **Nginx** - Reverse proxy
- **Let's Encrypt** - SSL certificates

---

## Recommended Tech Stack Summary

### Core Stack
- **Runtime**: Node.js 20+ (LTS)
- **Language**: TypeScript
- **Database**: PostgreSQL + pgvector
- **Cache/Queue**: Redis
- **ORM**: Prisma

### Processing
- **AI Framework**: LangChain.js
- **LLM**: OpenAI API (with Ollama fallback for local)
- **Embeddings**: OpenAI or local transformers
- **Vector DB**: pgvector (PostgreSQL extension)

### Feed Ingestion
- **Module System**: Custom with TypeScript interfaces
- **APIs**: Platform-specific clients (mastodon-api, snoowrap, etc.)
- **Android**: QEMU + Android-x86 + ADB (for platforms without APIs)

### Frontend
- **Framework**: Next.js 14+
- **UI**: Tailwind CSS + shadcn/ui
- **Real-time**: Socket.io
- **PWA**: next-pwa

### Infrastructure
- **Job Queue**: BullMQ
- **Logging**: Pino
- **Containerization**: Docker + Docker Compose

---

## Alternative Frameworks to Consider

### If Not Using ElizaOS

1. **LangChain.js** - Most relevant for the "Dream System" and AI processing
2. **LlamaIndex.js** - Good for semantic search and retrieval
3. **CrewAI** - Multi-agent framework (if you want multiple specialized agents)
4. **AutoGPT** - Autonomous agent framework (may be overkill)
5. **BabyAGI** - Task-oriented agent framework

### For Social Media Integration

1. **Social Media APIs** - Always prefer official APIs
2. **Puppeteer/Playwright** - For scraping when APIs unavailable
3. **RSS/Atom** - Universal feed format many platforms support
4. **ActivityPub** - For Fediverse (Mastodon, etc.)

---

## Framework Comparison Table

This table evaluates AI agent frameworks specifically for Kiran's use case, focusing on social media feed processing, interest extraction, content filtering, self-hosting, and privacy requirements.

| Framework | Primary Language | Best For | Pros | Cons | Relevance to Kiran |
|-----------|-----------------|----------|------|------|-------------------|
| **ElizaOS** | TypeScript/Node.js | Social media agents, multi-platform bots | • Built-in social media integrations (Twitter, Discord, Telegram)<br>• Modular plugin architecture<br>• Supports multiple LLMs (GPT-4, Claude, Llama)<br>• Voice, text, and media interactions<br>• RAG for long-term memory<br>• Active development by AI16Z | • Requires TypeScript knowledge<br>• May be over-engineered for simple use cases<br>• Less focus on content filtering<br>• Community still growing | **High** - Designed for social media agents, but may need customization for filtering use case |
| **LangChain.js** | TypeScript/JavaScript | LLM applications, chains, agents | • Excellent for building custom LLM workflows<br>• Strong TypeScript support<br>• Vector store integration (pgvector, Pinecone, etc.)<br>• Memory management<br>• Tool/function calling<br>• Large community and documentation<br>• Works with local models (Ollama) | • Lower-level framework (more code to write)<br>• No built-in social media integrations<br>• Requires building feed ingestion yourself | **Very High** - Perfect for "Dream System" and interest extraction, but need to build social media layer |
| **LlamaIndex.js** | TypeScript/JavaScript | Data indexing, semantic search, RAG | • Excellent for document indexing and querying<br>• Strong semantic search capabilities<br>• Data connectors for various sources<br>• Vector store integration<br>• Good for building knowledge bases | • Focused on retrieval, less on agent orchestration<br>• No social media integrations<br>• Smaller community than LangChain | **High** - Great for indexing user memories and interests, but need other tools for agent logic |
| **CrewAI** | Python | Multi-agent systems, collaborative agents | • Designed for multiple specialized agents<br>• Agent collaboration and task delegation<br>• Role-based agent architecture<br>• Good for complex workflows | • Python-based (would need separate Node.js integration)<br>• Overkill for single-user filtering system<br>• No social media integrations<br>• Less mature JavaScript version | **Medium** - Could be useful if building multiple specialized agents, but adds complexity |
| **Rig** | Rust | Modular, scalable AI agents | • High performance (Rust)<br>• Modular architecture<br>• Open-source<br>• Focus on scalability | • Rust learning curve<br>• Smaller community<br>• Limited documentation<br>• No social media integrations<br>• Would need to build everything from scratch | **Low** - Performance benefits don't outweigh the complexity for this use case |
| **Shinkai** | Multiple | Decentralized AI agents, local models | • Decentralized network approach<br>• Run models locally<br>• Community-driven<br>• Privacy-focused | • Very new/experimental<br>• Limited documentation<br>• Decentralized model may not fit self-hosted single-user use case<br>• No social media integrations | **Low** - Interesting for privacy, but too experimental and not aligned with Kiran's architecture |
| **Pippin** | Python | Modular digital assistants | • Created by BabyAGI founder<br>• Modular design<br>• Autonomous agent capabilities | • Python-based<br>• Relatively new<br>• Limited adoption and documentation<br>• No social media focus | **Low** - Too new and Python-based, doesn't align with Node.js stack |
| **ZerePy** | Python | Creative AI, social media agents | • Focus on social media integration<br>• Creative AI capabilities<br>• Multi-platform deployment | • Python-based (not Node.js)<br>• Focused on content creation, not filtering<br>• Requires fine-tuning<br>• Limited documentation | **Medium** - Social media focus is relevant, but Python stack and creation focus don't match Kiran |
| **Daydreams** | Multiple | Blockchain/on-chain agents | • Autonomous agent framework<br>• Task-oriented | • Blockchain-focused (not relevant)<br>• Limited documentation<br>• Niche use case | **Very Low** - Blockchain focus is not relevant to Kiran |
| **Liz** | TypeScript/JavaScript | Lightweight AI agents, developer control | • Lightweight and focused<br>• Direct prompt/model access<br>• Express-style middleware<br>• TypeScript support<br>• Good developer experience | • Very new framework<br>• Smaller community<br>• Less feature-rich than LangChain<br>• No social media integrations | **Medium** - Could be good for simple agent logic, but LangChain is more mature |

### Evaluation Criteria Summary

**Social Media Platform Support:**
- **ElizaOS**: Built-in (Twitter, Discord, Telegram)
- **Others**: None built-in, require custom integration

**Interest Extraction Capabilities:**
- **LangChain.js**: Excellent (chains, prompts, function calling)
- **LlamaIndex.js**: Good (semantic search, querying)
- **ElizaOS**: Good (RAG, memory)
- **Others**: Limited or require significant custom work

**Self-Hosting Support:**
- **LangChain.js**: Excellent (works with local models via Ollama)
- **LlamaIndex.js**: Excellent (local vector stores)
- **ElizaOS**: Good (supports local models)
- **Others**: Varies, some require cloud services

**Privacy/Data Ownership:**
- **LangChain.js**: Excellent (full control, local models)
- **LlamaIndex.js**: Excellent (self-hosted)
- **ElizaOS**: Good (self-hostable)
- **Others**: Varies

**Learning Curve:**
- **ElizaOS**: Medium (TypeScript, plugin system)
- **LangChain.js**: Medium-High (comprehensive but well-documented)
- **LlamaIndex.js**: Medium (focused API)
- **Liz**: Low-Medium (lightweight)
- **Others**: Varies

**Community/Documentation:**
- **LangChain.js**: Excellent (large community, extensive docs)
- **ElizaOS**: Good (growing, AI16Z backing)
- **LlamaIndex.js**: Good (active community)
- **Others**: Limited to very limited

**Modularity:**
- **ElizaOS**: Excellent (plugin architecture)
- **LangChain.js**: Excellent (composable chains)
- **CrewAI**: Excellent (multi-agent)
- **Others**: Varies

**TypeScript/Node.js Support:**
- **ElizaOS**: Native TypeScript
- **LangChain.js**: Native TypeScript
- **LlamaIndex.js**: Native TypeScript
- **Liz**: Native TypeScript
- **Others**: Python or limited JS support

**Cost/Licensing:**
- All listed frameworks: Open-source (free)
- Note: LLM API costs (OpenAI, Anthropic) apply regardless of framework

---

## Framework Recommendations for Kiran

Based on the comparison above, here are specific recommendations for each component of Kiran:

### Dream System (Interest Extraction)
**Recommended: LangChain.js**
- Best fit for processing user instructions into structured interests
- Excellent prompt management and function calling for extracting preferences
- Strong TypeScript support aligns with Node.js stack
- Can use local models (Ollama) for privacy
- Large community and documentation

**Alternative: LlamaIndex.js** if you need more focus on semantic search and retrieval

### Content Processing & Matching
**Recommended: LangChain.js + pgvector**
- LangChain for content analysis and filtering logic
- pgvector (PostgreSQL extension) for semantic similarity matching
- Can generate embeddings and compare against user interest vectors
- All self-hosted and privacy-preserving

**Alternative: LlamaIndex.js** if you want more built-in retrieval capabilities

### Social Media Integration
**Recommended: Custom Module System + Platform APIs**
- Build your own pluggable module architecture
- Use official APIs where available (Mastodon, Reddit, etc.)
- For platforms without APIs, use Android emulation approach

**Alternative: ElizaOS** if you want to leverage its built-in social media integrations, but you'll need to adapt it for filtering rather than posting

### Overall Architecture Recommendation

**Hybrid Approach:**
1. **Core Processing**: LangChain.js for the Dream System and content processing
2. **Semantic Search**: LlamaIndex.js or pgvector for interest matching
3. **Feed Ingestion**: Custom TypeScript modules (not a framework)
4. **Social Media**: Platform-specific API clients + Android emulation fallback

**Why not ElizaOS?**
While ElizaOS is well-designed for social media agents, it's optimized for agents that *interact* with social media (posting, responding). Kiran's use case is different - it's a *filtering* system that watches and processes content without posting. Building custom modules gives you more control and avoids unnecessary features.

**Why LangChain.js over others?**
- Mature, well-documented, TypeScript-native
- Perfect for building custom LLM workflows
- Works with local models for privacy
- Large community for support
- Flexible enough to build exactly what Kiran needs

---

## Implementation Phases

### Phase 1: Core Infrastructure
1. Set up Node.js + TypeScript project
2. Set up PostgreSQL database with Prisma
3. Create basic API with Express/Next.js
4. Implement authentication

### Phase 2: Feed Ingestion
1. Create module interface/architecture
2. Implement 2-3 feed modules (e.g., RSS, Reddit, Mastodon)
3. Set up job queue for feed processing
4. Test feed ingestion and storage

### Phase 3: Dream System
1. Set up LangChain.js
2. Implement interest extraction from user input
3. Create embedding generation pipeline
4. Build semantic matching engine

### Phase 4: Processing Engine
1. Implement content processing pipeline
2. Build interest matching logic
3. Create notification generation system
4. Add filtering and scoring

### Phase 5: Virtual Android (If Needed)
1. Set up Android-x86 in QEMU
2. Create ADB integration
3. Build notification capture system
4. Test with target social apps

### Phase 6: Frontend
1. Set up Next.js PWA
2. Build user interface
3. Implement real-time updates
4. Add notification system

### Phase 7: Polish & Deploy
1. Add monitoring and logging
2. Optimize performance
3. Create Docker setup
4. Write documentation

---

## Key Considerations

1. **Self-Hosted First**: All components should work without cloud dependencies
2. **Privacy**: User data never leaves their control
3. **Modularity**: Easy to add new feed sources
4. **Performance**: Efficient processing of large feed volumes
5. **Reliability**: Handle API failures, rate limits, etc.
6. **User Control**: Users should understand and control what Kiran does

---

## Resources & Documentation

- **LangChain.js Docs**: https://js.langchain.com/
- **Prisma Docs**: https://www.prisma.io/docs
- **Next.js Docs**: https://nextjs.org/docs
- **PostgreSQL pgvector**: https://github.com/pgvector/pgvector
- **Android-x86**: https://www.android-x86.org/
- **ADB Documentation**: https://developer.android.com/tools/adb

