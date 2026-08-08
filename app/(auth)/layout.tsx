import { Blocks } from 'lucide-react';
import { siteConfig } from '@/config/site';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-primary/5 to-transparent px-4 py-12">
      <div className="mb-8 flex items-center gap-2">
        <Blocks className="h-7 w-7 text-primary" />
        <span className="text-xl font-bold">{siteConfig.name}</span>
      </div>
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}
