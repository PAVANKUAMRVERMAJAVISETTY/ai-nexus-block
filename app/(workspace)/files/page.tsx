'use client';

import { useState, useEffect } from 'react';
import { PageContainer, PageHeader } from '@/components/common';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { FileText, Upload, Search, Trash2, FileCode, FileImage, FileArchive, Loader2, FolderOpen, Lock } from 'lucide-react';
import { toast } from 'sonner';
import type { UserFile } from '@/types/database';

export default function FilesPage() {
  const [files, setFiles] = useState<UserFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // New file form
  const [filename, setFilename] = useState('');
  const [filePath, setFilePath] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('general');
  const [fileSize, setFileSize] = useState('1024');

  useEffect(() => {
    fetchFiles();
  }, []);

  const fetchFiles = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/files');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch files');
      setFiles(data.files || []);
    } catch (err: any) {
      toast.error(err.message || 'Error loading files');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateFile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!filename.trim() || !filePath.trim()) {
      toast.error('Filename and Storage path are required.');
      return;
    }

    setCreating(true);
    try {
      const payload = {
        filename: filename.trim(),
        file_path: filePath.trim(),
        file_size: parseInt(fileSize, 10) || 1024,
        mime_type: getMimeType(filename),
        category,
        title: title.trim() || filename.trim(),
        description: description.trim() || null,
      };

      const res = await fetch('/api/files', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add file record');

      setFiles([data.file, ...files]);
      toast.success('File metadata added to private workspace!');
      setUploadModalOpen(false);
      resetForm();
    } catch (err: any) {
      toast.error(err.message || 'Error creating file record');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/files?id=${id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete file');

      setFiles(files.filter((f) => f.id !== id));
      toast.success('File record removed.');
    } catch (err: any) {
      toast.error(err.message || 'Error deleting file');
    } finally {
      setDeletingId(null);
    }
  };

  const resetForm = () => {
    setFilename('');
    setFilePath('');
    setTitle('');
    setDescription('');
    setCategory('general');
    setFileSize('1024');
  };

  const getMimeType = (fname: string) => {
    const ext = fname.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'pdf': return 'application/pdf';
      case 'txt': return 'text/plain';
      case 'md': return 'text/markdown';
      case 'json': return 'application/json';
      case 'ts': case 'js': case 'py': return 'text/x-code';
      case 'png': case 'jpg': case 'jpeg': return 'image/png';
      default: return 'application/octet-stream';
    }
  };

  const getFileIcon = (fname: string) => {
    const ext = fname.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'ts': case 'js': case 'py': case 'json': case 'html':
        return <FileCode className="h-5 w-5 text-blue-500" />;
      case 'png': case 'jpg': case 'jpeg': case 'svg':
        return <FileImage className="h-5 w-5 text-emerald-500" />;
      case 'zip': case 'tar': case 'gz':
        return <FileArchive className="h-5 w-5 text-amber-500" />;
      default:
        return <FileText className="h-5 w-5 text-primary" />;
    }
  };

  const filteredFiles = files.filter((file) => {
    const matchesSearch =
      (file.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      file.filename.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (file.description || '').toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory =
      selectedCategory === 'all' || file.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  return (
    <PageContainer>
      <PageHeader
        title="My Files"
        description="Private user file library and knowledge metadata."
      >
        <Button size="sm" onClick={() => setUploadModalOpen(true)} className="text-xs flex items-center gap-1.5">
          <Upload className="h-4 w-4" />
          Add File Record
        </Button>
      </PageHeader>

      <div className="mt-6 flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search files..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 text-xs"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-40 text-xs">
              <SelectValue placeholder="Category filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="general">General</SelectItem>
              <SelectItem value="code">Code & Scripts</SelectItem>
              <SelectItem value="documents">Documents</SelectItem>
              <SelectItem value="images">Images</SelectItem>
              <SelectItem value="research">Research Notes</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center h-64 space-y-2 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <p className="text-xs">Loading private file library...</p>
        </div>
      ) : filteredFiles.length === 0 ? (
        <Card className="mt-6 border-dashed border-border/60 bg-muted/20">
          <CardContent className="flex flex-col items-center justify-center h-64 space-y-3">
            <FolderOpen className="h-10 w-10 text-muted-foreground/60" />
            <p className="text-sm font-medium text-foreground">No files in your workspace</p>
            <p className="text-xs text-muted-foreground text-center max-w-sm">
              Keep your code, notes, and research documents stored securely with Row Level Security.
            </p>
            <Button size="sm" onClick={() => setUploadModalOpen(true)} className="text-xs">
              Add First File
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredFiles.map((file) => (
            <Card key={file.id} className="border-border/40 bg-card hover:border-border transition-colors">
              <CardHeader className="p-4 pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 overflow-hidden">
                    {getFileIcon(file.filename)}
                    <div className="truncate">
                      <CardTitle className="text-xs font-semibold truncate">{file.title || file.filename}</CardTitle>
                      <CardDescription className="text-[10px] truncate">{file.filename}</CardDescription>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-[9px] capitalize shrink-0">
                    {file.category}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-4 pt-2 text-xs space-y-2">
                {file.description && (
                  <p className="text-muted-foreground line-clamp-2 text-[11px]">{file.description}</p>
                )}
                <div className="flex items-center justify-between pt-2 border-t border-border/40 text-[10px] text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Lock className="h-3 w-3 text-emerald-500" />
                    Private RLS
                  </span>
                  <span>{(file.file_size / 1024).toFixed(1)} KB</span>
                </div>
              </CardContent>
              <div className="flex items-center justify-between px-4 pb-3">
                <span className="text-[10px] text-muted-foreground">
                  {new Date(file.created_at).toLocaleDateString()}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-muted-foreground hover:text-destructive"
                  onClick={() => handleDelete(file.id)}
                  disabled={deletingId === file.id}
                >
                  {deletingId === file.id ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Trash2 className="h-3 w-3" />
                  )}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* UPLOAD MODAL */}
      <Dialog open={uploadModalOpen} onOpenChange={setUploadModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold flex items-center gap-2">
              <Upload className="h-4 w-4 text-primary" />
              Add File Record
            </DialogTitle>
            <DialogDescription className="text-xs">
              Save file reference and metadata in your personal workspace database.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateFile} className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="filename" className="text-xs">Filename *</Label>
              <Input
                id="filename"
                value={filename}
                onChange={(e) => setFilename(e.target.value)}
                placeholder="architecture_diagram.png or notes.md"
                required
                className="text-xs"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="filePath" className="text-xs">Storage Path / URL *</Label>
              <Input
                id="filePath"
                value={filePath}
                onChange={(e) => setFilePath(e.target.value)}
                placeholder="user_uploads/123/architecture_diagram.png"
                required
                className="text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs">Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="text-xs">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General</SelectItem>
                    <SelectItem value="code">Code & Scripts</SelectItem>
                    <SelectItem value="documents">Documents</SelectItem>
                    <SelectItem value="images">Images</SelectItem>
                    <SelectItem value="research">Research Notes</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="fileSize" className="text-xs">File Size (Bytes)</Label>
                <Input
                  id="fileSize"
                  type="number"
                  value={fileSize}
                  onChange={(e) => setFileSize(e.target.value)}
                  className="text-xs"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="title" className="text-xs">Custom Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Project Architecture Diagram"
                className="text-xs"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description" className="text-xs">Description / Notes</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Key component diagram for Next.js App Router and Supabase integration."
                rows={3}
                className="text-xs"
              />
            </div>

            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => setUploadModalOpen(false)} className="text-xs">
                Cancel
              </Button>
              <Button type="submit" disabled={creating} className="text-xs flex items-center gap-1.5">
                {creating && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Add File
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
