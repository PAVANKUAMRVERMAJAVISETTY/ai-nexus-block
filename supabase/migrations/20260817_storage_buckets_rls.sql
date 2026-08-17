-- ============================================================
-- STORAGE BUCKETS: portfolio-media & portfolio-documents
-- ============================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('portfolio-media', 'portfolio-media', TRUE)
ON CONFLICT (id) DO UPDATE SET public = TRUE;

INSERT INTO storage.buckets (id, name, public)
VALUES ('portfolio-documents', 'portfolio-documents', TRUE)
ON CONFLICT (id) DO UPDATE SET public = TRUE;

INSERT INTO storage.buckets (id, name, public)
VALUES ('public-downloads', 'public-downloads', TRUE)
ON CONFLICT (id) DO UPDATE SET public = TRUE;

-- ============================================================
-- RLS POLICIES FOR STORAGE OBJECTS
-- ============================================================

-- 1. PUBLIC READ POLICIES
DROP POLICY IF EXISTS "public_read_portfolio_media" ON storage.objects;
CREATE POLICY "public_read_portfolio_media"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id IN ('portfolio-media', 'portfolio-documents', 'public-downloads'));

-- 2. AUTHENTICATED SUPER ADMIN WRITE POLICIES (INSERT)
DROP POLICY IF EXISTS "super_admin_insert_portfolio_media" ON storage.objects;
CREATE POLICY "super_admin_insert_portfolio_media"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id IN ('portfolio-media', 'portfolio-documents', 'public-downloads')
    AND public.is_super_admin()
);

-- 3. AUTHENTICATED SUPER ADMIN WRITE POLICIES (UPDATE)
DROP POLICY IF EXISTS "super_admin_update_portfolio_media" ON storage.objects;
CREATE POLICY "super_admin_update_portfolio_media"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
    bucket_id IN ('portfolio-media', 'portfolio-documents', 'public-downloads')
    AND public.is_super_admin()
)
WITH CHECK (
    bucket_id IN ('portfolio-media', 'portfolio-documents', 'public-downloads')
    AND public.is_super_admin()
);

-- 4. AUTHENTICATED SUPER ADMIN WRITE POLICIES (DELETE)
DROP POLICY IF EXISTS "super_admin_delete_portfolio_media" ON storage.objects;
CREATE POLICY "super_admin_delete_portfolio_media"
ON storage.objects
FOR DELETE
TO authenticated
USING (
    bucket_id IN ('portfolio-media', 'portfolio-documents', 'public-downloads')
    AND public.is_super_admin()
);
