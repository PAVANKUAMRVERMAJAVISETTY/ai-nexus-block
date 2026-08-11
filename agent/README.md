# Nexus Local Development Agent

The Nexus IDE runs in your browser, but **your code runs on your machine**. This
agent is the bridge — and it is the only piece of the system that executes
anything.

```
Browser (Nexus Web IDE)
      │  authenticated user session
      ▼
Next.js server ──────────► queues a run row. Never spawns a process.
      ▲
      │  device token (Bearer)
      │
Nexus Local Development Agent ──► spawns the process on your machine
      │
      ▼
Project workspace on local disk
```

## Why it works this way

A browser cannot safely be given the ability to run arbitrary operating-system
commands, and a public web server must never expose one. Putting execution
behind an agent you start yourself means:

- the server has **no code path** that spawns a child process
- commands run with **your** permissions, on **your** machine, in a directory
  you chose
- you can stop everything by pressing `Ctrl+C`

## Setup

**1. Pair a device.** In the Nexus IDE, open the Terminal panel and choose
*Pair local agent*. A token starting `nxa_` is displayed **once** — copy it. Only
a SHA-256 hash of it is stored on the server.

**2. Start the agent.**

```bash
NEXUS_SERVER_URL=http://localhost:3000 \
NEXUS_AGENT_TOKEN=nxa_your_token_here \
node agent/nexus-agent.mjs
```

or, from the project root:

```bash
NEXUS_AGENT_TOKEN=nxa_your_token_here npm run agent
```

The IDE status bar switches to **Agent connected** within a few seconds.

## Configuration

| Variable | Default | Purpose |
|---|---|---|
| `NEXUS_AGENT_TOKEN` | *(required)* | Device token from the pairing dialog |
| `NEXUS_SERVER_URL` | `http://localhost:3000` | Where the Nexus IDE server lives |
| `NEXUS_WORKSPACE_ROOT` | `~/nexus-workspaces` | Where project files are materialized |
| `NEXUS_POLL_INTERVAL_MS` | `3000` | How often to check for queued work |
| `NEXUS_MAX_CONCURRENT` | `1` | Runs executed at the same time |

## Server requirement

Agent endpoints authenticate with a device token rather than a user session, so
they cannot rely on Row Level Security. The server therefore needs
`SUPABASE_SERVICE_ROLE_KEY` set. Without it the IDE still works for editing —
Run / Test / Build stay disabled with an explicit message rather than pretending
to execute.

## What the agent will and will not do

**Will:**
- run only the programs on its allowlist (`npm`, `git`, `node`, `python`,
  `java`, `go`, `cargo`, `make`, and the usual test/build tools)
- spawn them with an argv array and `shell: false`, so `;`, `|`, `&&` and
  backticks have no interpreter to act on
- write files only beneath `NEXUS_WORKSPACE_ROOT`, refusing any path that
  resolves outside it
- print every command and every byte of output to its own terminal

**Will not:**
- run a program that is not on the allowlist, even if the server asks
- follow `..` in any path
- keep running after you revoke the device in the IDE
- start on its own, or run in the background after you close it

The allowlist in `nexus-agent.mjs` mirrors `config/ide.ts`. The agent's copy is
the one that actually protects you: it is re-checked immediately before spawn,
so a compromised or impersonated server still cannot execute an arbitrary
binary on your machine.

## Revoking access

In the IDE, open the Terminal panel → *Agent devices* → **Revoke**. The next
poll fails, and the agent stops itself. Revocation is immediate and
server-side; no need to reach the machine running the agent.

## Troubleshooting

**"NEXUS_AGENT_TOKEN is not set"** — pair a device first.

**"This agent device token is not valid or has been revoked"** — the token was
revoked, or you copied it incompletely. Pair again.

**"Is npm installed and on this machine's PATH?"** — the agent found no such
program. It does not install toolchains for you.

**Run stays "queued" forever** — no agent is polling. Check this process is
still running and pointed at the right `NEXUS_SERVER_URL`.
