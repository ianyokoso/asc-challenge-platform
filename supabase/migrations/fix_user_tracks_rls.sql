-- Fix RLS policies for user_tracks table
-- This allows users to enroll themselves in tracks

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can insert own tracks" ON public.user_tracks;
DROP POLICY IF EXISTS "Users can view own tracks" ON public.user_tracks;
DROP POLICY IF EXISTS "Users can update own tracks" ON public.user_tracks;

-- Allow users to insert their own track registrations
CREATE POLICY "Users can insert own tracks"
  ON public.user_tracks
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Allow users to view their own tracks
CREATE POLICY "Users can view own tracks"
  ON public.user_tracks
  FOR SELECT
  USING (auth.uid() = user_id);

-- Allow users to update their own tracks
CREATE POLICY "Users can update own tracks"
  ON public.user_tracks
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Allow admins to view all tracks
CREATE POLICY "Admins can view all tracks"
  ON public.user_tracks
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE admin_users.user_id = auth.uid()
        AND admin_users.is_active = true
    )
  );

-- Allow admins to insert tracks for any user
CREATE POLICY "Admins can insert any tracks"
  ON public.user_tracks
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE admin_users.user_id = auth.uid()
        AND admin_users.is_active = true
    )
  );

-- Allow admins to update any tracks
CREATE POLICY "Admins can update any tracks"
  ON public.user_tracks
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE admin_users.user_id = auth.uid()
        AND admin_users.is_active = true
    )
  );

