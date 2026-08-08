'use client';

import { PageContainer, PageHeader, EmptyState } from '@/components/common';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ImageIcon, Upload } from 'lucide-react';
import { useState } from 'react';

const buckets = ['avatars', 'profile_media', 'tool_media', 'project_media', 'knowledge_media', 'roadmap_media', 'resource_media', 'journey_media', 'documents'];

export default function AdminMediaPage() {
  const [bucket, setBucket] = useState('avatars');
  const [altText, setAltText] = useState('');

  return (
    <PageContainer>
      <PageHeader title="Media Library" description="Upload and manage media assets." />
      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <Card className="border-border/40">
            <CardHeader className="border-b border-border/40">
              <span className="font-semibold">Upload</span>
            </CardHeader>
            <CardContent className="space-y-4 p-6">
              <div className="space-y-2">
                <Label htmlFor="bucket">Bucket</Label>
                <Select value={bucket} onValueChange={setBucket}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {buckets.map((b) => (
                      <SelectItem key={b} value={b}>{b}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="alt-text">Alt Text</Label>
                <Input id="alt-text" value={altText} onChange={(e) => setAltText(e.target.value)} placeholder="Describe the image" />
              </div>
              <div className="rounded-lg border-2 border-dashed border-border/60 p-8 text-center">
                <Upload className="mx-auto h-8 w-8 text-muted-foreground" />
                <p className="mt-2 text-sm text-muted-foreground">Drag and drop or click to upload</p>
                <Button className="mt-4" size="sm">Choose File</Button>
              </div>
            </CardContent>
          </Card>
        </div>
        <div className="lg:col-span-2">
          <EmptyState
            icon={<ImageIcon className="h-10 w-10" />}
            title="No media uploaded yet"
            description="Uploaded images and files will appear here."
          />
        </div>
      </div>
    </PageContainer>
  );
}
