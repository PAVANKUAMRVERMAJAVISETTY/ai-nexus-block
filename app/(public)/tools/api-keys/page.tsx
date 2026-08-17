'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { PageContainer, PageHeader } from '@/components/common';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  KeyRound,
  Search,
  ExternalLink,
  Check,
  Copy,
  Plus,
  X,
  Sparkles,
  Layers,
  Wrench,
  ShieldCheck,
} from 'lucide-react';

export interface ApiKeyItem {
  id: string;
  name: string;
  category: string;
  usedFor: string;
  usedInProjects: string[];
  websiteUrl: string;
  pricingType: 'Free' | 'Freemium' | 'Paid' | 'Open Source';
  badgeColor: string;
  keyReferenceName: string;
}

const API_KEYS_DATA: ApiKeyItem[] = [
  {
    id: 'supabase',
    name: 'Supabase Client & Service Role API',
    category: 'Database & Auth',
    usedFor: 'PostgreSQL database access, Row Level Security (RLS) enforcement, realtime database subscriptions, user authentication, and storage bucket management.',
    usedInProjects: ['AI Nexus Block', 'Urban Properties', 'Trippy\'s Mehfill', 'Shree Gopi Traders', 'Extru Tech'],
    websiteUrl: 'https://supabase.com/',
    pricingType: 'Freemium',
    badgeColor: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
    keyReferenceName: 'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  },
  {
    id: 'gemini',
    name: 'Google Gemini API',
    category: 'AI Reasoning',
    usedFor: 'Multimodal AI reasoning, high-speed code analysis, instant bug resolution, and live copilot chat assistance in AI Nexus Block.',
    usedInProjects: ['AI Nexus Block'],
    websiteUrl: 'https://ai.google.dev/',
    pricingType: 'Freemium',
    badgeColor: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    keyReferenceName: 'GEMINI_API_KEY',
  },
  {
    id: 'openrouter',
    name: 'OpenRouter Multi-LLM API',
    category: 'AI Gateway Router',
    usedFor: 'Multi-provider AI model orchestration (Claude 3.5 Sonnet, GPT-4o, Llama 3, DeepSeek) with automated fallback routing.',
    usedInProjects: ['AI Nexus Block'],
    websiteUrl: 'https://openrouter.ai/',
    pricingType: 'Paid',
    badgeColor: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
    keyReferenceName: 'OPENROUTER_API_KEY',
  },
  {
    id: 'razorpay',
    name: 'Razorpay Payments API',
    category: 'Fintech & Payments',
    usedFor: 'B2B online payment checkout, consultation booking billing, order creation, and payment verification webhooks in Extru Tech.',
    usedInProjects: ['Extru Tech'],
    websiteUrl: 'https://razorpay.com/',
    pricingType: 'Paid',
    badgeColor: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20',
    keyReferenceName: 'RAZORPAY_KEY_ID',
  },
  {
    id: 'vercel',
    name: 'Vercel Edge Platform API',
    category: 'Cloud Deployment',
    usedFor: 'Edge network deployment, serverless function execution, dynamic domain routing, and CI/CD automated deployment.',
    usedInProjects: ['AI Nexus Block', 'Trippy\'s Mehfill', 'Extru Tech', 'Urban Properties'],
    websiteUrl: 'https://vercel.com/',
    pricingType: 'Freemium',
    badgeColor: 'bg-zinc-500/10 text-zinc-300 border-zinc-500/20',
    keyReferenceName: 'VERCEL_TOKEN',
  },
  {
    id: 'github',
    name: 'GitHub REST & GraphQL API',
    category: 'Developer Services',
    usedFor: 'Repository synchronization, public commit metadata tracking, automated release logging, and profile portfolio stats.',
    usedInProjects: ['AI Nexus Block'],
    websiteUrl: 'https://docs.github.com/en/rest',
    pricingType: 'Free',
    badgeColor: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
    keyReferenceName: 'GITHUB_PERSONAL_ACCESS_TOKEN',
  },
  {
    id: 'pkzip',
    name: 'PKZip Binary Archiver Engine',
    category: 'Binary & File Processing',
    usedFor: 'Zero-dependency client-side ZIP package generator with native Uint8Array headers and CRC-32 checksums for bulk property media downloads.',
    usedInProjects: ['Urban Properties'],
    websiteUrl: 'https://seedhaproperties.com/',
    pricingType: 'Open Source',
    badgeColor: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
    keyReferenceName: 'CUSTOM_PKZIP_ENGINE',
  },
  {
    id: 'haversine',
    name: 'Haversine Geolocation Engine',
    category: 'Location & Routing',
    usedFor: 'Micro-market spherical coordinate distance calculation to instantly route incoming real estate leads to local territory agents.',
    usedInProjects: ['Urban Properties'],
    websiteUrl: 'https://seedhaproperties.com/',
    pricingType: 'Open Source',
    badgeColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    keyReferenceName: 'HAVERSINE_GEO_ENGINE',
  },
  {
    id: 'tanstack',
    name: 'TanStack Query & Router API',
    category: 'Client State & Routing',
    usedFor: 'Asynchronous server-state caching, optimistic UI updates, background refetching, and type-safe routing in Urban Properties.',
    usedInProjects: ['Urban Properties'],
    websiteUrl: 'https://tanstack.com/',
    pricingType: 'Open Source',
    badgeColor: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
    keyReferenceName: 'TANSTACK_QUERY_CLIENT',
  },
  {
    id: 'tailwind-framer',
    name: 'Tailwind CSS & Framer Motion',
    category: 'UI & Animation',
    usedFor: 'Utility-first responsive styling, 3D tilt perspective cards, dark mode tokens, glassmorphism overlays, and fluid layout motion.',
    usedInProjects: ['AI Nexus Block', 'Urban Properties', 'Trippy\'s Mehfill', 'Shree Gopi Traders', 'Extru Tech'],
    websiteUrl: 'https://tailwindcss.com/',
    pricingType: 'Open Source',
    badgeColor: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
    keyReferenceName: 'TAILWIND_DESIGN_SYSTEM',
  },
  {
    id: 'claude',
    name: 'Anthropic Claude API (Claude Code)',
    category: 'Agentic Workflows',
    usedFor: 'Advanced autonomous agentic software engineering, code generation, refactoring, and automated test suite execution.',
    usedInProjects: ['AI Nexus Block'],
    websiteUrl: 'https://www.anthropic.com/',
    pricingType: 'Paid',
    badgeColor: 'bg-amber-600/10 text-amber-500 border-amber-600/20',
    keyReferenceName: 'ANTHROPIC_API_KEY',
  },
  {
    id: 'unsplash',
    name: 'Unsplash Source Media API',
    category: 'Media & Assets',
    usedFor: 'High-resolution dynamic imagery, portfolio profile avatars, property preview images, and project cover screenshot assets.',
    usedInProjects: ['AI Nexus Block', 'Urban Properties', 'Trippy\'s Mehfill', 'Shree Gopi Traders', 'Extru Tech'],
    websiteUrl: 'https://unsplash.com/developers',
    pricingType: 'Free',
    badgeColor: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
    keyReferenceName: 'UNSPLASH_ACCESS_KEY',
  },
];

const PRICING_FILTERS = ['#All', '#Free / Open Source', '#Freemium', '#Paid'];

export default function ApiKeysPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('#All');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [customKeys, setCustomKeys] = useState<ApiKeyItem[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const [newKeyForm, setNewKeyForm] = useState({
    name: '',
    category: 'AI Service',
    usedFor: '',
    usedInProjects: 'AI Nexus Block',
    websiteUrl: 'https://',
    pricingType: 'Freemium' as ApiKeyItem['pricingType'],
    keyReferenceName: '',
  });

  useEffect(() => {
    try {
      const saved = localStorage.getItem('nexus_custom_api_keys');
      if (saved) {
        setCustomKeys(JSON.parse(saved));
      }
    } catch {}
  }, []);

  const handleAddCustomKey = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyForm.name.trim() || !newKeyForm.keyReferenceName.trim()) return;

    const newItem: ApiKeyItem = {
      id: 'custom-' + Date.now(),
      name: newKeyForm.name.trim(),
      category: newKeyForm.category.trim() || 'AI Service',
      usedFor: newKeyForm.usedFor.trim() || 'Custom API Key Integration',
      usedInProjects: newKeyForm.usedInProjects.split(',').map((p) => p.trim()).filter(Boolean),
      websiteUrl: newKeyForm.websiteUrl.trim() || 'https://',
      pricingType: newKeyForm.pricingType,
      badgeColor: newKeyForm.pricingType === 'Paid' ? 'bg-purple-500/10 text-purple-500 border-purple-500/20' : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
      keyReferenceName: newKeyForm.keyReferenceName.trim().toUpperCase(),
    };

    const updated = [newItem, ...customKeys];
    setCustomKeys(updated);
    try {
      localStorage.setItem('nexus_custom_api_keys', JSON.stringify(updated));
    } catch {}

    setIsAddModalOpen(false);
    setNewKeyForm({
      name: '',
      category: 'AI Service',
      usedFor: '',
      usedInProjects: 'AI Nexus Block',
      websiteUrl: 'https://',
      pricingType: 'Freemium',
      keyReferenceName: '',
    });
  };

  const handleCopyKeyRef = (keyRef: string, id: string) => {
    navigator.clipboard.writeText(keyRef);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const allKeys = [...customKeys, ...API_KEYS_DATA];

  const filteredKeys = allKeys.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.usedFor.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.usedInProjects.some((p) => p.toLowerCase().includes(searchQuery.toLowerCase()));

    if (activeFilter === '#All') return matchesSearch;
    if (activeFilter === '#Free / Open Source') {
      return matchesSearch && (item.pricingType === 'Free' || item.pricingType === 'Open Source');
    }
    if (activeFilter === '#Freemium') {
      return matchesSearch && item.pricingType === 'Freemium';
    }
    if (activeFilter === '#Paid') {
      return matchesSearch && item.pricingType === 'Paid';
    }
    return matchesSearch;
  });

  return (
    <PageContainer>
      <PageHeader
        title="API Key Collection & Backup Vault"
        description="Structured catalog of 12+ API keys, cloud integrations, and custom algorithmic engines powering Naga Pavan Kumar Javisetty's production platforms."
      />

      {/* Top Controls: Search Bar, Add Button & Pricing Filters */}
      <div className="mt-8 flex flex-col sm:flex-row gap-4 items-center justify-between border-b border-border/40 pb-6">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search API keys or projects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-card/50 text-sm"
            />
          </div>

          <Button
            onClick={() => setIsAddModalOpen(true)}
            size="sm"
            className="gap-1.5 font-bold shadow-md bg-emerald-600 hover:bg-emerald-500 text-white shrink-0"
          >
            <Plus className="h-4 w-4" />
            <span>Add API Key</span>
          </Button>
        </div>

        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          {PRICING_FILTERS.map((filter) => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-full border transition-all ${
                activeFilter === filter
                  ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                  : 'bg-muted/30 text-muted-foreground hover:bg-muted border-border/40'
              }`}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      {/* Structured Tabular View */}
      <div className="mt-8 overflow-x-auto rounded-2xl border border-border/60 bg-card shadow-lg">
        <table className="w-full text-left border-collapse min-w-[800px]">
          <thead>
            <tr className="border-b border-border/60 bg-muted/40 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              <th className="py-4 px-5">API Key Name & Category</th>
              <th className="py-4 px-5">Used For / Features</th>
              <th className="py-4 px-5">Utilized In Platforms</th>
              <th className="py-4 px-5">Free / Paid</th>
              <th className="py-4 px-5 text-right">Link & Reference</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/30 text-sm">
            {filteredKeys.length > 0 ? (
              filteredKeys.map((item) => (
                <tr key={item.id} className="hover:bg-muted/20 transition-colors">
                  {/* API Key Name & Category */}
                  <td className="py-4 px-5 align-top">
                    <div className="flex items-start gap-2.5">
                      <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0 mt-0.5">
                        <KeyRound className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="font-semibold text-foreground">{item.name}</div>
                        <Badge variant="outline" className="text-[10px] mt-1 font-mono">
                          {item.category}
                        </Badge>
                      </div>
                    </div>
                  </td>

                  {/* Used For / Features */}
                  <td className="py-4 px-5 align-top max-w-sm">
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {item.usedFor}
                    </p>
                  </td>

                  {/* Utilized In Platforms */}
                  <td className="py-4 px-5 align-top">
                    <div className="flex flex-wrap gap-1">
                      {item.usedInProjects.map((proj) => (
                        <Badge key={proj} variant="secondary" className="text-[10px] font-medium">
                          {proj}
                        </Badge>
                      ))}
                    </div>
                  </td>

                  {/* Free / Paid Badge */}
                  <td className="py-4 px-5 align-top">
                    <Badge variant="outline" className={`text-xs font-bold ${item.badgeColor}`}>
                      {item.pricingType}
                    </Badge>
                  </td>

                  {/* Link & Reference */}
                  <td className="py-4 px-5 align-top text-right space-y-2">
                    <div>
                      <a
                        href={item.websiteUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                      >
                        Official Site
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>

                    <div>
                      <button
                        type="button"
                        onClick={() => handleCopyKeyRef(item.keyReferenceName, item.id)}
                        className="inline-flex items-center gap-1 text-[11px] font-mono text-muted-foreground hover:text-foreground bg-muted/40 hover:bg-muted px-2 py-1 rounded border border-border/40 transition-colors"
                        title="Copy Key Identifier"
                      >
                        {copiedId === item.id ? (
                          <>
                            <Check className="h-3 w-3 text-emerald-400" />
                            Copied!
                          </>
                        ) : (
                          <>
                            <Copy className="h-3 w-3" />
                            {item.keyReferenceName.length > 18 ? item.keyReferenceName.slice(0, 18) + '...' : item.keyReferenceName}
                          </>
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="py-12 text-center text-muted-foreground">
                  No API key integrations match your search criteria.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add Custom API Key Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-card border border-border rounded-2xl max-w-lg w-full p-6 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-border pb-4 mb-4">
              <div className="flex items-center gap-2">
                <KeyRound className="h-5 w-5 text-emerald-400" />
                <h3 className="font-bold text-lg text-foreground">Add Custom API Key Backup</h3>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-muted-foreground hover:text-foreground p-1 rounded-md"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleAddCustomKey} className="space-y-4 text-xs">
              <div>
                <label className="font-semibold block mb-1">API Service Name *</label>
                <Input
                  placeholder="e.g. OpenAI GPT-4o API"
                  value={newKeyForm.name}
                  onChange={(e) => setNewKeyForm({ ...newKeyForm, name: e.target.value })}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold block mb-1">Category</label>
                  <Input
                    placeholder="e.g. LLM Inference"
                    value={newKeyForm.category}
                    onChange={(e) => setNewKeyForm({ ...newKeyForm, category: e.target.value })}
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1">Pricing Type</label>
                  <select
                    className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                    value={newKeyForm.pricingType}
                    onChange={(e) => setNewKeyForm({ ...newKeyForm, pricingType: e.target.value as any })}
                  >
                    <option value="Free">Free</option>
                    <option value="Freemium">Freemium</option>
                    <option value="Paid">Paid</option>
                    <option value="Open Source">Open Source</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold block mb-1">Key Reference / Secret Name *</label>
                <Input
                  placeholder="e.g. OPENAI_API_KEY or sk-proj-..."
                  value={newKeyForm.keyReferenceName}
                  onChange={(e) => setNewKeyForm({ ...newKeyForm, keyReferenceName: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="font-semibold block mb-1">Used For / Features</label>
                <Input
                  placeholder="e.g. Code generation, automated testing, RAG embeddings"
                  value={newKeyForm.usedFor}
                  onChange={(e) => setNewKeyForm({ ...newKeyForm, usedFor: e.target.value })}
                />
              </div>

              <div>
                <label className="font-semibold block mb-1">Utilized In Projects (comma separated)</label>
                <Input
                  placeholder="e.g. AI Nexus Block, Urban Properties"
                  value={newKeyForm.usedInProjects}
                  onChange={(e) => setNewKeyForm({ ...newKeyForm, usedInProjects: e.target.value })}
                />
              </div>

              <div>
                <label className="font-semibold block mb-1">Official Website URL</label>
                <Input
                  placeholder="https://platform.openai.com"
                  value={newKeyForm.websiteUrl}
                  onChange={(e) => setNewKeyForm({ ...newKeyForm, websiteUrl: e.target.value })}
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-border">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsAddModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold">
                  Save to Vault
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </PageContainer>
  );
}
