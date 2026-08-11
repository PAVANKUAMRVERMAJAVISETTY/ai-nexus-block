'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle,
  Check,
  Copy,
  Eye,
  EyeOff,
  Loader2,
  RefreshCw,
  ShieldCheck,
  UserPlus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { suggestPassword } from '@/lib/admin/demo-user';

interface CreatedUser {
  id: string;
  displayName: string;
  email: string;
  role: string;
}

/**
 * Creates a normal user account for demos and interviews.
 *
 * There is deliberately no role selector: the endpoint forces `role = 'user'`,
 * so offering a choice here would be a lie. The password is shown once, from
 * local state — the API never returns it.
 */
export function CreateDemoUserDialog() {
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [displayName, setDisplayName] = useState('Demo User');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [showPassword, setShowPassword] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<CreatedUser | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const reset = () => {
    setDisplayName('Demo User');
    setEmail('');
    setPassword('');
    setPhone('');
    setError(null);
    setCreated(null);
    setCopied(null);
  };

  const generate = () => {
    setPassword(suggestPassword());
    setShowPassword(true);
  };

  const copy = async (label: string, value: string) => {
    await navigator.clipboard.writeText(value);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  };

  const submit = async () => {
    setBusy(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName,
          email,
          password,
          phone: phone || undefined,
        }),
      });

      const payload = await response.json();

      if (!response.ok) {
        setError(payload.error ?? 'The account could not be created.');
        return;
      }

      setCreated(payload.user as CreatedUser);
      toast.success(`Created ${payload.user.email}`);
      // Refresh the server-rendered list so the new account appears.
      router.refresh();
    } catch {
      setError('Could not reach the server. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  };

  const canSubmit = displayName.trim() && email.trim() && password.length >= 12 && !busy;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm" className="h-8 text-xs">
          <UserPlus className="mr-1.5 h-3.5 w-3.5" />
          Create Demo User
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <UserPlus className="h-4 w-4 text-primary" />
            Create Demo User
          </DialogTitle>
          <DialogDescription className="text-xs">
            Creates an ordinary account you can hand to an interviewer. It is isolated from your
            data by the same rules that separate any two users.
          </DialogDescription>
        </DialogHeader>

        {created ? (
          <div className="space-y-3">
            <div className="flex items-start gap-2 rounded-md border border-emerald-500/30 bg-emerald-500/10 p-3">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
              <div className="min-w-0 text-xs">
                <p className="font-semibold text-foreground">Account created</p>
                <p className="mt-0.5 text-muted-foreground">
                  They can sign in immediately — no email confirmation needed.
                </p>
              </div>
            </div>

            <div className="space-y-2 rounded-md border border-border/40 bg-muted/30 p-3">
              {[
                { label: 'Email', value: created.email },
                { label: 'Password', value: password },
              ].map((row) => (
                <div key={row.label} className="flex items-center gap-2">
                  <span className="w-16 shrink-0 text-[11px] text-muted-foreground">
                    {row.label}
                  </span>
                  <code className="min-w-0 flex-1 truncate font-mono text-xs text-foreground">
                    {row.value}
                  </code>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6 shrink-0"
                    onClick={() => copy(row.label, row.value)}
                    aria-label={`Copy ${row.label}`}
                  >
                    {copied === row.label ? (
                      <Check className="h-3 w-3 text-emerald-400" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                  </Button>
                </div>
              ))}

              <div className="flex items-center gap-2 pt-1">
                <span className="w-16 shrink-0 text-[11px] text-muted-foreground">Role</span>
                <Badge variant="outline" className="h-5 px-1.5 text-[10px]">
                  {created.role}
                </Badge>
              </div>
            </div>

            <p className="flex items-start gap-1.5 text-[11px] text-amber-300">
              <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
              Copy the password now. It is not stored anywhere readable and cannot be shown again.
            </p>

            <DialogFooter className="gap-2 sm:gap-2">
              <Button variant="outline" size="sm" onClick={reset}>
                Create another
              </Button>
              <Button size="sm" onClick={() => setOpen(false)}>
                Done
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <label htmlFor="demo-name" className="mb-1.5 block text-xs font-medium text-foreground">
                Display name
              </label>
              <Input
                id="demo-name"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                className="h-8 text-xs"
              />
            </div>

            <div>
              <label htmlFor="demo-email" className="mb-1.5 block text-xs font-medium text-foreground">
                Email
              </label>
              <Input
                id="demo-email"
                type="email"
                autoComplete="off"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="interviewer@example.com"
                className="h-8 text-xs"
              />
            </div>

            <div>
              <label
                htmlFor="demo-password"
                className="mb-1.5 flex items-center justify-between text-xs font-medium text-foreground"
              >
                Password
                <button
                  type="button"
                  onClick={generate}
                  className="flex items-center gap-1 text-[11px] font-normal text-primary hover:underline"
                >
                  <RefreshCw className="h-3 w-3" />
                  Generate
                </button>
              </label>
              <div className="relative">
                <Input
                  id="demo-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="At least 12 characters"
                  className="h-8 pr-8 font-mono text-xs"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              </div>
              {password && password.length < 12 && (
                <p className="mt-1 text-[11px] text-amber-400">
                  {12 - password.length} more character{12 - password.length === 1 ? '' : 's'} needed.
                </p>
              )}
            </div>

            <div>
              <label htmlFor="demo-phone" className="mb-1.5 block text-xs font-medium text-foreground">
                Phone <span className="text-muted-foreground">(optional)</span>
              </label>
              <Input
                id="demo-phone"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder="+15551234567"
                className="h-8 text-xs"
              />
            </div>

            <div className="flex items-start gap-2 rounded-md border border-border/40 bg-muted/30 p-2.5">
              <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />
              <p className="text-[11px] text-muted-foreground">
                This account is always created with the role{' '}
                <code className="font-mono text-foreground">user</code>. Admin roles cannot be
                created here.
              </p>
            </div>

            {error && (
              <div className="flex items-start gap-1.5 rounded-md border border-red-500/30 bg-red-500/10 px-2.5 py-2 text-[11px] text-red-300">
                <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
                {error}
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" size="sm" onClick={() => setOpen(false)} disabled={busy}>
                Cancel
              </Button>
              <Button size="sm" onClick={submit} disabled={!canSubmit}>
                {busy ? (
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <UserPlus className="mr-1.5 h-3.5 w-3.5" />
                )}
                Create account
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
