# AI Nexus Block

## Agentic Knowledge OS & Multi-Tenant Developer Sandbox

AI Nexus Block is a production-grade AI-powered developer workspace, knowledge platform, tool discovery system, engineering journal, project showcase, AI assistant, and living developer portfolio.

## Vision

Help developers and students discover AI and developer tools, understand which tool is appropriate for a problem, learn technologies, follow engineering roadmaps, document projects, record engineering problems and solutions, maintain personal knowledge, debug code with AI, receive AI-powered tool recommendations, maintain a living developer portfolio, and prepare for technical interviews.

## Features

### Public Experience
- Developer profile (My Block slide-over panel)
- Project showcase with case studies
- AI/developer tool catalog with pricing and categories
- Knowledge articles and guides
- Engineering roadmaps with visual timelines
- Engineering journey timeline
- Curated resources
- Public AI assistant CTA

### Authenticated Workspace
- Dashboard with statistics
- AI Assistant (multi-provider: Gemini, OpenAI, Claude)
- AI-assisted code debugging
- Personal notes
- Conversation history
- Engineering decision records

### Admin Panel
- Content management (tools, projects, knowledge, roadmaps, resources, journey, decisions)
- Profile management
- Media library
- AI settings configuration
- User management
- Analytics

## Architecture

Feature-based architecture where each feature is an independent module with clear boundaries. Shared UI lives in `components/`, business logic in `features/` and `services/`, and external integrations in `services/` and `lib/`.

### Technology Stack
- **Frontend:** Next.js (App Router), React, TypeScript, Tailwind CSS, shadcn/ui, Framer Motion
- **Backend:** Next.js Server Actions, Route Handlers
- **Managed Backend:** Supabase (Auth, Database, Storage)
- **AI Providers:** Google Gemini, OpenAI, Anthropic Claude (planned)
- **Deployment:** Vercel

## Folder Structure

```
app/            — Next.js App Router routes (public, auth, workspace, admin, api)
features/       — Feature-based modules (components, hooks, services, types)
components/     — Shared UI (ui, layout, cards, modals, common, navigation)
lib/            — Shared libraries (supabase, ai, search, security, validation, logger, utils)
services/       — External service integrations (ai providers, data services)
types/          — Centralized TypeScript interfaces
config/         — Application configuration (site, navigation, routes, ai, permissions)
database/       — Database migrations, seed data, and types (planned)
docs/           — Project documentation
hooks/          — Shared React hooks
public/         — Static assets (icons, logos, illustrations)
scripts/        — Utility scripts
tests/          — Test suites (unit, integration, e2e)
```

## Local Development

```bash
npm install
npm run dev
```

The development server runs automatically in this environment.

## Environment Variables

Copy `.env.example` to `.env.local` and fill in the values:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
GEMINI_API_KEY=
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
```

Never commit `.env.local` or include real secrets in source code.

## Supabase Setup

The Supabase project is provisioned and credentials are pre-populated in `.env`. The client/server architecture is prepared in `lib/supabase/` with placeholders for authentication, database queries, and storage.

### Planned Database Tables (lowercase snake_case, plural)

`profiles`, `user_roles`, `tools`, `tool_categories`, `tool_features`, `tool_pros_cons`, `tool_stack_compatibility`, `projects`, `project_technologies`, `project_challenges`, `knowledge_articles`, `knowledge_categories`, `roadmaps`, `roadmap_steps`, `resources`, `journey_entries`, `engineering_decisions`, `ai_conversations`, `ai_messages`, `ai_recommendations`, `ai_recommendation_items`, `debug_sessions`, `notes`, `saved_tools`, `media_assets`, `page_views`, `project_views`

### Planned Storage Buckets

`avatars`, `profile_media`, `tool_media`, `project_media`, `knowledge_media`, `roadmap_media`, `resource_media`, `journey_media`, `documents`

## AI Provider Setup

AI provider integration is prepared but not yet implemented. The architecture supports multiple providers (Gemini, OpenAI, Claude) via `lib/ai/provider.ts` and `services/ai/`. API keys are stored as environment variables and managed via the deployment platform.

## Testing

Test directories are prepared in `tests/unit`, `tests/integration`, and `tests/e2e`. Test implementation will be added in later stages.

## Deployment

The project is configured for deployment on Vercel. Build verification:

```bash
npm run build
```

## Roadmap

1. **Stage 1 (Current):** Project foundation, architecture, UI system, route structure, types, config, service boundaries, documentation
2. **Stage 2:** Database migrations, Supabase Auth, RLS policies
3. **Stage 3:** AI assistant backend, multi-provider support
4. **Stage 4:** RAG, vector search, pgvector integration
5. **Stage 5:** AI recommendations engine
6. **Stage 6:** Analytics backend
7. **Stage 7:** Full CMS functionality
8. **Stage 8:** Testing suite
9. **Stage 9:** Production deployment

## Security Notes

- Never store passwords in the database manually — use Supabase Auth
- Never include real secrets in source code
- Never commit `.env.local`
- Admin access controlled via `user_roles` table (roles: admin, editor, user)
- RLS policies will be enabled on all tables
- Input validation and sanitization at system boundaries
- API keys managed via environment variables only
