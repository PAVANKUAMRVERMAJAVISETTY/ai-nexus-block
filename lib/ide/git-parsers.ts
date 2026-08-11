/**
 * Parsers for Git's machine-readable output.
 *
 * Every parser here consumes output produced by the exact flags in
 * `buildGitArgv`, so the two must change together. Porcelain formats are used
 * throughout because Git guarantees their stability across versions and they
 * are unaffected by the user's locale or colour configuration.
 */

import type {
  GitBranchInfo,
  GitFileChange,
  GitFileStatus,
  GitStatusSummary,
  GitCommitInfo,
  GitDiffHunk,
  GitDiffFile,
} from '@/types/git';

/* ------------------------------------------------------------------ */
/* status --porcelain=v1 -z --branch                                   */
/* ------------------------------------------------------------------ */

/**
 * Map a two-character porcelain code to a status.
 * Index 0 is the staged (index) state, index 1 the unstaged (worktree) state.
 */
function decodeStatusChar(char: string): GitFileStatus {
  switch (char) {
    case 'M':
      return 'modified';
    case 'A':
      return 'added';
    case 'D':
      return 'deleted';
    case 'R':
      return 'renamed';
    case 'C':
      return 'copied';
    case 'T':
      return 'type_changed';
    case '?':
      return 'untracked';
    case 'U':
      return 'conflicted';
    default:
      return 'unmodified';
  }
}

/** Both sides 'U', or specific DD/AA pairs, mean a merge conflict. */
function isConflictCode(index: string, worktree: string): boolean {
  const pair = `${index}${worktree}`;
  return (
    index === 'U' ||
    worktree === 'U' ||
    pair === 'DD' ||
    pair === 'AA'
  );
}

/**
 * Parse `git status --porcelain=v1 -z --branch --untracked-files=all`.
 *
 * The `-z` form is NUL-delimited and never quotes or escapes paths, which is
 * why it is used here: filenames containing spaces, quotes or newlines parse
 * correctly, where the default output would mangle them. Renames emit two
 * NUL-separated entries (new path, then old path).
 */
export function parseGitStatus(output: string): GitStatusSummary {
  const summary: GitStatusSummary = {
    branch: null,
    upstream: null,
    ahead: 0,
    behind: 0,
    files: [],
    hasConflicts: false,
    isClean: true,
    detached: false,
  };

  if (!output) return summary;

  const records = output.split('\u0000');

  for (let i = 0; i < records.length; i += 1) {
    const record = records[i];
    if (!record) continue;

    // Branch header: "## main...origin/main [ahead 2, behind 1]"
    if (record.startsWith('## ')) {
      const header = record.slice(3);

      if (header.startsWith('HEAD (no branch)')) {
        summary.detached = true;
        summary.branch = 'HEAD (detached)';
        continue;
      }

      const trackMatch = /\[(.+)\]$/.exec(header);
      if (trackMatch) {
        const ahead = /ahead (\d+)/.exec(trackMatch[1]);
        const behind = /behind (\d+)/.exec(trackMatch[1]);
        summary.ahead = ahead ? Number.parseInt(ahead[1], 10) : 0;
        summary.behind = behind ? Number.parseInt(behind[1], 10) : 0;
      }

      const refs = header.replace(/\s*\[.+\]$/, '');
      const [local, upstream] = refs.split('...');
      summary.branch = local?.trim() || null;
      summary.upstream = upstream?.trim() || null;
      continue;
    }

    // Entry: XY<space>path   (X = index, Y = worktree)
    if (record.length < 3) continue;

    const indexChar = record[0];
    const worktreeChar = record[1];
    const path = record.slice(3);

    const conflicted = isConflictCode(indexChar, worktreeChar);
    let originalPath: string | null = null;

    // A rename or copy is followed by its source path in the next record.
    if (indexChar === 'R' || indexChar === 'C') {
      originalPath = records[i + 1] ?? null;
      i += 1;
    }

    const change: GitFileChange = {
      path,
      originalPath,
      indexStatus: decodeStatusChar(indexChar),
      worktreeStatus: decodeStatusChar(worktreeChar),
      conflicted,
      // '??' is untracked; anything else with a non-space index char is staged.
      staged: !conflicted && indexChar !== ' ' && indexChar !== '?',
      // A worktree char other than space means unstaged work exists.
      unstaged: !conflicted && worktreeChar !== ' ' && worktreeChar !== '?',
      untracked: indexChar === '?' && worktreeChar === '?',
    };

    if (conflicted) summary.hasConflicts = true;
    summary.files.push(change);
  }

  summary.isClean = summary.files.length === 0;
  return summary;
}

/* ------------------------------------------------------------------ */
/* branch --list --all --format=...                                    */
/* ------------------------------------------------------------------ */

/**
 * Parse the tab-delimited branch format:
 *   name \t HEAD-marker \t upstream \t track
 * `%(HEAD)` is '*' for the current branch and ' ' otherwise.
 */
