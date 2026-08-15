'use client';

import { useState, useEffect } from 'react';
import { PageContainer, PageHeader, EmptyState } from '@/components/common';
import { KnowledgeCard } from '@/components/cards';
import { AdminWrapper } from '@/components/admin';
import { BookOpen, Copy, Check, ChevronDown, ChevronUp, FileText, Database } from 'lucide-react';
import type { KnowledgeArticle } from '@/types/knowledge';

const knowledgeCategories = [
  '#All',
  '#Supabase & RLS',
  '#Next.js App Router',
  '#Algorithms',
  '#AI Frameworks',
];

const sampleQandAs = [
  {
    q: 'How does Supabase Row Level Security (RLS) enforce authorization?',
    a: 'Supabase RLS policies are evaluated directly inside PostgreSQL using auth.uid() or security definer helper functions (such as public.is_super_admin()). Non-admin queries are filtered at the database engine level before returning data to the client.',
    code: `CREATE POLICY "super_admin_all" ON public.nexus_projects\nFOR ALL TO authenticated\nUSING (public.is_super_admin())\nWITH CHECK (public.is_super_admin());`,
  },
  {
    q: 'How does Next.js revalidatePath() handle instant CMS updates?',
    a: 'In Next.js App Router, revalidatePath("/projects") purges the Data Cache and Full Route Cache for the specified path, ensuring subsequent server renders fetch fresh dynamic content instantly.',
    code: `import { revalidatePath } from 'next/cache';\n\nawait db.insert(newProject);\nrevalidatePath('/projects');\nrevalidatePath('/');`,
  },
];

export default function KnowledgePage() {
  const [articles, setArticles] = useState<KnowledgeArticle[]>([]);
  const [activeCategory, setActiveCategory] = useState('#All');
  const [loading, setLoading] = useState(true);
  const [copiedCodeIdx, setCopiedCodeIdx] = useState<number | null>(null);
  const [openAccordion, setOpenAccordion] = useState<number | null>(0);

  useEffect(() => {
    fetch('/api/knowledge')
      .then((res) => res.json())
      .then((json) => setArticles(json.data || []))
      .catch(() => setArticles([]))
      .finally(() => setLoading(false));
  }, []);

  const handleCopy = (code: string, idx: number) => {
    navigator.clipboard.writeText(code);
    setCopiedCodeIdx(idx);
    setTimeout(() => setCopiedCodeIdx(null), 2000);
  };

  const filteredArticles = articles.filter((art) => {
    if (activeCategory === '#All') return true;
    const cleanCat = activeCategory.replace('#', '').toLowerCase();
    const cat = (art.category || '').toLowerCase();
    const tags = (art.tags || []).map((t) => t.toLowerCase());
    return cat.includes(cleanCat) || tags.some((t) => t.includes(cleanCat));
  });

  return (
    <PageContainer>
      <AdminWrapper entityType="knowledge">
        <PageHeader
          title="Knowledge & Engineering Insights"
          description="Technical articles, architecture patterns, RLS policies, interview Q&As, and downloadable PDF/SQL guides."
        />

        {/* Category Filter Tabs */}
        <div className="mt-6 flex flex-wrap gap-2 border-b border-border/40 pb-4">
          {knowledgeCategories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-1.5 text-xs font-semibold rounded-full border transition-all ${
                activeCategory === cat
                  ? 'bg-primary text-primary-foreground border-primary shadow-md'
                  : 'bg-muted/30 text-muted-foreground hover:bg-muted border-border/50'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Collapsible Interview Q&A Accordions & Syntax Highlighted Code */}
        <div className="mt-8 rounded-2xl border border-border/60 bg-card p-6 space-y-4 shadow-sm">
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-primary" />
            Interview Q&A & Code Snippets Workspace
          </h2>

          <div className="space-y-3">
            {sampleQandAs.map((item, idx) => (
              <div key={idx} className="rounded-xl border border-border/40 bg-muted/20 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setOpenAccordion(openAccordion === idx ? null : idx)}
                  className="w-full flex items-center justify-between p-4 text-left font-semibold text-sm hover:bg-muted/40 transition-colors"
                >
                  <span>💡 {item.q}</span>
                  {openAccordion === idx ? <ChevronUp className="h-4 w-4 text-primary" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                </button>

                {openAccordion === idx && (
                  <div className="p-4 pt-0 space-y-3 border-t border-border/20 text-xs text-muted-foreground">
                    <p className="leading-relaxed">{item.a}</p>
                    {item.code && (
                      <div className="relative rounded-lg bg-zinc-950 p-3 text-zinc-100 font-mono text-[11px]">
                        <button
                          type="button"
                          onClick={() => handleCopy(item.code, idx)}
                          className="absolute top-2 right-2 flex items-center gap-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 px-2 py-1 rounded text-[10px]"
                        >
                          {copiedCodeIdx === idx ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                          {copiedCodeIdx === idx ? 'Copied!' : 'Copy Code'}
                        </button>
                        <pre className="overflow-x-auto whitespace-pre-wrap">{item.code}</pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Articles Grid */}
        <div className="mt-8">
          {loading ? (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 animate-pulse">
              {[1, 2, 3].map((n) => (
                <div key={n} className="h-56 rounded-xl bg-muted/40" />
              ))}
            </div>
          ) : filteredArticles.length > 0 ? (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {filteredArticles.map((article) => (
                <KnowledgeCard key={article.id} article={article} />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<BookOpen className="h-10 w-10" />}
              title="No articles found"
              description="No articles match the selected category filter."
            />
          )}
        </div>
      </AdminWrapper>
    </PageContainer>
  );
}
