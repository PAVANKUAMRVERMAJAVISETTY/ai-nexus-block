#!/usr/bin/env node
/**
 * Nexus Local Development Agent
 * =============================
 *
 * Runs on the developer's own machine. This is the ONLY component in the Nexus
 * IDE that executes commands. The web server never spawns a process; it only
 * queues work, which this agent chooses to claim.
 *
 *   Nexus Web IDE  →  Next.js server (queue only)  →  this agent  →  your shell
 *
 * Security properties this file is responsible for:
 *
 *   1. ALLOWLIST — only the programs in ALLOWED_BINARIES may run. This mirrors
 *      config/ide.ts and is enforced again here, so a compromised or spoofed
 *      server still cannot make your machine run an arbitrary binary.
 *   2. NO SHELL — processes are spawned with an argv array and `shell: false`,
 *      so `;`, `|`, `&&` and backticks have no interpreter to act on.
 *   3. SANDBOXED PATHS — every file path from the server is re-validated and
 *      resolved, and anything landing outside the workspace root is refused.
 *   4. EXPLICIT CONSENT — the agent runs only while you choose to run it, only
 *      for the account holding the device token, and prints everything it does.
 *
 * Usage:
 *   NEXUS_SERVER_URL=http://localhost:3000 \
 *   NEXUS_AGENT_TOKEN=nxa_xxxxxxxx \
 *   node agent/nexus-agent.mjs
 */

import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import process from 'node:process';

const AGENT_VERSION = '1.0.0';
const PROTOCOL_VERSION = 1;

const SERVER_URL = (process.env.NEXUS_SERVER_URL || 'http://localhost:3000').replace(/\/+$/, '');
const TOKEN = process.env.NEXUS_AGENT_TOKEN || '';
const WORKSPACE_ROOT = path.resolve(
  process.env.NEXUS_WORKSPACE_ROOT || path.join(os.homedir(), 'nexus-workspaces')
);
const POLL_INTERVAL_MS = Number(process.env.NEXUS_POLL_INTERVAL_MS || 3000);
const MAX_CONCURRENT = Number(process.env.NEXUS_MAX_CONCURRENT || 1);

/**
 * Mirrors `allowedCommandBinaries` in config/ide.ts.
 * Keep the two lists in sync — this copy is the one that actually protects you.
 */
const ALLOWED_BINARIES = new Set([
  'npm', 'pnpm', 'yarn', 'bun', 'npx', 'node',
  'git', 'tsc', 'eslint', 'next',
  'vitest', 'jest', 'playwright',
  'python', 'python3', 'pip', 'pytest',
  'java', 'javac', 'mvn', 'gradle',
  'go', 'cargo', 'make',
]);

/** Paths the agent will never write, regardless of what the server sends. */
const FORBIDDEN_SEGMENTS = new Set(['.', '..', '.git', 'node_modules']);

const active = new Map();
let stopping = false;

/* ------------------------------------------------------------------ */
/* Logging                                                             */
/* ------------------------------------------------------------------ */

const colors = {
  reset: '\u001b[0m',
  dim: '\u001b[2m',
  red: '\u001b[31m',
  green: '\u001b[32m',
  yellow: '\u001b[33m',
  cyan: '\u001b[36m',
};

function log(message, color = 'reset') {
  const stamp = new Date().toISOString().slice(11, 19);
  console.log(`${colors.dim}[${stamp}]${colors.reset} ${colors[color]}${message}${colors.reset}`);
}

/* ------------------------------------------------------------------ */
/* HTTP                                                                */
/* ------------------------------------------------------------------ */

async function api(pathname, { method = 'POST', body, query } = {}) {
  const url = new URL(`${SERVER_URL}${pathname}`);
  if (query) {
    for (const [key, value] of Object.entries(query)) url.searchParams.set(key, value);
  }

  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const text = await response.text();
  let payload;
  try {
    payload = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`Server returned non-JSON (${response.status}): ${text.slice(0, 200)}`);
  }

  if (!response.ok) {
    throw new Error(payload.error || `Request failed with status ${response.status}`);
  }

  return payload;
}

/* ------------------------------------------------------------------ */
/* Path safety                                                         */
/* ------------------------------------------------------------------ */

