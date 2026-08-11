'use client';

import { useMemo, useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Copy,
  File as FileIcon,
  FileCode2,
  FileJson,
  FileText,
  FilePlus2,
  FolderPlus,
  Folder,
  FolderOpen,
  Pencil,
  RefreshCw,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { basename, dirname } from '@/lib/ide/paths';
import { searchFiles } from '@/lib/ide/tree';
import type { IdeFileSummary, IdeTreeNode } from '@/types/ide';

function iconFor(node: IdeTreeNode, expanded: boolean) {
  if (node.isDirectory) {
    return expanded ? (
      <FolderOpen className="h-3.5 w-3.5 shrink-0 text-primary/70" />
    ) : (
      <Folder className="h-3.5 w-3.5 shrink-0 text-primary/70" />
    );
  }

  switch (node.language) {
    case 'typescript':
    case 'javascript':
      return <FileCode2 className="h-3.5 w-3.5 shrink-0 text-blue-400" />;
    case 'json':
      return <FileJson className="h-3.5 w-3.5 shrink-0 text-amber-400" />;
    case 'markdown':
      return <FileText className="h-3.5 w-3.5 shrink-0 text-sky-300" />;
    case 'css':
    case 'scss':
      return <FileCode2 className="h-3.5 w-3.5 shrink-0 text-pink-400" />;
    case 'sql':
      return <FileCode2 className="h-3.5 w-3.5 shrink-0 text-emerald-400" />;
    case 'python':
      return <FileCode2 className="h-3.5 w-3.5 shrink-0 text-yellow-300" />;
    case 'java':
      return <FileCode2 className="h-3.5 w-3.5 shrink-0 text-orange-400" />;
    default:
      return <FileIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />;
  }
}

interface FileExplorerProps {
  tree: IdeTreeNode[];
  files: IdeFileSummary[];
  activePath: string | null;
  expandedDirs: Set<string>;
  dirtyPaths: Set<string>;
  onOpen: (path: string) => void;
  onToggleDir: (path: string) => void;
  onCreate: (path: string, isDirectory: boolean) => void;
  onRename: (path: string, newPath: string) => void;
  onDuplicate: (path: string) => void;
  onDelete: (path: string) => void;
  onRefresh: () => void;
}

export function FileExplorer({
  tree,
  files,
  activePath,
  expandedDirs,
  dirtyPaths,
  onOpen,
  onToggleDir,
  onCreate,
  onRename,
  onDuplicate,
  onDelete,
  onRefresh,
}: FileExplorerProps) {
  const [query, setQuery] = useState('');
  const [pendingDelete, setPendingDelete] = useState<IdeTreeNode | null>(null);

  const searchResults = useMemo(
    () => (query.trim() ? searchFiles(files, query) : []),
    [files, query]
  );

  const promptCreate = (parentPath: string, isDirectory: boolean) => {
    const label = isDirectory ? 'folder' : 'file';
    const name = window.prompt(
      `New ${label}${parentPath ? ` in ${parentPath}` : ' at project root'}:`,
      isDirectory ? 'new-folder' : 'new-file.ts'
    );
    if (!name?.trim()) return;
    onCreate(parentPath ? `${parentPath}/${name.trim()}` : name.trim(), isDirectory);
  };

  const promptRename = (node: IdeTreeNode) => {
    const next = window.prompt('New name:', node.name);
    if (!next?.trim() || next.trim() === node.name) return;
    const parent = dirname(node.path);
    onRename(node.path, parent ? `${parent}/${next.trim()}` : next.trim());
  };

  const renderNode = (node: IdeTreeNode, depth: number): React.ReactNode => {
    const expanded = expandedDirs.has(node.path);
    const isActive = activePath === node.path;
    const isDirty = dirtyPaths.has(node.path);

    return (
      <div key={node.path}>
        <ContextMenu>
          <ContextMenuTrigger asChild>
            <button
              type="button"
              onClick={() => (node.isDirectory ? onToggleDir(node.path) : onOpen(node.path))}
              style={{ paddingLeft: `${depth * 12 + 8}px` }}
              className={cn(
                'group flex w-full items-center gap-1.5 py-[3px] pr-2 text-left text-[13px] transition-colors',
                'hover:bg-accent/60',
                isActive && 'bg-accent text-foreground'
              )}
              title={node.path}
            >
              {node.isDirectory ? (
                expanded ? (
                  <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground" />
                )
              ) : (
                <span className="w-3 shrink-0" />
              )}

              {iconFor(node, expanded)}

              <span
                className={cn(
                  'truncate',
                  isActive ? 'text-foreground' : 'text-muted-foreground',
                  isDirty && 'italic'
                )}
              >
                {node.name}
              </span>

              {isDirty && <span className="ml-auto h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />}
            </button>
          </ContextMenuTrigger>

          <ContextMenuContent className="w-56">
            {node.isDirectory && (
              <>
                <ContextMenuItem onClick={() => promptCreate(node.path, false)}>
                  <FilePlus2 className="mr-2 h-3.5 w-3.5" /> New File
                </ContextMenuItem>
                <ContextMenuItem onClick={() => promptCreate(node.path, true)}>
                  <FolderPlus className="mr-2 h-3.5 w-3.5" /> New Folder
                </ContextMenuItem>
                <ContextMenuSeparator />
              </>
            )}
            <ContextMenuItem onClick={() => promptRename(node)}>
              <Pencil className="mr-2 h-3.5 w-3.5" /> Rename
            </ContextMenuItem>
            <ContextMenuItem onClick={() => onDuplicate(node.path)}>
              <Copy className="mr-2 h-3.5 w-3.5" /> Duplicate
            </ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem
              onClick={() => setPendingDelete(node)}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete
            </ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>

        {node.isDirectory && expanded && node.children.map((child) => renderNode(child, depth + 1))}
      </div>
    );
  };

  return (
    <div className="flex h-full flex-col bg-card/40">
      <div className="flex items-center justify-between border-b border-border/40 px-3 py-2">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Explorer
        </span>
        <div className="flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => promptCreate('', false)}
            title="New file at project root"
          >
            <FilePlus2 className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => promptCreate('', true)}
            title="New folder at project root"
          >
            <FolderPlus className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={onRefresh}
            title="Refresh"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <div className="border-b border-border/40 p-2">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search files"
            className="h-7 pl-7 pr-7 text-xs"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-1">
        {query.trim() ? (
          searchResults.length ? (
            searchResults.map((file) => (
              <button
                key={file.id}
                type="button"
                onClick={() => onOpen(file.file_path)}
                className="flex w-full items-center gap-2 px-3 py-1 text-left text-[13px] hover:bg-accent/60"
              >
                <FileCode2 className="h-3.5 w-3.5 shrink-0 text-blue-400" />
                <span className="truncate text-foreground">{basename(file.file_path)}</span>
                <span className="ml-auto truncate text-[10px] text-muted-foreground">
                  {dirname(file.file_path) || '/'}
                </span>
              </button>
            ))
          ) : (
            <p className="px-3 py-6 text-center text-xs text-muted-foreground">
              No files match “{query}”.
            </p>
          )
        ) : tree.length ? (
          tree.map((node) => renderNode(node, 0))
        ) : (
          <div className="px-4 py-8 text-center">
            <Folder className="mx-auto mb-2 h-8 w-8 text-muted-foreground/40" />
            <p className="text-xs text-muted-foreground">This project has no files yet.</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-3 h-7 text-xs"
              onClick={() => promptCreate('', false)}
            >
              Create the first file
            </Button>
          </div>
        )}
      </div>

      <AlertDialog open={Boolean(pendingDelete)} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {pendingDelete?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDelete?.isDirectory
                ? 'This deletes the folder and everything inside it. This cannot be undone.'
                : 'This permanently deletes the file. This cannot be undone.'}
              <span className="mt-2 block font-mono text-[11px] text-foreground">
                {pendingDelete?.path}
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (pendingDelete) onDelete(pendingDelete.path);
                setPendingDelete(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
