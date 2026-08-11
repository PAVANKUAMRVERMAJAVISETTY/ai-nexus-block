'use client';

import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { PageContainer, PageHeader } from '@/components/common';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Bot, Send, Wrench, Code2, GitCompare, Map, BookOpen, Loader2, Sparkles, User as UserIcon, Plus } from 'lucide-react';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { defaultAIProvider, type AIProviderId } from '@/config/ai';
import { assistantIdentity } from '@/config/ide';
import { toast } from 'sonner';

const modes = [
  { id: 'recommend_stack', label: 'Recommend Stack', icon: Wrench, prompt: 'Suggest a modern tech stack for a real-time web application.' },
  { id: 'debug_problem', label: 'Debug Code', icon: Code2, prompt: 'How do I fix memory leaks and unhandled promise rejections in Node.js?' },
  { id: 'compare_tools', label: 'Compare Tools', icon: GitCompare, prompt: 'Compare Next.js App Router vs Vite React SPA for SaaS platforms.' },
  { id: 'plan_project', label: 'Plan Project', icon: Map, prompt: 'Create an architectural roadmap for building an AI knowledge base.' },
  { id: 'learn_concept', label: 'Learn Concept', icon: BookOpen, prompt: 'Explain Supabase SSR auth and Row Level Security policies with code examples.' },
] as const;

type ModeId = typeof modes[number]['id'];

interface ChatMessage {
  id?: string;
  role: 'user' | 'assistant';
  content: string;
}

