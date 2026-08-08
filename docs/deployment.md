# Deployment

## Platform

The project is configured for deployment on Vercel.

## Build

```bash
npm run build
```

## Environment Variables

Set the following environment variables in the Vercel dashboard:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `GEMINI_API_KEY`
- `OPENAI_API_KEY`
- `ANTHROPIC_API_KEY`

## Notes

- Images are optimized via `next/image` with `unoptimized: true` for compatibility
- ESLint warnings do not block builds (`ignoreDuringBuilds: true`)
- The Supabase project is provisioned separately and connected via environment variables
