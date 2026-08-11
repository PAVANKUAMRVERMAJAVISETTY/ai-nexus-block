'use client';

import { useEffect, useRef, useState } from 'react';
import {
  Bot,
  FileDiff,
  Loader2,
  Send,
  Sparkles,
  TriangleAlert,
  User as UserIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { ideClient } from '../services/ide-client';
import {
  assistantIdentity,
  defaultAssistantMode,
  defaultExplanationLevel,
  explanationLevels,
  ideAssistantModes,
  proposingModes,
} from '@/config/ide';
import type {
  IdeAgentAction,
  IdeAssistantMode,
  IdeAssistantScope,
  IdeExplanationLevel,
} from '@/types/ide';

export interface AiPanelMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  action?: IdeAgentAction | null;
  warnings?: string[];
  contextFiles?: string[];
}

export interface AiPrefill {
  message: string;
  mode: IdeAssistantMode;
  scope?: IdeAssistantScope;
  /** Send immediately rather than waiting for the user to press enter. */
  autoSend?: boolean;
}

interface AiPanelProps {
  projectId: string;
  activeFilePath: string | null;
  selection: { text: string; startLine: number; endLine: number } | null;
  prefill: AiPrefill | null;
  onPrefillHandled: () => void;
  onReviewAction: (action: IdeAgentAction) => void;
  isAdmin: boolean;
}

