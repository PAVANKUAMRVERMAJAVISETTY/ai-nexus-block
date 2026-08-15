'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  Bot,
  FolderGit2,
  Wrench,
  BookOpen,
  FileText,
  Layers,
  ArrowRight,
  X,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface SearchResult {
  title: string;
  url: string;
  category: string;
  type: 'project' | 'tool' | 'knowledge' | 'resource' | 'decision';
}

const mockSearchCatalog: SearchResult[] = [
  { title: 'AI Nexus Block Platform', url: '/projects/ai-nexus-block', category: 'Full Stack AI', type: 'project' },
  { title: 'Supabase RLS Security Engine', url: '/projects/supabase-rls-security', category: 'Database Systems', type: 'project' },
  { title: 'Monaco Web IDE Sandbox', url: '/projects/monaco-web-ide', category: 'Frontend', type: 'project' },
  { title: 'Groq LLM Acceleration', url: '/tools/groq', category: 'AI Framework', type: 'tool' },
  { title: 'Cerebras Ultra Low Latency', url: '/tools/cerebras', category: 'AI Tool', type: 'tool' },
  { title: 'Supabase SSR & RLS Guide', url: '/knowledge/supabase-rls-guide', category: 'Supabase & RLS', type: 'knowledge' },
  { title: 'Next.js App Router Architecture', url: '/knowledge/nextjs-app-router-architecture', category: 'Next.js', type: 'knowledge' },
  { title: 'AI Engineering Handbook', url: '/resources', category: 'Resource', type: 'resource' },
  { title: 'ADR-001: 11-Provider AI Cascade Engine', url: '/decisions/adr-001-11-provider-ai-cascade', category: 'Architecture', type: 'decision' },
  { title: 'ADR-002: PostgreSQL Row Level Security Policies', url: '/decisions/adr-002-pg-rls-security-definer', category: 'Security', type: 'decision' },
];

export function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const router = useRouter();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      } else if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (!isOpen) return null;

  const isAICommand = query.startsWith('>');
  const aiQuery = isAICommand ? query.substring(1).trim() : '';

  const filteredResults = isAICommand
    ? []
    : mockSearchCatalog.filter((item) =>
        item.title.toLowerCase().includes(query.toLowerCase()) ||
        item.category.toLowerCase().includes(query.toLowerCase())
      );

  const handleSelectResult = (url: string) => {
    setIsOpen(false);
    setQuery('');
    router.push(url);
  };

  const handleTriggerAI = () => {
    setIsOpen(false);
    setQuery('');
    // Dispatch event to open floating copilot with query
    const copilotBtn = document.querySelector('button[aria-label="Open AI Copilot"]') as HTMLButtonElement | null;
    if (copilotBtn) copilotBtn.click();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-black/60 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-xl rounded-2xl border border-border bg-card shadow-2xl overflow-hidden text-card-foreground">
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 border-b border-border/60 px-4 py-3 bg-muted/30">
          <Search className="h-5 w-5 text-muted-foreground shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Type a command or search... (type '>' to ask AI Assistant)"
            className="w-full bg-transparent text-sm font-medium focus:outline-none placeholder:text-muted-foreground"
            autoFocus
          />
          <button onClick={() => setIsOpen(false)} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* AI Command Trigger Option */}
        {isAICommand && (
          <div className="p-4">
            <div
              onClick={handleTriggerAI}
              className="cursor-pointer flex items-center justify-between p-3 rounded-xl bg-primary/10 border border-primary/30 text-primary hover:bg-primary/20 transition-all"
            >
              <div className="flex items-center gap-2.5">
                <Bot className="h-5 w-5" />
                <span className="text-xs font-bold">
                  Ask AI Assistant: <code className="text-foreground font-normal font-mono">&quot;{aiQuery || '...'}&quot;</code>
                </span>
              </div>
              <ArrowRight className="h-4 w-4" />
            </div>
          </div>
        )}

        {/* Catalog Search Results */}
        {!isAICommand && (
          <div className="max-h-80 overflow-y-auto p-2 space-y-1">
            {filteredResults.length > 0 ? (
              filteredResults.map((item, idx) => (
                <div
                  key={idx}
                  onClick={() => handleSelectResult(item.url)}
                  className={`cursor-pointer flex items-center justify-between p-3 rounded-xl transition-all ${
                    selectedIndex === idx ? 'bg-primary/10 border border-primary/30' : 'hover:bg-muted/40'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {item.type === 'project' && <FolderGit2 className="h-4 w-4 text-emerald-500" />}
                    {item.type === 'tool' && <Wrench className="h-4 w-4 text-amber-500" />}
                    {item.type === 'knowledge' && <BookOpen className="h-4 w-4 text-blue-500" />}
                    {item.type === 'resource' && <FileText className="h-4 w-4 text-purple-500" />}
                    {item.type === 'decision' && <Layers className="h-4 w-4 text-rose-500" />}
                    <div>
                      <h4 className="text-xs font-bold text-foreground">{item.title}</h4>
                      <p className="text-[10px] text-muted-foreground">{item.category}</p>
                    </div>
                  </div>

                  <Badge variant="outline" className="text-[10px] capitalize">
                    {item.type}
                  </Badge>
                </div>
              ))
            ) : (
              <div className="p-6 text-center text-xs text-muted-foreground">
                No catalog items found matching &quot;{query}&quot;. Type <code className="text-primary">&gt; query</code> to ask AI Assistant.
              </div>
            )}
          </div>
        )}

        {/* Footer Hint */}
        <div className="flex items-center justify-between px-4 py-2 border-t border-border/40 bg-muted/20 text-[10px] text-muted-foreground">
          <span>
            Use <code className="bg-muted px-1.5 py-0.5 rounded font-mono">↑</code> <code className="bg-muted px-1.5 py-0.5 rounded font-mono">↓</code> to navigate
          </span>
          <span>
            Press <code className="bg-muted px-1.5 py-0.5 rounded font-mono">ESC</code> to close
          </span>
        </div>
      </div>
    </div>
  );
}
