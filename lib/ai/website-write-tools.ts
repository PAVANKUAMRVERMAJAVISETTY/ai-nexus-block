import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

type Entity = "project" | "tool" | "knowledge" | "roadmap";
type Action = "create" | "update" | "delete";

export type WebsiteWriteRequest = {
  name: string;
  arguments?: Record<string, unknown>;
};

export type WebsiteWriteResult = {
  success: boolean;
  action: Action;
  entity: Entity;
  data?: unknown;
  error?: string;
};

const ENTITY_TABLE: Record<Entity, string> = {
  project: "nexus_projects",
  tool: "nexus_tools",
  knowledge: "nexus_knowledge",
  roadmap: "nexus_roadmaps",
};

const ENTITY_FIELDS: Record<Entity, Set<string>> = {
  project: new Set([
    "slug",
    "name",
    "description",
    "long_description",
    "category",
    "tags",
    "image_url",
    "live_url",
    "github_url",
    "featured",
    "published",
    "display_order",
  ]),

  tool: new Set([
    "slug",
    "name",
    "description",
    "category",
    "tags",
    "website_url",
    "documentation_url",
    "pricing",
    "pricing_details",
    "logo_url",
    "featured",
    "published",
    "display_order",
  ]),

  knowledge: new Set([
    "slug",
    "title",
    "excerpt",
    "content",
    "category",
    "tags",
    "cover_image_url",
    "reading_time_minutes",
    "is_pinned",
    "featured",
    "published",
    "display_order",
  ]),

  roadmap: new Set([
    "slug",
    "title",
    "description",
    "difficulty",
    "tags",
    "estimated_hours",
    "category",
    "featured",
    "published",
    "display_order",
  ]),
};

async function getAdminClient(): Promise<SupabaseClient> {
  const adminModule = await import("@/lib/supabase/admin");
  const exported = adminModule as Record<string, unknown>;

  for (const [key, value] of Object.entries(exported)) {
    if (
      /admin/i.test(key) &&
      typeof value === "function"
    ) {
      const client = (value as () => unknown)();

      if (
        client &&
        typeof client === "object" &&
        typeof (client as { from?: unknown }).from === "function"
      ) {
        return client as SupabaseClient;
      }
    }
  }

  for (const value of Object.values(exported)) {
    if (
      value &&
      typeof value === "object" &&
      typeof (value as { from?: unknown }).from === "function"
    ) {
      return value as SupabaseClient;
    }
  }

  throw new Error(
    "Could not resolve the existing Supabase admin client from lib/supabase/admin."
  );
}

function cleanPayload(
  entity: Entity,
  input: unknown
): Record<string, unknown> {
  if (
    !input ||
    typeof input !== "object" ||
    Array.isArray(input)
  ) {
    throw new Error("payload must be an object.");
  }

  const source = input as Record<string, unknown>;
  const allowed = ENTITY_FIELDS[entity];
  const output: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(source)) {
    if (!allowed.has(key)) continue;
    if (value === undefined) continue;
    output[key] = value;
  }

  return output;
}

async function getAuthenticatedUser() {
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Readonly request context.
          }
        },
      },
    }
  );

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error("Authentication required.");
  }

  return user;
}

async function assertSuperAdmin() {
  const user = await getAuthenticatedUser();
  const admin = await getAdminClient();

  const { data: profile, error } = await admin
    .from("profiles")
    .select("id, role")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    throw new Error(
      `Unable to verify administrator role: ${error.message}`
    );
  }

  if (!profile || profile.role !== "super_admin") {
    throw new Error("Super-admin permission required.");
  }

  return {
    userId: user.id,
  };
}

async function writeAuditLog(params: {
  userId: string;
  toolName: string;
  action: Action;
  entity: Entity;
  entityId?: string | null;
  payload?: unknown;
  status: "success" | "failed";
  error?: string;
}) {
  const admin = await getAdminClient();

  const record = {
    actor_id: params.userId,
    tool_name: params.toolName,
    action_type: params.action,
    entity_type: params.entity,
    entity_id: params.entityId ?? null,
    payload: params.payload ?? null,
    status: params.status,
    error_message: params.error ?? null,
  };

  const { error } = await admin
    .from("ai_agent_actions")
    .insert(record);

  if (error) {
    throw new Error(
      `AI audit log failed: ${error.message}`
    );
  }
}

async function createEntity(
  entity: Entity,
  args: Record<string, unknown>,
  userId: string,
  toolName: string
): Promise<WebsiteWriteResult> {
  const admin = await getAdminClient();
  const payload = cleanPayload(entity, args.payload);

  if (!payload.slug) {
    throw new Error(
      "Create operation requires payload.slug"
    );
  }

  const { data, error } = await admin
    .from(ENTITY_TABLE[entity])
    .insert(payload)
    .select("*")
    .single();

  if (error) {
    try {
      await writeAuditLog({
        userId,
        toolName,
        action: "create",
        entity,
        payload,
        status: "failed",
        error: error.message,
      });
    } catch {
      // Preserve original write failure.
    }

    throw new Error(error.message);
  }

  await writeAuditLog({
    userId,
    toolName,
    action: "create",
    entity,
    entityId: data?.id ?? null,
    payload,
    status: "success",
  });

  return {
    success: true,
    action: "create",
    entity,
    data,
  };
}