/** Render assistant markdown: fenced code, inline code, bold, and headings. */
function renderContent(content: string) {
  const segments = content.split(/(```[\s\S]*?```)/g);

  return segments.map((segment, index) => {
    if (segment.startsWith('```')) {
      const body = segment.replace(/^```[\w-]*\n?/, '').replace(/```$/, '');
      return (
        <pre
          key={index}
          className="my-2 overflow-x-auto rounded-md border border-border/40 bg-[#0a0f19] p-3 font-mono text-[11.5px] leading-relaxed text-[#dbe3ee]"
        >
          {body}
        </pre>
      );
    }

    return (
      <div key={index} className="whitespace-pre-wrap">
        {segment.split('\n').map((line, lineIndex) => {
          if (/^#{1,4}\s/.test(line)) {
            return (
              <p key={lineIndex} className="mt-2 font-semibold text-foreground">
                {line.replace(/^#+\s/, '')}
              </p>
            );
          }
          const parts = line.split(/(`[^`]+`|\*\*[^*]+\*\*)/g);
          return (
            <p key={lineIndex}>
              {parts.map((part, partIndex) => {
                if (part.startsWith('`') && part.endsWith('`')) {
                  return (
                    <code
                      key={partIndex}
                      className="rounded bg-muted px-1 py-0.5 font-mono text-[11.5px] text-primary"
                    >
                      {part.slice(1, -1)}
                    </code>
                  );
                }
                if (part.startsWith('**') && part.endsWith('**')) {
                  return (
                    <strong key={partIndex} className="font-semibold text-foreground">
                      {part.slice(2, -2)}
                    </strong>
                  );
                }
                return <span key={partIndex}>{part}</span>;
              })}
            </p>
          );
        })}
      </div>
    );
  });
}

export function AiPanel({
  projectId,
  activeFilePath,
  selection,
  prefill,
  onPrefillHandled,
  onReviewAction,
  isAdmin,
}: AiPanelProps) {
  const [messages, setMessages] = useState<AiPanelMessage[]>([]);
  const [input, setInput] = useState('');
  const [mode, setMode] = useState<IdeAssistantMode>(defaultAssistantMode);
  const [level, setLevel] = useState<IdeExplanationLevel>(defaultExplanationLevel);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [debugInfo, setDebugInfo] = useState<string | null>(null);

  const endRef = useRef<HTMLDivElement | null>(null);
  const useSelectionRef = useRef(true);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, busy]);

  const send = async (
    text: string,
    sendMode: IdeAssistantMode = mode,
    scopeOverride?: IdeAssistantScope
  ) => {
    const trimmed = text.trim();
    if (!trimmed || busy) return;

    const scope: IdeAssistantScope = scopeOverride ?? {
      activeFilePath,
      selection: useSelectionRef.current && selection?.text ? selection.text : null,
      selectionStartLine: selection?.startLine ?? null,
      selectionEndLine: selection?.endLine ?? null,
    };

    setMessages((prev) => [
      ...prev,
      { id: `u-${Date.now()}`, role: 'user', content: trimmed },
    ]);
    setInput('');
    setBusy(true);

    try {
      const result = await ideClient.ask({
        projectId,
        message: trimmed,
        mode: sendMode,
        level,
        conversationId,
        scope,
      });

      setConversationId(result.conversationId);
      if (isAdmin && result.debugProvider) {
        setDebugInfo(`${result.debugProvider} · ${result.debugModel ?? 'default model'}`);
      }

      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: 'assistant',
          content: result.content,
          action: result.action,
          warnings: result.warnings,
          contextFiles: result.contextFilesUsed,
        },
      ]);

      if (result.action) {
        toast.info('Nexus AI proposed a change. Review it before it is applied.');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'The assistant is unavailable.';
      setMessages((prev) => [
        ...prev,
        { id: `e-${Date.now()}`, role: 'assistant', content: `⚠️ ${message}` },
      ]);
    } finally {
      setBusy(false);
    }
  };

  // Handle a request handed over from the Problems panel or terminal.
  useEffect(() => {
    if (!prefill) return;

    setMode(prefill.mode);
    if (prefill.autoSend) {
      send(prefill.message, prefill.mode, prefill.scope);
    } else {
      setInput(prefill.message);
    }
    onPrefillHandled();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefill]);

  const activeMode = ideAssistantModes.find((m) => m.id === mode);
  const canPropose = proposingModes.has(mode);

  return (
    <div className="flex h-full flex-col bg-card/40">
      {/* Header */}
      <div className="border-b border-border/40 px-3 py-2">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/15 text-primary">
            <Bot className="h-3.5 w-3.5" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold text-foreground">
              {assistantIdentity.name}
            </p>
            <p className="truncate text-[10px] text-muted-foreground">
              {assistantIdentity.tagline}
            </p>
          </div>
          {canPropose && (
            <Badge variant="outline" className="ml-auto h-4 shrink-0 px-1.5 text-[9px]">
              can edit files
            </Badge>
          )}
        </div>

        <div className="mt-2 grid grid-cols-2 gap-1.5">
          <Select value={mode} onValueChange={(value) => setMode(value as IdeAssistantMode)}>
            <SelectTrigger className="h-7 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ideAssistantModes.map((option) => {
                const Icon = option.icon;
                return (
                  <SelectItem key={option.id} value={option.id} className="text-xs">
                    <span className="flex items-center gap-2">
                      <Icon className="h-3.5 w-3.5" />
                      {option.label}
                    </span>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>

          <Select value={level} onValueChange={(value) => setLevel(value as IdeExplanationLevel)}>
            <SelectTrigger className="h-7 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {explanationLevels.map((option) => (
                <SelectItem key={option.id} value={option.id} className="text-xs">
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {activeMode && (
          <p className="mt-1.5 text-[10px] leading-snug text-muted-foreground">
            {activeMode.description}
          </p>
        )}
      </div>

      {/* Conversation */}
      <div className="flex-1 space-y-3 overflow-y-auto p-3">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center px-2 text-center">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Sparkles className="h-5 w-5" />
            </div>
            <p className="text-sm font-semibold text-foreground">Ask about this project</p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {assistantIdentity.name} has read your file tree, routes and dependencies.
            </p>

            <div className="mt-4 w-full space-y-1.5 text-left">
              {[
                { label: 'Explain this project architecture', modeId: 'architect' as const },
                { label: 'Explain this file', modeId: 'explain' as const },
                { label: 'Review this code', modeId: 'review' as const },
                { label: 'Create a README', modeId: 'document' as const },
              ].map((suggestion) => (
                <button
                  key={suggestion.label}
                  type="button"
                  onClick={() => {
                    setMode(suggestion.modeId);
                    send(suggestion.label, suggestion.modeId);
                  }}
                  className="w-full rounded-md border border-border/40 bg-muted/30 px-2.5 py-1.5 text-[11px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                  {suggestion.label}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((message) => (
            <div key={message.id} className="space-y-1.5">
              <div className="flex items-center gap-1.5">
                {message.role === 'assistant' ? (
                  <Bot className="h-3 w-3 text-primary" />
                ) : (
                  <UserIcon className="h-3 w-3 text-muted-foreground" />
                )}
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {message.role === 'assistant' ? assistantIdentity.shortName : 'You'}
                </span>
              </div>

              <div
                className={cn(
                  'rounded-md px-2.5 py-2 text-[12.5px] leading-relaxed',
                  message.role === 'user'
                    ? 'bg-primary/10 text-foreground'
                    : 'border border-border/40 bg-muted/40 text-foreground'
                )}
              >
                {renderContent(message.content)}
              </div>

              {message.warnings?.map((warning) => (
                <div
                  key={warning}
                  className="flex items-start gap-1.5 rounded-md border border-amber-500/30 bg-amber-500/10 px-2.5 py-1.5 text-[11px] text-amber-300"
                >
                  <TriangleAlert className="mt-0.5 h-3 w-3 shrink-0" />
                  {warning}
                </div>
              ))}

              {message.action && (
                <button
                  type="button"
                  onClick={() => onReviewAction(message.action!)}
                  className="flex w-full items-center gap-2 rounded-md border border-primary/40 bg-primary/10 px-2.5 py-2 text-left transition-colors hover:bg-primary/20"
                >
                  <FileDiff className="h-4 w-4 shrink-0 text-primary" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[12px] font-medium text-foreground">
                      {message.action.title}
                    </span>
                    <span className="block text-[10px] text-muted-foreground">
                      {message.action.files_affected.length} file
                      {message.action.files_affected.length === 1 ? '' : 's'} ·{' '}
                      {message.action.status === 'pending'
                        ? 'awaiting your review'
                        : message.action.status}
                    </span>
                  </span>
                  <Badge variant="outline" className="h-5 shrink-0 px-1.5 text-[10px]">
                    Review
                  </Badge>
                </button>
              )}

              {message.contextFiles && message.contextFiles.length > 0 && (
                <p className="text-[10px] text-muted-foreground">
                  Context: {message.contextFiles.slice(0, 4).join(', ')}
                  {message.contextFiles.length > 4
                    ? ` +${message.contextFiles.length - 4} more`
                    : ''}
                </p>
              )}
            </div>
          ))
        )}

        {busy && (
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
            {assistantIdentity.shortName} is reading your project…
          </div>
        )}

        <div ref={endRef} />
      </div>

      {/* Composer */}
      <div className="border-t border-border/40 p-2">
        {selection?.text && (
          <div className="mb-1.5 flex items-center gap-2 rounded-md border border-border/40 bg-muted/40 px-2 py-1 text-[10px] text-muted-foreground">
            <span className="truncate">
              Using selection · lines {selection.startLine}–{selection.endLine}
            </span>
            <button
              type="button"
              className="ml-auto shrink-0 hover:text-foreground"
              onClick={() => {
                useSelectionRef.current = !useSelectionRef.current;
                toast.info(
                  useSelectionRef.current
                    ? 'Selection will be included.'
                    : 'Selection will be ignored.'
                );
              }}
            >
              toggle
            </button>
          </div>
        )}

        <div className="flex items-end gap-1.5">
          <Textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                send(input);
              }
            }}
            placeholder={activeMode?.placeholder ?? 'Ask about this project…'}
            rows={2}
            disabled={busy}
            className="min-h-[52px] resize-none text-xs"
          />
          <Button
            size="icon"
            className="h-[52px] w-9 shrink-0"
            disabled={busy || !input.trim()}
            onClick={() => send(input)}
            aria-label="Send"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>

        {isAdmin && debugInfo && (
          <p className="mt-1 text-[9px] text-muted-foreground/60">debug · {debugInfo}</p>
        )}
      </div>
    </div>
  );
}
