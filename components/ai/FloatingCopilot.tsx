'use client';

import { useState, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Bot,
  X,
  Send,
  Loader2,
  Sparkles,
  Plus,
  Search,
  Globe,
  Maximize2,
  Minimize2,
  Briefcase,
  HelpCircle,
} from 'lucide-react';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

const recruiterPromptChips = [
  '5 Live Production Platforms',
  'Explain RLS Security & Supabase',
  'Haversine & PKZip Algorithms',
  'AI Agentic Engineering (Cursor/Claude)',
];

export function FloatingCopilot() {
  const pathname = usePathname();
  const { isSuperAdmin } = useAuth();

  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isInterviewMode, setIsInterviewMode] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  useEffect(() => {
    const observer = new MutationObserver(() => {
      const drawer = document.querySelector('.z-\\[100\\], .z-\\[90\\]');
      setIsDrawerOpen(Boolean(drawer));
    });
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isSuperAdmin) {
      const saved = sessionStorage.getItem('nexus_visitor_copilot');
      if (saved) {
        try {
          setMessages(JSON.parse(saved));
        } catch {
          setMessages(getInitialWelcomeMessage(pathname, isInterviewMode));
        }
      } else {
        setMessages(getInitialWelcomeMessage(pathname, isInterviewMode));
      }
    } else {
      setMessages(getInitialWelcomeMessage(pathname, isInterviewMode));
    }
  }, [isSuperAdmin, pathname, isInterviewMode]);

  useEffect(() => {
    if (!isSuperAdmin && messages.length > 0) {
      sessionStorage.setItem('nexus_visitor_copilot', JSON.stringify(messages));
    }
  }, [messages, isSuperAdmin]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  function getInitialWelcomeMessage(currentPath: string, interview: boolean): ChatMessage[] {
    if (interview) {
      return [
        {
          id: 'welcome_interview',
          role: 'assistant',
          content: `🎯 **Interview AI Twin Mode Activated**\n\nI am the digital AI Twin for **Naga Pavan Kumar Javisetty** (AI-Focused Full-Stack Developer & Systems Architect).\n\nAsk me about my 5 live production platforms, Next.js App Router & React 19 expertise, Supabase PostgreSQL RLS security, custom algorithms (Haversine & PKZip), or AI agentic engineering workflows!`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ];
    }
    return [
      {
        id: 'welcome_1',
        role: 'assistant',
        content: `👋 Hello! I am the **Nexus AI Copilot**.\n\nCurrently assisting on **${currentPath || '/'}**.\n\nAsk me about AI Tools, Engineering Roadmaps, Projects architecture, or technical concepts!`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ];
  }

  const handleNewChat = () => {
    setConversationId(null);
    const welcome = getInitialWelcomeMessage(pathname, isInterviewMode);
    setMessages(welcome);
    if (!isSuperAdmin) {
      sessionStorage.removeItem('nexus_visitor_copilot');
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    const prompt = (textToSend || inputMessage).trim();
    if (!prompt || isLoading) return;

    const userMsg: ChatMessage = {
      id: `user_${Date.now()}`,
      role: 'user',
      content: prompt,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const payload: Record<string, any> = {
        message: prompt,
        pathname,
        conversation_id: conversationId,
        is_interview_mode: isInterviewMode,
      };

      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Failed to get response from AI Copilot');
      }

      if (json.conversation_id) {
        setConversationId(json.conversation_id);
      }

      const assistantMsg: ChatMessage = {
        id: `asst_${Date.now()}`,
        role: 'assistant',
        content: json.content || 'I could not generate a response.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: `err_${Date.now()}`,
        role: 'assistant',
        content: `⚠️ ${err.message || 'Apologies, an error occurred while processing your request.'}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  if (isDrawerOpen) return null;

  return (
    <>
      {/* Floating Launcher Button */}
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-30 flex items-center gap-2.5 rounded-full bg-gradient-to-r from-primary to-blue-600 px-4 py-3 text-white shadow-2xl transition-all duration-300 hover:scale-105 hover:shadow-primary/30 border border-white/20"
          aria-label="Open AI Copilot"
        >
          <div className="relative">
            <Bot className="h-6 w-6" />
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
            </span>
          </div>
          <span className="font-bold text-sm">AI Copilot</span>
        </button>
      )}

      {/* Floating Chat Window */}
      {isOpen && (
        <div
          className={`fixed z-40 transition-all duration-300 flex flex-col bg-card border border-border/80 shadow-2xl rounded-2xl overflow-hidden ${
            isExpanded
              ? 'bottom-4 right-4 left-4 top-4 md:left-auto md:w-[680px] md:h-[680px]'
              : 'bottom-6 right-6 w-[92vw] sm:w-[440px] h-[600px]'
          }`}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border/60 p-3.5 bg-muted/40">
            <div className="flex items-center gap-2 min-w-0">
              <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                <Bot className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-sm tracking-tight text-foreground truncate">
                    Nexus AI Copilot
                  </h3>
                  <Badge variant="outline" className="text-[10px] bg-primary/5 text-primary border-primary/20">
                    Smart RAG
                  </Badge>
                </div>
                <p className="text-[10px] text-muted-foreground truncate">
                  Context: <code className="text-foreground">{pathname}</code>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={handleNewChat}
                title="Start New Chat Thread"
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
              >
                <Plus className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setIsExpanded(!isExpanded)}
                className="h-8 w-8 text-muted-foreground hover:text-foreground hidden sm:flex"
              >
                {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setIsOpen(false)}
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Mode Switch & Search Info */}
          <div className="flex items-center justify-between px-3 py-2 bg-muted/30 border-b border-border/20 text-xs">
            <div className="flex items-center space-x-2">
              <Switch
                id="copilot_interview_mode"
                checked={isInterviewMode}
                onCheckedChange={setIsInterviewMode}
              />
              <Label htmlFor="copilot_interview_mode" className="text-xs font-semibold flex items-center gap-1 cursor-pointer">
                <Briefcase className="h-3.5 w-3.5 text-amber-500" />
                Interview AI Twin Mode
              </Label>
            </div>

            <span className="text-[10px] text-muted-foreground hidden sm:inline">
              11-Provider Fallback
            </span>
          </div>

          {/* Recruiter Prompt Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto p-2 bg-muted/10 border-b border-border/20 text-[10px] scrollbar-none">
            <span className="text-muted-foreground font-semibold shrink-0 pl-1">Recruiter Chips:</span>
            {recruiterPromptChips.map((chip) => (
              <button
                key={chip}
                type="button"
                onClick={() => handleSendMessage(chip)}
                className="shrink-0 px-2.5 py-1 rounded-full bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 transition-all"
              >
                {chip}
              </button>
            ))}
          </div>

          {/* Message List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${
                  msg.role === 'user' ? 'items-end' : 'items-start'
                }`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 leading-relaxed shadow-sm ${
                    msg.role === 'user'
                      ? 'bg-primary text-primary-foreground rounded-br-none'
                      : 'bg-muted/60 text-foreground border border-border/40 rounded-bl-none'
                  }`}
                >
                  <p className="whitespace-pre-line">{msg.content}</p>
                </div>
                <span className="text-[10px] text-muted-foreground mt-1 px-1">
                  {msg.timestamp}
                </span>
              </div>
            ))}

            {isLoading && (
              <div className="flex items-center gap-2 text-muted-foreground text-xs p-2">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                <span>Searching knowledge & consulting AI cascade...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="p-3 border-t border-border/60 bg-muted/20 flex gap-2"
          >
            <Input
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder={isInterviewMode ? "Ask Javisetty (AI Twin) an interview question..." : "Ask anything about tools, projects, guides..."}
              className="text-xs flex-1"
              disabled={isLoading}
            />
            <Button type="submit" size="icon" disabled={isLoading || !inputMessage.trim()} className="bg-primary text-primary-foreground">
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      )}
    </>
  );
}