export function parseGitBranches(output: string): GitBranchInfo[] {
  if (!output.trim()) return [];

  const branches: GitBranchInfo[] = [];

  for (const line of output.split('\n')) {
    if (!line.trim()) continue;

    const [name, headMarker, upstream, track] = line.split('\t');
    if (!name) continue;

    // Skip the symbolic origin/HEAD pointer — it is not a real branch.
    if (/^origin\/HEAD$/.test(name.trim())) continue;

    const isRemote = name.startsWith('remotes/') || /^origin\//.test(name);
    const cleanName = name.replace(/^remotes\//, '').trim();

    const ahead = track ? /ahead (\d+)/.exec(track) : null;
    const behind = track ? /behind (\d+)/.exec(track) : null;

    branches.push({
      name: cleanName,
      isCurrent: headMarker?.trim() === '*',
      isRemote,
      upstream: upstream?.trim() || null,
      ahead: ahead ? Number.parseInt(ahead[1], 10) : 0,
      behind: behind ? Number.parseInt(behind[1], 10) : 0,
      isGone: Boolean(track && track.includes('gone')),
    });
  }

  return branches;
}

/* ------------------------------------------------------------------ */
/* log --pretty=format:%H%x09%an%x09%ar%x09%s                          */
/* ------------------------------------------------------------------ */

export function parseGitLog(output: string): GitCommitInfo[] {
  if (!output.trim()) return [];

  const commits: GitCommitInfo[] = [];

  for (const line of output.split('\n')) {
    if (!line.trim()) continue;
    const [hash, author, relativeDate, ...rest] = line.split('\t');
    if (!hash) continue;

    commits.push({
      hash,
      shortHash: hash.slice(0, 7),
      author: author ?? 'unknown',
      relativeDate: relativeDate ?? '',
      subject: rest.join('\t'),
    });
  }

  return commits;
}

/* ------------------------------------------------------------------ */
/* diff --no-color                                                     */
/* ------------------------------------------------------------------ */

/**
 * Parse unified diff output into per-file hunks.
 * Deliberately tolerant: an unrecognized line is attached to the current hunk
 * as context rather than aborting, so an unusual diff still renders.
 */
export function parseGitDiff(output: string): GitDiffFile[] {
  if (!output.trim()) return [];

  const files: GitDiffFile[] = [];
  let currentFile: GitDiffFile | null = null;
  let currentHunk: GitDiffHunk | null = null;
  let oldLine = 0;
  let newLine = 0;

  for (const line of output.split('\n')) {
    if (line.startsWith('diff --git ')) {
      const match = /diff --git a\/(.+?) b\/(.+)$/.exec(line);
      currentFile = {
        path: match?.[2] ?? 'unknown',
        oldPath: match?.[1] ?? null,
        hunks: [],
        additions: 0,
        deletions: 0,
        isBinary: false,
      };
      files.push(currentFile);
      currentHunk = null;
      continue;
    }

    if (!currentFile) continue;

    if (line.startsWith('Binary files ')) {
      currentFile.isBinary = true;
      continue;
    }

    // @@ -old,count +new,count @@ optional section heading
    if (line.startsWith('@@')) {
      const match = /^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@(.*)$/.exec(line);
      if (match) {
        oldLine = Number.parseInt(match[1], 10);
        newLine = Number.parseInt(match[3], 10);
        currentHunk = {
          header: line,
          heading: match[5]?.trim() || null,
          lines: [],
        };
        currentFile.hunks.push(currentHunk);
      }
      continue;
    }

    if (!currentHunk) continue;

    if (line.startsWith('+') && !line.startsWith('+++')) {
      currentHunk.lines.push({ type: 'added', content: line.slice(1), oldLine: null, newLine });
      newLine += 1;
      currentFile.additions += 1;
    } else if (line.startsWith('-') && !line.startsWith('---')) {
      currentHunk.lines.push({ type: 'removed', content: line.slice(1), oldLine, newLine: null });
      oldLine += 1;
      currentFile.deletions += 1;
    } else if (line.startsWith(' ')) {
      currentHunk.lines.push({ type: 'context', content: line.slice(1), oldLine, newLine });
      oldLine += 1;
      newLine += 1;
    }
    // '\ No newline at end of file' and headers fall through intentionally.
  }

  return files;
}

/* ------------------------------------------------------------------ */
/* Conflict markers                                                    */
/* ------------------------------------------------------------------ */

export interface ConflictRegion {
  /** 1-indexed line of the `<<<<<<<` marker. */
  startLine: number;
  /** 1-indexed line of the `=======` separator. */
  separatorLine: number;
  /** 1-indexed line of the `>>>>>>>` marker. */
  endLine: number;
  currentLabel: string;
  incomingLabel: string;
  currentContent: string[];
  incomingContent: string[];
}

/**
 * Find merge-conflict regions in file content.
 *
 * Detection only — nothing here resolves a conflict. Resolution is always an
 * explicit user action (or an AI proposal the user approves), never automatic.
 */
export function detectConflicts(content: string): ConflictRegion[] {
  if (!content.includes('<<<<<<<')) return [];

  const lines = content.split('\n');
  const regions: ConflictRegion[] = [];

  let start = -1;
  let separator = -1;
  let currentLabel = '';
  let incomingLabel = '';

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];

    if (line.startsWith('<<<<<<<')) {
      start = i;
      separator = -1;
      currentLabel = line.slice(7).trim() || 'current';
      continue;
    }

    // Only treat '=======' as a separator while inside a conflict, so a
    // markdown rule or a line of equals signs elsewhere is not misread.
    if (start !== -1 && separator === -1 && /^={7}\s*$/.test(line)) {
      separator = i;
      continue;
    }

    if (start !== -1 && separator !== -1 && line.startsWith('>>>>>>>')) {
      incomingLabel = line.slice(7).trim() || 'incoming';

      regions.push({
        startLine: start + 1,
        separatorLine: separator + 1,
        endLine: i + 1,
        currentLabel,
        incomingLabel,
        currentContent: lines.slice(start + 1, separator),
        incomingContent: lines.slice(separator + 1, i),
      });

      start = -1;
      separator = -1;
    }
  }

  return regions;
}

