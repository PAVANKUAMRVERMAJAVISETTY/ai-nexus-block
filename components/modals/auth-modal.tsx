'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { toast } from 'sonner';
import { Loader2, Blocks } from 'lucide-react';

interface AuthModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultTab?: 'login' | 'signup';
}

export function AuthModal({ open, onOpenChange, defaultTab = 'login' }: AuthModalProps) {
  const router = useRouter();
  const { signIn, signUp } = useAuth();
  const [activeTab, setActiveTab] = useState<'login' | 'signup'>(defaultTab);

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  // Signup form state
  const [signupDisplayName, setSignupDisplayName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupConfirmPassword, setSignupConfirmPassword] = useState('');
  const [signupLoading, setSignupLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail.trim() || !loginPassword.trim()) {
      toast.error('Please enter your email and password');
      return;
    }

    setLoginLoading(true);
    try {
      await signIn({ email: loginEmail, password: loginPassword });
      toast.success('Signed in successfully!');
      onOpenChange(false);
      router.push('/assistant');
    } catch (err: any) {
      toast.error(err.message || 'Failed to sign in. Please check your credentials.');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signupDisplayName.trim() || !signupEmail.trim() || !signupPassword.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (signupPassword !== signupConfirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (signupPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setSignupLoading(true);
    try {
      await signUp({
        displayName: signupDisplayName,
        email: signupEmail,
        password: signupPassword,
      });
      toast.success('Account created successfully! Redirecting...');
      onOpenChange(false);
      router.push('/assistant');
    } catch (err: any) {
      toast.error(err.message || 'Failed to create account.');
    } finally {
      setSignupLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] border-border/40 bg-background text-foreground">
        <DialogHeader className="flex flex-col items-center justify-center text-center space-y-2 pb-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Blocks className="h-6 w-6" />
          </div>
          <DialogTitle className="text-xl font-bold">Welcome to AI Nexus Block</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Sign in or create an account to access the AI assistant and developer sandbox.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as 'login' | 'signup')} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">Sign In</TabsTrigger>
            <TabsTrigger value="signup">Sign Up</TabsTrigger>
          </TabsList>

          {/* LOGIN TAB */}
          <TabsContent value="login" className="space-y-4 pt-3">
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="modal-login-email">Email</Label>
                <Input
                  id="modal-login-email"
                  type="email"
                  placeholder="you@example.com"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="modal-login-password">Password</Label>
                  <a
                    href="/forgot-password"
                    onClick={() => onOpenChange(false)}
                    className="text-xs text-primary hover:underline"
                  >
                    Forgot password?
                  </a>
                </div>
                <Input
                  id="modal-login-password"
                  type="password"
                  placeholder="••••••••"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  required
                />
              </div>

              <Button type="submit" className="w-full" disabled={loginLoading}>
                {loginLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  'Sign In'
                )}
              </Button>
            </form>
          </TabsContent>

          {/* SIGNUP TAB */}
          <TabsContent value="signup" className="space-y-4 pt-3">
            <form onSubmit={handleSignUp} className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="modal-signup-name">Display Name</Label>
                <Input
                  id="modal-signup-name"
                  type="text"
                  placeholder="Jane Doe"
                  value={signupDisplayName}
                  onChange={(e) => setSignupDisplayName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="modal-signup-email">Email</Label>
                <Input
                  id="modal-signup-email"
                  type="email"
                  placeholder="you@example.com"
                  value={signupEmail}
                  onChange={(e) => setSignupEmail(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="modal-signup-password">Password</Label>
                <Input
                  id="modal-signup-password"
                  type="password"
                  placeholder="••••••••"
                  value={signupPassword}
                  onChange={(e) => setSignupPassword(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="modal-signup-confirm">Confirm Password</Label>
                <Input
                  id="modal-signup-confirm"
                  type="password"
                  placeholder="••••••••"
                  value={signupConfirmPassword}
                  onChange={(e) => setSignupConfirmPassword(e.target.value)}
                  required
                />
              </div>

              <Button type="submit" className="w-full mt-2" disabled={signupLoading}>
                {signupLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating account...
                  </>
                ) : (
                  'Create Account'
                )}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
