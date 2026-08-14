import { describe, expect, it, vi } from 'vitest';
import {
  createProjectZip,
  filterFilesForExport,
  isPathSafeForExport,
} from '@/lib/ide/project-export';
import JSZip from 'jszip';

describe('Phase 12 — Project Export Security & Packaging', () => {
  describe('isPathSafeForExport', () => {
    it('allows valid relative source code paths', () => {
      expect(isPathSafeForExport('package.json')).toBe(true);
      expect(isPathSafeForExport('src/index.ts')).toBe(true);
      expect(isPathSafeForExport('app/(workspace)/page.tsx')).toBe(true);
      expect(isPathSafeForExport('components/ui/button.tsx')).toBe(true);
      expect(isPathSafeForExport('README.md')).toBe(true);
    });

    it('blocks path traversal attempts', () => {
      expect(isPathSafeForExport('../secret.txt')).toBe(false);
      expect(isPathSafeForExport('src/../../etc/passwd')).toBe(false);
      expect(isPathSafeForExport('..\\windows\\system32')).toBe(false);
      expect(isPathSafeForExport('a/b/../../../etc/shadow')).toBe(false);
    });

    it('blocks absolute paths', () => {
      expect(isPathSafeForExport('/etc/passwd')).toBe(false);
      expect(isPathSafeForExport('/var/log/syslog')).toBe(false);
      expect(isPathSafeForExport('C:\\Windows\\System32')).toBe(false);
      expect(isPathSafeForExport('D:\\Secrets')).toBe(false);
    });

    it('excludes sensitive environment files and secrets', () => {
      expect(isPathSafeForExport('.env')).toBe(false);
      expect(isPathSafeForExport('.env.local')).toBe(false);
      expect(isPathSafeForExport('.env.production')).toBe(false);
      expect(isPathSafeForExport('.env.vault')).toBe(false);
      expect(isPathSafeForExport('config/.env.test')).toBe(false);
    });

    it('excludes private key and credential files', () => {
      expect(isPathSafeForExport('id_rsa')).toBe(false);
      expect(isPathSafeForExport('id_ed25519')).toBe(false);
      expect(isPathSafeForExport('server.key')).toBe(false);
      expect(isPathSafeForExport('cert.pem')).toBe(false);
      expect(isPathSafeForExport('credentials.json')).toBe(false);
      expect(isPathSafeForExport('gcp-service-account.json')).toBe(false);
    });

    it('excludes build artifacts and dependencies', () => {
      expect(isPathSafeForExport('node_modules/express/package.json')).toBe(false);
      expect(isPathSafeForExport('.next/static/chunks/main.js')).toBe(false);
      expect(isPathSafeForExport('dist/bundle.js')).toBe(false);
      expect(isPathSafeForExport('build/index.html')).toBe(false);
      expect(isPathSafeForExport('.git/config')).toBe(false);
      expect(isPathSafeForExport('.DS_Store')).toBe(false);
    });
  });

  describe('filterFilesForExport', () => {
    it('filters out insecure or sensitive rows from file array', () => {
      const inputFiles = [
        { file_path: 'package.json', content: '{"name":"test"}' },
        { file_path: '.env.local', content: 'SECRET=123' },
        { file_path: 'src/app.ts', content: 'console.log("hello");' },
        { file_path: '../etc/passwd', content: 'root:x:0:0' },
        { file_path: 'id_rsa', content: '-----BEGIN PRIVATE KEY-----' },
      ];

      const filtered = filterFilesForExport(inputFiles);
      expect(filtered.map((f) => f.file_path)).toEqual(['package.json', 'src/app.ts']);
    });
  });

  describe('createProjectZip', () => {
    it('creates a valid ZIP archive preserving directory structure and excluding secrets', async () => {
      const files = [
        { file_path: 'package.json', content: '{"name":"my-app"}' },
        { file_path: 'src/index.ts', content: 'export const main = () => {};' },
        { file_path: 'src/components/', is_directory: true },
        { file_path: 'src/components/Header.tsx', content: 'export const Header = () => null;' },
        { file_path: '.env.local', content: 'DATABASE_URL=postgres://...' }, // Should be excluded
      ];

      const zipBytes = await createProjectZip({
        projectName: 'My Sample App',
        files,
      });

      expect(zipBytes).toBeInstanceOf(Uint8Array);
      expect(zipBytes.length).toBeGreaterThan(0);

      // Verify created zip contents using JSZip
      const loadedZip = await JSZip.loadAsync(zipBytes);
      const fileNames = Object.keys(loadedZip.files);

      expect(fileNames).toContain('package.json');
      expect(fileNames).toContain('src/index.ts');
      expect(fileNames).toContain('src/components/Header.tsx');
      expect(fileNames).not.toContain('.env.local');

      const pkgContent = await loadedZip.file('package.json')?.async('string');
      expect(pkgContent).toBe('{"name":"my-app"}');
    });
  });
});
