# Development Guide

## Getting Started

```bash
npm install
npm run dev
```

The development server runs automatically in this environment.

## Scripts

- `npm run dev` — Start development server
- `npm run build` — Production build
- `npm run start` — Start production server
- `npm run lint` — Run ESLint
- `npm run typecheck` — Run TypeScript type checking

## Code Conventions

- TypeScript strict mode — no `any`
- Feature-based architecture — one feature = one independent module
- Shared UI in `components/`, business logic in `features/` and `services/`
- Clean imports using `@/` path alias
- Reusable components with single responsibility
- Small files — no giant files
- No business logic in UI components
- No secrets in source code

## Adding a New Feature

1. Create the feature module in `features/<name>/` with `components/`, `hooks/`, `services/`, `types/`, `README.md`
2. Add TypeScript interfaces to `types/` if shared
3. Add service functions to `services/<name>/`
4. Create routes in `app/` using the appropriate route group
5. Add navigation items to `config/navigation.ts` if needed
6. Add routes to `config/routes.ts`

## Adding an AI Provider

1. Create a service file in `services/ai/<provider>.service.ts`
2. Implement the `AIProvider` interface from `lib/ai/provider.ts`
3. Add provider config to `config/ai.ts`
4. Add environment variable to `.env.example`

## Database Migrations

Use the Supabase MCP `apply_migration` tool for DDL operations. Never use raw SQL outside of migration tools.
