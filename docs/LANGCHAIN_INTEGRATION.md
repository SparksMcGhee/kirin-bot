# Kirin LangChain.js Integration

## Overview
This document outlines the plan for integrating LangChain.js into Kirin for advanced content processing.

## Features to Implement

### 1. RAG (Retrieval-Augmented Generation)
- Store conversation history in pgvector
- Query similar past conversations for context
- Improve summary accuracy with historical context

### 2. Prompt Management
- Use LangChain's PromptTemplate
- Version control for prompts
- A/B testing different prompt strategies

### 3. Topic Extraction
- Use LangChain chains to extract topics from conversations
- Store topics in PostgreSQL for filtering

### 4. Relevance Scoring
- Implement embeddings-based relevance scoring
- Use user feedback to tune relevance thresholds

### 5. Multi-Step Processing
- Chain multiple LLM calls for complex tasks
- Example: Extract → Classify → Summarize → Store

## Implementation Status
- [ ] Setup LangChain.js with Ollama
- [ ] Implement basic RAG with pgvector
- [ ] Create prompt templates
- [ ] Add topic extraction
- [ ] Implement relevance scoring

## Notes
This is a future enhancement. The current implementation uses direct Ollama API calls.

