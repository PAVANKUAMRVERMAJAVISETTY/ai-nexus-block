import { createSupabaseServerClient } from "@/lib/supabase/server";

export interface UserContext {
  authenticated: boolean;
  userId?: string;
  email?: string;
  role?: string;
}

export async function getUserContext(): Promise<UserContext> {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      authenticated: false,
    };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  return {
    authenticated: true,
    userId: user.id,
    email: user.email ?? undefined,
    role: profile?.role ?? undefined,
  };
}