/**
 * Validate a server-supplied relative path and resolve it inside `root`.
 * Returns null when the path is unsafe. Mirrors lib/ide/paths.ts.
 */
function safeResolve(root, relativePath) {
  if (typeof relativePath !== 'string' || !relativePath || relativePath.includes('\u0000')) {
    return null;
  }

  const normalized = relativePath.replace(/\\/g, '/').replace(/\/+/g, '/').replace(/^\/+/, '');
  const segments = normalized.split('/');

  for (const segment of segments) {
    if (!segment || FORBIDDEN_SEGMENTS.has(segment.toLowerCase())) return null;
  }

  const resolved = path.resolve(root, ...segments);
  const rootWithSep = root.endsWith(path.sep) ? root : root + path.sep;

  // Final containment check: refuse anything that escapes the workspace.
  if (resolved !== root && !resolved.startsWith(rootWithSep)) return null;

  return resolved;
}

/* ------------------------------------------------------------------ */
/* Workspace materialization                                           */
/* ------------------------------------------------------------------ */

async function syncWorkspace(projectId, workspaceDir) {
  const workspace = await api('/api/ide/agent/workspace', {
    method: 'GET',
    query: { projectId },
  });

  const dirName = safeResolve(WORKSPACE_ROOT, workspace.workspaceDir || workspaceDir || projectId);
  if (!dirName) throw new Error('Server supplied an unsafe workspace directory name.');

  await mkdir(dirName, { recursive: true });

  let written = 0;
  let skipped = 0;

  for (const file of workspace.files || []) {
    const target = safeResolve(dirName, file.path);
    if (!target) {
      skipped += 1;
      log(`refused unsafe path from server: ${file.path}`, 'red');
      continue;
    }

    if (file.isDirectory) {
      await mkdir(target, { recursive: true });
      continue;
    }

    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, file.content ?? '', 'utf8');
    written += 1;
  }

  if (workspace.truncated) {
    log('workspace sync was truncated by the server size limit', 'yellow');
  }

  log(`synced ${written} file(s) into ${dirName}${skipped ? ` (${skipped} refused)` : ''}`, 'dim');
  return dirName;
}


/* ------------------------------------------------------------------ */
/* Git operations                                                      */
/* ------------------------------------------------------------------ */

/**
 * Rebuild argv from a structured Git operation.
 *
 * This mirrors buildGitArgv() in lib/ide/git-protocol.ts. The agent does NOT
 * trust the argv the server sent for Git: it reconstructs it from the typed
 * fields, so even a compromised server cannot smuggle extra flags through.
 * User text (commit messages, branch names) becomes its own argv element and
 * is never parsed, quoted, or concatenated.
 */
