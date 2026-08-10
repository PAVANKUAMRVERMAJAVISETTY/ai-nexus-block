'use client';

import { useState, useEffect } from 'react';
import { PageContainer, PageHeader } from '@/components/common';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Bookmark, Plus, Search, Trash2, ExternalLink, ThumbsUp, ThumbsDown, DollarSign, Tag, Loader2, Sparkles, UserCheck } from 'lucide-react';
import { toast } from 'sonner';
import type { UserResearch } from '@/types/database';

export default function ResearchPage() {
  const [researchList, setResearchList] = useState<UserResearch[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Form states
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('ai_tool');
  const [url, setUrl] = useState('');
  const [summary, setSummary] = useState('');
  const [personalNotes, setPersonalNotes] = useState('');
  const [opinion, setOpinion] = useState('');
  const [prosInput, setProsInput] = useState('');
  const [consInput, setConsInput] = useState('');
  const [pricingInfo, setPricingInfo] = useState('Freemium');
  const [tagsInput, setTagsInput] = useState('');

  useEffect(() => {
    fetchResearch();
  }, []);

  const fetchResearch = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/research');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch research');
      setResearchList(data.research || []);
    } catch (err: any) {
      toast.error(err.message || 'Error loading research collection');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateResearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error('Title is required.');
      return;
    }

    setSaving(true);
    try {
      const prosArray = prosInput.split(',').map((p) => p.trim()).filter(Boolean);
      const consArray = consInput.split(',').map((c) => c.trim()).filter(Boolean);
      const tagsArray = tagsInput.split(',').map((t) => t.trim()).filter(Boolean);

      const payload = {
        title: title.trim(),
        category,
        url: url.trim() || null,
        summary: summary.trim() || null,
        personal_notes: personalNotes.trim() || null,
        opinion: opinion.trim() || null,
        pros: prosArray,
        cons: consArray,
        pricing_info: pricingInfo || null,
        tags: tagsArray,
      };

      const res = await fetch('/api/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save research record');

      setResearchList([data.research, ...researchList]);
      toast.success('Research saved to personal collection!');
      setModalOpen(false);
      resetForm();
    } catch (err: any) {
      toast.error(err.message || 'Error saving research');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/research?id=${id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete research');

      setResearchList(researchList.filter((r) => r.id !== id));
      toast.success('Research record removed.');
    } catch (err: any) {
      toast.error(err.message || 'Error deleting research');
    } finally {
      setDeletingId(null);
    }
  };

  const resetForm = () => {
    setTitle('');
    setCategory('ai_tool');
    setUrl('');
    setSummary('');
    setPersonalNotes('');
    setOpinion('');
    setProsInput('');
    setConsInput('');
    setPricingInfo('Freemium');
    setTagsInput('');
  };

  const filteredResearch = researchList.filter((item) => {
    const matchesSearch =
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.summary || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.personal_notes || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.tags || []).some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory =
      selectedCategory === 'all' || item.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  return (
    <PageContainer>
      <PageHeader
        title="My Research"
        description="Personal AI tool bookmarks, technology notes, and reviews."
      >
        <Button size="sm" onClick={() => setModalOpen(true)} className="text-xs flex items-center gap-1.5">
          <Plus className="h-4 w-4" />
          Add Research Entry
        </Button>
      </PageHeader>

      <div className="mt-6 flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search research & tools..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 text-xs"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-44 text-xs">
              <SelectValue placeholder="Category filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="ai_tool">AI Tools</SelectItem>
              <SelectItem value="technology">Technologies</SelectItem>
              <SelectItem value="framework">Frameworks & Libs</SelectItem>
              <SelectItem value="article">Articles & Guides</SelectItem>
              <SelectItem value="tutorial">Tutorials</SelectItem>
              <SelectItem value="job">Career & Jobs</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center h-64 space-y-2 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <p className="text-xs">Loading research collection...</p>
        </div>
      ) : filteredResearch.length === 0 ? (
        <Card className="mt-6 border-dashed border-border/60 bg-muted/20">
          <CardContent className="flex flex-col items-center justify-center h-64 space-y-3">
            <Bookmark className="h-10 w-10 text-muted-foreground/60" />
            <p className="text-sm font-medium text-foreground">No research records saved</p>
            <p className="text-xs text-muted-foreground text-center max-w-sm">
              Save AI tools, articles, frameworks, and personal reviews to build your personal knowledge base.
            </p>
            <Button size="sm" onClick={() => setModalOpen(true)} className="text-xs">
              Add First Entry
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredResearch.map((item) => (
            <Card key={item.id} className="border-border/40 bg-card hover:border-border transition-colors flex flex-col justify-between">
              <CardHeader className="p-4 pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      {item.title}
                      {item.url && (
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-muted-foreground hover:text-primary transition-colors"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      )}
                    </CardTitle>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="secondary" className="text-[10px] uppercase tracking-wider">
                        {item.category.replace('_', ' ')}
                      </Badge>
                      {item.pricing_info && (
                        <Badge variant="outline" className="text-[10px] flex items-center gap-0.5">
                          <DollarSign className="h-3 w-3 text-emerald-500" />
                          {item.pricing_info}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-muted-foreground hover:text-destructive"
                    onClick={() => handleDelete(item.id)}
                    disabled={deletingId === item.id}
                  >
                    {deletingId === item.id ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Trash2 className="h-3 w-3" />
                    )}
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="p-4 pt-2 text-xs space-y-3 flex-1">
                {/* SOURCE SUMMARY */}
                {item.summary && (
                  <div className="rounded-md bg-muted/40 p-2.5 space-y-1">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                      Source Information
                    </p>
                    <p className="text-foreground text-[11px] leading-relaxed">{item.summary}</p>
                  </div>
                )}

                {/* USER OPINION */}
                {item.opinion && (
                  <div className="rounded-md border border-primary/20 bg-primary/5 p-2.5 space-y-1">
                    <p className="text-[10px] font-semibold text-primary flex items-center gap-1">
                      <UserCheck className="h-3 w-3" />
                      User Opinion / Review
                    </p>
                    <p className="text-foreground text-[11px] italic leading-relaxed">"{item.opinion}"</p>
                  </div>
                )}

                {/* PERSONAL NOTES */}
                {item.personal_notes && (
                  <div className="space-y-1">
                    <p className="text-[10px] font-semibold text-muted-foreground">Notes</p>
                    <p className="text-muted-foreground text-[11px]">{item.personal_notes}</p>
                  </div>
                )}

                {/* PROS & CONS */}
                {((item.pros && item.pros.length > 0) || (item.cons && item.cons.length > 0)) && (
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    {item.pros && item.pros.length > 0 && (
                      <div className="space-y-1">
                        <p className="text-[10px] font-semibold text-emerald-500 flex items-center gap-1">
                          <ThumbsUp className="h-3 w-3" /> Pros
                        </p>
                        <ul className="text-[10px] text-muted-foreground list-disc list-inside space-y-0.5">
                          {item.pros.map((p, idx) => (
                            <li key={idx}>{p}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {item.cons && item.cons.length > 0 && (
                      <div className="space-y-1">
                        <p className="text-[10px] font-semibold text-rose-500 flex items-center gap-1">
                          <ThumbsDown className="h-3 w-3" /> Cons
                        </p>
                        <ul className="text-[10px] text-muted-foreground list-disc list-inside space-y-0.5">
                          {item.cons.map((c, idx) => (
                            <li key={idx}>{c}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                {/* TAGS */}
                {item.tags && item.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {item.tags.map((tag, idx) => (
                      <Badge key={idx} variant="outline" className="text-[9px] text-muted-foreground">
                        #{tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>

              <CardFooter className="p-4 pt-0 text-[10px] text-muted-foreground flex justify-between">
                <span>Created {new Date(item.created_at).toLocaleDateString()}</span>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* CREATE RESEARCH MODAL */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold flex items-center gap-2">
              <Bookmark className="h-4 w-4 text-primary" />
              Add Research Entry
            </DialogTitle>
            <DialogDescription className="text-xs">
              Save AI tools, learning topics, and personal opinions to your workspace collection.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateResearch} className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="title" className="text-xs">Title *</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="v0.dev or Claude Code"
                  required
                  className="text-xs"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="text-xs">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ai_tool">AI Tool</SelectItem>
                    <SelectItem value="technology">Technology</SelectItem>
                    <SelectItem value="framework">Framework / Library</SelectItem>
                    <SelectItem value="article">Article / Guide</SelectItem>
                    <SelectItem value="tutorial">Tutorial</SelectItem>
                    <SelectItem value="job">Career & Job</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="url" className="text-xs">Website URL</Label>
                <Input
                  id="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://example.com"
                  className="text-xs"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="pricingInfo" className="text-xs">Pricing Info</Label>
                <Input
                  id="pricingInfo"
                  value={pricingInfo}
                  onChange={(e) => setPricingInfo(e.target.value)}
                  placeholder="Free, Freemium, Open Source"
                  className="text-xs"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="summary" className="text-xs">Source Information / Fact Summary</Label>
              <Textarea
                id="summary"
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder="Official overview of what the tool does based on documentation..."
                rows={3}
                className="text-xs"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="opinion" className="text-xs">Your Personal Opinion / Review</Label>
              <Textarea
                id="opinion"
                value={opinion}
                onChange={(e) => setOpinion(e.target.value)}
                placeholder="My thoughts: Excellent UI generation, but requires manual tweaking for complex state..."
                rows={2}
                className="text-xs border-primary/30"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="pros" className="text-xs">Pros (Comma separated)</Label>
                <Input
                  id="pros"
                  value={prosInput}
                  onChange={(e) => setProsInput(e.target.value)}
                  placeholder="Fast generation, Tailwind output"
                  className="text-xs"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cons" className="text-xs">Cons (Comma separated)</Label>
                <Input
                  id="cons"
                  value={consInput}
                  onChange={(e) => setConsInput(e.target.value)}
                  placeholder="Usage limits on free tier"
                  className="text-xs"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tags" className="text-xs">Tags (Comma separated)</Label>
              <Input
                id="tags"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="ai-ui, frontend, nextjs"
                className="text-xs"
              />
            </div>

            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => setModalOpen(false)} className="text-xs">
                Cancel
              </Button>
              <Button type="submit" disabled={saving} className="text-xs flex items-center gap-1.5">
                {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Save Entry
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
