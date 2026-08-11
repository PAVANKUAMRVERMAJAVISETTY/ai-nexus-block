/**
 * Language detection for the Nexus IDE.
 *
 * The returned identifiers are Monaco language ids, so the same value drives
 * syntax highlighting in the editor, the icon in the explorer, and the
 * language hint sent to the Nexus AI Assistant.
 */

import { basename, extname } from './paths';

export const EXTENSION_LANGUAGES: Record<string, string> = {
  // JavaScript / TypeScript
  ts: 'typescript',
  tsx: 'typescript',
  mts: 'typescript',
  cts: 'typescript',
  js: 'javascript',
  jsx: 'javascript',
  mjs: 'javascript',
  cjs: 'javascript',
  // Web
  html: 'html',
  htm: 'html',
  css: 'css',
  scss: 'scss',
  sass: 'scss',
  less: 'less',
  vue: 'html',
  svelte: 'html',
  // Data / config
  json: 'json',
  jsonc: 'json',
  yaml: 'yaml',
  yml: 'yaml',
  toml: 'ini',
  ini: 'ini',
  env: 'ini',
  xml: 'xml',
  csv: 'plaintext',
  // Docs
  md: 'markdown',
  mdx: 'markdown',
  txt: 'plaintext',
  // Database
  sql: 'sql',
  prisma: 'graphql',
  graphql: 'graphql',
  gql: 'graphql',
  // JVM
  java: 'java',
  kt: 'kotlin',
  kts: 'kotlin',
  scala: 'scala',
  groovy: 'java',
  // Systems
  c: 'c',
  h: 'c',
  cpp: 'cpp',
  cc: 'cpp',
  cxx: 'cpp',
  hpp: 'cpp',
  hh: 'cpp',
  cs: 'csharp',
  go: 'go',
  rs: 'rust',
  swift: 'swift',
  m: 'objective-c',
  // Scripting
  py: 'python',
  pyi: 'python',
  rb: 'ruby',
  php: 'php',
  pl: 'perl',
  lua: 'lua',
  r: 'r',
  sh: 'shell',
  bash: 'shell',
  zsh: 'shell',
  fish: 'shell',
  ps1: 'powershell',
  bat: 'bat',
  cmd: 'bat',
  // Other
  dart: 'dart',
  ex: 'elixir',
  exs: 'elixir',
  clj: 'clojure',
  hs: 'plaintext',
  dockerfile: 'dockerfile',
};

/** Files whose language is decided by filename, not extension. */
export const FILENAME_LANGUAGES: Record<string, string> = {
  dockerfile: 'dockerfile',
  makefile: 'plaintext',
  procfile: 'plaintext',
  '.gitignore': 'plaintext',
  '.gitattributes': 'plaintext',
  '.npmrc': 'ini',
  '.nvmrc': 'plaintext',
  '.editorconfig': 'ini',
  '.eslintrc': 'json',
  '.eslintrc.json': 'json',
  '.prettierrc': 'json',
  '.babelrc': 'json',
  'package.json': 'json',
  'tsconfig.json': 'json',
  'jsconfig.json': 'json',
  'netlify.toml': 'ini',
  'vercel.json': 'json',
};

/** Extensions that must never be opened in the text editor. */
const BINARY_EXTENSIONS = new Set([
  'png', 'jpg', 'jpeg', 'gif', 'webp', 'avif', 'bmp', 'ico', 'tiff',
  'mp3', 'wav', 'ogg', 'flac', 'm4a',
  'mp4', 'webm', 'mov', 'avi', 'mkv',
  'zip', 'tar', 'gz', 'bz2', 'xz', '7z', 'rar',
  'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx',
  'woff', 'woff2', 'ttf', 'otf', 'eot',
  'so', 'dll', 'dylib', 'exe', 'bin', 'wasm', 'class', 'jar', 'pyc',
  'db', 'sqlite', 'sqlite3',
]);

export function detectLanguage(path: string): string {
  const name = basename(path).toLowerCase();

  if (FILENAME_LANGUAGES[name]) return FILENAME_LANGUAGES[name];

  // `.env`, `.env.local`, `.env.example` all behave the same way.
  if (name === '.env' || name.startsWith('.env.')) return 'ini';
  if (name.startsWith('dockerfile')) return 'dockerfile';

  const ext = extname(path);
  return EXTENSION_LANGUAGES[ext] ?? 'plaintext';
}

export function isBinaryPath(path: string): boolean {
  return BINARY_EXTENSIONS.has(extname(path));
}

/** Human label for the editor status bar. */
export function languageLabel(language: string): string {
  const labels: Record<string, string> = {
    typescript: 'TypeScript',
    javascript: 'JavaScript',
    json: 'JSON',
    markdown: 'Markdown',
    css: 'CSS',
    scss: 'SCSS',
    html: 'HTML',
    sql: 'SQL',
    yaml: 'YAML',
    ini: 'Config',
    shell: 'Shell',
    python: 'Python',
    java: 'Java',
    cpp: 'C++',
    c: 'C',
    csharp: 'C#',
    go: 'Go',
    rust: 'Rust',
    plaintext: 'Plain Text',
  };
  return labels[language] ?? language.charAt(0).toUpperCase() + language.slice(1);
}

/**
 * Which language family a project is, inferred from its file mix.
 * Used to bias assistant explanations toward what the user is actually writing.
 */
export function inferPrimaryLanguage(paths: string[]): string {
  const counts = new Map<string, number>();
  for (const path of paths) {
    if (isBinaryPath(path)) continue;
    const language = detectLanguage(path);
    if (language === 'plaintext' || language === 'json' || language === 'markdown' || language === 'ini') {
      continue;
    }
    counts.set(language, (counts.get(language) ?? 0) + 1);
  }
  let best = 'typescript';
  let bestCount = 0;
  for (const [language, count] of Array.from(counts.entries())) {
    if (count > bestCount) {
      best = language;
      bestCount = count;
    }
  }
  return best;
}
