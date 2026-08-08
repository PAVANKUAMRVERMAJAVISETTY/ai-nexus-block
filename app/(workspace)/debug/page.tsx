'use client';

import { useState } from 'react';
import { PageContainer, PageHeader } from '@/components/common';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Code2, Bug } from 'lucide-react';

export default function DebugPage() {
  const [title, setTitle] = useState('');
  const [problem, setProblem] = useState('');
  const [code, setCode] = useState('');
  const [language, setLanguage] = useState('typescript');

  return (
    <PageContainer>
      <PageHeader
        title="Debug"
        description="Describe a problem and get AI-assisted debugging help."
      />
      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card className="border-border/40">
            <CardHeader className="border-b border-border/40">
              <div className="flex items-center gap-2">
                <Bug className="h-5 w-5 text-primary" />
                <span className="font-semibold">New Debug Session</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 p-6">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Brief title for the issue"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="language">Language</Label>
                <Select value={language} onValueChange={setLanguage}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="typescript">TypeScript</SelectItem>
                    <SelectItem value="javascript">JavaScript</SelectItem>
                    <SelectItem value="python">Python</SelectItem>
                    <SelectItem value="rust">Rust</SelectItem>
                    <SelectItem value="go">Go</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="problem">Problem Description</Label>
                <Textarea
                  id="problem"
                  value={problem}
                  onChange={(e) => setProblem(e.target.value)}
                  placeholder="Describe the problem, expected behavior, and actual behavior..."
                  rows={4}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="code">Code Snippet</Label>
                <Textarea
                  id="code"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="Paste the relevant code here..."
                  rows={8}
                  className="font-mono text-sm"
                />
              </div>
              <Button className="w-full">
                <Code2 className="mr-2 h-4 w-4" />
                Start Debug Session
              </Button>
            </CardContent>
          </Card>
        </div>
        <div>
          <Card className="border-border/40">
            <CardHeader className="border-b border-border/40">
              <span className="font-semibold">Recent Sessions</span>
            </CardHeader>
            <CardContent className="p-6 text-center text-sm text-muted-foreground">
              No debug sessions yet. Start one to see history here.
            </CardContent>
          </Card>
        </div>
      </div>
    </PageContainer>
  );
}
