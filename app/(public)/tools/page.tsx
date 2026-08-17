'use client';

import { useState, useEffect } from 'react';
import { PageContainer, PageHeader, EmptyState } from '@/components/common';
import { ToolCard } from '@/components/cards';
import { AdminWrapper } from '@/components/admin';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Wrench, Plus, X } from 'lucide-react';
import type { Tool } from '@/types/tools';

const pricingFilters = ['#All', '#Free', '#Freemium', '#Paid'];

const TOP_REPOS_SLUGS = ['openclaw', 'n8n', 'ollama', 'langflow', 'dify', 'langchain', 'open-webui', 'deepseek-v3', 'gemini-cli', 'ragflow', 'claude-code', 'crewai'];

export default function ToolsPage() {
  const [tools, setTools] = useState<Tool[]>([]);
  const [activePricing, setActivePricing] = useState('#All');
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const [newToolForm, setNewToolForm] = useState({
    name: '',
    category: 'AI Agent Frameworks',
    tagline: '',
    description: '',
    pricing: 'Free',
    website_url: 'https://',
    documentation_url: 'https://github.com/',
    tags: 'AI Agent, Developer Tool',
  });

  useEffect(() => {
    fetch('/api/tools')
      .then((res) => res.json())
      .then((json) => {
        let fetchedTools: Tool[] = json.data || [];
        try {
          const customSaved = localStorage.getItem('nexus_custom_tools');
          if (customSaved) {
            const customList: Tool[] = JSON.parse(customSaved);
            fetchedTools = [...customList, ...fetchedTools];
          }
        } catch {}
        setTools(fetchedTools);
      })
      .catch(() => setTools([]))
      .finally(() => setLoading(false));
  }, []);

  const handleAddToolSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newToolForm.name.trim()) return;

    const generatedSlug = newToolForm.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    const newToolItem: Tool = {
      id: 'tool-custom-' + Date.now(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      name: newToolForm.name.trim(),
      slug: generatedSlug,
      description: newToolForm.description.trim() || newToolForm.tagline.trim() || newToolForm.name.trim(),
      category: newToolForm.category.trim() || 'AI Tools',
      website_url: newToolForm.website_url.trim() || null,
      documentation_url: newToolForm.documentation_url.trim() || null,
      pricing: (newToolForm.pricing.toLowerCase() as any),
      pricing_details: null,
      is_open_source: true,
      tags: newToolForm.tags.split(',').map((t) => t.trim()).filter(Boolean),
      featured: true,
      published: true,
      display_order: 1,
    };

    // Try posting to backend API first
    try {
      await fetch('/api/tools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newToolItem),
      });
    } catch {}

    // Save to local storage for instant offline fallback state persistence
    const updated = [newToolItem, ...tools];
    setTools(updated);
    try {
      const customOnly = updated.filter((t) => t.id.startsWith('tool-custom-'));
      localStorage.setItem('nexus_custom_tools', JSON.stringify(customOnly));
    } catch {}

    setIsAddModalOpen(false);
    setNewToolForm({
      name: '',
      category: 'AI Agent Frameworks',
      tagline: '',
      description: '',
      pricing: 'Free',
      website_url: 'https://',
      documentation_url: 'https://github.com/',
      tags: 'AI Agent, Developer Tool',
    });
  };

  const filteredTools = tools.filter((tool) => {
    if (activePricing === '#All') return true;
    const cleanFilter = activePricing.replace('#', '').toLowerCase();
    const pricingStr = typeof tool.pricing === 'string' ? tool.pricing : (tool.pricing as any)?.value || '';
    return pricingStr.toLowerCase() === cleanFilter;
  });

  const topRepos = filteredTools.filter((t) => TOP_REPOS_SLUGS.includes(t.slug) || t.id.startsWith('tool-custom-'));
  const otherTools = filteredTools.filter((t) => !TOP_REPOS_SLUGS.includes(t.slug) && !t.id.startsWith('tool-custom-'));

  return (
    <PageContainer>
      <AdminWrapper entityType="tools">
        <PageHeader
          title="AI Tools & Ecosystem Directory"
          description="Curated catalog of top AI GitHub repositories, LLMs, local AI agents, vector databases, and developer productivity tools used by Naga Pavan Kumar Javisetty."
        />

        {/* Pricing Filter Tabs & Action Buttons */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-b border-border/40 pb-4">
          <div className="flex flex-wrap gap-2">
            {pricingFilters.map((pFilter) => (
              <button
                key={pFilter}
                onClick={() => setActivePricing(pFilter)}
                className={`px-4 py-1.5 text-xs font-semibold rounded-full border transition-all ${
                  activePricing === pFilter
                    ? 'bg-primary text-primary-foreground border-primary shadow-md'
                    : 'bg-muted/30 text-muted-foreground hover:bg-muted border-border/50'
                }`}
              >
                {pFilter}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <Button
              onClick={() => setIsAddModalOpen(true)}
              size="sm"
              className="gap-1.5 font-bold shadow-md bg-emerald-600 hover:bg-emerald-500 text-white"
            >
              <Plus className="h-4 w-4" />
              <span>Add New Tool</span>
            </Button>

            <a
              href="/tools/api-keys"
              className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-4 py-1.5 text-xs font-bold text-primary hover:bg-primary/20 transition-all shadow-sm"
            >
              <Wrench className="h-3.5 w-3.5" />
              <span>View API Key Collection (12+ Integrations) →</span>
            </a>
          </div>
        </div>

        <div className="mt-8 space-y-12">
          {loading ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 animate-pulse">
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <div key={n} className="h-48 rounded-xl bg-muted/40" />
              ))}
            </div>
          ) : filteredTools.length > 0 ? (
            <>
              {/* Section 1: Top 12 AI GitHub Repositories */}
              {topRepos.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <span className="h-2 w-2 rounded-full bg-emerald-400"></span>
                    <h2 className="text-lg font-bold text-foreground tracking-tight">
                      Top 12 AI GitHub Repositories & Agent Frameworks
                    </h2>
                  </div>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {topRepos.map((tool) => (
                      <ToolCard key={tool.id} tool={tool} />
                    ))}
                  </div>
                </div>
              )}

              {/* Section 2: Core Stack & Developer Tools */}
              {otherTools.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <span className="h-2 w-2 rounded-full bg-blue-400"></span>
                    <h2 className="text-lg font-bold text-foreground tracking-tight">
                      Databases, Cloud & Agentic Foundations
                    </h2>
                  </div>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {otherTools.map((tool) => (
                      <ToolCard key={tool.id} tool={tool} />
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <EmptyState
              icon={<Wrench className="h-10 w-10" />}
              title="No tools found"
              description="No tools match the selected pricing filter."
            />
          )}
        </div>
      </AdminWrapper>

      {/* Add New Tool Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-card border border-border rounded-2xl max-w-lg w-full p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border pb-4 mb-4">
              <div className="flex items-center gap-2">
                <Wrench className="h-5 w-5 text-emerald-400" />
                <h3 className="font-bold text-lg text-foreground">Add New AI / Developer Tool</h3>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-muted-foreground hover:text-foreground p-1 rounded-md"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleAddToolSubmit} className="space-y-4 text-xs">
              <div>
                <label className="font-semibold block mb-1">Tool Name *</label>
                <Input
                  placeholder="e.g. Ollama Web UI"
                  value={newToolForm.name}
                  onChange={(e) => setNewToolForm({ ...newToolForm, name: e.target.value })}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold block mb-1">Category</label>
                  <Input
                    placeholder="e.g. AI Agent Frameworks"
                    value={newToolForm.category}
                    onChange={(e) => setNewToolForm({ ...newToolForm, category: e.target.value })}
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1">Pricing Model</label>
                  <select
                    className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                    value={newToolForm.pricing}
                    onChange={(e) => setNewToolForm({ ...newToolForm, pricing: e.target.value })}
                  >
                    <option value="Free">Free</option>
                    <option value="Freemium">Freemium</option>
                    <option value="Paid">Paid</option>
                    <option value="Open Source">Open Source</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold block mb-1">Tagline / Short Description</label>
                <Input
                  placeholder="e.g. Run open-weight LLMs locally with web interface"
                  value={newToolForm.tagline}
                  onChange={(e) => setNewToolForm({ ...newToolForm, tagline: e.target.value })}
                />
              </div>

              <div>
                <label className="font-semibold block mb-1">Full Description</label>
                <textarea
                  className="w-full min-h-[80px] p-3 rounded-md border border-input bg-background text-sm"
                  placeholder="Detailed breakdown of capabilities, agent workflows, and architecture..."
                  value={newToolForm.description}
                  onChange={(e) => setNewToolForm({ ...newToolForm, description: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold block mb-1">Official Website URL</label>
                  <Input
                    placeholder="https://..."
                    value={newToolForm.website_url}
                    onChange={(e) => setNewToolForm({ ...newToolForm, website_url: e.target.value })}
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1">Documentation / GitHub URL</label>
                  <Input
                    placeholder="https://github.com/..."
                    value={newToolForm.documentation_url}
                    onChange={(e) => setNewToolForm({ ...newToolForm, documentation_url: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold block mb-1">Tags (comma-separated)</label>
                <Input
                  placeholder="AI Agent, Local LLMs, Open Source"
                  value={newToolForm.tags}
                  onChange={(e) => setNewToolForm({ ...newToolForm, tags: e.target.value })}
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-border">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsAddModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold">
                  Add Tool
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </PageContainer>
  );
}
