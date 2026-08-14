# AI Provider Expansion Roadmap

## CURRENT VERIFIED FOUNDATION

1. Gemini
2. Groq
3. Mistral
4. OpenAI
5. Claude
6. Ollama

Do not remove or rewrite this foundation.

## FUTURE EXTENSIONS

Candidate providers:

7. Cerebras
8. OpenRouter
9. NVIDIA
10. Cohere
11. DeepSeek
12. Hugging Face

These are candidates, not automatically enabled providers.

Before enabling each:
- verify current API
- verify authentication
- verify model endpoint
- verify current limits
- verify current pricing/free tier
- implement provider adapter
- add timeout
- add AbortSignal
- add HTTP error handling
- test fallback
- test rate-limit behavior

Never activate a provider merely because an API key exists.
