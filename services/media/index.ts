import type { MediaAsset } from '@/types/extended';

// TODO: Connect to Supabase Storage in a later stage.

export async function uploadMedia(_file: File, _bucket: string): Promise<MediaAsset | null> {
  throw new Error('Media upload is not yet implemented.');
}

export async function listMedia(): Promise<MediaAsset[]> {
  return [];
}
