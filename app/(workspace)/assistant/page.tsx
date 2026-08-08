'use client';

import { useState } from 'react';
import { PageContainer, PageHeader } from '@/components/common';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Bot, Send, Wrench, Code2, GitCompare, Map, BookOpen } from 'lucide-react';

const modes = [
  { id: 'recommend_stack', label: 'Recommend a Stack', icon: Wrench },
  { id: 'debug_problem', label: 'Debug a Problem', icon: Code2 },
  { id: 'compare_tools', label: 'Compare Tools', icon: GitCompare },
  { id: 'plan_project', label: 'Plan a Project', icon: Map },
  { id: 'learn_concept', label: 'Learn a Concept', icon: BookOpen },
] as const;

type ModeId = typeof modes[number]['id'];

export default function AssistantPage() {
  const [selectedMode, setSelectedMode] = useState<ModeId>('recommend_stack');
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([]);

  const handleSend = () => {
    if (!input.trim()) return;
    setMessages([...messages, { role: 'user', content: input }]);
    setInput('');
    // TODO: Connect to /api/ai in a later stage.
  };

  return (
    <PageContainer>
      <PageHeader
        title="AI Assistant"
        description="Get AI-powered recommendations, debug code, compare tools, and plan projects."
      />
      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-4">
        {/* Mode selector */}
        <div className="lg:col-span-1">
          <div className="flex flex-col gap-2">
            {modes.map((mode) => {
              const Icon = mode.icon;
              return (
                <Button
                  key={mode.id}
                  variant={selectedMode === mode.id ? 'default' : 'outline'}
                  className="justify-start"
                  onClick={() => setSelectedMode(mode.id)}
                >
                  <Icon className="mr-2 h-4 w-4" />
                  {mode.label}
                </Button>
              );
            })}
          </div>
        </div>

        {/* Chat area */}
        <div className="lg:col-span-3">
          <Card className="flex h-[600px] flex-col border-border/40">
            <CardHeader className="border-b border-border/40">
              <div className="flex items-center gap-2">
                <Bot className="h-5 w-5 text-primary" />
                <span className="font-semibold">AI Nexus Assistant</span>
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto p-4">
              {messages.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center text-center text-muted-foreground">
                  <Bot className="mb-3 h-12 w-12" />
                  <p className="text-sm">What are you building today?</p>
                  <p className="mt-1 text-xs">Select a mode above and start asking.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((msg, i) => (
                    <div
                      key={i}
                      className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-lg px-4 py-2 text-sm ${
                          msg.role === 'user'
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-foreground'
                        }`}
                      >
                        {msg.content}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
            <div className="border-t border-border/40 p-4">
              <div className="flex gap-2">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Type your message..."
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                />
                <Button size="icon" onClick={handleSend} aria-label="Send message">
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </PageContainer>
  );
}
