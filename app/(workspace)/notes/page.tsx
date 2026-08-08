'use client';

import { useState } from 'react';
import { PageContainer, PageHeader, EmptyState } from '@/components/common';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { StickyNote, Pin } from 'lucide-react';

interface Note {
  id: string;
  title: string;
  content: string;
  is_pinned: boolean;
}

export default function NotesPage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  const addNote = () => {
    if (!title.trim()) return;
    setNotes([{ id: Date.now().toString(), title, content, is_pinned: false }, ...notes]);
    setTitle('');
    setContent('');
  };

  return (
    <PageContainer>
      <PageHeader
        title="Notes"
        description="Quick notes and snippets for your engineering work."
      />
      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <Card className="border-border/40">
            <CardHeader className="border-b border-border/40">
              <span className="font-semibold">New Note</span>
            </CardHeader>
            <CardContent className="space-y-4 p-6">
              <div className="space-y-2">
                <Label htmlFor="note-title">Title</Label>
                <Input
                  id="note-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Note title"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="note-content">Content</Label>
                <Textarea
                  id="note-content"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Write your note..."
                  rows={5}
                />
              </div>
              <Button className="w-full" onClick={addNote}>Add Note</Button>
            </CardContent>
          </Card>
        </div>
        <div className="lg:col-span-2">
          {notes.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {notes.map((note) => (
                <Card key={note.id} className="border-border/40">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <h3 className="text-base font-semibold">{note.title}</h3>
                      <Pin className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground whitespace-pre-wrap">{note.content}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<StickyNote className="h-10 w-10" />}
              title="No notes yet"
              description="Create your first note using the form on the left."
            />
          )}
        </div>
      </div>
    </PageContainer>
  );
}
