/**
 * Minimal GitHub REST client (server-side only).
 *
 * Deliberately not Octokit: this needs four endpoints, and a hand-written
 * client keeps the dependency surface small and makes it obvious that the
 * token never leaves the server. Every call takes the token as an argument
 * rather than reading it from module state, so it cannot leak into a closure
 * that outlives the request.
 */

import type { GitHubRepository, GitHubUser } from '@/types/git';

const API_BASE = 'https://api.github.com';
const API_VERSION = '2022-11-28';

export class GitHubApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'GitHubApiError';
    this.status = status;
  }
}

/** Translate GitHub's HTTP failures into messages a user can act on. */
function describeFailure(status: number, body: string): string {
  switch (status) {
    case 401:
      return 'Your GitHub connection has expired or been revoked. Reconnect GitHub to continue.';
    case 403:
      return body.includes('rate limit')
        ? 'GitHub rate limit reached. Wait a few minutes and try again.'
        : 'GitHub denied access. Your connection may not have permission for this resource.';
    case 404:
      return 'Not found on GitHub. The repository may be private, renamed, or outside your access.';
    case 422:
      return 'GitHub rejected the request as invalid.';
    default:
      return `GitHub request failed (HTTP ${status}).`;
  }
}

async function githubFetch(
  token: string,
  path: string,
  init: RequestInit = {}
): Promise<Response> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': API_VERSION,
      'User-Agent': 'AI-Nexus-Block',
      ...(init.headers ?? {}),
    },
    // Repository lists change often; never serve a stale list.
    cache: 'no-store',
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new GitHubApiError(response.status, describeFailure(response.status, body));
  }

  return response;
}

/** The authenticated user. Also acts as a token validity check. */
export async function getAuthenticatedUser(token: string): Promise<GitHubUser> {
  const response = await githubFetch(token, '/user');
  const data = (await response.json()) as {
    login: string;
    id: number;
    avatar_url?: string;
    name?: string;
  };

  return {
    login: data.login,
    id: data.id,
    avatarUrl: data.avatar_url ?? null,
    name: data.name ?? null,
  };
}

interface RawRepository {
  id: number;
  name: string;
  full_name: string;
  owner: { login: string };
  description: string | null;
  private: boolean;
  default_branch: string;
  html_url: string;
  clone_url: string;
  updated_at: string | null;
  pushed_at: string | null;
  language: string | null;
  stargazers_count: number;
  permissions?: { push?: boolean; admin?: boolean };
}

function toRepository(raw: RawRepository): GitHubRepository {
  return {
    id: raw.id,
    name: raw.name,
    fullName: raw.full_name,
    owner: raw.owner?.login ?? raw.full_name.split('/')[0],
    description: raw.description,
    private: raw.private,
    defaultBranch: raw.default_branch || 'main',
    htmlUrl: raw.html_url,
    cloneUrl: raw.clone_url,
    updatedAt: raw.pushed_at ?? raw.updated_at,
    language: raw.language,
    stars: raw.stargazers_count ?? 0,
    canPush: Boolean(raw.permissions?.push ?? raw.permissions?.admin),
  };
}

/**
 * Repositories the connection can see, most recently pushed first.
 * Paginated by GitHub; we fetch a bounded number of pages so a user with
 * thousands of repositories cannot stall the request.
 */
export async function listRepositories(
  token: string,
  options: { perPage?: number; maxPages?: number } = {}
): Promise<GitHubRepository[]> {
  const perPage = Math.min(options.perPage ?? 100, 100);
  const maxPages = Math.min(options.maxPages ?? 3, 10);

  const repositories: GitHubRepository[] = [];

  for (let page = 1; page <= maxPages; page += 1) {
    const response = await githubFetch(
      token,
      `/user/repos?per_page=${perPage}&page=${page}&sort=pushed&affiliation=owner,collaborator,organization_member`
    );

    const batch = (await response.json()) as RawRepository[];
    repositories.push(...batch.map(toRepository));

    // Short page means we have reached the end.
    if (batch.length < perPage) break;
  }

  return repositories;
}

/** Search the user's repositories by name/description, server-side. */
export function filterRepositories(
  repositories: GitHubRepository[],
  query: string
): GitHubRepository[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return repositories;

  return repositories.filter(
    (repo) =>
      repo.fullName.toLowerCase().includes(needle) ||
      (repo.description ?? '').toLowerCase().includes(needle) ||
      (repo.language ?? '').toLowerCase().includes(needle)
  );
}

/** A single repository, used to confirm access before importing. */
export async function getRepository(
  token: string,
  owner: string,
  name: string
): Promise<GitHubRepository> {
  const response = await githubFetch(
    token,
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}`
  );
  return toRepository((await response.json()) as RawRepository);
}

/** Branches for a repository, for the import dialog's branch picker. */
export async function listBranches(
  token: string,
  owner: string,
  name: string
): Promise<string[]> {
  const response = await githubFetch(
    token,
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}/branches?per_page=100`
  );
  const data = (await response.json()) as { name: string }[];
  return data.map((branch) => branch.name);
}

/** Split "owner/repo" defensively. */
export function parseFullName(fullName: unknown): { owner: string; name: string } {
  if (typeof fullName !== 'string') {
    throw new GitHubApiError(400, 'Repository must be given as "owner/name".');
  }

  const parts = fullName.trim().replace(/\.git$/, '').split('/');
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    throw new GitHubApiError(400, 'Repository must be given as "owner/name".');
  }
  if (!/^[\w.-]+$/.test(parts[0]) || !/^[\w.-]+$/.test(parts[1])) {
    throw new GitHubApiError(400, 'Repository owner or name contains invalid characters.');
  }

  return { owner: parts[0], name: parts[1] };
}
