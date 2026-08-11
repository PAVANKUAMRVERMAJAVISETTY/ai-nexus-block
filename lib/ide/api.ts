/**
 * Shared server-side helpers for the Nexus IDE API routes.
 *
 * Two invariants every IDE route depends on:
 *   1. The acting user comes from the Supabase session, never from the request
 *      body or a query parameter.
 *   2. A project is only reachable after `requireProject` confirms the session
 *      user owns it. RLS enforces this a second time at the database level.
 */

import { NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { RATE_LIMITS, hit, rateLimitHeaders } from '@/lib/security/rate-limit';
import type { IdeProject } from '@/types/ide';
import { InvalidPathError } from './paths';

export interface AuthedContext {
  supabase: SupabaseClient;
  userId: string;
}

export class ApiError extends Error {
  status: number;
  headers?: Record<string, string>;

  constructor(status: number, message: string, headers?: Record<string, string>) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.headers = headers;
  }
}

/**
 * Apply a rate limit for the acting user and throw a 429 when exceeded.
 * Keyed by user id, so one account cannot exhaust the budget for everyone.
 */
export function enforceRateLimit(userId: string, bucket: keyof typeof RATE_LIMITS): void {
  const result = hit(`${bucket}:${userId}`, RATE_LIMITS[bucket]);

  if (!result.allowed) {
    throw new ApiError(
      429,
      `Too many requests. Try again in ${result.retryAfterSeconds}s.`,
      rateLimitHeaders(result)
    );
  }
}

/** Resolve the session user, or throw a 401. */
export async function requireUser(): Promise<AuthedContext> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new ApiError(401, 'You must be signed in to use the Nexus IDE.');
  }

  return { supabase, userId: user.id };
}

/** Load a project the session user owns, or throw 404. */
export async function requireProject(
  ctx: AuthedContext,
  projectId: string
): Promise<IdeProject> {
  if (!isUuid(projectId)) {
    throw new ApiError(400, 'Invalid project id.');
  }

  const { data, error } = await ctx.supabase
    .from('ide_projects')
    .select('*')
    .eq('id', projectId)
    .eq('user_id', ctx.userId)
    .maybeSingle();

  if (error) {
    throw new ApiError(500, describeDbError(error));
  }
  // Deliberately 404 rather than 403: a user should not be able to probe
  // whether another user's project id exists.
  if (!data) {
    throw new ApiError(404, 'Project not found.');
  }

  return data as IdeProject;
}

export function isUuid(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
  );
}

/**
 * Turn a Supabase/Postgres error into a message that is useful without
 * leaking schema internals to the browser.
 */
export function describeDbError(error: { code?: string; message?: string }): string {
  if (error.code === '42P01' || error.code === 'PGRST205') {
    return (
      'The Nexus IDE tables are not present in your Supabase project. ' +
      'Run database/migrations/20260811000000_nexus_ide_v2.sql in the Supabase SQL editor.'
    );
  }
  if (error.code === '23505') {
    return 'That path already exists in this project.';
  }
  if (error.code === '42501') {
    return 'Row level security rejected this operation.';
  }
  return error.message || 'Database error.';
}

/** Convert any thrown value into a JSON response with a sensible status. */
export function toErrorResponse(error: unknown): NextResponse {
  if (error instanceof ApiError) {
    return NextResponse.json(
      { error: error.message },
      { status: error.status, headers: error.headers }
    );
  }
  if (error instanceof InvalidPathError) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const message = error instanceof Error ? error.message : 'Unexpected server error.';
  // Log the full error server-side; return only the message to the client.
  console.error('[ide-api]', error);
  return NextResponse.json({ error: message }, { status: 500 });
}

/** Parse a JSON body, rejecting anything that is not an object. */
export async function readJsonBody(request: Request): Promise<Record<string, unknown>> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw new ApiError(400, 'Request body must be valid JSON.');
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new ApiError(400, 'Request body must be a JSON object.');
  }
  return body as Record<string, unknown>;
}

/** Require a non-empty string field. */
export function requireString(
  body: Record<string, unknown>,
  field: string,
  maxLength = 500
): string {
  const value = body[field];
  if (typeof value !== 'string' || !value.trim()) {
    throw new ApiError(400, `"${field}" is required.`);
  }
  if (value.length > maxLength) {
    throw new ApiError(400, `"${field}" exceeds ${maxLength} characters.`);
  }
  return value.trim();
}

/** Optional string field, normalized to `null` when absent or blank. */
export function optionalString(
  body: Record<string, unknown>,
  field: string,
  maxLength = 2000
): string | null {
  const value = body[field];
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string') {
    throw new ApiError(400, `"${field}" must be a string.`);
  }
  if (value.length > maxLength) {
    throw new ApiError(400, `"${field}" exceeds ${maxLength} characters.`);
  }
  return value.trim() || null;
}

/** URL-safe slug derived from a display name. */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'project';
}

/** SHA-256 hex digest using the Web Crypto API available in Next runtimes. */
export async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

/** Byte length of a string, matching what the agent will write to disk. */
export function byteLength(input: string): number {
  return new TextEncoder().encode(input).length;
}
