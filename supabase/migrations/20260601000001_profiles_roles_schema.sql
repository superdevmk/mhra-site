-- MHRA platform refresh: profiles, roles, schema extensions

DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('user', 'admin', 'super_admin');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text,
  role public.app_role NOT NULL DEFAULT 'user',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role = 'super_admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('admin', 'super_admin')
  );
$$;

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    'user'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

INSERT INTO public.profiles (id, display_name, role)
SELECT u.id, split_part(u.email, '@', 1),
  CASE
    WHEN u.email = 'alimiatdhe9@gmail.com' THEN 'super_admin'::public.app_role
    WHEN u.email IN ('superdev.mk@gmail.com', 'mickoski.darko@yahoo.com', 'contact@mhra.mk') THEN 'admin'::public.app_role
    ELSE 'user'::public.app_role
  END
FROM auth.users u
ON CONFLICT (id) DO UPDATE SET role = EXCLUDED.role, updated_at = now();

ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS language text NOT NULL DEFAULT 'mk';
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS published boolean NOT NULL DEFAULT true;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS excerpt text;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS slug text;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS published_at timestamptz;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS body_format text NOT NULL DEFAULT 'plain';

UPDATE public.posts SET published_at = created_at WHERE published_at IS NULL;
UPDATE public.posts SET slug = lower(regexp_replace(regexp_replace(coalesce(title,'post'), '[^a-zA-Z0-9]+', '-', 'g'), '(^-|-$)', '', 'g')) WHERE slug IS NULL;

DO $$ BEGIN
  ALTER TABLE public.posts ADD CONSTRAINT posts_language_check CHECK (language IN ('mk', 'en'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.posts ADD CONSTRAINT posts_body_format_check CHECK (body_format IN ('plain', 'html', 'markdown'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE public.informative_posts ADD COLUMN IF NOT EXISTS body_format text NOT NULL DEFAULT 'plain';
ALTER TABLE public.hr_events ADD COLUMN IF NOT EXISTS body_format text NOT NULL DEFAULT 'plain';
ALTER TABLE public.yearly_conferences ADD COLUMN IF NOT EXISTS body_format text NOT NULL DEFAULT 'plain';

DROP TRIGGER IF EXISTS posts_set_updated_at ON public.posts;
CREATE TRIGGER posts_set_updated_at BEFORE UPDATE ON public.posts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_posts_author_id ON public.posts(author_id);
CREATE INDEX IF NOT EXISTS idx_posts_lang_pub ON public.posts(language, published, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_posts_slug_lang ON public.posts(language, slug);
CREATE INDEX IF NOT EXISTS idx_informative_posts_author_id ON public.informative_posts(author_id);
CREATE INDEX IF NOT EXISTS idx_hr_events_author_id ON public.hr_events(author_id);
CREATE INDEX IF NOT EXISTS idx_yearly_conferences_author_id ON public.yearly_conferences(author_id);
CREATE INDEX IF NOT EXISTS idx_informative_posts_lang_pub ON public.informative_posts(language, published);
CREATE INDEX IF NOT EXISTS idx_hr_events_lang_pub ON public.hr_events(language, published);
CREATE INDEX IF NOT EXISTS idx_yearly_conferences_lang_pub ON public.yearly_conferences(language, published);

DROP POLICY IF EXISTS "profiles_select_own_or_admin" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_admin" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update profiles" ON public.profiles;

CREATE POLICY "profiles_select_own_or_admin" ON public.profiles FOR SELECT TO authenticated
  USING (id = (SELECT auth.uid()) OR public.is_admin());

CREATE POLICY "profiles_update_super_admin" ON public.profiles FOR UPDATE TO authenticated
  USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (id = (SELECT auth.uid()));

INSERT INTO storage.buckets (id, name, public)
VALUES ('content-media', 'content-media', true)
ON CONFLICT (id) DO NOTHING;
