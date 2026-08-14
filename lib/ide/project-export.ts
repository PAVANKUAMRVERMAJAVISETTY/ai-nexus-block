import JSZip from 'jszip';
import type { IdeFile } from '@/types/ide';

/**
 * Patterns of sensitive files, credentials, runtime state, and internal system paths
 * that MUST be excluded from exported project ZIP archives.
 */
const SENSITIVE_EXCLUSION_PATTERNS = [
  /^\.env(\..+)?$/i,                     // .env, .env.local, .env.production, etc.
  /\.(key|pem|p12|pfx|keystore)$/i,      // Private keys & certificates
  /(^|\/)(id_rsa|id_ed25519|id_dsa)$/i,  // SSH private keys
  /(^|\/).*service.*account.*\.json$/i,  // Service accounts (GCP/Firebase/etc.)
  /(^|\/)credentials\.json$/i,           // AWS/GCP credentials
  /(^|\/)\.git(\/|$)/i,                  // Git internal metadata
  /(^|\/)node_modules(\/|$)/i,           // Dependencies
  /(^|\/)\.next(\/|$)/i,                 // Next.js build cache
  /(^|\/)(dist|build|coverage|\.turbo|\.cache)(\/|$)/i, // Build outputs
  /\.(sqlite|db)$/i,                     // SQLite database files
  /\.(ds_store|thumbs\.db)$/i,           // OS metadata files
];

/**
 * Validates a file path to prevent path traversal, absolute path leakage, or secret inclusion.
 */
export function isPathSafeForExport(filePath: string): boolean {
  if (!filePath || typeof filePath !== 'string') return false;

  // Normalize slashes
  const normalized = filePath.replace(/\\/g, '/').trim();

  // Reject path traversal attempts
  if (normalized.includes('..') || normalized.includes('\0')) {
    return false;
  }

  // Reject absolute paths (starts with / or Windows drive letter like C:)
  if (normalized.startsWith('/') || /^[a-zA-Z]:/.test(normalized)) {
    return false;
  }

  // Check against sensitive exclusion patterns
  const basename = normalized.split('/').pop() || '';
  for (const pattern of SENSITIVE_EXCLUSION_PATTERNS) {
    if (pattern.test(normalized) || pattern.test(basename)) {
      return false;
    }
  }

  return true;
}

/**
 * Filter project files for export, keeping only safe, non-sensitive, valid paths.
 */
export function filterFilesForExport<T extends { file_path: string }>(files: T[]): T[] {
  return files.filter((file) => isPathSafeForExport(file.file_path));
}

export interface ProjectExportOptions {
  projectName: string;
  files: Array<{
    file_path: string;
    content?: string | null;
    is_directory?: boolean;
    is_binary?: boolean;
  }>;
}

/**
 * Packages project files into a secure ZIP archive.
 * Preserves directory structure and excludes sensitive/system files.
 */
export async function createProjectZip(options: ProjectExportOptions): Promise<Uint8Array> {
  const zip = new JSZip();

  const safeFiles = filterFilesForExport(options.files);

  for (const file of safeFiles) {
    // Strip leading ./ if present
    const cleanPath = file.file_path.replace(/^\.\//, '');

    if (file.is_directory) {
      zip.folder(cleanPath);
    } else {
      const content = file.content ?? '';
      zip.file(cleanPath, content);
    }
  }

  const zipContent = await zip.generateAsync({
    type: 'uint8array',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });

  return zipContent;
}
