-- ============================================================
-- PHASE 10 — USER ATTACHMENTS
-- ============================================================

INSERT INTO storage.buckets (id, name, public)
VALUES (
    'nexus-user-attachments',
    'nexus-user-attachments',
    FALSE
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "user_attachments_owner_access"
ON storage.objects;

CREATE POLICY "user_attachments_owner_access"
ON storage.objects
FOR ALL
TO authenticated
USING (
    bucket_id = 'nexus-user-attachments'
    AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
    bucket_id = 'nexus-user-attachments'
    AND (storage.foldername(name))[1] = auth.uid()::text
);
