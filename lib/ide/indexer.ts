/**
 * Project indexing.
 *
 * The Nexus AI Assistant must understand a project before it advises on it, but
 * shipping every file to a model on every request is slow, expensive, and
 * quickly exceeds the context window. Instead the project is distilled once
 * into reusable facts — an overview, per-module imports/exports, and a route
 * map — which are cheap to attach to any request.
 *
 * Everything here is pure: it takes file rows in and returns facts out.
 */

import { indexDefaults } from '@/config/ide';
import type {
  IdeFile,
  IdeModuleFact,
  IdeProject,
  IdeProjectOverview,
  IdeRouteFact,
} from '@/types/ide';
import { detectLanguage, inferPrimaryLanguage, isBinaryPath } from './languages';
import { extname } from './paths';

/* ------------------------------------------------------------------ */
/* Module facts                                                        */
/* ------------------------------------------------------------------ */

const IMPORT_PATTERNS = [
  /import\s+[^;]*?\bfrom\s+['"]([^'"]+)['"]/g,
  /import\s+['"]([^'"]+)['"]/g,
  /require\(\s*['"]([^'"]+)['"]\s*\)/g,
  /^\s*from\s+([\w.]+)\s+import\s+/gm, // Python
  /^\s*import\s+([\w.]+)\s*$/gm, // Python / Java
];

const EXPORT_PATTERNS = [
  /export\s+(?:async\s+)?function\s+(\w+)/g,
  /export\s+(?:const|let|var|class|interface|type|enum)\s+(\w+)/g,
  /export\s+\{\s*([^}]+)\s*\}/g,
  /^\s*(?:public\s+)?class\s+(\w+)/gm, // Java
  /^\s*def\s+(\w+)/gm, // Python
];

function collectMatches(content: string, patterns: RegExp[], limit: number): string[] {
  const found = new Set<string>();

  for (const pattern of patterns) {
    // Each use needs its own lastIndex, so clone rather than reuse.
    const regex = new RegExp(pattern.source, pattern.flags);
    let match: RegExpExecArray | null;
    while ((match = regex.exec(content)) !== null) {
      const captured = match[1];
      if (!captured) continue;
      for (const part of captured.split(',')) {
        const name = part.trim().split(/\s+as\s+/)[0].trim();
        if (name && name.length < 80) found.add(name);
        if (found.size >= limit) return Array.from(found);
      }
    }
  }

  return Array.from(found);
}

export function extractModuleFacts(file: IdeFile): IdeModuleFact | null {
  if (file.is_directory || file.is_binary || isBinaryPath(file.file_path)) return null;
  if (file.size > indexDefaults.maxIndexableFileBytes) {
    return {
      path: file.file_path,
      language: file.language,
      imports: [],
      exports: [],
      loc: 0,
    };
  }

  const content = file.content ?? '';

  return {
    path: file.file_path,
    language: file.language || detectLanguage(file.file_path),
    imports: collectMatches(content, IMPORT_PATTERNS, 40),
    exports: collectMatches(content, EXPORT_PATTERNS, 40),
    loc: content ? content.split('\n').length : 0,
  };
}

/* ------------------------------------------------------------------ */
/* Route facts                                                         */
/* ------------------------------------------------------------------ */

/**
 * Derive a URL from a Next.js App Router file path.
 * `app/(workspace)/dashboard/page.tsx` → `/dashboard`
 */
