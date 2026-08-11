#!/usr/bin/env node
/**
 * Copy Monaco's prebuilt assets into public/ so the editor is served from our
 * own origin.
 *
 * By default @monaco-editor/react fetches Monaco from cdn.jsdelivr.net. That
 * would mean: a script-src exception in the Content-Security-Policy, a hard
 * dependency on a third-party CDN being up, a version that can drift from the
 * installed package, and every user's browser announcing itself to jsDelivr.
 * Serving the copy we already have in node_modules avoids all four.
 *
 * Output is generated, so it is gitignored and regenerated on install/build.
 */

import { cp, mkdir, rm, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = path.join(root, 'node_modules', 'monaco-editor', 'min', 'vs');
const destination = path.join(root, 'public', 'monaco-editor', 'vs');

async function main() {
  if (!existsSync(source)) {
    // Not fatal: a CI job that only runs tests does not need the editor assets.
    console.warn('[monaco] node_modules/monaco-editor/min/vs not found — skipping copy.');
    return;
  }

  // Remove first so an upgrade cannot leave stale files behind.
  await rm(destination, { recursive: true, force: true });
  await mkdir(path.dirname(destination), { recursive: true });
  await cp(source, destination, { recursive: true });

  const { size } = await stat(destination).catch(() => ({ size: 0 }));
  void size;

  const version = JSON.parse(
    await (await import('node:fs/promises')).readFile(
      path.join(root, 'node_modules', 'monaco-editor', 'package.json'),
      'utf8'
    )
  ).version;

  console.log(`[monaco] copied monaco-editor@${version} to public/monaco-editor/vs`);
}

main().catch((error) => {
  console.error('[monaco] copy failed:', error.message);
  process.exitCode = 1;
});
