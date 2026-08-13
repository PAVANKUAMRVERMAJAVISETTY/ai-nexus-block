'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { toast } from 'sonner';
import { Loader2, ArrowLeft, Sparkles } from 'lucide-react';
import { authService } from '@/features/auth/services/auth-service';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextUrl = searchParams.get('next');
  const { signIn } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // /auth-callback sends people here with a reason when an email link has
  // expired or was already used. Without this the redirect looks like nothing
  // happened at all.
  const callbackError = searchParams.get('error');

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);

    try {
      await signIn({ email, password });
      toast.success('Signed in successfully!');

      if (nextUrl) {
        router.push(nextUrl);
        return;
      }

      router.push('/assistant');
    } catch (err: any) {
      toast.error(err.message || 'Unable to sign in. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };
  const handleGuestSignIn = async () => {
    setLoading(true);
    try {
      await signIn({ email: 'guest@ainexus.demo', password: 'GuestDemo2026!' });
      toast.success('Signed in as Demo Guest user!');

      if (nextUrl) {
        router.push(nextUrl);
        return;
      }

      router.push('/assistant');
    } catch (err: any) {
      toast.error(err.message || 'Demo account not found. Please create guest@ainexus.demo in Supabase.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-border/40 w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl font-bold">Sign In</CardTitle>
        <CardDescription>Enter your credentials to access the workspace.</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {callbackError && (
            <p className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-300">
              {callbackError}
            </p>
          )}
          <div className="space-y-2">
            <Label htmlFor="email">Email address</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <Link href="/forgot-password" className="text-xs text-primary hover:underline">
                Forgot password?
              </Link>
            </div>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-4">
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Signing in...
              </>
            ) : (
              'Sign In'
            )}
          </Button>

          <Button
            type="button"
            variant="outline"
            className="w-full border-primary/30 hover:bg-primary/10 flex items-center justify-center gap-2"
            disabled={loading}
            onClick={handleGuestSignIn}
          >
            <Sparkles className="h-4 w-4 text-amber-400" />
            Explore Demo Guest Account
          </Button>

          <Separator />

          <div className="flex items-center justify-between w-full text-xs text-muted-foreground">
            <span>Don&apos;t have an account?</span>
            <Link href="/signup" className="text-primary hover:underline font-medium">
              Create an account
            </Link>
          </div>

          <Link href="/" className="flex items-center text-xs text-muted-foreground hover:text-foreground">
            <ArrowLeft className="mr-1 h-3 w-3" />
            Back to homepage
          </Link>
        </CardFooter>
      </form>
    </Card>
  );
}
