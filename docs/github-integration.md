# GitHub Integration (Nexus IDE — Phase 7)

Connect a GitHub account, import repositories, and use source control from
inside the Nexus IDE. Git runs on **your machine**, through the Nexus Local
Development Agent. The server never clones, commits, or pushes anything.

---

## Architecture

```
Browser (Source Control panel)
      │  authenticated user session
      ▼
Next.js server ─────────► validates + enqueues a structured Git operation
      │                    (never executes git)
      ▲
      │  device token (Bearer)
      │
Nexus Local Development Agent
      │  rebuilds argv from typed fields, spawns without a shell
      ▼
git on your machine  ──►  github.com
```

### Why Git uses a structured protocol

The IDE's command validator rejects shell metacharacters — correct for
free-form commands, but `&`, `;`, `$`, backticks and `|` are all legitimate
inside a commit message. Routing Git through that validator would reject most
real commit messages.

So Git does **not** use command strings. A Git operation is typed data:

```jsonc
{ "op": "commit", "message": "fix: handle A & B; see #42" }
```

The agent turns that into an argv array itself — `['commit', '-m', '<message>']`
— and spawns with `shell: false`. The message is a single argv element, so
there is nothing to escape and nothing to inject. Both the server and the agent
validate the operation independently.

Supported operations: `clone`, `status`, `branch_list`, `branch_create`,
`branch_switch`, `branch_delete`, `stage`, `unstage`, `discard`, `commit`,
`push`, `pull`, `fetch`, `diff`, `log`.

---

## Setup

### 1. Create a GitHub OAuth App

GitHub → **Settings → Developer settings → OAuth Apps → New OAuth App**

| Field | Value |
|---|---|
| Application name | AI Nexus Block (or your own name) |
| Homepage URL | `https://your-domain.com` |
| Authorization callback URL | `https://your-domain.com/api/ide/github/callback` |

For local development use `http://localhost:3000` and
`http://localhost:3000/api/ide/github/callback`. GitHub allows only one callback
URL per app, so create a second app for local work.

Generate a client secret and keep it. It is never sent to a browser.

### 2. Generate an encryption key

Access tokens are encrypted at rest with AES-256-GCM. Without this key the
integration refuses to store a connection rather than saving a plaintext token:

```bash
openssl rand -base64 32
```

### 3. Set the environment

```bash
GITHUB_CLIENT_ID=Iv1.xxxxxxxxxxxx
GITHUB_CLIENT_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
NEXUS_ENCRYPTION_KEY=<the base64 value from step 2>

# Only if the callback cannot be derived from the request
# (behind a proxy that rewrites Host, for example):
# GITHUB_OAUTH_REDIRECT_URI=https://your-domain.com/api/ide/github/callback
```

None of these may be prefixed `NEXT_PUBLIC_`. Anything so prefixed is inlined
into the browser bundle.

### 4. Apply the database migration

Run in the Supabase SQL editor, in order:

1. `database/migrations/20260811000000_nexus_ide_v2.sql` (if not already applied)
2. `database/migrations/20260811000001_nexus_ide_github.sql`

Both are additive and safe to re-run. If they are missing, the IDE says so
explicitly rather than failing obscurely.

### 5. Run a local agent

Git executes on your machine. See `agent/README.md`. Without a running agent the
Source Control panel says **"Local agent offline"** — it does not fake status.

---

## Using it

### Connect

IDE → the **GitHub** icon in the activity bar → **Connect GitHub**. You are sent
to GitHub to authorize, then returned to the IDE. The connection shows your
login, avatar and granted scopes.

Requested scopes: `repo` (read and write repository contents) and `read:user`
(your login and avatar). `repo` is required to push; GitHub has no narrower
scope that permits pushing to private repositories.

### Import a repository

**Import from GitHub** on the launcher, or the GitHub icon inside a project.
Search your repositories, pick one, choose a project name, and import.

That creates the Nexus project, records the link, and queues a `clone` for your
agent. The response tells you whether the clone was queued or whether command
execution is unavailable — it never implies the code was cloned when it was not.

### Source Control panel

