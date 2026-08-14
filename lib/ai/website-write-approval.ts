import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { applyWebsiteWriteTool } from "@/lib/ai/website-write-tools";

const ALLOWED_WEBSITE_TOOLS = new Set([
  "create_project",
  "update_project",
  "delete_project",
  "create_tool",
  "update_tool",
  "delete_tool",
  "create_knowledge",
  "update_knowledge",
  "delete_knowledge",
  "create_roadmap",
  "update_roadmap",
  "delete_roadmap",
]);

async function requireSuperAdmin() {
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
            // Read-only request context.
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

  const admin = createSupabaseAdminClient();

  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("id, role")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    throw new Error(
      `Unable to verify administrator role: ${profileError.message}`
    );
  }

  if (!profile || profile.role !== "super_admin") {
    throw new Error("Super-admin permission required.");
  }

  return {
    userId: user.id,
    admin,
  };
}

export async function approveWebsiteChangeRequest(actionId: string) {
  const { userId, admin } = await requireSuperAdmin();

  const { data: action, error: readError } = await admin
    .from("agent_change_requests")
    .select("*")
    .eq("id", actionId)
    .maybeSingle();

  if (readError) {
    throw new Error(readError.message);
  }

  if (!action) {
    throw new Error("Website change request not found.");
  }

  if (action.target_type !== "website") {
    throw new Error("This is not a website change request.");
  }

  if (action.status !== "pending") {
    throw new Error(
      `This request has already been ${String(action.status)}.`
    );
  }

  const proposed = action.proposed_change;

  if (
    !proposed ||
    typeof proposed !== "object" ||
    Array.isArray(proposed)
  ) {
    throw new Error("Stored website proposal is invalid.");
  }

  const proposal = proposed as {
    toolName?: unknown;
    arguments?: unknown;
  };

  if (
    typeof proposal.toolName !== "string" ||
    !ALLOWED_WEBSITE_TOOLS.has(proposal.toolName)
  ) {
    throw new Error("Stored website tool is not allowed.");
  }

  if (
    !proposal.arguments ||
    typeof proposal.arguments !== "object" ||
    Array.isArray(proposal.arguments)
  ) {
    throw new Error("Stored website proposal arguments are invalid.");
  }

  // Claim the request atomically.
  const { data: claimed, error: claimError } = await admin
    .from("agent_change_requests")
    .update({
      status: "approved",
      approved_at: new Date().toISOString(),
      approved_by: userId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", actionId)
    .eq("status", "pending")
    .select("*")
    .maybeSingle();

  if (claimError) {
    throw new Error(claimError.message);
  }

  if (!claimed) {
    throw new Error("This approval request was already resolved.");
  }

  try {
    const result = await applyWebsiteWriteTool({
      name: proposal.toolName as Parameters<
        typeof applyWebsiteWriteTool
      >[0]["name"],
      arguments:
        proposal.arguments as Parameters<
          typeof applyWebsiteWriteTool
        >[0]["arguments"],
    });

    const resultPayload = {
      success: result.success,
      action: result.action,
      entity: result.entity,
      data: result.data ?? null,
    };

    const { data: updated, error: updateError } = await admin
      .from("agent_change_requests")
      .update({
        status: "applied",
        result: resultPayload,
        error_message: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", actionId)
      .select("*")
      .single();

    if (updateError) {
      throw new Error(updateError.message);
    }

    return updated;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : String(error);

    await admin
      .from("agent_change_requests")
      .update({
        status: "failed",
        error_message: message.slice(0, 4000),
        updated_at: new Date().toISOString(),
      })
      .eq("id", actionId);

    throw new Error(message);
  }
}

export async function rejectWebsiteChangeRequest(actionId: string) {
  const { admin } = await requireSuperAdmin();

  const { data: updated, error } = await admin
    .from("agent_change_requests")
    .update({
      status: "rejected",
      updated_at: new Date().toISOString(),
      error_message:
        "Rejected by super-admin. No website changes were applied.",
    })
    .eq("id", actionId)
    .eq("status", "pending")
    .select("*")
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!updated) {
    throw new Error(
      "This approval request no longer exists in pending state."
    );
  }

  return updated;
}
