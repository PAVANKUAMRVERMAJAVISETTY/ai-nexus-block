'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { PageContainer, PageHeader, EmptyState } from '@/components/common';
import { Badge } from '@/components/ui/badge';
import { AdminWrapper, AdminEditButton } from '@/components/admin';
import { ShieldCheck, CheckCircle2, AlertCircle, FileText, ArrowRight, Layers } from 'lucide-react';

const statusTabs = ['#All', '#Accepted', '#Proposed', '#Deprecated'];

export default function DecisionsPage() {
  const [decisions, setDecisions] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('#All');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/decisions')
      .then((res) => res.json())
      .then((json) => setDecisions(json.data || []))
      .catch(() => setDecisions([]))
      .finally(() => setLoading(false));
  }, []);

  const filteredDecisions = decisions.filter((d) => {
    if (activeTab === '#All') return true;
    const cleanStatus = activeTab.replace('#', '').toLowerCase();
    const status = (d.status || '').toLowerCase();
    return status === cleanStatus;
  });

  const getStatusBadge = (status: string) => {
    const s = (status || '').toLowerCase();
    if (s === 'accepted') {
      return <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/30">Accepted</Badge>;
    }
    if (s === 'proposed') {
      return <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/30">Proposed</Badge>;
    }
    if (s === 'deprecated') {
      return <Badge className="bg-rose-500/10 text-rose-500 border-rose-500/30">Deprecated</Badge>;
    }
    return <Badge variant="outline">{status}</Badge>;
  };

  return (
    <PageContainer>
      <AdminWrapper entityType="decisions">
        <PageHeader
          title="Architectural Decision Records (ADRs)"
          description="Documented trade-offs, system design choices, and technical evolution of the platform."
        />

        {/* Status Filter Tabs */}
        <div className="mt-6 flex flex-wrap gap-2 border-b border-border/40 pb-4">
          {statusTabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-1.5 text-xs font-semibold rounded-full border transition-all ${
                activeTab === tab
                  ? 'bg-primary text-primary-foreground border-primary shadow-md'
                  : 'bg-muted/30 text-muted-foreground hover:bg-muted border-border/50'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="mt-8 space-y-6">
          {loading ? (
            <div className="space-y-4 animate-pulse">
              {[1, 2, 3].map((n) => (
                <div key={n} className="h-44 rounded-xl bg-muted/40" />
              ))}
            </div>
          ) : filteredDecisions.length > 0 ? (
            filteredDecisions.map((adr) => (
              <div
                key={adr.id || adr.slug}
                className="relative rounded-2xl border border-border/60 bg-card p-6 shadow-md transition-all hover:border-primary/40 hover:shadow-lg space-y-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      {getStatusBadge(adr.status)}
                      <Badge variant="secondary" className="text-xs">{adr.category || 'Architecture'}</Badge>
                    </div>
                    <Link href={`/decisions/${adr.slug}`} className="hover:underline">
                      <h2 className="text-xl font-bold tracking-tight text-foreground">{adr.title}</h2>
                    </Link>
                  </div>

                  <AdminEditButton entityType="decisions" item={adr} />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 text-xs">
                  {/* Context */}
                  <div className="rounded-xl border border-border/30 bg-muted/20 p-4 space-y-1">
                    <span className="font-bold text-muted-foreground uppercase text-[10px]">Context</span>
                    <p className="text-foreground leading-relaxed line-clamp-3">{adr.context}</p>
                  </div>

                  {/* Decision */}
                  <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-1">
                    <span className="font-bold text-primary uppercase text-[10px]">Decision</span>
                    <p className="text-foreground leading-relaxed line-clamp-3">{adr.decision}</p>
                  </div>

                  {/* Consequences */}
                  <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 space-y-1">
                    <span className="font-bold text-emerald-500 uppercase text-[10px]">Consequences</span>
                    <p className="text-foreground leading-relaxed line-clamp-3">{adr.consequences}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 text-xs text-muted-foreground border-t border-border/20">
                  <span>Record Date: {new Date(adr.created_at || Date.now()).toLocaleDateString()}</span>
                  <Link href={`/decisions/${adr.slug}`} className="flex items-center text-primary font-semibold hover:underline">
                    Read full ADR <ArrowRight className="h-3.5 w-3.5 ml-1" />
                  </Link>
                </div>
              </div>
            ))
          ) : (
            <EmptyState
              icon={<Layers className="h-10 w-10" />}
              title="No ADR records found"
              description="No architectural decision records match the selected filter."
            />
          )}
        </div>
      </AdminWrapper>
    </PageContainer>
  );
}
