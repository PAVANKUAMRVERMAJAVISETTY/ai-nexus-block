'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, KeyRound, Loader2, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { toast } from 'sonner';
import { authService } from '@/features/auth/services/auth-service';
import { MIN_PASSWORD_LENGTH, checkPassword, passwordsMatch } from '@/lib/auth/password';

interface UpdatePasswordFormProps {
  email: string;
  /**
   * True when the session came from a recovery email. The server decides this;
   * it is not a value the browser can set for itself.
   */
  isRecovery: boolean;
}

const METER_COLOURS = [
  'bg-red-500',
  'bg-red-500',
  'bg-amber-500',
  'bg-emerald-500',
  'bg-emerald-400',
];

export function UpdatePasswordForm({ email, isRecovery }: UpdatePasswordFormProps) {
  const router = useRouter();

  const [current, setCurrent] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [reveal, setReveal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const strength = checkPassword(password);
  const mismatch = confirm.length > 0 && !passwordsMatch(password, confirm);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!strength.valid) {
      setError(strength.error);
      return;
    }

    if (!passwordsMatch(password, confirm)) {
      setError('The two passwords do not match.');
      return;
    }

    if (!isRecovery && password === current) {
      setError('The new password must be different from your current one.');
      return;
    }

    setLoading(true);

    try {
      // Outside recovery, prove the person at the keyboard is the account
      // holder and not someone who found the session already open.
      if (!isRecovery) {
        const ok = await authService.verifyPassword(email, current);
        if (!ok) {
          setError('Your current password is not correct.');
          return;
        }
      }

      await authService.updatePassword(password);

      // Spend the recovery marker so the reduced-friction path cannot be
      // replayed on a later visit.
      await fetch('/api/auth/complete-recovery', { method: 'POST' }).catch(() => undefined);

      toast.success('Password updated.');
      router.replace('/dashboard');
      router.refresh();
    } catch (err: any) {
      setError(err?.message || 'The password could not be updated.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-border/40 w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-2xl font-bold">
          <KeyRound className="h-5 w-5 text-primary" />
          {isRecovery ? 'Choose a new password' : 'Change password'}
        </CardTitle>
        <CardDescription>
          {isRecovery
            ? `Setting a new password for ${email}.`
            : 'Enter your current password, then choose a new one.'}
        </CardDescription>
      </CardHeader>

      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {!isRecovery && (
            <div className="space-y-2">
              <Label htmlFor="current-password">Current password</Label>
              <Input
                id="current-password"
                type="password"
                autoComplete="current-password"
                value={current}
                onChange={(event) => setCurrent(event.target.value)}
                required
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="new-password">New password</Label>
            <div className="relative">
              <Input
                id="new-password"
                type={reveal ? 'text' : 'password'}
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`}
                className="pr-10"
                required
              />
              <button
                type="button"
                onClick={() => setReveal((value) => !value)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label={reveal ? 'Hide password' : 'Show password'}
              >
                {reveal ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            {password.length > 0 && (
              <div className="flex items-center gap-2">
                <div className="flex h-1 flex-1 gap-1">
                  {[0, 1, 2, 3].map((index) => (
                    <div
                      key={index}
                      className={`h-full flex-1 rounded-full ${
                        index < strength.score ? METER_COLOURS[strength.score] : 'bg-muted'
                      }`}
                    />
                  ))}
                </div>
                <span className="w-14 text-right text-xs text-muted-foreground">
                  {strength.label}
                </span>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirm new password</Label>
            <Input
              id="confirm-password"
              type={reveal ? 'text' : 'password'}
              autoComplete="new-password"
              value={confirm}
              onChange={(event) => setConfirm(event.target.value)}
              required
            />
            {mismatch && <p className="text-xs text-red-400">The two passwords do not match.</p>}
          </div>

          {error && (
            <p className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
              {error}
            </p>
          )}

          <p className="flex items-start gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />
            Your password is hashed by Supabase Auth. It is never stored in this application&apos;s
            database or written to its logs.
          </p>
        </CardContent>

        <CardFooter>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Update password
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
