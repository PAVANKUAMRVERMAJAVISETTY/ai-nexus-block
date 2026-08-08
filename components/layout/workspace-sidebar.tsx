'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X, Blocks, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetClose } from '@/components/ui/sheet';
import { workspaceNav } from '@/config/navigation';
import { siteConfig } from '@/config/site';
import { cn } from '@/lib/utils';

export function WorkspaceSidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const navContent = (
    <nav className="flex flex-col gap-1 px-3 py-4">
      {workspaceNav.map((item) => {
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
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 border-r border-border/40 bg-background md:flex md:flex-col">
        <div className="flex h-16 items-center gap-2 border-b border-border/40 px-6">
          <Blocks className="h-5 w-5 text-primary" />
          <span className="text-sm font-semibold">{siteConfig.shortName}</span>
        </div>
        {navContent}
        <div className="mt-auto border-t border-border/40 p-3">
          <Button asChild variant="ghost" size="sm" className="w-full justify-start">
            <Link href="/">
              <ChevronLeft className="mr-2 h-4 w-4" />
              Back to site
            </Link>
          </Button>
        </div>
      </aside>

      {/* Mobile sidebar */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="md:hidden" aria-label="Open menu">
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-72 p-0">
          <div className="flex h-16 items-center justify-between border-b border-border/40 px-6">
            <span className="text-sm font-semibold">{siteConfig.shortName}</span>
            <SheetClose asChild>
              <Button variant="ghost" size="icon" aria-label="Close menu">
                <X className="h-5 w-5" />
              </Button>
            </SheetClose>
          </div>
          {navContent}
        </SheetContent>
      </Sheet>
    </>
  );
}
