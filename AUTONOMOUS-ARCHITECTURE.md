# AI Nexus Block
# Autonomous Agent Platform

## CURRENT FOUNDATION

Frontend:
- Next.js
- React
- TypeScript
- Tailwind CSS

Backend:
- Next.js server/API routes
- Supabase
- PostgreSQL
- Supabase Auth
- Row Level Security

Deployment:
- Vercel

Current AI provider foundation:
- Gemini
- Groq
- Mistral
- OpenAI
- Claude
- Ollama (local development)

Current web search:
- Tavily

## CURRENT PROVIDER CASCADE

Gemini
→ Groq
→ Mistral
→ OpenAI
→ Claude
→ Ollama

Existing resilience:
- provider abstraction
- fallback cascade
- provider-specific timeouts
- AbortController
- AbortSignal
- HTTP error handling

## TARGET AUTONOMOUS ARCHITECTURE

User
↓
Authentication
↓
Current Page Context
↓
Intent / Agent Router
↓
Controlled Tools
↓
Website Knowledge Search
↓
Tavily External Search when necessary
↓
Existing AI Provider Cascade
↓
Answer OR Authorized Action
↓
Supabase / UI Update

## AGENT TOOLS

Planned controlled tools:

1. search_website_knowledge
2. search_web_external
3. update_site_setting
4. update_profile
5. update_project
6. update_tool
7. update_roadmap
8. create_pending_knowledge_review
9. approve_pending_knowledge
10. reject_pending_knowledge
11. generate_project_files
12. export_project_zip

## DATABASE FOUNDATION

New tables:

site_settings
site_profile
pending_knowledge_reviews
ai_agent_actions
nexus_media_assets

Existing tables must be inspected before modification:

projects
tools
roadmaps
profiles
conversations / chat tables
any existing settings/content tables

## SECURITY RULE

The AI model never receives unrestricted database access.

The server:
- validates authentication
- verifies authorization
- validates tool input
- executes allowed database mutations
- records privileged actions

Never trust a userRole value sent from the browser.

## PAGE-AWARE AI

The assistant should understand:
- current pathname
- page type
- relevant entity ID

Examples:
- /tools
- /projects
- /roadmaps
- /about
- /research
- /ide

## KNOWLEDGE ROUTING

First:
Search internal AI Nexus Block data.

If relevant information exists:
Use internal information.

If no relevant information exists:
Use Tavily when external/current information is needed.

Then:
Use the existing provider cascade to synthesize the answer.

## EXTERNAL KNOWLEDGE PIPELINE

External result
↓
relevance check
↓
structured content
↓
pending_knowledge_reviews
↓
admin approval
↓
public content

Do not automatically publish arbitrary web information.

## PROFILE SYSTEM

Admin-managed:

- photo
- name
- title
- biography
- skills
- education
- experience
- projects
- achievements
- resume
- GitHub
- LinkedIn
- contact links

## MULTIMODAL TARGET

- text
- images
- videos
- voice input
- spoken responses

## PRIVACY TARGET

Conversation/session cleanup:
approximately 2 hours after logout/session completion.

Must be server/database controlled.

## NEXUS IDE TARGET

- Monaco
- multi-file projects
- AI code generation
- project preview
- execution/testing
- self-debugging
- ZIP export

## TESTING TARGET

Java
Selenium WebDriver
JUnit
Maven

## PROVIDER EXPANSION TARGET

Future providers may include:
- Cerebras
- OpenRouter
- NVIDIA
- Cohere
- DeepSeek
- Hugging Face

Provider availability, models, limits, and pricing/free-tier rules must be verified before activation.

Do not claim permanent free access without verification.
