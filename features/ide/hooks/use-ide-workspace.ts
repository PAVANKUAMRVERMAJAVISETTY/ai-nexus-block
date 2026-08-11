'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { ideClient, IdeApiError } from '../services/ide-client';
import { detectLanguage } from '@/lib/ide/languages';
import { basename, dirname } from '@/lib/ide/paths';
import { expansionPathsFor } from '@/lib/ide/tree';
import type {
  IdeAgentStatus,
  IdeFileSummary,
  IdeProblem,
  IdeProject,
  IdeRun,
  IdeTreeNode,
} from '@/types/ide';

export interface OpenTab {
  path: string;
  /** Content as loaded from the server. */
  savedContent: string;
  /** Content currently in the editor. */
  draftContent: string;
  language: string;
  loading: boolean;
  readOnly: boolean;
}

export interface WorkspaceState {
  project: IdeProject | null;
  files: IdeFileSummary[];
  tree: IdeTreeNode[];
  tabs: OpenTab[];
  activePath: string | null;
  expandedDirs: Set<string>;
  runs: IdeRun[];
  problems: IdeProblem[];
  agentStatus: IdeAgentStatus | null;
  loading: boolean;
  error: string | null;
}

function errorMessage(error: unknown): string {
  if (error instanceof IdeApiError) return error.message;
  if (error instanceof Error) return error.message;
  return 'Something went wrong.';
}

