/**
 * Parsing and validation of AI change proposals.
 *
 * Everything a model emits is untrusted input. A proposal is parsed, every path
 * is re-validated through `normalizeProjectPath`, and the result is stored as a
 * `pending` row. Nothing touches the project until the user approves it.
 */

import { InvalidPathError, normalizeProjectPath } from './paths';
import { detectLanguage, isBinaryPath } from './languages';
import { validateCommand, UnsafeCommandError } from './agent-protocol';
import type {
  IdeActionRisk,
  IdeFileOperation,
  IdeFileOperationType,
  IdeProposedChange,
} from '@/types/ide';

/** Ceilings that bound a single proposal. */
const MAX_OPERATIONS = 25;
const MAX_CONTENT_BYTES = 512 * 1024;

export interface ParsedProposal {
  title: string;
  summary: string;
  risk: IdeActionRisk;
  change: IdeProposedChange;
  /** The response with the machine-readable block removed, for display. */
  displayContent: string;
  /** Non-fatal problems worth showing next to the diff. */
  warnings: string[];
}

export class ProposalParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ProposalParseError';
  }
}

/** Extract the fenced `nexus-action` block, if the response contains one. */
export function extractActionBlock(response: string): { json: string; stripped: string } | null {
  const pattern = /```nexus-action\s*\n([\s\S]*?)```/;
  const match = pattern.exec(response);
  if (!match) return null;

  return {
    json: match[1].trim(),
    stripped: response.replace(pattern, '').trimEnd(),
  };
}

const VALID_OPERATION_TYPES: IdeFileOperationType[] = ['create', 'update', 'delete', 'rename'];

function riskOf(value: unknown, operations: IdeFileOperation[]): IdeActionRisk {
  if (value === 'high' || value === 'medium' || value === 'low') {
    // A model may under-rate a destructive change; the floor below still applies.
    if (value !== 'high' && operations.some((op) => op.type === 'delete')) return 'high';
    return value;
  }

  // Infer when the model omitted or mis-typed it.
  if (operations.some((op) => op.type === 'delete')) return 'high';
  if (
    operations.some((op) =>
      ['package.json', 'tsconfig.json', 'next.config.js', 'middleware.ts'].includes(op.path)
    )
  ) {
    return 'high';
  }
  return operations.length > 3 ? 'medium' : 'low';
}

/**
 * Parse and validate a proposal out of an assistant response.
 * Returns `null` when the response contains no proposal (a read-only answer).
 */
