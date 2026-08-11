import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseAdminClient, isServiceRoleConfigured } from '@/lib/supabase/admin';
import {
  DEMO_USER_ROLE,
  InvalidDemoUserError,
  describeAuthError,
  toPublicDemoUser,
  validateDemoUserInput,
} from '@/lib/admin/demo-user';

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/users — create a demo/interview account.
 *
 * SECURITY MODEL
 *
 * 1. The caller's identity comes from the Supabase session cookie, never the
 *    body. 2. Their role is read from `public.profiles` server-side; a role
 *    claimed by the browser is ignored. 3. The created account's role is the
 *    constant `DEMO_USER_ROLE` — there is no code path that reads a role from
 *    the request, so an escalation attempt cannot succeed, only be ignored.
 * 4. The service-role key is used only here, server-side, after the super_admin
 *    check has passed.
 *
 * The password is written straight to Supabase Auth (which hashes it) and is
 * never stored in `profiles`, never logged, and never returned.
 */
export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();

    // --- 1. authenticate -------------------------------------------------
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'You must be signed in.' },
        { status: 401 }
      );
    }

    // --- 2. authorize from the database, not from the client -------------
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    if (profileError) {
      return NextResponse.json({ error: 'Could not verify your permissions.' }, { status: 500 });
    }

    if (!profile || profile.role !== 'super_admin') {
      // 403, not 404: the caller is authenticated, just not permitted.
      return NextResponse.json(
        { error: 'Only a super admin can create demo accounts.' },
        { status: 403 }
      );
    }

    // --- 3. server capability check --------------------------------------
    if (!isServiceRoleConfigured()) {
      return NextResponse.json(
        {
          error:
            'This server cannot create accounts: SUPABASE_SERVICE_ROLE_KEY is not configured.',
        },
        { status: 503 }
      );
    }

    // --- 4. validate the request -----------------------------------------
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Request body must be valid JSON.' }, { status: 400 });
    }

    let input;
    try {
      input = validateDemoUserInput(body);
    } catch (error) {
      if (error instanceof InvalidDemoUserError) {
        return NextResponse.json({ error: error.message, field: error.field }, { status: 400 });
      }
      throw error;
    }

    // --- 5. create the auth user -----------------------------------------
    const admin = createSupabaseAdminClient();

    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email: input.email,
      password: input.password,
      // Confirmed immediately: a demo account must be usable the moment it is
      // handed over, without waiting on an inbox the interviewer cannot read.
      email_confirm: true,
      ...(input.phone ? { phone: input.phone } : {}),
      user_metadata: {
        display_name: input.displayName,
        // Marks the account as demo WITHOUT a schema change. Lives in
        // auth.users metadata, so `profiles` is untouched.
        is_demo: true,
        created_by_admin: user.id,
      },
    });

    if (createError || !created?.user) {
      // Log the failure reason only — never the request body.
      console.error('[admin/users] create failed:', createError?.message);
      const mapped = describeAuthError(createError?.message ?? '');
      return NextResponse.json({ error: mapped.message }, { status: mapped.status });
    }

    const newUserId = created.user.id;

    // --- 6. make sure the profile exists, exactly once --------------------
    // The `on_auth_user_created` trigger normally creates it with role='user'.
    // This upsert is a safety net for a database where the trigger is missing;
    // `onConflict: id` means it can never produce a duplicate profile.
    const { error: profileUpsertError } = await admin.from('profiles').upsert(
      {
        id: newUserId,
        display_name: input.displayName,
        email: input.email,
        // The constant — never a value from the request.
        role: DEMO_USER_ROLE,
      },
      { onConflict: 'id' }
    );

    if (profileUpsertError) {
      // The auth user exists but has no usable profile; leaving it would be a
      // half-created account the admin cannot see or fix from the UI.
      await admin.auth.admin.deleteUser(newUserId).catch(() => undefined);

      console.error('[admin/users] profile upsert failed:', profileUpsertError.message);
      return NextResponse.json(
        { error: 'The account could not be completed and was rolled back. Please try again.' },
        { status: 500 }
      );
    }

    // --- 7. respond with non-credential fields only -----------------------
    return NextResponse.json(
      {
        success: true,
        user: toPublicDemoUser({
          id: newUserId,
          displayName: input.displayName,
          email: input.email,
        }),
      },
      { status: 201 }
    );
  } catch (error) {
    // Never include the request body — it contains a password.
    console.error('[admin/users] unexpected error:', error instanceof Error ? error.message : error);
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}
