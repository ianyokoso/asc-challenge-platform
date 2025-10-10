-- Fix infinite recursion in RLS policies
-- The problem: admin_users table RLS is causing recursion when checked by other policies

-- ============================================
-- ADMIN_USERS TABLE - Simple RLS to prevent recursion
-- ============================================

-- Drop all existing policies on admin_users
DROP POLICY IF EXISTS "Users can read own data" ON public.admin_users;
DROP POLICY IF EXISTS "Users can view own admin status" ON public.admin_users;
DROP POLICY IF EXISTS "Admins can view all admin users" ON public.admin_users;

-- Allow users to read their own admin status (simple, no recursion)
CREATE POLICY "Users can view own admin status"
  ON public.admin_users
  FOR SELECT
  USING (auth.uid() = user_id);

-- ============================================
-- Re-create other policies without recursion issues
-- ============================================

-- TRACKS TABLE - Allow everyone to read tracks
DROP POLICY IF EXISTS "Anyone can view tracks" ON public.tracks;
CREATE POLICY "Anyone can view tracks"
  ON public.tracks
  FOR SELECT
  USING (true);

-- USER_TRACKS TABLE - Simplified admin check
DROP POLICY IF EXISTS "Users can insert own tracks" ON public.user_tracks;
DROP POLICY IF EXISTS "Users can view own tracks" ON public.user_tracks;
DROP POLICY IF EXISTS "Users can update own tracks" ON public.user_tracks;
DROP POLICY IF EXISTS "Admins can view all user tracks" ON public.user_tracks;
DROP POLICY IF EXISTS "Admins can insert any user tracks" ON public.user_tracks;
DROP POLICY IF EXISTS "Admins can update any user tracks" ON public.user_tracks;

-- User policies (no admin check needed)
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

-- Admin policies (safe - no recursion)
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

-- CERTIFICATIONS TABLE
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

-- MISSION_CONTENTS TABLE
DROP POLICY IF EXISTS "Anyone can view mission contents" ON public.mission_contents;
CREATE POLICY "Anyone can view mission contents"
  ON public.mission_contents
  FOR SELECT
  USING (true);

-- TITLES TABLE
DROP POLICY IF EXISTS "Anyone can view titles" ON public.titles;
CREATE POLICY "Anyone can view titles"
  ON public.titles
  FOR SELECT
  USING (true);

-- USER_TITLES TABLE
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

