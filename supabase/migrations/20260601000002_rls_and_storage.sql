-- RLS overhaul: public blog + admin CMS + storage

-- Drop all existing public table policies
DO $$ DECLARE r record;
BEGIN
  FOR r IN SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, r.tablename);
  END LOOP;
END $$;

-- POSTS: community blog
CREATE POLICY "posts_public_read_published" ON public.posts FOR SELECT TO anon, authenticated
  USING (
    published = true
    OR author_id = (SELECT auth.uid())
    OR public.is_admin()
  );

CREATE POLICY "posts_auth_insert_own" ON public.posts FOR INSERT TO authenticated
  WITH CHECK (author_id = (SELECT auth.uid()));

CREATE POLICY "posts_author_update_own" ON public.posts FOR UPDATE TO authenticated
  USING (author_id = (SELECT auth.uid()) OR public.is_admin())
  WITH CHECK (author_id = (SELECT auth.uid()) OR public.is_admin());

CREATE POLICY "posts_author_delete_own" ON public.posts FOR DELETE TO authenticated
  USING (author_id = (SELECT auth.uid()) OR public.is_admin());

-- CMS tables: admin only write, public read published
CREATE POLICY "informative_public_read" ON public.informative_posts FOR SELECT TO anon, authenticated
  USING (published = true OR public.is_admin());

CREATE POLICY "informative_admin_insert" ON public.informative_posts FOR INSERT TO authenticated
  WITH CHECK (public.is_admin() AND author_id = (SELECT auth.uid()));

CREATE POLICY "informative_admin_update" ON public.informative_posts FOR UPDATE TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "informative_admin_delete" ON public.informative_posts FOR DELETE TO authenticated
  USING (public.is_admin());

CREATE POLICY "hr_events_public_read" ON public.hr_events FOR SELECT TO anon, authenticated
  USING (published = true OR public.is_admin());

CREATE POLICY "hr_events_admin_insert" ON public.hr_events FOR INSERT TO authenticated
  WITH CHECK (public.is_admin() AND author_id = (SELECT auth.uid()));

CREATE POLICY "hr_events_admin_update" ON public.hr_events FOR UPDATE TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "hr_events_admin_delete" ON public.hr_events FOR DELETE TO authenticated
  USING (public.is_admin());

CREATE POLICY "conferences_public_read" ON public.yearly_conferences FOR SELECT TO anon, authenticated
  USING (published = true OR public.is_admin());

CREATE POLICY "conferences_admin_insert" ON public.yearly_conferences FOR INSERT TO authenticated
  WITH CHECK (public.is_admin() AND author_id = (SELECT auth.uid()));

CREATE POLICY "conferences_admin_update" ON public.yearly_conferences FOR UPDATE TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "conferences_admin_delete" ON public.yearly_conferences FOR DELETE TO authenticated
  USING (public.is_admin());

-- Storage: drop old object policies for our buckets
DO $$ DECLARE r record;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', r.policyname);
  END LOOP;
END $$;

-- Public read via direct URL (no listing needed for anon if we use getPublicUrl)
CREATE POLICY "storage_public_read_blog" ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id IN ('blog-images', 'content-media', 'informative-assets', 'events-assets', 'conferences-assets'));

CREATE POLICY "storage_auth_upload_blog_own" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'blog-images'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  );

CREATE POLICY "storage_auth_upload_content_media" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'content-media'
    AND (
      (storage.foldername(name))[1] = (SELECT auth.uid())::text
      OR public.is_admin()
    )
  );

CREATE POLICY "storage_admin_upload_informative" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'informative-assets' AND public.is_admin());

CREATE POLICY "storage_admin_upload_events" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'events-assets' AND public.is_admin());

CREATE POLICY "storage_admin_upload_conferences" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'conferences-assets' AND public.is_admin());

CREATE POLICY "storage_delete_own_or_admin" ON storage.objects FOR DELETE TO authenticated
  USING (
    public.is_admin()
    OR (storage.foldername(name))[1] = (SELECT auth.uid())::text
  );

UPDATE storage.buckets
SET allowed_mime_types = ARRAY['image/jpeg','image/png','image/webp','image/gif','image/svg+xml']
WHERE id IN ('blog-images','content-media','informative-assets','events-assets','conferences-assets');