function buildGitArgvLocal(operation) {
  const branchOk = (b) =>
    typeof b === 'string' &&
    b.length > 0 &&
    b.length <= 255 &&
    !b.startsWith('-') &&
    !/[\u0000-\u0020~^:?*\[\\]/.test(b) &&
    !b.includes('..');

  const pathsOk = (paths) =>
    Array.isArray(paths) &&
    paths.length > 0 &&
    paths.every(
      (x) => typeof x === 'string' && x.length > 0 && !x.startsWith('-') && !x.includes('..')
    );

  switch (operation.op) {
    case 'clone': {
      if (typeof operation.repoUrl !== 'string' || !/^https:\/\/github\.com\//.test(operation.repoUrl)) {
        throw new Error('Refused clone: repository URL must be an https github.com URL.');
      }
      if (operation.repoUrl.includes('@')) {
        throw new Error('Refused clone: repository URL must not embed credentials.');
      }
      return [
        'clone',
        ...(operation.branch && branchOk(operation.branch) ? ['--branch', operation.branch] : []),
        '--',
        operation.repoUrl,
        '.',
      ];
    }
    case 'status':
      return ['status', '--porcelain=v1', '-z', '--branch', '--untracked-files=all'];
    case 'branch_list':
      return ['branch', '--list', '--all',
        '--format=%(refname:short)%09%(HEAD)%09%(upstream:short)%09%(upstream:track)'];
    case 'branch_create':
      if (!branchOk(operation.branch)) throw new Error('Refused: invalid branch name.');
      return operation.from && branchOk(operation.from)
        ? ['checkout', '-b', operation.branch, operation.from]
        : ['checkout', '-b', operation.branch];
    case 'branch_switch':
      if (!branchOk(operation.branch)) throw new Error('Refused: invalid branch name.');
      return ['checkout', operation.branch];
    case 'branch_delete':
      if (!branchOk(operation.branch)) throw new Error('Refused: invalid branch name.');
      return ['branch', operation.force ? '-D' : '-d', operation.branch];
    case 'stage':
      if (!pathsOk(operation.paths)) throw new Error('Refused: invalid paths.');
      return ['add', '--', ...operation.paths];
    case 'unstage':
      if (!pathsOk(operation.paths)) throw new Error('Refused: invalid paths.');
      return ['restore', '--staged', '--', ...operation.paths];
    case 'discard':
      if (!pathsOk(operation.paths)) throw new Error('Refused: invalid paths.');
      return ['checkout', '--', ...operation.paths];
    case 'commit': {
      if (typeof operation.message !== 'string' || !operation.message.trim()) {
        throw new Error('Refused: commit message is empty.');
      }
      // The message is a single argv element. Nothing is escaped because
      // nothing is ever interpreted by a shell.
      return ['commit', '-m', operation.message];
    }
    case 'push':
      return ['push', ...(operation.setUpstream ? ['--set-upstream'] : []), 'origin',
        ...(operation.branch && branchOk(operation.branch) ? [operation.branch] : ['HEAD'])];
    case 'pull':
      return ['pull', '--ff-only', 'origin',
        ...(operation.branch && branchOk(operation.branch) ? [operation.branch] : [])];
    case 'fetch':
      return ['fetch', '--prune', 'origin'];
    case 'diff':
      return ['diff', ...(operation.staged ? ['--staged'] : []), '--no-color',
        ...(typeof operation.path === 'string' && !operation.path.includes('..')
          ? ['--', operation.path] : [])];
    case 'log':
      return ['log', `--max-count=${Math.min(Math.max(Number(operation.limit) || 20, 1), 100)}`,
        '--pretty=format:%H%x09%an%x09%ar%x09%s', '--no-color'];
    default:
      throw new Error(`Refused: unsupported git operation "${operation.op}".`);
  }
}

/**
 * Environment for a Git child process.
 *
 * The credential is injected via GIT_CONFIG_* environment variables rather than
 * argv, because argv is visible to any process listing (`ps`). Using
 * http.extraheader also means the token is never written into .git/config, so
 * it does not persist on disk after the operation.
 *
 * GIT_TERMINAL_PROMPT=0 makes git fail fast with a clear auth error instead of
 * blocking forever on an invisible username prompt.
 */
function buildGitEnv(credential) {
  const env = {
    ...process.env,
    GIT_TERMINAL_PROMPT: '0',
    GIT_ASKPASS: '',
    GCM_INTERACTIVE: 'never',
  };

  if (credential && credential.token) {
    const basic = Buffer.from(`${credential.username || 'x-access-token'}:${credential.token}`).toString('base64');
    env.GIT_CONFIG_COUNT = '1';
    env.GIT_CONFIG_KEY_0 = 'http.https://github.com/.extraheader';
    env.GIT_CONFIG_VALUE_0 = `Authorization: Basic ${basic}`;
  }

  return env;
}

/** Remove anything credential-shaped before output is sent back or printed. */
function redact(text) {
  if (!text) return text;
  return String(text)
    .replace(/https:\/\/[^@\s/]+:[^@\s/]+@/g, 'https://***:***@')
    .replace(/(Authorization:\s*(?:Basic|Bearer)\s+)[A-Za-z0-9+/=._-]+/gi, '$1***')
    .replace(/\bgh[pousr]_[A-Za-z0-9]{16,}\b/g, '***')
    .replace(/\bgithub_pat_[A-Za-z0-9_]{20,}\b/g, '***');
}

/* ------------------------------------------------------------------ */
/* Execution                                                           */
/* ------------------------------------------------------------------ */

async function report(event) {
  try {
    return await api('/api/ide/agent/report', { body: event });
  } catch (error) {
    log(`failed to report ${event.event}: ${error.message}`, 'red');
    return null;
  }
}

async function executeRun(assignment) {
  const { runId, command, projectId, workspaceDir } = assignment;
  let argv = assignment.argv;
  let gitEnv = null;

  // Structured Git operation: rebuild argv locally rather than trusting the
  // server's, and prepare a credential environment for network operations.
  if (assignment.gitOperation) {
    try {
      argv = ['git', ...buildGitArgvLocal(assignment.gitOperation)];
      gitEnv = buildGitEnv(assignment.gitCredential);
    } catch (error) {
      log(error.message, 'red');
      await report({
        runId,
        event: 'finished',
        status: 'error',
        exitCode: null,
        durationMs: 0,
        stdout: '',
        stderr: error.message,
      });
      return;
    }
  }

  // Re-validate before spawning. Never trust the server's argv.
  if (!Array.isArray(argv) || argv.length === 0) {
    await report({
      runId,
      event: 'finished',
      status: 'error',
      exitCode: null,
      durationMs: 0,
      stdout: '',
      stderr: 'Agent refused an empty command.',
    });
    return;
  }

  if (!ALLOWED_BINARIES.has(argv[0])) {
    const message = `Agent refused "${argv[0]}": not in the local allowlist.`;
    log(message, 'red');
    await report({
      runId,
      event: 'finished',
      status: 'error',
      exitCode: null,
      durationMs: 0,
      stdout: '',
      stderr: message,
    });
    return;
  }

  let cwd;
  try {
    if (assignment.gitOperation) {
      // A Git workspace is a real clone on disk — never overwrite it with the
      // database's virtual file copies. Just resolve (and create for clone).
      cwd = safeResolve(WORKSPACE_ROOT, workspaceDir || projectId);
      if (!cwd) throw new Error('Server supplied an unsafe workspace directory name.');
      await mkdir(cwd, { recursive: true });
    } else if (assignment.syncWorkspace === false) {
      cwd = safeResolve(WORKSPACE_ROOT, workspaceDir || projectId);
      if (!cwd) throw new Error('Server supplied an unsafe workspace directory name.');
      await mkdir(cwd, { recursive: true });
    } else {
      cwd = await syncWorkspace(projectId, workspaceDir);
    }
  } catch (error) {
    await report({
      runId,
      event: 'finished',
      status: 'error',
      exitCode: null,
      durationMs: 0,
      stdout: '',
      stderr: `Workspace sync failed: ${error.message}`,
    });
    return;
  }

  log(`$ ${redact(command)}`, 'cyan');
  await report({ runId, event: 'started' });

  const startedAt = Date.now();
  let stdout = '';
  let stderr = '';
  let seq = 0;
  let settled = false;

  const child = spawn(argv[0], argv.slice(1), {
    cwd,
    // shell:false is the point — no interpreter, so no metacharacter injection.
    shell: false,
    env: gitEnv
      ? { ...gitEnv, CI: '1', FORCE_COLOR: '0' }
      : { ...process.env, CI: '1', FORCE_COLOR: '0' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  const entry = { child, cancelled: false };
  active.set(runId, entry);

  const pump = (stream, name) => {
    stream.setEncoding('utf8');
    stream.on('data', (raw) => {
      // Redact before the bytes go anywhere — terminal, buffer, or server.
      const chunk = redact(raw);
      if (name === 'stdout') stdout += chunk;
      else stderr += chunk;
      process.stdout.write(chunk);
      const current = seq++;
      report({ runId, event: 'output', stream: name, chunk, seq: current });
    });
  };

  pump(child.stdout, 'stdout');
  pump(child.stderr, 'stderr');

  const timeout = setTimeout(() => {
    if (!settled) {
      entry.cancelled = 'timeout';
      child.kill('SIGKILL');
    }
  }, assignment.timeoutMs || 10 * 60 * 1000);

  await new Promise((resolve) => {
    const finish = async (exitCode, signal) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      active.delete(runId);

      let status;
      if (entry.cancelled === 'timeout') status = 'timeout';
      else if (entry.cancelled) status = 'cancelled';
      else if (exitCode === 0) status = 'success';
      else status = 'error';

      const durationMs = Date.now() - startedAt;
      const color = status === 'success' ? 'green' : status === 'error' ? 'red' : 'yellow';
      log(`${status.toUpperCase()} (exit ${exitCode ?? signal ?? 'n/a'}) in ${durationMs}ms`, color);

      await report({
        runId,
        event: 'finished',
        status,
        exitCode: exitCode === null || exitCode === undefined ? null : exitCode,
        durationMs,
        stdout,
        stderr,
      });

      resolve();
    };

    child.on('error', (error) => {
      stderr += `\nFailed to start "${argv[0]}": ${error.message}\n`;
      if (error.code === 'ENOENT') {
        stderr += `Is ${argv[0]} installed and on this machine's PATH?\n`;
      }
      finish(null, null);
    });

    child.on('close', (code, signal) => finish(code, signal));
  });
}

/* ------------------------------------------------------------------ */
/* Poll loop                                                           */
/* ------------------------------------------------------------------ */

async function pollOnce() {
  const capacity = Math.max(0, MAX_CONCURRENT - active.size);

  const response = await api('/api/ide/agent/poll', {
    body: {
      protocolVersion: PROTOCOL_VERSION,
      platform: `${os.platform()} ${os.release()}`,
      agentVersion: AGENT_VERSION,
      workspaceRoot: WORKSPACE_ROOT,
      capacity,
    },
  });

  if (response.protocolVersion !== PROTOCOL_VERSION) {
    log(
      `server speaks protocol v${response.protocolVersion}, this agent speaks v${PROTOCOL_VERSION}. Update the agent.`,
      'yellow'
    );
  }

  for (const runId of response.cancellations || []) {
    const entry = active.get(runId);
    if (entry && !entry.cancelled) {
      log(`cancelling run ${runId}`, 'yellow');
      entry.cancelled = true;
      entry.child.kill('SIGTERM');
      setTimeout(() => {
        if (active.has(runId)) entry.child.kill('SIGKILL');
      }, 5000);
    }
  }

  for (const assignment of response.runs || []) {
    executeRun(assignment).catch((error) => {
      log(`run ${assignment.runId} crashed the handler: ${error.message}`, 'red');
    });
  }
}

async function main() {
  if (!TOKEN) {
    console.error(
      '\nNEXUS_AGENT_TOKEN is not set.\n\n' +
        'Open the Nexus IDE, go to the Terminal panel, and choose "Pair local agent"\n' +
        'to generate a device token, then start this agent with:\n\n' +
        '  NEXUS_AGENT_TOKEN=nxa_... node agent/nexus-agent.mjs\n'
    );
    process.exit(1);
  }

  await mkdir(WORKSPACE_ROOT, { recursive: true });

  log(`Nexus Local Development Agent v${AGENT_VERSION}`, 'green');
  log(`server:    ${SERVER_URL}`, 'dim');
  log(`workspace: ${WORKSPACE_ROOT}`, 'dim');
  log(`allowlist: ${[...ALLOWED_BINARIES].join(', ')}`, 'dim');
  log('polling for work — press Ctrl+C to stop', 'dim');

  let consecutiveFailures = 0;

  while (!stopping) {
    try {
      await pollOnce();
      consecutiveFailures = 0;
    } catch (error) {
      consecutiveFailures += 1;
      log(`poll failed: ${error.message}`, 'red');

      if (/not valid|revoked|token/i.test(error.message)) {
        log('this device token is no longer accepted — stopping.', 'red');
        break;
      }
      // Back off so a server restart does not produce a request storm.
      if (consecutiveFailures > 3) {
        await new Promise((r) => setTimeout(r, Math.min(consecutiveFailures * 2000, 30_000)));
      }
    }

    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }
}

function shutdown() {
  if (stopping) process.exit(1);
  stopping = true;
  log('shutting down — terminating active processes', 'yellow');
  for (const [, entry] of active) {
    entry.cancelled = true;
    entry.child.kill('SIGTERM');
  }
  setTimeout(() => process.exit(0), 1500);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

main().catch((error) => {
  console.error(`Agent failed to start: ${error.message}`);
  process.exit(1);
});

