'use client';

import { useState } from 'react';
import { Check, Copy, Loader2, Plug, ShieldCheck, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { ideClient } from '../services/ide-client';
import type { IdeAgentDevice } from '@/types/ide';

interface AgentPairingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPaired: () => void;
}

export function AgentPairingDialog({ open, onOpenChange, onPaired }: AgentPairingDialogProps) {
  const [name, setName] = useState('My Laptop');
  const [busy, setBusy] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [devices, setDevices] = useState<IdeAgentDevice[]>([]);
  const [copied, setCopied] = useState(false);

  const loadDevices = async () => {
    try {
      const data = await ideClient.getAgentStatus();
      setDevices(data.devices);
    } catch {
      // Non-fatal — the list is informational.
    }
  };

  const pair = async () => {
    setBusy(true);
    try {
      const result = await ideClient.pairAgent(name.trim() || 'Local Agent');
      setToken(result.token);
      await loadDevices();
      onPaired();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not create a device token.');
    } finally {
      setBusy(false);
    }
  };

  const revoke = async (deviceId: string) => {
    if (!window.confirm('Revoke this device? Its agent will stop working immediately.')) return;
    try {
      await ideClient.revokeAgent(deviceId);
      await loadDevices();
      onPaired();
      toast.success('Device revoked.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not revoke the device.');
    }
  };

  const command = token
    ? `NEXUS_SERVER_URL=${typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'} \\\n  NEXUS_AGENT_TOKEN=${token} \\\n  node agent/nexus-agent.mjs`
    : '';

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (next) loadDevices();
        else {
          setToken(null);
          setCopied(false);
        }
      }}
    >
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Plug className="h-4 w-4 text-primary" />
            Nexus Local Development Agent
          </DialogTitle>
          <DialogDescription className="text-xs leading-relaxed">
            Your code runs on your machine, never on this server. The agent is the only component
            that executes anything — it accepts a fixed list of programs, spawns them without a
            shell, and writes only inside the workspace directory you choose.
          </DialogDescription>
        </DialogHeader>

        {token ? (
          <div className="space-y-4">
            <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3">
              <p className="text-xs font-semibold text-amber-300">
                Copy this token now — it cannot be shown again.
              </p>
              <p className="mt-1 text-[11px] text-amber-300/80">
                Only a SHA-256 hash is stored on the server.
              </p>
            </div>

            <div>
              <p className="mb-1.5 text-xs font-medium text-foreground">
                Run this in your project directory:
              </p>
              <div className="relative">
                <pre className="overflow-x-auto rounded-md border border-border/40 bg-[#0a0f19] p-3 pr-12 font-mono text-[11px] leading-relaxed text-[#dbe3ee]">
                  {command}
                </pre>
                <Button
                  size="icon"
                  variant="ghost"
                  className="absolute right-1.5 top-1.5 h-7 w-7"
                  onClick={async () => {
                    await navigator.clipboard.writeText(command);
                    setCopied(true);
                    toast.success('Command copied.');
                    setTimeout(() => setCopied(false), 2000);
                  }}
                >
                  {copied ? (
                    <Check className="h-3.5 w-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </Button>
              </div>
            </div>

            <p className="text-[11px] text-muted-foreground">
              The status bar switches to <strong className="text-foreground">Agent connected</strong>{' '}
              within a few seconds. Full setup notes are in{' '}
              <code className="font-mono text-foreground">agent/README.md</code>.
            </p>

            <Button size="sm" className="w-full" onClick={() => onOpenChange(false)}>
              Done
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-foreground">
                Device name
              </label>
              <Input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="My Laptop"
                className="h-8 text-xs"
              />
            </div>

            <div className="space-y-1.5 rounded-md border border-border/40 bg-muted/30 p-3 text-[11px] text-muted-foreground">
              <p className="flex items-center gap-1.5 font-medium text-foreground">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                What the agent can and cannot do
              </p>
              <p>· Runs only allow-listed programs (npm, git, node, python, java, go, …)</p>
              <p>· Spawns without a shell, so pipes and chaining have no interpreter</p>
              <p>· Writes only beneath the workspace root you set</p>
              <p>· Stops the moment you revoke the device here</p>
            </div>

            <Button size="sm" className="w-full" onClick={pair} disabled={busy}>
              {busy ? (
                <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Plug className="mr-2 h-3.5 w-3.5" />
              )}
              Generate device token
            </Button>

            {devices.length > 0 && (
              <div>
                <p className="mb-1.5 text-xs font-medium text-foreground">Paired devices</p>
                <div className="space-y-1">
                  {devices.map((device) => (
                    <div
                      key={device.id}
                      className="flex items-center gap-2 rounded-md border border-border/40 px-2.5 py-1.5"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs text-foreground">{device.name}</p>
                        <p className="truncate text-[10px] text-muted-foreground">
                          {device.token_prefix}… ·{' '}
                          {device.last_seen_at
                            ? `last seen ${new Date(device.last_seen_at).toLocaleString()}`
                            : 'never connected'}
                        </p>
                      </div>
                      <Badge
                        variant="outline"
                        className="h-4 shrink-0 px-1.5 text-[9px] capitalize"
                      >
                        {device.status}
                      </Badge>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6 shrink-0 text-muted-foreground hover:text-destructive"
                        onClick={() => revoke(device.id)}
                        title="Revoke"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