/**
 * Apply a conflict resolution to file content.
 *
 * Pure: returns new content, writes nothing. The result still flows through the
 * normal approval path before it reaches the project.
 */
export function resolveConflict(
  content: string,
  region: ConflictRegion,
  resolution: 'current' | 'incoming' | 'both'
): string {
  const lines = content.split('\n');

  const replacement =
    resolution === 'current'
      ? region.currentContent
      : resolution === 'incoming'
        ? region.incomingContent
        : [...region.currentContent, ...region.incomingContent];

  return [
    ...lines.slice(0, region.startLine - 1),
    ...replacement,
    ...lines.slice(region.endLine),
  ].join('\n');
}

/* ------------------------------------------------------------------ */
/* stderr interpretation                                               */
/* ------------------------------------------------------------------ */

/**
 * Turn Git's stderr into an actionable message.
 *
 * The original stderr is ALWAYS preserved and shown alongside this — the goal
 * is to lead with a human explanation, never to hide what Git actually said.
 */
export function interpretGitError(stderr: string, exitCode: number | null): string | null {
  if (!stderr) return null;

  const text = stderr.toLowerCase();

  if (text.includes('authentication failed') || text.includes('invalid username or password')) {
    return 'GitHub authentication failed. Your connection may have expired — reconnect GitHub and try again.';
  }
  if (text.includes('could not read username') || text.includes('terminal prompts disabled')) {
    return 'GitHub credentials were not available for this operation. Reconnect GitHub and try again.';
  }
  if (text.includes('repository not found')) {
    return 'Repository not found. It may be private, renamed, or your connection may not have access to it.';
  }
  if (text.includes('permission denied') || text.includes('403')) {
    return 'Access denied by GitHub. Your connection may not have permission for this repository.';
  }
  if (text.includes('conflict')) {
    return 'Merge conflict detected. Resolve the conflicting files, stage them, then commit.';
  }
  if (text.includes('non-fast-forward') || text.includes('fetch first') || text.includes('rejected')) {
    return 'Push rejected: the remote has commits you do not have locally. Pull first, then push.';
  }
  if (text.includes('divergent branches') || text.includes('not possible to fast-forward')) {
    return 'Your branch and the remote have diverged. Pull and reconcile the histories before pushing.';
  }
  if (text.includes('local changes') && text.includes('would be overwritten')) {
    return 'You have uncommitted changes that this operation would overwrite. Commit or discard them first.';
  }
  if (text.includes('not a git repository')) {
    return 'This project is not a Git repository yet. Import a repository from GitHub first.';
  }
  if (text.includes('already exists')) {
    return 'A branch with that name already exists.';
  }
  if (text.includes('did not match any file') || text.includes('unknown revision')) {
    return 'That branch or reference does not exist.';
  }
  if (text.includes('nothing to commit')) {
    return 'Nothing to commit — stage some changes first.';
  }
  if (text.includes('unable to access') || text.includes('could not resolve host')) {
    return 'Could not reach GitHub. Check the network connection on the machine running your agent.';
  }

  if (exitCode !== null && exitCode !== 0) {
    return 'The Git command failed. See the output below for details.';
  }

  return null;
}

/**
 * Strip anything credential-shaped from text before it is stored or displayed.
 * The token is injected via the environment and should never appear, but Git
 * echoes URLs in several messages, so this is a hard backstop.
 */
export function redactCredentials(text: string): string {
  if (!text) return text;

  return (
    text
      // https://user:token@github.com/...
      .replace(/https:\/\/[^@\s/]+:[^@\s/]+@/g, 'https://***:***@')
      // Authorization headers Git may echo in verbose modes.
      .replace(/(Authorization:\s*(?:Basic|Bearer)\s+)[A-Za-z0-9+/=._-]+/gi, '$1***')
      // GitHub token formats.
      .replace(/\bgh[pousr]_[A-Za-z0-9]{16,}\b/g, '***')
      .replace(/\bgithub_pat_[A-Za-z0-9_]{20,}\b/g, '***')
  );
}