export default function AssistantPage() {
  const { profile, user } = useAuth();
  const searchParams = useSearchParams();
  const queryConvId = searchParams.get('id');

  const [selectedMode, setSelectedMode] = useState<ModeId>('recommend_stack');
  const [selectedProvider, setSelectedProvider] = useState<AIProviderId>(defaultAIProvider);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Restore latest or query-specified active conversation on mount
  useEffect(() => {
    let isMounted = true;

    const restoreSession = async () => {
      setLoadingInitial(true);
      try {
        let targetId = queryConvId;

        // If no URL ID provided, check for user's most recent conversation
        if (!targetId) {
          const listRes = await fetch('/api/conversations');
          const listData = await listRes.json();
          if (listRes.ok && listData.conversations && listData.conversations.length > 0) {
            targetId = listData.conversations[0].id;
          }
        }

        if (targetId && isMounted) {
          const detailRes = await fetch(`/api/conversations/${targetId}`);
          const detailData = await detailRes.json();
          if (detailRes.ok && detailData.conversation && isMounted) {
            setConversationId(detailData.conversation.id);
            setSelectedMode((detailData.conversation.mode as ModeId) || 'recommend_stack');
            setSelectedProvider((detailData.conversation.provider as AIProviderId) || defaultAIProvider);
            setMessages(
              (detailData.messages || []).map((m: any) => ({
                id: m.id,
                role: m.role,
                content: m.content,
              }))
            );
          }
        }
      } catch (err) {
        console.warn('Failed to restore AI conversation session:', err);
      } finally {
        if (isMounted) setLoadingInitial(false);
      }
    };

    if (user) {
      restoreSession();
    } else {
      setLoadingInitial(false);
    }

    return () => {
      isMounted = false;
    };
  }, [user, queryConvId]);

  const handleStartNewSession = () => {
    setConversationId(null);
    setMessages([]);
    setInput('');
    toast.info('Started a new conversation session.');
  };

  const handleSend = async (overridePrompt?: string) => {
    const textToSend = overridePrompt || input.trim();
    if (!textToSend || loading) return;

    const userMessage: ChatMessage = { role: 'user', content: textToSend };
    setMessages((prev) => [...prev, userMessage]);
    if (!overridePrompt) setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: textToSend,
          mode: selectedMode,
          provider: selectedProvider,
          conversation_id: conversationId,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to get AI response.');
      }

      if (data.conversation_id && !conversationId) {
        setConversationId(data.conversation_id);
      }

      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: data.content,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err: any) {
      toast.error(err.message || 'An error occurred while contacting the AI assistant.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickPrompt = (mode: typeof modes[number]) => {
    setSelectedMode(mode.id);
    handleSend(mode.prompt);
  };

  return (
    <PageContainer>
      <PageHeader
        title={`Welcome, ${profile?.display_name || user?.email?.split('@')[0] || 'Developer'}`}
        description="Get AI-powered recommendations, debug code, compare tools, and plan architectural roadmaps."
      />

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-4">
        {/* Left Column: Mode Selector */}
        <div className="lg:col-span-1 space-y-6">
          {/* Mode Selector */}
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1">
              Assistant Mode
            </label>
            <div className="flex flex-col gap-2">
              {modes.map((mode) => {
                const Icon = mode.icon;
                const isSelected = selectedMode === mode.id;
                return (
                  <Button
                    key={mode.id}
                    variant={isSelected ? 'default' : 'outline'}
                    className="justify-start text-xs h-10 px-3"
                    onClick={() => setSelectedMode(mode.id)}
                  >
                    <Icon className="mr-2 h-4 w-4" />
                    {mode.label}
                  </Button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Chat Window */}
        <div className="lg:col-span-3">
          <Card className="flex h-[620px] flex-col border-border/40 bg-card">
            <CardHeader className="border-b border-border/40 py-3.5 px-4 flex flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Bot className="h-4 w-4" />
                </div>
                <div>
                  <CardTitle className="text-sm font-bold">{assistantIdentity.name}</CardTitle>
                  <p className="text-[11px] text-muted-foreground">
                    Mode: <span className="font-semibold capitalize">{selectedMode.replace('_', ' ')}</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {conversationId && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 px-2.5 text-xs flex items-center gap-1 text-muted-foreground hover:text-foreground"
                    onClick={handleStartNewSession}
                    title="Start fresh conversation"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    New Session
                  </Button>
                )}
                <Sparkles className="h-4 w-4 text-primary animate-pulse" />
              </div>
            </CardHeader>

            <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
              {loadingInitial ? (
                <div className="flex flex-col items-center justify-center h-full space-y-2 text-muted-foreground">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  <p className="text-xs">Restoring conversation session...</p>
                </div>
              ) : messages.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center text-center text-muted-foreground px-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary mb-4">
                    <Bot className="h-7 w-7" />
                  </div>
                  <h3 className="text-base font-semibold text-foreground">What are you building today?</h3>
                  <p className="mt-1 text-xs max-w-md text-muted-foreground">
                    Select a mode on the left or click a starter prompt below to initiate an AI session.
                  </p>

                  <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full max-w-xl text-left">
                    {modes.slice(0, 4).map((m) => (
                      <button
                        key={m.id}
                        onClick={() => handleQuickPrompt(m)}
                        className="rounded-lg border border-border/40 bg-muted/30 p-3 text-xs text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                      >
                        <p className="font-semibold text-foreground flex items-center gap-1.5 mb-1">
                          <m.icon className="h-3.5 w-3.5 text-primary" />
                          {m.label}
                        </p>
                        <p className="line-clamp-2 text-[11px] opacity-80">{m.prompt}</p>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((msg, i) => (
                    <div
                      key={msg.id || i}
                      className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      {msg.role === 'assistant' && (
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary mt-1">
                          <Bot className="h-4 w-4" />
                        </div>
                      )}

                      <div
                        className={`max-w-[85%] rounded-lg px-4 py-3 text-sm whitespace-pre-wrap leading-relaxed ${
                          msg.role === 'user'
                            ? 'bg-primary text-primary-foreground font-medium'
                            : 'bg-muted/70 text-foreground border border-border/40'
                        }`}
                      >
                        {msg.content}
                      </div>

                      {msg.role === 'user' && (
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent text-foreground mt-1 text-xs font-bold">
                          <UserIcon className="h-4 w-4" />
                        </div>
                      )}
                    </div>
                  ))}

                  {loading && (
                    <div className="flex gap-3 justify-start items-center">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <Bot className="h-4 w-4" />
                      </div>
                      <div className="rounded-lg bg-muted/70 px-4 py-3 text-xs text-muted-foreground flex items-center gap-2 border border-border/40">
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                        {assistantIdentity.shortName} is thinking...
                      </div>
                    </div>
                  )}

                  <div ref={chatEndRef} />
                </div>
              )}
            </CardContent>

            <div className="border-t border-border/40 p-3">
              <div className="flex gap-2">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={`Ask ${assistantIdentity.name} in ${selectedMode.replace('_', ' ')} mode...`}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  disabled={loading || loadingInitial}
                />
                <Button size="icon" onClick={() => handleSend()} disabled={loading || loadingInitial || !input.trim()} aria-label="Send message">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </PageContainer>
  );
}
