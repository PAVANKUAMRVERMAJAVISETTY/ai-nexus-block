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
    const redirectTo = `${window.location.origin}/login`;
    const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
      redirectTo,
    });

    if (error) {
      throw new Error(error.message);
    }
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