async function updateEntity(
  entity: Entity,
  args: Record<string, unknown>,
  userId: string,
  toolName: string
): Promise<WebsiteWriteResult> {
  const admin = await getAdminClient();

  const id =
    typeof args.id === "string"
      ? args.id
      : undefined;

  const slug =
    typeof args.slug === "string"
      ? args.slug
      : undefined;

  if (!id && !slug) {
    throw new Error(
      "Update operation requires id or slug."
    );
  }

  const payload = cleanPayload(
    entity,
    args.payload
  );

  if (Object.keys(payload).length === 0) {
    throw new Error("Update payload is empty.");
  }

  let query = admin
    .from(ENTITY_TABLE[entity])
    .update(payload);

  query = id
    ? query.eq("id", id)
    : query.eq("slug", slug!);

  const { data, error } = await query
    .select("*")
    .single();

  if (error) {
    try {
      await writeAuditLog({
        userId,
        toolName,
        action: "update",
        entity,
        entityId: id ?? null,
        payload,
        status: "failed",
        error: error.message,
      });
    } catch {
      // Preserve original write failure.
    }

    throw new Error(error.message);
  }

  await writeAuditLog({
    userId,
    toolName,
    action: "update",
    entity,
    entityId: data?.id ?? null,
    payload,
    status: "success",
  });

  return {
    success: true,
    action: "update",
    entity,
    data,
  };
}

async function deleteEntity(
  entity: Entity,
  args: Record<string, unknown>,
  userId: string,
  toolName: string
): Promise<WebsiteWriteResult> {
  const admin = await getAdminClient();

  const id =
    typeof args.id === "string"
      ? args.id
      : undefined;

  const slug =
    typeof args.slug === "string"
      ? args.slug
      : undefined;

  if (!id && !slug) {
    throw new Error(
      "Delete operation requires id or slug."
    );
  }

  let query = admin
    .from(ENTITY_TABLE[entity])
    .delete()
    .select("id");

  query = id
    ? query.eq("id", id)
    : query.eq("slug", slug!);

  const { data, error } = await query;

  if (error) {
    try {
      await writeAuditLog({
        userId,
        toolName,
        action: "delete",
        entity,
        entityId: id ?? null,
        payload: { slug: slug ?? null },
        status: "failed",
        error: error.message,
      });
    } catch {
      // Preserve original delete failure.
    }

    throw new Error(error.message);
  }

  const entityId = data?.[0]?.id ?? id ?? null;

  await writeAuditLog({
    userId,
    toolName,
    action: "delete",
    entity,
    entityId,
    payload: { slug: slug ?? null },
    status: "success",
  });

  return {
    success: true,
    action: "delete",
    entity,
    data: {
      id: entityId,
      slug: slug ?? null,
    },
  };
}

const TOOL_MAP: Record<
  string,
  { entity: Entity; action: Action }
> = {
  create_project: {
    entity: "project",
    action: "create",
  },
  update_project: {
    entity: "project",
    action: "update",
  },
  delete_project: {
    entity: "project",
    action: "delete",
  },

  create_tool: {
    entity: "tool",
    action: "create",
  },
  update_tool: {
    entity: "tool",
    action: "update",
  },
  delete_tool: {
    entity: "tool",
    action: "delete",
  },

  create_knowledge: {
    entity: "knowledge",
    action: "create",
  },
  update_knowledge: {
    entity: "knowledge",
    action: "update",
  },
  delete_knowledge: {
    entity: "knowledge",
    action: "delete",
  },

  create_roadmap: {
    entity: "roadmap",
    action: "create",
  },
  update_roadmap: {
    entity: "roadmap",
    action: "update",
  },
  delete_roadmap: {
    entity: "roadmap",
    action: "delete",
  },
};

export async function applyWebsiteWriteTool(
  call: WebsiteWriteRequest
): Promise<WebsiteWriteResult> {
  const operation = TOOL_MAP[call.name];

  if (!operation) {
    throw new Error(
      `Unsupported website write tool: ${call.name}`
    );
  }

  const { userId } = await assertSuperAdmin();
  const args = call.arguments ?? {};

  if (operation.action === "create") {
    return createEntity(
      operation.entity,
      args,
      userId,
      call.name
    );
  }

  if (operation.action === "update") {
    return updateEntity(
      operation.entity,
      args,
      userId,
      call.name
    );
  }

  return deleteEntity(
    operation.entity,
    args,
    userId,
    call.name
  );
}

/**
 * Phase 6 proposal gateway.
 *
 * AI website writes do not mutate the website directly.
 * They create an agent_change_requests row and return pendingActionId.
 *
 * The real mutation happens only inside applyWebsiteWriteTool()
 * after super-admin approval.
 */
export async function executeWebsiteWriteTool(
  call: Parameters<typeof applyWebsiteWriteTool>[0]
): Promise<{
  success: true;
  action: "pending";
  entity: string;
  data: {
    toolName: string;
    arguments: Record<string, unknown>;
    targetId: string | null;
  };
  pendingActionId: string;
}> {
  const operation = TOOL_MAP[call.name];

  if (!operation) {
    throw new Error(`Unsupported website write tool: ${call.name}`);
  }

  const { userId } = await assertSuperAdmin();
  const args = call.arguments ?? {};

  const targetId =
    typeof args.id === "string"
      ? args.id
      : typeof args.slug === "string"
        ? args.slug
        : null;

  const proposedChange = {
    toolName: call.name,
    arguments: args,
    entity: operation.entity,
    action: operation.action,
  };

  const admin = createSupabaseAdminClient();

  const { data, error } = await admin
    .from("agent_change_requests")
    .insert({
      requested_by: userId,
      action_type: call.name,
      target_type: "website",
      target_id: targetId,
      title: `AI: ${call.name}`,
      proposed_change: proposedChange,
      status: "pending",
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(
      `Could not create website approval request: ${error.message}`
    );
  }

  return {
    success: true,
    action: "pending",
    entity: operation.entity,
    data: {
      toolName: call.name,
      arguments: args,
      targetId,
    },
    pendingActionId: data.id as string,
  };
}
