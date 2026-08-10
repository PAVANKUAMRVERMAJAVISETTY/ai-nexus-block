'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { Menu, X, Blocks, LogOut, ShieldAlert, Bot } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetClose } from '@/components/ui/sheet';
import { publicNav } from '@/config/navigation';
import { siteConfig } from '@/config/site';
import { cn } from '@/lib/utils';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { AuthModal } from '@/components/modals/auth-modal';
import { toast } from 'sonner';

export function PublicHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, profile, isSuperAdmin, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await signOut();
      toast.success('Signed out successfully.');
      router.push('/login');
    } catch (err: any) {
      toast.error('Logout failed: ' + err.message);
    }
  };

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-border/40 bg-background/80 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2">
            <Blocks className="h-6 w-6 text-primary" />
            <span className="text-lg font-semibold tracking-tight">{siteConfig.shortName}</span>
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            {publicNav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground',
                  pathname === item.href && 'text-foreground'
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="hidden items-center gap-2 md:flex">
            {user ? (
              <div className="flex items-center gap-3">
                <Button asChild variant="outline" size="sm" className="gap-1.5">
                  <Link href="/assistant">
                    <Bot className="h-4 w-4 text-primary" />
                    AI Assistant
                  </Link>
                </Button>

                {isSuperAdmin && (
                  <Button asChild variant="secondary" size="sm" className="gap-1.5">
                    <Link href="/admin/dashboard">
                      <ShieldAlert className="h-4 w-4 text-amber-500" />
                      Admin Panel
                    </Link>
                  </Button>
                )}

                <span className="text-xs font-medium text-muted-foreground bg-muted px-2.5 py-1 rounded-full border border-border/40">
                  {profile?.display_name || user.email}
                </span>

                <Button variant="ghost" size="icon" onClick={handleLogout} title="Sign Out">
                  <LogOut className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                </Button>
              </div>
            ) : (
              <>
                <Button variant="ghost" size="sm" onClick={() => setAuthModalOpen(true)}>
                  Sign in
                </Button>
                <Button size="sm" onClick={() => setAuthModalOpen(true)}>
                  Get Started
                </Button>
              </>
            )}
          </div>

          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden" aria-label="Open menu">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72">
              <div className="flex items-center justify-between">
                <Link href="/" onClick={() => setOpen(false)} className="flex items-center gap-2">
                  <Blocks className="h-6 w-6 text-primary" />
                  <span className="text-lg font-semibold">{siteConfig.shortName}</span>
                </Link>
                <SheetClose asChild>
                  <Button variant="ghost" size="icon" aria-label="Close menu">
                    <X className="h-5 w-5" />
                  </Button>
                </SheetClose>
              </div>
              <nav className="mt-8 flex flex-col gap-1">
                {publicNav.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      'rounded-md px-3 py-2.5 text-base font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground',
                      pathname === item.href && 'bg-accent text-foreground'
                    )}
                  >
                    {item.label}
                  </Link>
                ))}
                <div className="mt-4 flex flex-col gap-2">
                  {user ? (
                    <>
                      <Button asChild variant="default" onClick={() => setOpen(false)}>
                        <Link href="/assistant">AI Assistant</Link>
                      </Button>
                      {isSuperAdmin && (
                        <Button asChild variant="secondary" onClick={() => setOpen(false)}>
                          <Link href="/admin/dashboard">Admin Panel</Link>
                        </Button>
                      )}
                      <Button variant="outline" onClick={handleLogout}>
                        Sign Out
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button variant="outline" onClick={() => { setOpen(false); setAuthModalOpen(true); }}>
                        Sign in
                      </Button>
                      <Button onClick={() => { setOpen(false); setAuthModalOpen(true); }}>
                        Get Started
                      </Button>
                    </>
                  )}
                </div>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </header>

      <AuthModal open={authModalOpen} onOpenChange={setAuthModalOpen} />
    </>
  );
}
