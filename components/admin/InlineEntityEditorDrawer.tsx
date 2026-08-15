'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  X,
  Upload,
  Loader2,
  FileText,
  Database,
  Archive,
  Video,
  ImageIcon,
  Plus,
  Trash2,
  Bold,
  Italic,
  Code,
  List,
  Heading,
  Link as LinkIcon,
} from 'lucide-react';
import type { EntityType } from './EntryEditModal';

interface CustomButton {
  label: string;
  url: string;
}

interface InlineEntityEditorDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  entityType: EntityType;
  initialData?: Record<string, any> | null;
  onSuccess?: () => void;
}

export function InlineEntityEditorDrawer({
  isOpen,
  onClose,
  entityType,
  initialData,
  onSuccess,
}: InlineEntityEditorDrawerProps) {
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [customButtons, setCustomButtons] = useState<CustomButton[]>([]);
  const [galleryImages, setGalleryImages] = useState<string[]>([]);
  const [uploadingField, setUploadingField] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [newImageUrl, setNewImageUrl] = useState('');

  const categoryPillsMap: Record<EntityType, string[]> = {
    projects: ['Frontend', 'Backend & API', 'Supabase Systems', 'Full Stack AI', 'AI Platform'],
    tools: ['Developer Tool', 'Code Generator', 'AI Framework', 'Database Tool', 'Productivity'],
    knowledge: ['Supabase & RLS', 'Next.js App Router', 'Algorithms', 'AI Frameworks', 'Architecture'],
    resources: ['Supabase & RLS', 'Next.js App Router', 'Algorithms', 'AI Frameworks', 'Developer Guide'],
    decisions: ['Accepted', 'Proposed', 'Deprecated', 'Superseded', 'Architecture'],
    roadmaps: ['Full-Stack AI', 'Frontend Performance', 'Database Architecture', 'DevOps & Cloud'],
    journey: ['Project Milestone', 'Learning Achievement', 'Career Upgrade', 'Platform Launch'],
    profile: ['Executive Bio', 'Systems Architect', 'Full Stack AI', 'Lead Developer'],
  };

  useEffect(() => {
    if (initialData) {
      setFormData({
        ...initialData,
        title: initialData.title || initialData.name || '',
        name: initialData.name || initialData.title || '',
        tags: Array.isArray(initialData.tags) ? initialData.tags.join(', ') : initialData.tags || '',
        featured: Boolean(initialData.featured),
        published: initialData.status !== 'draft',
      });

      // Parse metadata for custom buttons and gallery images
      const metadata = initialData.metadata || {};
      if (Array.isArray(metadata.custom_buttons)) {
        setCustomButtons(metadata.custom_buttons);
      } else {
        setCustomButtons([]);
      }

      if (Array.isArray(metadata.gallery_images)) {
        setGalleryImages(metadata.gallery_images);
      } else {
        setGalleryImages(initialData.image_url ? [initialData.image_url] : []);
      }
    } else {
      setFormData({
        title: '',
        name: '',
        slug: '',
        description: '',
        long_description: '',
        content: '',
        excerpt: '',
        category: categoryPillsMap[entityType][0] || 'General',
        tags: '',
        image_url: '',
        pdf_url: '',
        sql_url: '',
        zip_file_url: '',
        youtube_url: '',
        video_url: '',
        live_url: '',
        website_url: '',
        github_url: '',
        pricing: 'free',
        level: 'intermediate',
        milestone_type: 'project',
        entry_date: new Date().toISOString().substring(0, 7),
        featured: false,
        published: true,
      });
      setCustomButtons([]);
      setGalleryImages([]);
    }
    setErrorMsg(null);
  }, [initialData, entityType, isOpen]);

  if (!isOpen) return null;

  const updateField = (key: string, val: any) => {
    setFormData((prev) => ({ ...prev, [key]: val }));
  };

  const handleFileUpload = async (
    fieldName: string,
    targetBucket: 'portfolio-media' | 'public-downloads',
    file: File,
    isGallery = false
  ) => {
    setUploadingField(fieldName);
    setErrorMsg(null);

    try {
      const data = new FormData();
      data.append('file', file);
      data.append('bucket', targetBucket);

      const res = await fetch('/api/media/upload', {
        method: 'POST',
        body: data,
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'File upload failed');

      if (json.url) {
        if (isGallery) {
          setGalleryImages((prev) => [...prev, json.url]);
          if (!formData.image_url) updateField('image_url', json.url);
        } else {
          updateField(fieldName, json.url);
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'File upload failed');
    } finally {
      setUploadingField(null);
    }
  };

  const handleAddCustomButton = () => {
    setCustomButtons((prev) => [...prev, { label: 'New Action', url: 'https://' }]);
  };

  const handleUpdateCustomButton = (index: number, key: keyof CustomButton, val: string) => {
    setCustomButtons((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [key]: val };
      return next;
    });
  };

  const handleRemoveCustomButton = (index: number) => {
    setCustomButtons((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddGalleryUrl = () => {
    if (!newImageUrl.trim()) return;
    setGalleryImages((prev) => [...prev, newImageUrl.trim()]);
    if (!formData.image_url) updateField('image_url', newImageUrl.trim());
    setNewImageUrl('');
  };

  const handleRemoveGalleryImage = (index: number) => {
    setGalleryImages((prev) => prev.filter((_, i) => i !== index));
  };

  const insertMarkdown = (prefix: string, suffix = '') => {
    const textarea = document.getElementById('drawer_rich_editor') as HTMLTextAreaElement | null;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentVal = formData.long_description || formData.content || '';
    const selectedText = currentVal.substring(start, end) || 'text';

    const newVal =
      currentVal.substring(0, start) +
      prefix +
      selectedText +
      suffix +
      currentVal.substring(end);

    updateField('long_description', newVal);
    updateField('content', newVal);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const isEditing = Boolean(initialData?.id);
      const endpoint = `/api/${entityType}`;
      const method = isEditing ? 'PUT' : 'POST';

      const titleOrName = formData.title || formData.name;
      const autoSlug =
        formData.slug ||
        titleOrName
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)+/g, '');

      const payload: Record<string, any> = {
        ...formData,
        title: titleOrName,
        name: titleOrName,
        slug: autoSlug,
        status: formData.published ? 'published' : 'draft',
        metadata: {
          ...(initialData?.metadata || {}),
          custom_buttons: customButtons,
          gallery_images: galleryImages,
          pdf_url: formData.pdf_url || null,
          sql_url: formData.sql_url || null,
          zip_file_url: formData.zip_file_url || null,
          youtube_url: formData.youtube_url || null,
        },
      };

      if (isEditing) {
        payload.id = initialData?.id;
      }

      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const text = await res.text();
      const result = text ? JSON.parse(text) : {};
      if (!res.ok) throw new Error(result.error || 'Failed to save entry');

      onSuccess?.();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save entry');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex justify-end bg-black/60 backdrop-blur-sm transition-opacity">
      <div className="relative w-full max-w-2xl bg-card border-l border-border h-full shadow-2xl flex flex-col overflow-hidden text-card-foreground">
        {/* Drawer Header */}
        <div className="flex items-center justify-between border-b border-border/60 p-4 bg-muted/30">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold tracking-tight">
                {initialData ? '✏️ Notion-Style CMS Editor' : '➕ Add New Entity'}
              </h2>
              <Badge variant="outline" className="text-xs uppercase">
                {entityType}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Live In-Page Content Management & Asset Downloader Engine
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {errorMsg && (
          <div className="m-4 rounded-md bg-destructive/10 border border-destructive/30 p-3 text-xs text-destructive">
            {errorMsg}
          </div>
        )}

        {/* Scrollable Form Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Section 1: Overview & Category Pills */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground border-b border-border/40 pb-1">
              1. Title, Slug & Category Selection
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="drawer_title">Title / Name *</Label>
                <Input
                  id="drawer_title"
                  value={formData.title || ''}
                  onChange={(e) => {
                    updateField('title', e.target.value);
                    updateField('name', e.target.value);
                  }}
                  placeholder="e.g. AI Nexus Block Platform"
                  required
                />
              </div>

              <div>
                <Label htmlFor="drawer_slug">Slug *</Label>
                <Input
                  id="drawer_slug"
                  value={formData.slug || ''}
                  onChange={(e) => updateField('slug', e.target.value)}
                  placeholder="e.g. ai-nexus-block-platform"
                  required
                />
              </div>
            </div>

            {/* Category Pills */}
            <div>
              <Label className="mb-2 block text-xs">Category Category Pills</Label>
              <div className="flex flex-wrap gap-1.5">
                {(categoryPillsMap[entityType] || ['General']).map((pill) => (
                  <button
                    key={pill}
                    type="button"
                    onClick={() => updateField('category', pill)}
                    className={`px-3 py-1 text-xs rounded-full border transition-all ${
                      formData.category === pill
                        ? 'bg-primary text-primary-foreground border-primary font-semibold shadow-sm'
                        : 'bg-muted/40 hover:bg-muted text-muted-foreground border-border/60'
                    }`}
                  >
                    {pill}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label htmlFor="drawer_desc">Short Description *</Label>
              <Textarea
                id="drawer_desc"
                value={formData.description || formData.excerpt || ''}
                onChange={(e) => {
                  updateField('description', e.target.value);
                  updateField('excerpt', e.target.value);
                }}
                placeholder="High-level overview summary..."
                rows={2}
                required
              />
            </div>
          </div>

          {/* Section 2: Media Dropzone */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground border-b border-border/40 pb-1 flex items-center gap-1.5">
              <ImageIcon className="h-3.5 w-3.5 text-blue-500" /> 2. Screenshots & Image Dropzone (portfolio-media)
            </h3>

            <div className="rounded-xl border border-dashed border-border/80 bg-muted/20 p-4 text-center">
              <p className="text-xs text-muted-foreground mb-2">
                Drag & drop or select images to upload directly to Supabase <code className="text-primary font-mono">portfolio-media</code> bucket:
              </p>
              <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm">
                {uploadingField === 'gallery' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                Upload Images
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    files.forEach((file) => handleFileUpload('gallery', 'portfolio-media', file, true));
                  }}
                />
              </label>

              <div className="mt-3 flex gap-2">
                <Input
                  type="url"
                  value={newImageUrl}
                  onChange={(e) => setNewImageUrl(e.target.value)}
                  placeholder="Or paste image URL here..."
                  className="text-xs"
                />
                <Button type="button" size="sm" variant="outline" onClick={handleAddGalleryUrl}>
                  Add URL
                </Button>
              </div>
            </div>

            {/* Gallery Preview */}
            {galleryImages.length > 0 && (
              <div className="grid grid-cols-4 gap-2 pt-2">
                {galleryImages.map((img, idx) => (
                  <div key={idx} className="relative aspect-video rounded-lg overflow-hidden border border-border group">
                    <img src={img} alt={`Gallery ${idx}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => handleRemoveGalleryImage(idx)}
                      className="absolute top-1 right-1 bg-black/70 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section 3: File Attachments */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground border-b border-border/40 pb-1 flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5 text-red-500" /> 3. File Attachments (public-downloads)
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* PDF Report/Guide */}
              <div className="rounded-lg border border-border/40 p-3 space-y-2 bg-card">
                <Label className="text-xs flex items-center gap-1 font-bold">
                  <FileText className="h-3.5 w-3.5 text-red-500" /> PDF Guide / Cheatsheet
                </Label>
                <div className="flex gap-2">
                  <Input
                    type="url"
                    value={formData.pdf_url || ''}
                    onChange={(e) => updateField('pdf_url', e.target.value)}
                    placeholder="PDF URL..."
                    className="text-xs"
                  />
                  <label className="cursor-pointer">
                    <span className="inline-flex items-center gap-1 px-2.5 py-2 text-xs font-semibold rounded bg-red-500/10 text-red-500 border border-red-500/20">
                      {uploadingField === 'pdf_url' ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
                    </span>
                    <input
                      type="file"
                      accept=".pdf"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileUpload('pdf_url', 'public-downloads', file);
                      }}
                    />
                  </label>
                </div>
              </div>

              {/* ZIP Source Archive */}
              <div className="rounded-lg border border-border/40 p-3 space-y-2 bg-card">
                <Label className="text-xs flex items-center gap-1 font-bold">
                  <Archive className="h-3.5 w-3.5 text-emerald-500" /> Source (.zip) Archive
                </Label>
                <div className="flex gap-2">
                  <Input
                    type="url"
                    value={formData.zip_file_url || ''}
                    onChange={(e) => updateField('zip_file_url', e.target.value)}
                    placeholder="ZIP URL..."
                    className="text-xs"
                  />
                  <label className="cursor-pointer">
                    <span className="inline-flex items-center gap-1 px-2.5 py-2 text-xs font-semibold rounded bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                      {uploadingField === 'zip_file_url' ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
                    </span>
                    <input
                      type="file"
                      accept=".zip"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileUpload('zip_file_url', 'public-downloads', file);
                      }}
                    />
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Section 4: Dynamic Custom Action Buttons */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-border/40 pb-1">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <LinkIcon className="h-3.5 w-3.5 text-amber-500" /> 4. Custom Action Buttons Builder
              </h3>
              <Button type="button" variant="outline" size="sm" onClick={handleAddCustomButton} className="text-xs h-7">
                <Plus className="h-3 w-3 mr-1" /> Add Button
              </Button>
            </div>

            {customButtons.map((btn, idx) => (
              <div key={idx} className="flex gap-2 items-center">
                <Input
                  value={btn.label}
                  onChange={(e) => handleUpdateCustomButton(idx, 'label', e.target.value)}
                  placeholder="Button Label (e.g. Try Live)"
                  className="text-xs flex-1"
                />
                <Input
                  value={btn.url}
                  onChange={(e) => handleUpdateCustomButton(idx, 'url', e.target.value)}
                  placeholder="Target URL (https://...)"
                  className="text-xs flex-[2]"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemoveCustomButton(idx)}
                  className="text-destructive h-8 w-8"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>

          {/* Section 5: Rich Text / Markdown Workspace */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground border-b border-border/40 pb-1">
              5. Rich Content Workspace (Markdown / Case Study / Guide)
            </h3>

            <div className="flex items-center gap-1 border border-border/60 rounded-t-lg bg-muted/30 p-1">
              <Button type="button" variant="ghost" size="sm" onClick={() => insertMarkdown('**', '**')} title="Bold">
                <Bold className="h-3.5 w-3.5" />
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => insertMarkdown('*', '*')} title="Italic">
                <Italic className="h-3.5 w-3.5" />
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => insertMarkdown('### ')} title="Heading">
                <Heading className="h-3.5 w-3.5" />
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => insertMarkdown('```ts\n', '\n```')} title="Code Block">
                <Code className="h-3.5 w-3.5" />
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => insertMarkdown('- ')} title="Bullet List">
                <List className="h-3.5 w-3.5" />
              </Button>
            </div>

            <Textarea
              id="drawer_rich_editor"
              value={formData.long_description || formData.content || ''}
              onChange={(e) => {
                updateField('long_description', e.target.value);
                updateField('content', e.target.value);
              }}
              placeholder="Write full markdown documentation, author review, step-by-step tutorial, pros & cons, or architectural breakdown..."
              rows={8}
              className="rounded-t-none text-xs font-mono"
            />
          </div>

          {/* Controls */}
          <div className="flex items-center justify-between pt-4 border-t border-border/60">
            <div className="flex items-center gap-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="drawer_pub"
                  checked={Boolean(formData.published)}
                  onCheckedChange={(v) => updateField('published', v)}
                />
                <Label htmlFor="drawer_pub" className="text-xs">Published</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="drawer_feat"
                  checked={Boolean(formData.featured)}
                  onCheckedChange={(v) => updateField('featured', v)}
                />
                <Label htmlFor="drawer_feat" className="text-xs">Featured</Label>
              </div>
            </div>

            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={isSubmitting || Boolean(uploadingField)}>
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                Save Entry
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
