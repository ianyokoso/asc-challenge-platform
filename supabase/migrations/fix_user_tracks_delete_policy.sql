-- Fix user_tracks delete policy to allow admins to remove tracks
-- This migration adds proper delete permissions for admin users

-- Drop existing delete policy if it exists
DROP POLICY IF EXISTS "Admin users can delete user tracks" ON user_tracks;

-- Create new delete policy that allows admins to delete any user_tracks
CREATE POLICY "Admin users can delete user tracks"
ON user_tracks
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM admin_users au
    WHERE au.user_id = auth.uid()
    AND au.is_active = true
  )
);

-- Also ensure admin users can update user_tracks (for future use)
DROP POLICY IF EXISTS "Admin users can update user tracks" ON user_tracks;

CREATE POLICY "Admin users can update user tracks"
ON user_tracks
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM admin_users au
    WHERE au.user_id = auth.uid()
    AND au.is_active = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM admin_users au
    WHERE au.user_id = auth.uid()
    AND au.is_active = true
  )
);

