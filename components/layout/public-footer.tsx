import Link from 'next/link';
import { Blocks, Github, Linkedin, FileText } from 'lucide-react';
import { siteConfig } from '@/config/site';
import { publicNav } from '@/config/navigation';

export function PublicFooter() {
  return (
    <footer className="border-t border-border/40 bg-background">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          <div className="md:col-span-2">
            <Link href="/" className="flex items-center gap-2">
              <Blocks className="h-6 w-6 text-primary" />
              <span className="text-lg font-semibold">{siteConfig.name}</span>
            </Link>
            <p className="mt-3 max-w-md text-sm text-muted-foreground">{siteConfig.description}</p>
            <div className="mt-4 flex items-center gap-3">
              <Link
                href={siteConfig.links.github}
                className="text-muted-foreground transition-colors hover:text-foreground"
                aria-label="GitHub"
              >
                <Github className="h-5 w-5" />
              </Link>
              <Link
                href={siteConfig.links.linkedin}
                className="text-muted-foreground transition-colors hover:text-foreground"
                aria-label="LinkedIn"
              >
                <Linkedin className="h-5 w-5" />
              </Link>
              <Link
                href={siteConfig.links.resume}
                className="text-muted-foreground transition-colors hover:text-foreground"
                aria-label="Resume"
              >
                <FileText className="h-5 w-5" />
              </Link>
            </div>
          </div>
          <div>
            <h3 className="text-sm font-semibold">Explore</h3>
            <ul className="mt-3 space-y-2">
              {publicNav.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold">Account</h3>
            <ul className="mt-3 space-y-2">
              <li>
                <Link href="/login" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                  Sign in
                </Link>
              </li>
              <li>
                <Link href="/my-block" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                  My Block
                </Link>
              </li>
              <li>
                <Link href="/dashboard" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                  Workspace
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="mt-8 border-t border-border/40 pt-6 text-center text-xs text-muted-foreground">
          &copy; {new Date().getFullYear()} {siteConfig.name}. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
