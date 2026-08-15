'use client';

import { useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { loader } from '@monaco-editor/react';
import type { editor } from 'monaco-editor';
import { Loader2 } from 'lucide-react';
import { editorDefaults } from '@/config/ide';
import type { IdeProblem } from '@/types/ide';

/**
 * Serve Monaco from our own origin.
 *
 * @monaco-editor/react defaults to cdn.jsdelivr.net, which the app's
 * Content-Security-Policy (`script-src 'self'`) blocks — the editor would
 * silently never load in production. `scripts/copy-monaco.mjs` copies the
 * installed package into public/monaco-editor, so this path is always the
 * exact version in package-lock.json, works offline and behind a firewall,
 * and sends no request to a third party.
 */
loader.config({ paths: { vs: '/monaco-editor/vs' } });

// Monaco ships its own workers and touches `window` at import time, so it can
// never be server-rendered.
const MonacoEditor = dynamic(() => import('@monaco-editor/react'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center gap-2 text-xs text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin" />
      Loading editor…
    </div>
  ),
});

/** Matches the workspace dark palette in globals.css. */
const NEXUS_DARK_THEME: editor.IStandaloneThemeData = {
  base: 'vs-dark',
  inherit: true,
  rules: [
    { token: 'comment', foreground: '5a6a85', fontStyle: 'italic' },
    { token: 'keyword', foreground: '7aa2f7' },
    { token: 'string', foreground: '9ece6a' },
    { token: 'number', foreground: 'ff9e64' },
    { token: 'type', foreground: '2ac3de' },
    { token: 'function', foreground: '7dcfff' },
  ],
  colors: {
    'editor.background': '#0a0f19',
    'editor.foreground': '#dbe3ee',
    'editorLineNumber.foreground': '#3b4757',
    'editorLineNumber.activeForeground': '#8fa5c4',
    'editor.selectionBackground': '#1f3050',
    'editor.lineHighlightBackground': '#111826',
    'editorCursor.foreground': '#3b93ff',
    'editorIndentGuide.background1': '#1b2434',
    'editorWidget.background': '#111826',
    'editorGutter.background': '#0a0f19',
  },
};

interface CodeEditorProps {
  path: string;
  value: string;
  language: string;
  readOnly?: boolean;
  problems?: IdeProblem[];
  onChange: (value: string) => void;
  onSave: () => void;
  onSelectionChange?: (selection: string, startLine: number, endLine: number) => void;
  /** Line to reveal, e.g. after clicking a problem. */
  revealLine?: number | null;
  width: number;
}

export function CodeEditor({
  path,
  value,
  language,
  readOnly = true,
  problems = [],
  onChange,
  onSave,
  onSelectionChange,
  revealLine,
  width,
}: CodeEditorProps) {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<typeof import('monaco-editor') | null>(null);
  // Kept in a ref so the Monaco command closure always calls the current handler.
  const onSaveRef = useRef(onSave);

  useEffect(() => {
    onSaveRef.current = onSave;
  }, [onSave]);

  /** Render diagnostics as native Monaco markers in the gutter and minimap. */
  useEffect(() => {
    const monaco = monacoRef.current;
    const instance = editorRef.current;
    if (!monaco || !instance) return;

    const model = instance.getModel();
    if (!model) return;

    const markers = problems
      .filter((problem) => problem.file_path === path && problem.line)
      .map((problem) => ({
        severity:
          problem.severity === 'error'
            ? monaco.MarkerSeverity.Error
            : problem.severity === 'warning'
              ? monaco.MarkerSeverity.Warning
              : monaco.MarkerSeverity.Info,
        startLineNumber: problem.line ?? 1,
        startColumn: problem.column ?? 1,
        endLineNumber: problem.line ?? 1,
        endColumn: (problem.column ?? 1) + 1,
        message: problem.code ? `${problem.code}: ${problem.message}` : problem.message,
        source: problem.source,
      }));

    monaco.editor.setModelMarkers(model, 'nexus', markers);
  }, [problems, path]);

  /** Jump to a line when the Problems panel asks for it. */
  useEffect(() => {
    if (!revealLine || !editorRef.current) return;
    editorRef.current.revealLineInCenter(revealLine);
    editorRef.current.setPosition({ lineNumber: revealLine, column: 1 });
    editorRef.current.focus();
  }, [revealLine]);

  return (
    <MonacoEditor
      path={path}
      language={language}
      value={value}
      theme="nexus-dark"
      onChange={(next) => onChange(next ?? '')}
      beforeMount={(monaco) => {
        monaco.editor.defineTheme('nexus-dark', NEXUS_DARK_THEME);
        // The virtual filesystem has no node_modules, so unresolved imports
        // would otherwise flood the editor with false errors.
        monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
          noSemanticValidation: true,
          noSyntaxValidation: false,
        });
        monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
          target: monaco.languages.typescript.ScriptTarget.ESNext,
          jsx: monaco.languages.typescript.JsxEmit.Preserve,
          allowNonTsExtensions: true,
          moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
        });
      }}
      onMount={(instance, monaco) => {
        editorRef.current = instance;
        monacoRef.current = monaco;

        instance.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
          onSaveRef.current();
        });

        instance.onDidChangeCursorSelection((event) => {
          if (!onSelectionChange) return;
          const model = instance.getModel();
          if (!model) return;

          const selected = model.getValueInRange(event.selection);
          onSelectionChange(
            selected,
            event.selection.startLineNumber,
            event.selection.endLineNumber
          );
        });
      }}
      options={{
        readOnly,
        fontSize: editorDefaults.fontSize,
        tabSize: editorDefaults.tabSize,
        fontFamily:
          'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace',
        minimap: { enabled: width >= editorDefaults.minimapMinWidthPx },
        scrollBeyondLastLine: false,
        smoothScrolling: true,
        cursorBlinking: 'smooth',
        renderLineHighlight: 'line',
        lineNumbersMinChars: 3,
        padding: { top: 12, bottom: 12 },
        automaticLayout: true,
        wordWrap: 'off',
        bracketPairColorization: { enabled: true },
        guides: { indentation: true, bracketPairs: false },
        scrollbar: { verticalScrollbarSize: 10, horizontalScrollbarSize: 10 },
        stickyScroll: { enabled: false },
      }}
    />
  );
}
