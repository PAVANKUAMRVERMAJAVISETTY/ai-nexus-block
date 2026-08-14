# AI Nexus Block Agent Tool Contracts

Every tool is server-side.

The AI model requests a tool.
The server validates the request.
The server performs the action.
The tool returns structured JSON.

## Read tools

### search_website_knowledge

Input:
{
  "query": string,
  "pageType": string | null,
  "pageId": string | null
}

Purpose:
Search internal AI Nexus Block knowledge.

Possible knowledge sources:
- projects
- tools
- roadmaps
- research
- notes
- site_profile
- site_settings

Do not invent table names before schema inspection.

---

### search_web_external

Input:
{
  "query": string,
  "maxResults": number
}

Purpose:
Tavily web search.

Only call when:
- local knowledge is insufficient
- query requires current/external information

---

## Admin tools

### update_site_setting

Input:
{
  "settingKey": string,
  "settingValue": unknown
}

Required:
authenticated super_admin.

---

### update_profile

Input:
{
  "fields": object
}

Required:
authenticated super_admin.

---

### update_tool

Input:
{
  "toolId": string,
  "changes": object
}

Required:
authenticated super_admin.

---

### update_project

Input:
{
  "projectId": string,
  "changes": object
}

Required:
authenticated super_admin.

---

### update_roadmap

Input:
{
  "roadmapId": string,
  "changes": object
}

Required:
authenticated super_admin.

---

### create_pending_knowledge_review

Input:
{
  "title": string,
  "category": string,
  "summary": string,
  "content": object,
  "sourceUrls": string[]
}

Purpose:
Stage external information for administrator approval.

---

## IMPORTANT SECURITY RULE

Never trust:
userRole
isAdmin
isSuperAdmin

when supplied by the client.

Always derive identity and authorization from the authenticated server-side session.
