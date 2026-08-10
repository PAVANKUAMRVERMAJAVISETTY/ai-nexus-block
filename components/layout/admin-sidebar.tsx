'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Menu, X, Blocks, ChevronLeft, LogOut, ShieldCheck, User as UserIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetClose } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { adminNav } from '@/config/navigation';
import { siteConfig } from '@/config/site';
import { cn } from '@/lib/utils';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { toast } from 'sonner';

export function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, profile, signOut } = useAuth();
  const [open, setOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await signOut();
      toast.success('Signed out successfully.');
      router.push('/login');
    } catch (err: any) {
      toast.error('Logout failed: ' + err.message);
    }
  };

  const navContent = (
    <nav className="flex flex-col gap-0.5 px-3 py-4">
      <div className="px-3 pb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Content
      </div>
      {adminNav.slice(0, 9).map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setOpen(false)}
            className={cn(
              'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground',
              isActive && 'bg-accent text-foreground'
            )}
          >
            {Icon && <Icon className="h-4 w-4" />}
            {item.label}
          </Link>
        );
      })}
      <div className="px-3 pb-2 pt-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        System
      </div>
      {adminNav.slice(9).map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setOpen(false)}
            className={cn(
              'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground',
              isActive && 'bg-accent text-foreground'
            )}
          >
            {Icon && <Icon className="h-4 w-4" />}
            {item.label}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <>
      <aside className="hidden w-64 shrink-0 border-r border-border/40 bg-background md:flex md:flex-col">
        <Link href="/" className="flex h-16 items-center gap-2 border-b border-border/40 px-6 hover:opacity-80 transition-opacity">
          <Blocks className="h-5 w-5 text-primary" />
          <span className="text-sm font-semibold">Admin Panel</span>
        </Link>
        <ScrollArea className="flex-1">{navContent}</ScrollArea>

        <div className="mt-auto border-t border-border/40 p-3 space-y-2">
          <div className="flex items-center justify-between rounded-lg border border-amber-500/30 bg-amber-500/10 p-2.5">
            <div className="flex items-center gap-2 overflow-hidden">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-500/20 text-amber-500 text-xs font-semibold">
                <ShieldCheck className="h-4 w-4" />
              </div>
              <div className="truncate text-xs">
                <p className="font-semibold text-foreground truncate">
                  {profile?.display_name || user?.email || 'Super Admin'}
                </p>
                <span className="text-[10px] font-bold text-amber-500 uppercase tracking-wider">
                  {profile?.role || 'super_admin'}
                </span>
              </div>
            </div>
            <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={handleLogout} title="Sign Out">
              <LogOut className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
            </Button>
          </div>

          <Button asChild variant="ghost" size="sm" className="w-full justify-start text-xs">
            <Link href="/">
              <ChevronLeft className="mr-2 h-4 w-4" />
              Back to site
            </Link>
          </Button>
        </div>
      </aside>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="md:hidden" aria-label="Open menu">
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-72 p-0 flex flex-col justify-between">
          <div>
            <div className="flex h-16 items-center justify-between border-b border-border/40 px-6">
              <span className="text-sm font-semibold">Admin Panel</span>
              <SheetClose asChild>
                <Button variant="ghost" size="icon" aria-label="Close menu">
                  <X className="h-5 w-5" />
                </Button>
              </SheetClose>
            </div>
            {navContent}
          </div>

          <div className="border-t border-border/40 p-3 space-y-2">
            <div className="flex items-center justify-between rounded-lg border border-amber-500/30 bg-amber-500/10 p-2.5">
              <div className="truncate text-xs">
                <p className="font-semibold text-foreground truncate">
                  {profile?.display_name || user?.email || 'Super Admin'}
                </p>
                <span className="text-[10px] font-bold text-amber-500 uppercase tracking-wider">
                  {profile?.role || 'super_admin'}
                </span>
              </div>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleLogout} title="Sign Out">
                <LogOut className="h-3.5 w-3.5" />
              </Button>
            </div>

            <Button asChild variant="ghost" size="sm" className="w-full justify-start text-xs" onClick={() => setOpen(false)}>
              <Link href="/">
                <ChevronLeft className="mr-2 h-4 w-4" />
                Back to site
              </Link>
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