export function useIdeWorkspace(projectId: string) {
  const [project, setProject] = useState<IdeProject | null>(null);
  const [files, setFiles] = useState<IdeFileSummary[]>([]);
  const [tree, setTree] = useState<IdeTreeNode[]>([]);
  const [tabs, setTabs] = useState<OpenTab[]>([]);
  const [activePath, setActivePath] = useState<string | null>(null);
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set());
  const [runs, setRuns] = useState<IdeRun[]>([]);
  const [problems, setProblems] = useState<IdeProblem[]>([]);
  const [agentStatus, setAgentStatus] = useState<IdeAgentStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  /* ---------------------------------------------------------------- */
  /* Loading                                                           */
  /* ---------------------------------------------------------------- */

  const refreshFiles = useCallback(async () => {
    try {
      const data = await ideClient.listFiles(projectId);
      if (!mounted.current) return;
      setFiles(data.files);
      setTree(data.tree);
    } catch (err) {
      if (mounted.current) toast.error(errorMessage(err));
    }
  }, [projectId]);

  const refreshRuns = useCallback(async () => {
    try {
      const data = await ideClient.listRuns(projectId);
      if (mounted.current) setRuns(data.runs);
    } catch {
      // Runs are supplementary; a failure here must not break the editor.
    }
  }, [projectId]);

  const refreshAgentStatus = useCallback(async () => {
    try {
      const data = await ideClient.getAgentStatus();
      if (mounted.current) setAgentStatus(data.status);
    } catch {
      if (mounted.current) {
        setAgentStatus({
          connected: false,
          device: null,
          lastSeenSecondsAgo: null,
          serverConfigured: false,
        });
      }
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const [detail, fileData] = await Promise.all([
          ideClient.getProject(projectId),
          ideClient.listFiles(projectId),
        ]);

        if (cancelled) return;

        setProject(detail.project);
        setRuns(detail.recentRuns);
        setFiles(fileData.files);
        setTree(fileData.tree);

        // Open a sensible first file so the editor is never blank on entry.
        const preferred =
          fileData.files.find((f) => f.file_path === 'README.md') ??
          fileData.files.find((f) => f.file_path === 'app/page.tsx') ??
          fileData.files.find((f) => !f.is_directory);

        if (preferred) {
          const file = await ideClient.readFile(projectId, preferred.file_path);
          if (cancelled) return;

          setTabs([
            {
              path: file.file.file_path,
              savedContent: file.file.content,
              draftContent: file.file.content,
              language: file.file.language,
              loading: false,
              readOnly: false,
            },
          ]);
          setActivePath(file.file.file_path);
          setExpandedDirs(new Set(expansionPathsFor(file.file.file_path)));
        }
      } catch (err) {
        if (!cancelled) setError(errorMessage(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    refreshAgentStatus();

    return () => {
      cancelled = true;
    };
  }, [projectId, refreshAgentStatus]);

  // Poll agent liveness so the status bar reflects reality.
  useEffect(() => {
    const timer = setInterval(refreshAgentStatus, 15_000);
    return () => clearInterval(timer);
  }, [refreshAgentStatus]);

  /* ---------------------------------------------------------------- */
  /* Tabs                                                              */
  /* ---------------------------------------------------------------- */

  const openFile = useCallback(
    async (path: string) => {
      setActivePath(path);
      setExpandedDirs((prev) => {
        const next = new Set(prev);
        for (const dir of expansionPathsFor(path)) next.add(dir);
        return next;
      });

      let alreadyOpen = false;
      setTabs((prev) => {
        alreadyOpen = prev.some((tab) => tab.path === path);
        if (alreadyOpen) return prev;
        return [
          ...prev,
          {
            path,
            savedContent: '',
            draftContent: '',
            language: detectLanguage(path),
            loading: true,
            readOnly: false,
          },
        ];
      });

      if (alreadyOpen) return;

      try {
        const { file } = await ideClient.readFile(projectId, path);
        if (!mounted.current) return;

        setTabs((prev) =>
          prev.map((tab) =>
            tab.path === path
              ? {
                  ...tab,
                  savedContent: file.content,
                  draftContent: file.content,
                  language: file.language,
                  loading: false,
                  readOnly: file.is_binary,
                }
              : tab
          )
        );
      } catch (err) {
        if (!mounted.current) return;
        toast.error(errorMessage(err));
        setTabs((prev) => prev.filter((tab) => tab.path !== path));
      }
    },
    [projectId]
  );

  const closeTab = useCallback(
    (path: string) => {
      setTabs((prev) => {
        const tab = prev.find((t) => t.path === path);
        if (tab && tab.draftContent !== tab.savedContent) {
          const discard = window.confirm(
            `"${basename(path)}" has unsaved changes. Close it and discard them?`
          );
          if (!discard) return prev;
        }

        const next = prev.filter((t) => t.path !== path);

        if (activePath === path) {
          setActivePath(next.length ? next[next.length - 1].path : null);
        }
        return next;
      });
    },
    [activePath]
  );

  const updateDraft = useCallback((path: string, content: string) => {
    setTabs((prev) =>
      prev.map((tab) => (tab.path === path ? { ...tab, draftContent: content } : tab))
    );
  }, []);

  const saveFile = useCallback(
    async (path: string) => {
      const tab = tabs.find((t) => t.path === path);
      if (!tab || tab.draftContent === tab.savedContent) return;

      try {
        await ideClient.saveFile(projectId, path, tab.draftContent);
        if (!mounted.current) return;

        setTabs((prev) =>
          prev.map((t) => (t.path === path ? { ...t, savedContent: t.draftContent } : t))
        );
        toast.success(`Saved ${basename(path)}`);
        refreshFiles();
      } catch (err) {
        toast.error(errorMessage(err));
      }
    },
    [projectId, tabs, refreshFiles]
  );

  const saveAll = useCallback(async () => {
    const dirty = tabs.filter((tab) => tab.draftContent !== tab.savedContent);
    if (!dirty.length) {
      toast.info('Nothing to save.');
      return;
    }
    for (const tab of dirty) {
      // Sequential so a failure names the file that failed.
      // eslint-disable-next-line no-await-in-loop
      await saveFile(tab.path);
    }
  }, [tabs, saveFile]);

  /* ---------------------------------------------------------------- */
  /* File operations                                                   */
  /* ---------------------------------------------------------------- */

  const createEntry = useCallback(
    async (path: string, isDirectory: boolean) => {
      try {
        await ideClient.createFile(projectId, { path, isDirectory, content: '' });
        await refreshFiles();
        toast.success(`Created ${path}`);
        if (!isDirectory) await openFile(path);
        else setExpandedDirs((prev) => new Set(prev).add(path));
      } catch (err) {
        toast.error(errorMessage(err));
      }
    },
    [projectId, refreshFiles, openFile]
  );

  const renameEntry = useCallback(
    async (path: string, newPath: string) => {
      try {
        await ideClient.renameFile(projectId, path, newPath);
        await refreshFiles();

        // Keep open tabs pointing at the right file.
        setTabs((prev) =>
          prev.map((tab) => {
            if (tab.path === path) return { ...tab, path: newPath };
            if (tab.path.startsWith(`${path}/`)) {
              return { ...tab, path: `${newPath}/${tab.path.slice(path.length + 1)}` };
            }
            return tab;
          })
        );
        setActivePath((prev) => (prev === path ? newPath : prev));
        toast.success(`Renamed to ${newPath}`);
      } catch (err) {
        toast.error(errorMessage(err));
      }
    },
    [projectId, refreshFiles]
  );

  const duplicateEntry = useCallback(
    async (path: string) => {
      const dir = dirname(path);
      const name = basename(path);
      const dot = name.lastIndexOf('.');
      const copyName = dot > 0 ? `${name.slice(0, dot)}-copy${name.slice(dot)}` : `${name}-copy`;
      const newPath = dir ? `${dir}/${copyName}` : copyName;

      try {
        await ideClient.duplicateFile(projectId, path, newPath);
        await refreshFiles();
        toast.success(`Duplicated to ${newPath}`);
      } catch (err) {
        toast.error(errorMessage(err));
      }
    },
    [projectId, refreshFiles]
  );

  const deleteEntry = useCallback(
    async (path: string) => {
      try {
        const result = await ideClient.deleteFile(projectId, path);
        await refreshFiles();

        setTabs((prev) => prev.filter((tab) => !result.removedPaths.includes(tab.path)));
        setActivePath((prev) => (prev && result.removedPaths.includes(prev) ? null : prev));

        toast.success(
          result.removedPaths.length > 1
            ? `Deleted ${path} and ${result.removedPaths.length - 1} nested entries`
            : `Deleted ${path}`
        );
      } catch (err) {
        toast.error(errorMessage(err));
      }
    },
    [projectId, refreshFiles]
  );

  /* ---------------------------------------------------------------- */
  /* Derived                                                           */
  /* ---------------------------------------------------------------- */

  const activeTab = useMemo(
    () => tabs.find((tab) => tab.path === activePath) ?? null,
    [tabs, activePath]
  );

  const dirtyPaths = useMemo(
    () => new Set(tabs.filter((t) => t.draftContent !== t.savedContent).map((t) => t.path)),
    [tabs]
  );

  const toggleDir = useCallback((path: string) => {
    setExpandedDirs((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }, []);

  return {
    // state
    project,
    files,
    tree,
    tabs,
    activeTab,
    activePath,
    expandedDirs,
    dirtyPaths,
    runs,
    problems,
    agentStatus,
    loading,
    error,
    // actions
    openFile,
    closeTab,
    updateDraft,
    saveFile,
    saveAll,
    createEntry,
    renameEntry,
    duplicateEntry,
    deleteEntry,
    toggleDir,
    setActivePath,
    setProblems,
    setRuns,
    refreshFiles,
    refreshRuns,
    refreshAgentStatus,
  };
}

export type IdeWorkspace = ReturnType<typeof useIdeWorkspace>;
