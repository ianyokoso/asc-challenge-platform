-- Fix user_tracks delete policy to allow admins to remove tracks
-- This migration adds proper delete permissions for admin users
-- and makes user_track_id nullable in certifications table

-- Step 1: Make user_track_id nullable in certifications table
-- This allows certifications to exist without being tied to a specific user_track
ALTER TABLE certifications 
ALTER COLUMN user_track_id DROP NOT NULL;

-- Step 2: Drop existing delete policy if it exists
DROP POLICY IF EXISTS "Admin users can delete user tracks" ON user_tracks;

-- Step 3: Create new delete policy that allows admins to delete any user_tracks
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

-- Step 4: Also ensure admin users can update user_tracks (for future use)
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

-- Step 5: Add UPDATE policy for certifications to allow admins to update user_track_id
DROP POLICY IF EXISTS "Admin users can update certifications" ON certifications;

CREATE POLICY "Admin users can update certifications"
ON certifications
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

