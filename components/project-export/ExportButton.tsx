'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface ExportButtonProps {
  projectId: string;
  projectName?: string;
  variant?: 'default' | 'outline' | 'secondary' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
}

export function ExportButton({
  projectId,
  projectName = 'project',
  variant = 'outline',
  size = 'sm',
  className = '',
}: ExportButtonProps) {
  const [downloading, setDownloading] = useState(false);

  const handleExport = async () => {
    if (downloading) return;
    setDownloading(true);

    try {
      const res = await fetch(`/api/ide/projects/${projectId}/export`, {
        method: 'POST',
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to export project ZIP.');
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const safeSlug = projectName
        .toLowerCase()
        .replace(/[^a-z0-9-_]/g, '-')
        .replace(/-+/g, '-');
      link.download = `${safeSlug}-export.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success('Project exported successfully as ZIP.');
    } catch (err: any) {
      toast.error(err.message || 'Export failed.');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleExport}
      disabled={downloading}
      className={className}
      aria-label="Export project as ZIP"
      title="Export project as ZIP"
    >
      {downloading ? (
        <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
      ) : (
        <Download className="h-4 w-4 mr-1.5" />
      )}
      Export ZIP
    </Button>
  );
}
