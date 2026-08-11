import { supabaseClient } from '@/lib/supabase/client';
import type { Profile } from '@/types/database';

export interface SignUpParams {
  displayName: string;
  email: string;
  password: string;
}

export interface SignInParams {
  email: string;
  password: string;
}

export const authService = {
  /**
   * Sign up a new user using Supabase Auth.
   * Default role is strictly 'user'.
   */
  async signUp({ displayName, email, password }: SignUpParams) {
    const { data, error } = await supabaseClient.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: displayName,
        },
      },
    });

    if (error) {
      throw new Error(error.message);
    }

    if (data.user) {
      // Ensure profile row exists in public.profiles with default role 'user'
      const { error: profileError } = await supabaseClient
        .from('profiles')
        .upsert(
          {
            id: data.user.id,
            display_name: displayName,
            email: email,
            role: 'user', // Hardcoded default role
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'id' }
        );

      if (profileError) {
        console.warn('Profile creation fallback notice:', profileError.message);
      }
    }

    return data;
  },

  /**
   * Sign in user with Email & Password
   */
  async signIn({ email, password }: SignInParams) {
    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw new Error(error.message);
    }

    return data;
  },

  /**
   * Sign out current user
   */
  async signOut() {
    const { error } = await supabaseClient.auth.signOut();
    if (error) {
      throw new Error(error.message);
    }
  },

  /**
   * Request password reset link
   */
  async resetPassword(email: string) {
    // Must go through /auth-callback: that route exchanges the one-time code
    // for a session. Pointing the email straight at a page would land the user
    // there with no session and no way to set a new password.
    const redirectTo = `${window.location.origin}/auth-callback?next=/update-password`;
    const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
      redirectTo,
    });

    if (error) {
      throw new Error(error.message);
    }
  },

  /**
   * Set a new password for the signed-in user.
   *
   * Used by both the in-app change form and the recovery flow — in both cases
   * Supabase requires an active session, and it does the hashing. The plaintext
   * never reaches our own server or database.
   */
  async updatePassword(password: string) {
    const { error } = await supabaseClient.auth.updateUser({ password });
    if (error) {
      throw new Error(error.message);
    }
  },

  /**
   * Confirm the current password by re-authenticating.
   *
   * `updateUser` alone will change the password of whoever holds the session,
   * so an unattended logged-in browser is enough to take over the account.
   * Verifying the old password first closes that gap. It signs in as the same
   * user, so a success leaves the existing session intact.
   */
  async verifyPassword(email: string, password: string): Promise<boolean> {
    const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
    return !error;
  },

  /**
   * Fetch current user's profile from public.profiles
   */
  async getProfile(userId: string): Promise<Profile | null> {
    const { data, error } = await supabaseClient
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error || !data) {
      return null;
    }

    return data as Profile;
  },

  /**
   * Fetch all users (Super Admin only)
   */
  async getAllProfiles(): Promise<Profile[]> {
    const { data, error } = await supabaseClient
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    return (data as Profile[]) || [];
  },
};
