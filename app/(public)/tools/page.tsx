'use client';

import { useState, useEffect } from 'react';
import { PageContainer, PageHeader, EmptyState } from '@/components/common';
import { ToolCard } from '@/components/cards';
import { AdminWrapper } from '@/components/admin';
import { Wrench } from 'lucide-react';
import type { Tool } from '@/types/tools';

const pricingFilters = ['#All', '#Free', '#Freemium', '#Paid'];

export default function ToolsPage() {
  const [tools, setTools] = useState<Tool[]>([]);
  const [activePricing, setActivePricing] = useState('#All');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/tools')
      .then((res) => res.json())
      .then((json) => setTools(json.data || []))
      .catch(() => setTools([]))
      .finally(() => setLoading(false));
  }, []);

  const filteredTools = tools.filter((tool) => {
    if (activePricing === '#All') return true;
    const cleanFilter = activePricing.replace('#', '').toLowerCase();
    const pricingStr = typeof tool.pricing === 'string' ? tool.pricing : (tool.pricing as any)?.value || '';
    return pricingStr.toLowerCase() === cleanFilter;
  });

  return (
    <PageContainer>
      <AdminWrapper entityType="tools">
        <PageHeader
          title="AI Tools & Directory"
          description="A curated catalog of AI and developer tools with educational breakdowns, pricing models, and step-by-step guides."
        />

        {/* Pricing Filter Tabs & API Key Collection Link */}
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

          <a
            href="/tools/api-keys"
            className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-4 py-1.5 text-xs font-bold text-primary hover:bg-primary/20 transition-all shadow-sm"
          >
            <Wrench className="h-3.5 w-3.5" />
            <span>View API Key Collection (12+ Integrations) →</span>
          </a>
        </div>

        <div className="mt-8">
          {loading ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 animate-pulse">
              {[1, 2, 3].map((n) => (
                <div key={n} className="h-48 rounded-xl bg-muted/40" />
              ))}
            </div>
          ) : filteredTools.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredTools.map((tool) => (
                <ToolCard key={tool.id} tool={tool} />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<Wrench className="h-10 w-10" />}
              title="No tools found"
              description="No tools match the selected pricing filter."
            />
          )}
        </div>
      </AdminWrapper>
    </PageContainer>
  );
}
