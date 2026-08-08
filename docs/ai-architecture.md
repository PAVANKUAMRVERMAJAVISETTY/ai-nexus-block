# AI Architecture

## Overview

AI Nexus Block supports multiple AI providers through a unified interface. The architecture is designed to avoid hardcoding any single provider.

## Provider Interface

```typescript
interface AIProvider {
  id: AIProviderId;
  generate(request: AIRequest): Promise<AIResponse>;
}
```

## Planned Providers

| Provider | Service File | Default Model |
|----------|-------------|---------------|
| Google Gemini | `services/ai/gemini.service.ts` | gemini-1.5-pro |
| OpenAI | `services/ai/openai.service.ts` | gpt-4o |
| Anthropic Claude | `services/ai/claude.service.ts` | claude-3-5-sonnet |

## Architecture Layers

```
app/api/ai/route.ts    → API endpoint
lib/ai/provider.ts     → Provider resolution
lib/ai/prompts.ts      → System prompts per mode
lib/ai/context.ts      → Context building (future RAG)
lib/ai/safety.ts       → Input validation and rate limiting
services/ai/*.ts       → Provider implementations
```

## AI Modes

- `recommend_stack` — Recommend a technology stack
- `debug_problem` — Debug a code problem
- `compare_tools` — Compare AI/developer tools
- `plan_project` — Plan a project
- `learn_concept` — Learn a technical concept
- `general` — General assistant

## Future: RAG and Vector Search

- pgvector extension for embedding storage
- Knowledge articles and tools indexed as embeddings
- Context builder retrieves relevant content before generation
- Search endpoint supports both full-text and semantic search
