import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import type { MediaAsset } from '@/types/extended';

const DEFAULT_BUCKET = 'nexus-user-attachments';

export const MAX_MEDIA_SIZE = 10 * 1024 * 1024;

export const ALLOWED_MEDIA_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
  'application/pdf',
  'text/plain',
  'text/markdown',
  'application/json',
  'audio/webm',
  'audio/wav',
  'audio/mpeg',
  'audio/mp3',
  'audio/m4a',
]);

function sanitizeFilename(name: string): string {
  const base = name.trim().replace(/[^a-zA-Z0-9._-]+/g, '_');
  return base || 'attachment';
}

export function validateMediaFile(file: File): void {
  if (!file) {
    throw new Error('File is required.');
  }

  if (file.size <= 0) {
    throw new Error('File is empty.');
  }

  if (file.size > MAX_MEDIA_SIZE) {
    throw new Error('File exceeds the 10 MB limit.');
  }

  if (!ALLOWED_MEDIA_TYPES.has(file.type)) {
    throw new Error(`Unsupported file type: ${file.type || 'unknown'}`);
  }
}

export async function uploadMedia(
  file: File,
  userId: string,
  conversationId: string,
  bucket = DEFAULT_BUCKET,
): Promise<MediaAsset> {
  validateMediaFile(file);

  if (!userId) {
    throw new Error('User ID is required.');
  }

  if (!conversationId) {
    throw new Error('Conversation ID is required.');
  }

  const supabase = createSupabaseAdminClient();
  const filename = sanitizeFilename(file.name);
  const path = `${userId}/${conversationId}/${Date.now()}_${filename}`;

  const buffer = Buffer.from(await file.arrayBuffer());

  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, buffer, {
      contentType: file.type,
      upsert: false,
    });

  if (error) {
    throw new Error(`Media upload failed: ${error.message}`);
  }

  const now = new Date().toISOString();

  return {
    id: path,
    user_id: userId,
    file_name: file.name,
    file_path: path,
    file_size: file.size,
    mime_type: file.type,
    bucket,
    alt_text: null,
    featured: false,
    published: false,
    display_order: 0,
    created_at: now,
    updated_at: now,
  };
}

export async function listMedia(): Promise<MediaAsset[]> {
  return [];
}

