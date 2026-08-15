import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseAdminClient, isServiceRoleConfigured } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const supabaseServer = await createSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabaseServer.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthenticated request.' },
        { status: 401 }
      );
    }

    // Check super_admin authorization
    const { data: profile } = await supabaseServer
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'super_admin') {
      return NextResponse.json(
        { error: 'Forbidden: Super Admin access required for file upload.' },
        { status: 403 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const requestedBucket = formData.get('bucket') as string | null;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided.' },
        { status: 400 }
      );
    }

    const filename = file.name || 'uploaded_file';
    const mimeType = file.type || '';
    const ext = filename.split('.').pop()?.toLowerCase() || '';

    // Determine target bucket
    let bucketName = requestedBucket;
    if (!bucketName) {
      if (
        ['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg'].includes(ext) ||
        mimeType.startsWith('image/')
      ) {
        bucketName = 'portfolio-media';
      } else {
        bucketName = 'public-downloads';
      }
    }

    // Use admin client if configured to bypass potential RLS storage policies
    const storageClient = isServiceRoleConfigured()
      ? createSupabaseAdminClient()
      : supabaseServer;

    // Ensure bucket exists
    try {
      await storageClient.storage.createBucket(bucketName, { public: true });
    } catch {
      // Bucket may already exist
    }

    const cleanFileName = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    const filePath = `uploads/${Date.now()}_${cleanFileName}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { error: uploadError } = await storageClient.storage
      .from(bucketName)
      .upload(filePath, buffer, {
        contentType: mimeType || 'application/octet-stream',
        upsert: true,
      });

    if (uploadError) {
      return NextResponse.json(
        { error: `Storage upload failed: ${uploadError.message}` },
        { status: 500 }
      );
    }

    const { data: publicUrlData } = storageClient.storage
      .from(bucketName)
      .getPublicUrl(filePath);

    return NextResponse.json({
      success: true,
      url: publicUrlData.publicUrl,
      bucket: bucketName,
      path: filePath,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal server error.' },
      { status: 500 }
    );
  }
}