function appRouterUrl(filePath: string): string {
  const withoutApp = filePath.replace(/^app\//, '');
  const segments = withoutApp
    .split('/')
    .slice(0, -1)
    // Route groups `(name)` do not appear in the URL.
    .filter((segment) => !(segment.startsWith('(') && segment.endsWith(')')));

  const url = `/${segments.join('/')}`;
  return url === '/' ? '/' : url.replace(/\/+$/, '');
}

export function extractRoutes(files: IdeFile[]): IdeRouteFact[] {
  const routes: IdeRouteFact[] = [];

  for (const file of files) {
    if (file.is_directory) continue;
    const path = file.file_path;

    if (/^app\/.*\/route\.(ts|js)$/.test(path) || path === 'app/route.ts') {
      routes.push({ route: appRouterUrl(path), kind: 'api', path });
      continue;
    }
    if (/^app\/.*page\.(tsx|jsx|ts|js)$/.test(path) || path === 'app/page.tsx') {
      routes.push({ route: appRouterUrl(path), kind: 'page', path });
      continue;
    }
    if (/^app\/.*layout\.(tsx|jsx)$/.test(path) || path === 'app/layout.tsx') {
      routes.push({ route: appRouterUrl(path), kind: 'layout', path });
      continue;
    }
    if (path === 'middleware.ts' || path === 'middleware.js') {
      routes.push({ route: '*', kind: 'middleware', path });
      continue;
    }
    // Pages Router
    if (/^pages\/.*\.(tsx|jsx|ts|js)$/.test(path)) {
      const url = path
        .replace(/^pages/, '')
        .replace(/\.(tsx|jsx|ts|js)$/, '')
        .replace(/\/index$/, '') || '/';
      routes.push({ route: url, kind: path.startsWith('pages/api/') ? 'api' : 'page', path });
    }
  }

  return routes.sort((a, b) => a.route.localeCompare(b.route));
}

/* ------------------------------------------------------------------ */
/* Overview                                                            */
/* ------------------------------------------------------------------ */

const ENV_PATTERN = /process\.env\.([A-Z0-9_]+)|import\.meta\.env\.([A-Z0-9_]+)|os\.environ\[['"]([A-Z0-9_]+)['"]\]/g;

export function buildOverview(project: IdeProject, files: IdeFile[]): IdeProjectOverview {
  const languages: Record<string, number> = {};
  const envVars = new Set<string>();
  const entryPoints: string[] = [];

  let fileCount = 0;
  let directoryCount = 0;
  let totalBytes = 0;
  let hasTests = false;
  let hasReadme = false;
  let supabaseDetected = false;

  let scripts: Record<string, string> = {};
  let dependencies: string[] = [];
  let devDependencies: string[] = [];

  for (const file of files) {
    if (file.is_directory) {
      directoryCount += 1;
      continue;
    }

    fileCount += 1;
    totalBytes += file.size || 0;

    const language = file.language || detectLanguage(file.file_path);
    languages[language] = (languages[language] ?? 0) + 1;

    const lower = file.file_path.toLowerCase();
    if (lower.includes('test') || lower.includes('spec') || lower.startsWith('tests/')) {
      hasTests = true;
    }
    if (lower === 'readme.md') hasReadme = true;

    if (
      /^(app\/page\.|src\/main\.|src\/index\.|main\.py|index\.js|index\.ts|src\/server\.)/.test(
        file.file_path
      )
    ) {
      entryPoints.push(file.file_path);
    }

    const content = file.content ?? '';
    if (content.includes('supabase') || content.includes('SUPABASE')) supabaseDetected = true;

    if (content && file.size <= indexDefaults.maxIndexableFileBytes) {
      const regex = new RegExp(ENV_PATTERN.source, 'g');
      let match: RegExpExecArray | null;
      while ((match = regex.exec(content)) !== null) {
        const name = match[1] || match[2] || match[3];
        // Names only. Values are never read, indexed, or sent anywhere.
        if (name) envVars.add(name);
      }
    }

    if (file.file_path === 'package.json' && content) {
      try {
        const pkg = JSON.parse(content) as {
          scripts?: Record<string, string>;
          dependencies?: Record<string, string>;
          devDependencies?: Record<string, string>;
        };
        scripts = pkg.scripts ?? {};
        dependencies = Object.keys(pkg.dependencies ?? {});
        devDependencies = Object.keys(pkg.devDependencies ?? {});
      } catch {
        // A malformed package.json is a finding for the assistant, not a crash.
      }
    }

    if (file.file_path === 'requirements.txt' && content) {
      dependencies = content
        .split('\n')
        .map((line) => line.trim().split(/[=<>~\[]/)[0])
        .filter(Boolean);
    }
  }

  const primaryLanguage =
    project.primary_language ||
    inferPrimaryLanguage(files.filter((f) => !f.is_directory).map((f) => f.file_path));

  return {
    name: project.name,
    framework: project.framework,
    primaryLanguage,
    packageManager: project.package_manager,
    fileCount,
    directoryCount,
    totalBytes,
    languages,
    scripts,
    dependencies,
    devDependencies,
    entryPoints,
    hasTests,
    hasReadme,
    supabaseDetected,
    envVarsReferenced: Array.from(envVars).sort(),
  };
}

/* ------------------------------------------------------------------ */
/* Context assembly                                                    */
/* ------------------------------------------------------------------ */

export interface ProjectIndexBundle {
  overview: IdeProjectOverview;
  modules: IdeModuleFact[];
  routes: IdeRouteFact[];
  tree: string[];
}

export function buildProjectIndex(project: IdeProject, files: IdeFile[]): ProjectIndexBundle {
  const modules: IdeModuleFact[] = [];

  for (const file of files) {
    const fact = extractModuleFacts(file);
    if (fact) modules.push(fact);
  }

  return {
    overview: buildOverview(project, files),
    modules,
    routes: extractRoutes(files),
    tree: files.map((f) => (f.is_directory ? `${f.file_path}/` : f.file_path)).sort(),
  };
}

/**
 * Render the index as compact text for a model prompt.
 * Bounded by `indexDefaults` so a large project cannot blow the context window.
 */
export function renderIndexForPrompt(bundle: ProjectIndexBundle): string {
  const { overview, routes, tree } = bundle;

  const lines: string[] = [
    `PROJECT: ${overview.name}`,
    `Framework: ${overview.framework} | Primary language: ${overview.primaryLanguage} | Package manager: ${overview.packageManager}`,
    `Size: ${overview.fileCount} files across ${overview.directoryCount} directories`,
    `Languages: ${Object.entries(overview.languages)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([lang, count]) => `${lang} (${count})`)
      .join(', ')}`,
  ];

  if (Object.keys(overview.scripts).length) {
    lines.push(
      `Scripts: ${Object.entries(overview.scripts)
        .map(([name, cmd]) => `${name}="${cmd}"`)
        .join(', ')}`
    );
  }
  if (overview.dependencies.length) {
    lines.push(`Dependencies: ${overview.dependencies.slice(0, 30).join(', ')}`);
  }
  if (overview.entryPoints.length) {
    lines.push(`Entry points: ${overview.entryPoints.join(', ')}`);
  }
  if (routes.length) {
    lines.push(
      `Routes:\n${routes
        .slice(0, 40)
        .map((r) => `  ${r.kind.padEnd(10)} ${r.route.padEnd(30)} ${r.path}`)
        .join('\n')}`
    );
  }
  if (overview.envVarsReferenced.length) {
    lines.push(
      `Environment variables referenced (names only, values never read): ${overview.envVarsReferenced.join(', ')}`
    );
  }
  lines.push(`Tests present: ${overview.hasTests ? 'yes' : 'no'}`);
  lines.push(`Supabase referenced: ${overview.supabaseDetected ? 'yes' : 'no'}`);

  const treeSlice = tree.slice(0, 200);
  lines.push(
    `FILE TREE${tree.length > treeSlice.length ? ` (first ${treeSlice.length} of ${tree.length})` : ''}:\n${treeSlice
      .map((p) => `  ${p}`)
      .join('\n')}`
  );

  return lines.join('\n');
}

/** Pick the files most likely to answer a question, within the char budget. */
export function selectRelevantFiles(
  files: IdeFile[],
  query: string,
  activeFilePath?: string | null
): IdeFile[] {
  const needle = query.toLowerCase();
  const terms = needle.split(/\W+/).filter((t) => t.length > 2);

  const scored = files
    .filter((f) => !f.is_directory && !f.is_binary && f.size <= indexDefaults.maxIndexableFileBytes)
    .map((file) => {
      let score = 0;

      if (activeFilePath && file.file_path === activeFilePath) score += 100;

      const pathLower = file.file_path.toLowerCase();
      for (const term of terms) {
        if (pathLower.includes(term)) score += 8;
        if ((file.content ?? '').toLowerCase().includes(term)) score += 2;
      }

      // Configuration and entry points are disproportionately informative.
      if (['package.json', 'tsconfig.json', 'README.md'].includes(file.file_path)) score += 4;
      if (extname(file.file_path) === 'md') score += 1;

      return { file, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score);

  const selected: IdeFile[] = [];
  let charBudget = indexDefaults.maxContextChars;

  for (const { file } of scored) {
    if (selected.length >= indexDefaults.maxContextFiles) break;
    const cost = (file.content ?? '').length;
    if (cost > charBudget) continue;
    charBudget -= cost;
    selected.push(file);
  }

  return selected;
}
