'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X, Upload, Loader2, FileText, Database, Archive, Video, Image as ImageIcon } from 'lucide-react';

export type EntityType = 'projects' | 'tools' | 'knowledge' | 'resources' | 'decisions' | 'roadmaps' | 'journey' | 'profile';

interface EntryEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  entityType: EntityType;
  initialData?: Record<string, any> | null;
  onSuccess?: () => void;
}

export function EntryEditModal({
  isOpen,
  onClose,
  entityType,
  initialData,
  onSuccess,
}: EntryEditModalProps) {
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [uploadingField, setUploadingField] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

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
    } else {
      setFormData({
        title: '',
        name: '',
        slug: '',
        description: '',
        long_description: '',
        content: '',
        excerpt: '',
        category: entityType === 'tools' ? 'AI Tool' : entityType === 'projects' ? 'AI Platform' : 'Engineering',
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
    }
    setErrorMsg(null);
  }, [initialData, entityType, isOpen]);

  if (!isOpen) return null;

  const updateField = (key: string, val: any) => {
    setFormData((prev) => ({ ...prev, [key]: val }));
  };

  const handleFileUpload = async (fieldName: string, targetBucket: 'portfolio-media' | 'public-downloads', file: File) => {
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
        updateField(fieldName, json.url);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'File upload failed');
    } finally {
      setUploadingField(null);
    }
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
      const autoSlug = formData.slug || titleOrName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');

      const payload: Record<string, any> = {
        ...formData,
        title: titleOrName,
        name: titleOrName,
        slug: autoSlug,
        status: formData.published ? 'published' : 'draft',
      };

      if (isEditing) {
        payload.id = initialData?.id;
      }

      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Failed to save entry');

      onSuccess?.();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save entry');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!initialData?.id || !confirm('Are you sure you want to delete this entry?')) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/${entityType}?id=${initialData.id}`, {
        method: 'DELETE',
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Delete failed');

      onSuccess?.();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Delete failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-2xl rounded-xl border border-border bg-card p-6 shadow-2xl my-8 text-card-foreground max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-border/40 pb-4 mb-4">
          <div>
            <h2 className="text-xl font-bold tracking-tight">
              {initialData ? '✏️ Edit Entry' : '➕ Add New Entry'}
            </h2>
            <p className="text-xs text-muted-foreground capitalize">
              Section: {entityType}
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
            <X className="h-4 w-4" />
          </Button>
        </div>

        {errorMsg && (
          <div className="mb-4 rounded-md bg-destructive/10 border border-destructive/30 p-3 text-xs text-destructive">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="title">Title / Name *</Label>
              <Input
                id="title"
                value={formData.title || ''}
                onChange={(e) => {
                  updateField('title', e.target.value);
                  updateField('name', e.target.value);
                }}
                placeholder="e.g. AI Nexus Assistant"
                required
              />
            </div>

            <div>
              <Label htmlFor="slug">Slug *</Label>
              <Input
                id="slug"
                value={formData.slug || ''}
                onChange={(e) => updateField('slug', e.target.value)}
                placeholder="e.g. ai-nexus-assistant"
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor="description">Short Description *</Label>
            <Textarea
              id="description"
              value={formData.description || formData.excerpt || ''}
              onChange={(e) => {
                updateField('description', e.target.value);
                updateField('excerpt', e.target.value);
              }}
              placeholder="Brief summary of the item..."
              rows={2}
              required
            />
          </div>

          {['projects', 'knowledge'].includes(entityType) && (
            <div>
              <Label htmlFor="long_description">Detailed Content / Long Description</Label>
              <Textarea
                id="long_description"
                value={formData.long_description || formData.content || ''}
                onChange={(e) => {
                  updateField('long_description', e.target.value);
                  updateField('content', e.target.value);
                }}
                placeholder="Full markdown overview or documentation..."
                rows={4}
              />
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="category">Category</Label>
              <Input
                id="category"
                value={formData.category || ''}
                onChange={(e) => updateField('category', e.target.value)}
                placeholder="e.g. AI & ML, Frontend"
              />
            </div>

            <div>
              <Label htmlFor="tags">Tags (comma separated)</Label>
              <Input
                id="tags"
                value={formData.tags || ''}
                onChange={(e) => updateField('tags', e.target.value)}
                placeholder="nextjs, supabase, ai"
              />
            </div>
          </div>

          {/* Specific Entity Controls */}
          {entityType === 'tools' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="pricing">Pricing Model</Label>
                <Select value={formData.pricing || 'free'} onValueChange={(v) => updateField('pricing', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="free">Free</SelectItem>
                    <SelectItem value="freemium">Freemium</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="enterprise">Enterprise</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="website_url">Website URL</Label>
                <Input
                  id="website_url"
                  type="url"
                  value={formData.website_url || formData.live_url || ''}
                  onChange={(e) => updateField('website_url', e.target.value)}
                  placeholder="https://..."
                />
              </div>
            </div>
          )}

          {entityType === 'roadmaps' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="level">Difficulty Level</Label>
                <Select value={formData.level || formData.difficulty || 'intermediate'} onValueChange={(v) => updateField('level', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="beginner">Beginner</SelectItem>
                    <SelectItem value="intermediate">Intermediate</SelectItem>
                    <SelectItem value="advanced">Advanced</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="estimated_hours">Estimated Hours</Label>
                <Input
                  id="estimated_hours"
                  type="number"
                  value={formData.estimated_hours || ''}
                  onChange={(e) => updateField('estimated_hours', e.target.value)}
                  placeholder="40"
                />
              </div>
            </div>
          )}

          {entityType === 'journey' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="milestone_type">Milestone Type</Label>
                <Select value={formData.milestone_type || 'project'} onValueChange={(v) => updateField('milestone_type', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="project">Project</SelectItem>
                    <SelectItem value="learning">Learning</SelectItem>
                    <SelectItem value="career">Career</SelectItem>
                    <SelectItem value="achievement">Achievement</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="entry_date">Entry Date (YYYY-MM)</Label>
                <Input
                  id="entry_date"
                  value={formData.entry_date || ''}
                  onChange={(e) => updateField('entry_date', e.target.value)}
                  placeholder="2024-01"
                />
              </div>
            </div>
          )}

          {/* Media & Asset Downloads Section */}
          <div className="rounded-lg border border-border/60 bg-muted/30 p-4 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Upload className="h-3.5 w-3.5" /> Media & Asset Uploads
            </h3>

            {/* Cover Image Upload -> portfolio-media */}
            <div>
              <Label className="text-xs flex items-center gap-1">
                <ImageIcon className="h-3 w-3 text-blue-500" /> Cover Image & Screenshot (→ portfolio-media)
              </Label>
              <div className="flex gap-2 items-center mt-1">
                <Input
                  type="url"
                  value={formData.image_url || ''}
                  onChange={(e) => updateField('image_url', e.target.value)}
                  placeholder="Image URL or upload file..."
                  className="text-xs"
                />
                <label className="cursor-pointer">
                  <span className="inline-flex items-center gap-1 px-3 py-2 text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 rounded-md border border-primary/20">
                    {uploadingField === 'image_url' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                    Upload
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload('image_url', 'portfolio-media', file);
                    }}
                  />
                </label>
              </div>
            </div>

            {/* PDF Cheatsheet -> public-downloads */}
            <div>
              <Label className="text-xs flex items-center gap-1">
                <FileText className="h-3 w-3 text-red-500" /> PDF Cheatsheet File (→ public-downloads)
              </Label>
              <div className="flex gap-2 items-center mt-1">
                <Input
                  type="url"
                  value={formData.pdf_url || ''}
                  onChange={(e) => updateField('pdf_url', e.target.value)}
                  placeholder="PDF URL or upload file..."
                  className="text-xs"
                />
                <label className="cursor-pointer">
                  <span className="inline-flex items-center gap-1 px-3 py-2 text-xs font-medium bg-red-500/10 text-red-500 hover:bg-red-500/20 rounded-md border border-red-500/20">
                    {uploadingField === 'pdf_url' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                    PDF
                  </span>
                  <input
                    type="file"
                    accept=".pdf,application/pdf"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload('pdf_url', 'public-downloads', file);
                    }}
                  />
                </label>
              </div>
            </div>

            {/* SQL Script -> public-downloads */}
            <div>
              <Label className="text-xs flex items-center gap-1">
                <Database className="h-3 w-3 text-amber-500" /> SQL Script File (→ public-downloads)
              </Label>
              <div className="flex gap-2 items-center mt-1">
                <Input
                  type="url"
                  value={formData.sql_url || ''}
                  onChange={(e) => updateField('sql_url', e.target.value)}
                  placeholder="SQL Script URL or upload file..."
                  className="text-xs"
                />
                <label className="cursor-pointer">
                  <span className="inline-flex items-center gap-1 px-3 py-2 text-xs font-medium bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 rounded-md border border-amber-500/20">
                    {uploadingField === 'sql_url' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                    SQL
                  </span>
                  <input
                    type="file"
                    accept=".sql,text/plain"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload('sql_url', 'public-downloads', file);
                    }}
                  />
                </label>
              </div>
            </div>

            {/* Project ZIP Source -> public-downloads */}
            <div>
              <Label className="text-xs flex items-center gap-1">
                <Archive className="h-3 w-3 text-emerald-500" /> Source (.zip) File (→ public-downloads)
              </Label>
              <div className="flex gap-2 items-center mt-1">
                <Input
                  type="url"
                  value={formData.zip_file_url || ''}
                  onChange={(e) => updateField('zip_file_url', e.target.value)}
                  placeholder="ZIP URL or upload archive..."
                  className="text-xs"
                />
                <label className="cursor-pointer">
                  <span className="inline-flex items-center gap-1 px-3 py-2 text-xs font-medium bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 rounded-md border border-emerald-500/20">
                    {uploadingField === 'zip_file_url' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                    ZIP
                  </span>
                  <input
                    type="file"
                    accept=".zip,application/zip"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload('zip_file_url', 'public-downloads', file);
                    }}
                  />
                </label>
              </div>
            </div>

            {/* Embedded Video URL */}
            <div>
              <Label className="text-xs flex items-center gap-1">
                <Video className="h-3 w-3 text-purple-500" /> Embedded Video URL (YouTube / Loom / Direct MP4)
              </Label>
              <Input
                type="url"
                value={formData.youtube_url || formData.video_url || ''}
                onChange={(e) => {
                  updateField('youtube_url', e.target.value);
                  updateField('video_url', e.target.value);
                }}
                placeholder="https://www.youtube.com/watch?v=... or https://loom.com/..."
                className="text-xs mt-1"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="published"
                  checked={Boolean(formData.published)}
                  onCheckedChange={(v) => updateField('published', v)}
                />
                <Label htmlFor="published" className="text-xs">Published</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="featured"
                  checked={Boolean(formData.featured)}
                  onCheckedChange={(v) => updateField('featured', v)}
                />
                <Label htmlFor="featured" className="text-xs">Featured</Label>
              </div>
            </div>

            <div className="flex gap-2">
              {initialData?.id && (
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={handleDelete}
                  disabled={isSubmitting}
                >
                  Delete
                </Button>
              )}
              <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={isSubmitting || Boolean(uploadingField)}>
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                Save Changes
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
