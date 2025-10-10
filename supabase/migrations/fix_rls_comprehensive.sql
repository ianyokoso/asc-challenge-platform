-- Comprehensive RLS fix for all tables
-- This ensures proper access control for users and admins

-- ============================================
-- TRACKS TABLE - Allow everyone to read tracks
-- ============================================

DROP POLICY IF EXISTS "Anyone can view tracks" ON public.tracks;

CREATE POLICY "Anyone can view tracks"
  ON public.tracks
  FOR SELECT
  USING (true);

-- ============================================
-- USER_TRACKS TABLE
-- ============================================

-- Drop all existing policies
DROP POLICY IF EXISTS "Users can insert own tracks" ON public.user_tracks;
DROP POLICY IF EXISTS "Users can view own tracks" ON public.user_tracks;
DROP POLICY IF EXISTS "Users can update own tracks" ON public.user_tracks;
DROP POLICY IF EXISTS "Admins can view all tracks" ON public.user_tracks;
DROP POLICY IF EXISTS "Admins can insert any tracks" ON public.user_tracks;
DROP POLICY IF EXISTS "Admins can update any tracks" ON public.user_tracks;

-- User policies
CREATE POLICY "Users can insert own tracks"
  ON public.user_tracks
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own tracks"
  ON public.user_tracks
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own tracks"
  ON public.user_tracks
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Admin policies
CREATE POLICY "Admins can view all user tracks"
  ON public.user_tracks
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE admin_users.user_id = auth.uid()
        AND admin_users.is_active = true
    )
  );

CREATE POLICY "Admins can insert any user tracks"
  ON public.user_tracks
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE admin_users.user_id = auth.uid()
        AND admin_users.is_active = true
    )
  );

CREATE POLICY "Admins can update any user tracks"
  ON public.user_tracks
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE admin_users.user_id = auth.uid()
        AND admin_users.is_active = true
    )
  );

-- ============================================
-- CERTIFICATIONS TABLE
-- ============================================

-- Drop all existing policies
DROP POLICY IF EXISTS "Users can insert own certifications" ON public.certifications;
DROP POLICY IF EXISTS "Users can view own certifications" ON public.certifications;
DROP POLICY IF EXISTS "Users can update own certifications" ON public.certifications;
DROP POLICY IF EXISTS "Admins can view all certifications" ON public.certifications;
DROP POLICY IF EXISTS "Admins can insert any certifications" ON public.certifications;
DROP POLICY IF EXISTS "Admins can update any certifications" ON public.certifications;
DROP POLICY IF EXISTS "Admins can delete certifications" ON public.certifications;

-- User policies
CREATE POLICY "Users can insert own certifications"
  ON public.certifications
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own certifications"
  ON public.certifications
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own certifications"
  ON public.certifications
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Admin policies
CREATE POLICY "Admins can view all certifications"
  ON public.certifications
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE admin_users.user_id = auth.uid()
        AND admin_users.is_active = true
    )
  );

CREATE POLICY "Admins can insert any certifications"
  ON public.certifications
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE admin_users.user_id = auth.uid()
        AND admin_users.is_active = true
    )
  );

CREATE POLICY "Admins can update any certifications"
  ON public.certifications
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE admin_users.user_id = auth.uid()
        AND admin_users.is_active = true
    )
  );

CREATE POLICY "Admins can delete certifications"
  ON public.certifications
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE admin_users.user_id = auth.uid()
        AND admin_users.is_active = true
    )
  );

-- ============================================
-- MISSION_CONTENTS TABLE - Allow everyone to read
-- ============================================

DROP POLICY IF EXISTS "Anyone can view mission contents" ON public.mission_contents;

CREATE POLICY "Anyone can view mission contents"
  ON public.mission_contents
  FOR SELECT
  USING (true);

-- ============================================
-- TITLES TABLE - Allow everyone to read
-- ============================================

DROP POLICY IF EXISTS "Anyone can view titles" ON public.titles;

CREATE POLICY "Anyone can view titles"
  ON public.titles
  FOR SELECT
  USING (true);

-- ============================================
-- USER_TITLES TABLE
-- ============================================

DROP POLICY IF EXISTS "Users can view own titles" ON public.user_titles;
DROP POLICY IF EXISTS "Admins can view all user titles" ON public.user_titles;

CREATE POLICY "Users can view own titles"
  ON public.user_titles
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all user titles"
  ON public.user_titles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE admin_users.user_id = auth.uid()
        AND admin_users.is_active = true
    )
  );

