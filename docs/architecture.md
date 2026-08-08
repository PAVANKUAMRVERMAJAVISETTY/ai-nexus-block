# Architecture

## Overview

AI Nexus Block uses a feature-based architecture built on Next.js App Router. Each feature is an independent module with clear boundaries.

## Principles

1. **One feature = one independent module** — Features do not depend on each other directly.
2. **Shared UI in `components/`** — Reusable UI components belong in the shared components directory.
3. **Business logic in `features/` and `services/`** — Feature-specific logic stays within feature boundaries.
4. **External integrations in `services/` and `lib/`** — Provider integrations (AI, database) are isolated.

## Route Groups

- `(public)/` — Public-facing pages (home, projects, tools, knowledge, roadmaps, resources, journey, my-block)
- `(auth)/` — Authentication pages (login, forgot-password, auth-callback)
- `(workspace)/` — Authenticated user workspace (dashboard, assistant, debug, notes, conversations, decisions)
- `admin/` — Admin panel (content management, settings, analytics)
- `api/` — API route handlers (ai, search, recommendations, health)

## Layouts

Each route group has its own layout with a distinct shell:
- `PublicShell` — Public header + footer
- `AuthLayout` — Centered card layout
- `WorkspaceShell` — Sidebar navigation
- `AdminShell` — Admin sidebar navigation

## Data Flow

```
UI Components → Services → lib/supabase → Supabase
                Services → lib/ai → AI Providers
```

Services act as the boundary between UI and external systems. UI components never call Supabase or AI providers directly.

## Configuration

All configuration is centralized in `config/`:
- `site.ts` — Site metadata and author info
- `navigation.ts` — Navigation items for each shell
- `routes.ts` — Typed route helpers
- `ai.ts` — AI provider configuration
- `permissions.ts` — Role-based permissions
