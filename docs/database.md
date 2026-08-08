# Database

## Overview

The database uses Supabase (PostgreSQL). Tables are not yet created — this document describes the planned schema.

## Naming Convention

- All table names use **lowercase snake_case**
- All table names are **plural**

## Planned Tables

| Table | Purpose |
|-------|---------|
| `profiles` | User profile data |
| `user_roles` | Role assignments (admin, editor, user) |
| `tools` | AI and developer tools |
| `tool_categories` | Tool categories |
| `tool_features` | Tool feature lists |
| `tool_pros_cons` | Tool pros and cons |
| `tool_stack_compatibility` | Tool technology compatibility |
| `projects` | Project showcases |
| `project_technologies` | Technologies used in projects |
| `project_challenges` | Project challenges and solutions |
| `knowledge_articles` | Knowledge articles |
| `knowledge_categories` | Article categories |
| `roadmaps` | Learning roadmaps |
| `roadmap_steps` | Steps within roadmaps |
| `resources` | Curated resources |
| `journey_entries` | Journey timeline entries |
| `engineering_decisions` | Architecture decision records |
| `ai_conversations` | AI assistant conversations |
| `ai_messages` | Messages within conversations |
| `ai_recommendations` | AI recommendation records |
| `ai_recommendation_items` | Individual recommendation items |
| `debug_sessions` | Debug session records |
| `notes` | Personal notes |
| `saved_tools` | User's saved tools |
| `media_assets` | Media file metadata |
| `page_views` | Page view tracking |
| `project_views` | Project view tracking |

## Storage Buckets

| Bucket | Purpose |
|--------|---------|
| `avatars` | User avatar images |
| `profile_media` | Profile-related media |
| `tool_media` | Tool images and logos |
| `project_media` | Project cover images |
| `knowledge_media` | Article images |
| `roadmap_media` | Roadmap images |
| `resource_media` | Resource images |
| `journey_media` | Journey entry images |
| `documents` | General documents |

## RLS

Row Level Security will be enabled on all tables. Policies will enforce:
- Public read access for published content
- Authenticated write access for content owners
- Admin-only access for user management and settings
