-- Fix RLS policies for certifications table
-- This allows users to submit and manage their own certifications

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can insert own certifications" ON public.certifications;
DROP POLICY IF EXISTS "Users can view own certifications" ON public.certifications;
DROP POLICY IF EXISTS "Users can update own certifications" ON public.certifications;

-- Allow users to insert their own certifications
CREATE POLICY "Users can insert own certifications"
  ON public.certifications
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Allow users to view their own certifications
CREATE POLICY "Users can view own certifications"
  ON public.certifications
  FOR SELECT
  USING (auth.uid() = user_id);

-- Allow users to update their own certifications
CREATE POLICY "Users can update own certifications"
  ON public.certifications
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Allow admins to view all certifications
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

-- Allow admins to insert certifications for any user
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

-- Allow admins to update any certifications
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

-- Allow admins to delete certifications
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

