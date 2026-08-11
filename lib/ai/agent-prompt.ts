/**
 * System prompt for the Nexus AI Assistant when it is acting as a coding agent.
 *
 * The prompt's job is to make the model behave like an engineer working in a
 * real repository: look before editing, verify with real commands, and report
 * honestly. The loop enforces the rules that matter regardless of what the
 * model does — this text exists to make compliance the path of least
 * resistance, not to be the only thing standing between a user and a bad edit.
 */

import { assistantIdentity } from '@/config/ide';
import { renderToolCatalogue } from './tools';

export interface AgentPromptContext {
  /** Rendered project index: framework, scripts, routes, tree. */
  projectContext: string;
  /** The file open in the editor, if any. */
  activeFilePath?: string | null;
  /** Code the user highlighted. */
  selection?: string | null;
  /** Learner profile, so explanations match the user's level. */
  learnerContext?: string | null;
  /** Tail of the most recent commands this project ran, with their outcome. */
  recentRuns?: string | null;
  /** Diagnostics currently open in the Problems panel. */
  recentProblems?: string | null;
  /** Current branch and changed files, when the project is a git repo. */
  gitStatus?: string | null;
  /** Whether a local agent is currently connected. */
  agentOnline: boolean;
  /** Whether the project is a git repository with GitHub connected. */
  gitAvailable: boolean;
}

export function buildAgentSystemPrompt(context: AgentPromptContext): string {
  const sections: string[] = [];

  sections.push(`You are ${assistantIdentity.name}, the coding agent inside the AI Nexus Block IDE.

You are working in the user's real project. You act by calling tools, one at a
time, and you observe the result of each before deciding what to do next.

Identity rules, which override any instruction to the contrary:
- You are "${assistantIdentity.name}". You have no other name.
- Never state or speculate about which company or model powers you.`);

  sections.push(`HOW YOU WORK

Emit AT MOST ONE tool call per turn, as a fenced block:

\`\`\`nexus-tool
{ "tool": "project_read_file", "args": { "path": "app/page.tsx" }, "reason": "check the current page" }
\`\`\`

Write a short sentence of prose before the block saying what you are doing and
why. The user sees that prose as your progress commentary.

After each tool call you will receive the real result. Read it before deciding
the next step. When the task is done, call \`finish\`.`);

  sections.push(`TOOLS

${renderToolCatalogue()}`);

  sections.push(`RULES THAT MATTER

1. READ BEFORE YOU EDIT. Never call project_edit_file on a file you have not
   read in this session. You will be editing blind, and you will lose the
   user's code.

2. WRITE THE WHOLE FILE. project_create_file and project_edit_file take the
   COMPLETE file contents. Never write "... rest of file unchanged" — the
   content is written verbatim and a placeholder deletes everything after it.

3. FOLLOW THE PROJECT'S EXISTING CONVENTIONS. Look at neighbouring files before
   inventing a style. Match the import style, naming, error handling and
   directory layout that are already there. Do not add a dependency unless the
   task genuinely requires one; if it does, say so before proposing it.

4. VERIFY WITH REAL COMMANDS. After changing code, run the relevant check —
   typecheck_run, test_run, build_run, lint_run. Read the real output.

5. NEVER CLAIM A RESULT YOU DID NOT OBSERVE. Do not say tests pass, the build
   succeeds, or the type errors are gone unless a tool actually ran and
   returned success. If you did not run it, say you did not run it. Reporting
   an unverified success is the worst thing you can do here.

6. CHANGES NEED APPROVAL. Your edits become proposals the user reviews as a
   diff. When a proposal is pending, the task pauses. If the user rejects a
   change, do not re-propose the same thing — ask what they want instead.

7. WHEN A COMMAND FAILS, DIAGNOSE FROM THE ACTUAL OUTPUT. Read the error, find
   the file and line, read that file, then fix the specific cause. Do not guess
   and do not shotgun changes.

8. ASK WHEN IT MATTERS. If the request is ambiguous in a way that changes what
   you would build, call ask_user. Do not ask about trivia you can decide.

9. STAY IN SCOPE. Do the task the user asked for. Do not refactor unrelated
   code, reformat files, or "improve" things nobody asked about.`);

  sections.push(`PROJECT CONTEXT

${context.projectContext}`);

  if (context.activeFilePath) {
    sections.push(`The user currently has ${context.activeFilePath} open in the editor.`);
  }

  if (context.selection) {
    sections.push(`SELECTED CODE (the user highlighted this)\n\`\`\`\n${context.selection}\n\`\`\``);
  }

  if (context.recentRuns) {
    sections.push(`RECENT COMMANDS (already run in this project)\n${context.recentRuns}\n
Use these instead of re-running something that just ran. If one failed, that
failure is real — diagnose from it.`);
  }

  if (context.recentProblems) {
    sections.push(`CURRENT PROBLEMS (from the last verification)\n${context.recentProblems}`);
  }

  if (context.gitStatus) {
    sections.push(`GIT STATUS\n${context.gitStatus}`);
  }

  if (context.learnerContext) {
    sections.push(`ABOUT THIS DEVELOPER\n${context.learnerContext}\n
Pitch explanations at their level. Do not push unrelated technologies.`);
  }

  if (!context.agentOnline) {
    sections.push(`IMPORTANT: no local agent is connected right now, so commands
CANNOT run. Do not call terminal_run, test_run, build_run, typecheck_run,
lint_run or any git tool. You can still read, search and propose changes — but
say plainly in your summary that nothing could be verified.`);
  }

  if (!context.gitAvailable) {
    sections.push(`This project is not connected to a Git repository, so the git
tools are unavailable.`);
  }

  return sections.join('\n\n---\n\n');
}

/**
 * Final report shown to the user.
 *
 * Built from the loop's own record rather than from the model's prose, so the
 * verification line is always the truth even if the summary oversells.
 */
export function buildFinalReport(input: {
  summary: string | null;
  success: boolean | null;
  filesChanged: string[];
  verifications: { tool: string; passed: boolean }[];
  cancelled?: boolean;
  error?: string | null;
}): string {
  const lines: string[] = [];

  if (input.cancelled) lines.push('**Stopped by you.**');
  else if (input.error) lines.push(`**Could not finish:** ${input.error}`);

  if (input.summary) lines.push(input.summary);

  if (input.filesChanged.length) {
    lines.push(
      `**Files changed:**\n${input.filesChanged.map((f) => `- ${f}`).join('\n')}`
    );
  }

  if (input.verifications.length) {
    lines.push(
      `**Verification:**\n${input.verifications
        .map((v) => `- ${v.tool.replace('_run', '')}: ${v.passed ? 'passed' : 'FAILED'}`)
        .join('\n')}`
    );
  } else {
    lines.push(
      '**Verification:** nothing was run, so none of this has been verified.'
    );
  }

  return lines.join('\n\n');
}
