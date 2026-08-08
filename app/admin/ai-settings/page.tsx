'use client';

import { PageContainer, PageHeader } from '@/components/common';
import { Card, CardContent, CardHeader, CardDescription, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Bot, Key } from 'lucide-react';
import { useState } from 'react';

export default function AdminAISettingsPage() {
  const [provider, setProvider] = useState('gemini');
  const [enabled, setEnabled] = useState(true);
  const [recommendations, setRecommendations] = useState(true);
  const [debugAssistant, setDebugAssistant] = useState(true);

  return (
    <PageContainer>
      <PageHeader title="AI Settings" description="Configure AI providers and assistant behavior." />
      <div className="mt-8 max-w-3xl space-y-6">
        <Card className="border-border/40">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-primary" />
              Provider Configuration
            </CardTitle>
            <CardDescription>Select the default AI provider for the assistant.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Default Provider</Label>
              <Select value={provider} onValueChange={setProvider}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gemini">Google Gemini</SelectItem>
                  <SelectItem value="openai">OpenAI</SelectItem>
                  <SelectItem value="claude">Anthropic Claude</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border/40 p-3">
              <div>
                <Label htmlFor="ai-enabled">AI Assistant Enabled</Label>
                <p className="text-xs text-muted-foreground">Enable or disable the AI assistant globally.</p>
              </div>
              <Switch id="ai-enabled" checked={enabled} onCheckedChange={setEnabled} />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/40">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5 text-primary" />
              Feature Toggles
            </CardTitle>
            <CardDescription>Enable or disable individual AI features.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border border-border/40 p-3">
              <div>
                <Label htmlFor="rec-enabled">Tool Recommendations</Label>
                <p className="text-xs text-muted-foreground">AI-powered tool stack recommendations.</p>
              </div>
              <Switch id="rec-enabled" checked={recommendations} onCheckedChange={setRecommendations} />
            </div>
            <Separator />
            <div className="flex items-center justify-between rounded-lg border border-border/40 p-3">
              <div>
                <Label htmlFor="debug-enabled">Debug Assistant</Label>
                <p className="text-xs text-muted-foreground">AI-assisted code debugging.</p>
              </div>
              <Switch id="debug-enabled" checked={debugAssistant} onCheckedChange={setDebugAssistant} />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/40">
          <CardHeader>
            <CardTitle>API Keys</CardTitle>
            <CardDescription>API keys are stored as environment variables and managed via the deployment platform.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>GEMINI_API_KEY — Set in environment variables</p>
              <p>OPENAI_API_KEY — Set in environment variables</p>
              <p>ANTHROPIC_API_KEY — Set in environment variables</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
