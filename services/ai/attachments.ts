import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import type { AIAttachment } from '@/types/ai';

export interface ResolvedAttachment {
  attachment: AIAttachment;
  base64?: string;
}

export async function resolveAttachmentContent(
  attachments: AIAttachment[] = [],
): Promise<ResolvedAttachment[]> {
  if (!attachments.length) return [];

  const supabase = createSupabaseAdminClient();
  const resolved: ResolvedAttachment[] = [];

  for (const attachment of attachments.slice(0, 5)) {
    const base: ResolvedAttachment = { attachment };

    if (!attachment.bucket || !attachment.file_path) {
      resolved.push(base);
      continue;
    }

    if (attachment.bucket !== 'nexus-user-attachments') {
      resolved.push(base);
      continue;
    }

    const { data, error } = await supabase.storage
      .from(attachment.bucket)
      .download(attachment.file_path);

    if (error || !data) {
      console.warn(
        '[ai-attachments] unable to download attachment',
        attachment.file_path,
        error?.message,
      );
      resolved.push(base);
      continue;
    }

    const bytes = Buffer.from(await data.arrayBuffer());

    base.base64 = bytes.toString('base64');
    resolved.push(base);
  }

  return resolved;
}

export function attachmentReferenceText(
  attachments: AIAttachment[] = [],
): string {
  if (!attachments.length) return '';

  return attachments
    .map(
      (item) =>
        `[Attached ${item.type}: ${item.name} (${item.mime_type})]`,
    )
    .join('\n');
}