The branch icon in the activity bar. It shows:

- current branch, with ahead/behind counts
- **Merge conflicts**, **Staged changes**, **Changes**
- per-file stage / unstage / discard, and stage-all / unstage-all
- commit box (`Ctrl`/`Cmd`+`Enter` commits)
- fetch, pull, push
- branch create / switch / delete

### Branch workflow

Create and switch from the branch dropdown. Deleting the branch you are on is
refused up front rather than surfacing a confusing Git error. Deleting any
branch asks for confirmation first.

### Commit, push, pull

- Commit requires a non-empty message and at least one staged file.
- **Pull is `--ff-only`.** A pull can therefore never create a surprise merge
  commit; if the branches have diverged you are told so and decide what to do.
- Push asks for confirmation, because it publishes to a remote other people see.

### Merge conflicts

A conflicted file appears under **Merge conflicts**. Conflict markers
(`<<<<<<<`, `=======`, `>>>>>>>`) are detected and parsed into both sides.

**Conflicts are never resolved automatically.** The Nexus AI Assistant can
explain a conflict, and can propose a resolution, but any file change goes
through the normal proposal → diff → approval flow. Nothing is written without
you approving it.

---

## Security model

| Concern | How it is handled |
|---|---|
| Token storage | AES-256-GCM encrypted at rest. Key lives in the server environment, not the database. |
| Token exposure | Never returned by any API, never in a `NEXT_PUBLIC_` variable, never in localStorage. Only display fields (login, avatar, scopes) reach the browser. |
| Token in transit to the agent | Sent only for network operations (`clone`/`push`/`pull`/`fetch`), only at hand-off, never persisted on the queue row. |
| Token on disk | Passed via `GIT_CONFIG_*` environment variables using `http.extraheader`. Never in argv (visible to `ps`), never written to `.git/config`. |
| Command injection | Structured operations only. The agent builds argv from typed fields and spawns with `shell: false`. Branch names starting with `-` are rejected so they cannot become flags. Pathspecs are separated with `--`. |
| Path traversal | Every path goes through the same validator as the rest of the IDE. The agent re-checks containment before writing. |
| Repository URLs | HTTPS `github.com` only. URLs embedding credentials are rejected. |
| CSRF on OAuth | `state` is an HMAC-signed token, bound to the user, expiring in 10 minutes, verified with a constant-time compare. The callback also rejects a mismatch between the user who started and finished the flow. |
| Destructive operations | `push`, `discard` and `branch_delete` require a second explicit confirmation. |
| Secret leakage in output | Redacted in the agent before display, and again on the server before persistence. |
| Disconnect | The token is revoked with GitHub, then the row is deleted. If revocation fails the response says so rather than claiming success. |

---

## Errors you may see

| Message | Meaning |
|---|---|
| GitHub is not connected. | Connect GitHub first. |
| Your GitHub connection has expired or been revoked. | Reconnect; the stored token no longer works. |
| Repository not found. | Private, renamed, or outside your grant. |
| Push rejected: the remote has commits you do not have locally. | Pull, then push. |
| Merge conflict detected. | Resolve the files, stage them, commit. |
| You have uncommitted changes that this operation would overwrite. | Commit or discard first. |
| Local agent offline. | Start your agent; Git runs on your machine. |
| Git operations are unavailable… no SUPABASE_SERVICE_ROLE_KEY. | Server-side configuration is incomplete. |

Git's own stderr is always shown alongside these explanations. Nothing is
swallowed — the plain-language line is a lead-in, not a replacement.

---

## Limitations

- **GitHub only.** GitLab and Bitbucket are not supported.
- **OAuth App, not GitHub App.** Simpler to configure; the tradeoff is
  repository-level rather than per-installation scoping.
- **Pull is fast-forward only.** Diverged branches must be reconciled
  deliberately; the IDE will not merge or rebase for you.
- **No pull request creation yet.** Push a branch and open the PR on GitHub.
- **Conflict resolution is manual** (optionally AI-proposed, always user-approved).
- Repository listing is capped at 300 repositories (3 pages of 100).
