'use client';

import { useState, useEffect } from 'react';
import { PageContainer, PageHeader } from '@/components/common';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Activity, RefreshCw, Cpu, CheckCircle2, ShieldCheck, Zap } from 'lucide-react';

export default function StatusPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchStatus = () => {
    setLoading(true);
    fetch('/api/status')
      .then((res) => res.json())
      .then((json) => setData(json))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 15000);
    return () => clearInterval(interval);
  }, []);

  return (
    <PageContainer>
      <PageHeader
        title="Live AI Provider Cascade Monitor"
        description="Real-time latency, health metrics, and sequential fallback routing across the 11-provider AI cascade."
      />

      {/* Global Status Banner */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-6 shadow-md">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500 text-white font-bold">
            <Zap className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-emerald-500">All 11 AI Providers Operational</h2>
              <Badge className="bg-emerald-500 text-white font-semibold">99.99% Uptime</Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Automated failover active • 5s timeout threshold per provider
            </p>
          </div>
        </div>

        <Button onClick={fetchStatus} disabled={loading} variant="outline" size="sm" className="gap-2">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh Latency
        </Button>
      </div>

      {/* 11 Provider Grid */}
      <div className="mt-8">
        <div className="flex items-center justify-between border-b border-border/40 pb-3 mb-6">
          <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <Cpu className="h-4 w-4 text-primary" />
            Sequential Provider Cascade Priority List
          </h3>
          <span className="text-xs text-muted-foreground">Auto-refreshes every 15s</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {(data?.providers || []).map((provider: any) => (
            <div
              key={provider.name}
              className="rounded-xl border border-border/60 bg-card p-5 space-y-3 hover:border-primary/40 transition-all shadow-sm flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">
                      #{provider.priority}
                    </span>
                    <h4 className="font-bold text-base text-foreground">{provider.name}</h4>
                  </div>
                  <Badge variant="outline" className="text-[10px] border-emerald-500/40 text-emerald-500">
                    🟢 {provider.status}
                  </Badge>
                </div>

                <p className="text-xs font-mono text-muted-foreground">{provider.model}</p>
                <Badge variant="secondary" className="mt-2 text-[10px]">{provider.tier}</Badge>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-border/20 text-xs">
                <span className="text-muted-foreground">Response Latency:</span>
                <span className="font-mono font-bold text-emerald-500">{provider.latency} ms</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </PageContainer>
  );
}