export function parseProposal(response: string): ParsedProposal | null {
  const block = extractActionBlock(response);
  if (!block) return null;

  let raw: unknown;
  try {
    raw = JSON.parse(block.json);
  } catch {
    throw new ProposalParseError(
      'The assistant returned a change proposal that is not valid JSON. Nothing was changed.'
    );
  }

  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new ProposalParseError('The change proposal must be a JSON object.');
  }

  const payload = raw as Record<string, unknown>;
  const rawOperations = payload.operations;

  if (!Array.isArray(rawOperations) || rawOperations.length === 0) {
    throw new ProposalParseError('The change proposal contains no file operations.');
  }
  if (rawOperations.length > MAX_OPERATIONS) {
    throw new ProposalParseError(
      `The change proposal touches ${rawOperations.length} files, above the limit of ${MAX_OPERATIONS}.`
    );
  }

  const warnings: string[] = [];
  const operations: IdeFileOperation[] = [];
  const seenPaths = new Set<string>();

  // Indexed loop rather than `.entries()`: this project targets ES5, where
  // iterating an IterableIterator requires downlevelIteration.
  for (let index = 0; index < rawOperations.length; index += 1) {
    const entry = rawOperations[index];

    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      throw new ProposalParseError(`Operation ${index + 1} is not an object.`);
    }

    const op = entry as Record<string, unknown>;
    const type = op.type as IdeFileOperationType;

    if (!VALID_OPERATION_TYPES.includes(type)) {
      throw new ProposalParseError(
        `Operation ${index + 1} has an unsupported type "${String(op.type)}".`
      );
    }

    let path: string;
    try {
      path = normalizeProjectPath(op.path);
    } catch (error) {
      const detail = error instanceof InvalidPathError ? error.message : 'invalid path';
      throw new ProposalParseError(`Operation ${index + 1} has an unsafe path: ${detail}`);
    }

    if (seenPaths.has(path)) {
      throw new ProposalParseError(`The proposal modifies "${path}" more than once.`);
    }
    seenPaths.add(path);

    if (isBinaryPath(path)) {
      throw new ProposalParseError(`The assistant cannot write binary files ("${path}").`);
    }

    const operation: IdeFileOperation = { type, path, language: detectLanguage(path) };

    if (type === 'create' || type === 'update') {
      if (typeof op.content !== 'string') {
        throw new ProposalParseError(
          `Operation ${index + 1} (${type} ${path}) is missing file content.`
        );
      }
      if (new TextEncoder().encode(op.content).length > MAX_CONTENT_BYTES) {
        throw new ProposalParseError(`"${path}" exceeds the ${MAX_CONTENT_BYTES / 1024}KB limit.`);
      }

      // A model that emits a placeholder instead of the full file would
      // silently destroy the rest of it on apply.
      if (/^\s*(\/\/|#|\/\*)?\s*\.\.\.\s*(rest of|remaining|unchanged)/im.test(op.content)) {
        throw new ProposalParseError(
          `The proposed content for "${path}" contains an ellipsis placeholder instead of the ` +
            'complete file. Applying it would delete the rest of the file, so it was rejected.'
        );
      }

      operation.content = op.content;
    }

    if (type === 'rename') {
      try {
        operation.newPath = normalizeProjectPath(op.newPath);
      } catch (error) {
        const detail = error instanceof InvalidPathError ? error.message : 'invalid path';
        throw new ProposalParseError(`Operation ${index + 1} has an unsafe destination: ${detail}`);
      }
    }

    operations.push(operation);
  }

  // The validation command runs through the same allowlist as any other run.
  let validationCommand: string | null = null;
  if (typeof payload.validationCommand === 'string' && payload.validationCommand.trim()) {
    try {
      validationCommand = validateCommand(payload.validationCommand).command;
    } catch (error) {
      warnings.push(
        `The suggested validation command was dropped: ${
          error instanceof UnsafeCommandError ? error.message : 'not allowed'
        }`
      );
    }
  }

  const title =
    typeof payload.title === 'string' && payload.title.trim()
      ? payload.title.trim().slice(0, 120)
      : 'AI change proposal';

  const summary =
    typeof payload.summary === 'string' ? payload.summary.trim().slice(0, 2000) : '';

  return {
    title,
    summary,
    risk: riskOf(payload.risk, operations),
    change: {
      operations,
      validationCommand,
      notes: typeof payload.notes === 'string' ? payload.notes.slice(0, 2000) : null,
    },
    displayContent: block.stripped,
    warnings,
  };
}

/** One-line description of an operation, for the review UI and the audit log. */
export function describeOperation(operation: IdeFileOperation): string {
  switch (operation.type) {
    case 'create':
      return `Create ${operation.path}`;
    case 'update':
      return `Modify ${operation.path}`;
    case 'delete':
      return `Delete ${operation.path}`;
    case 'rename':
      return `Rename ${operation.path} → ${operation.newPath}`;
    default:
      return operation.path;
  }
}

/** Human-readable risk explanation shown above the approve/reject buttons. */
export function describeRisk(risk: IdeActionRisk, operations: IdeFileOperation[]): string {
  const deletions = operations.filter((op) => op.type === 'delete').length;

  if (risk === 'high') {
    if (deletions) {
      return `This change deletes ${deletions} file${deletions === 1 ? '' : 's'}. Deleted files cannot be recovered from the IDE.`;
    }
    return 'This change touches configuration or security-sensitive files. Review it carefully.';
  }
  if (risk === 'medium') {
    return `This change modifies ${operations.length} files.`;
  }
  return 'This is a contained change.';
}
