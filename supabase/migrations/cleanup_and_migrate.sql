-- Cleanup and recreate all tables and policies
-- This is idempotent - can be run multiple times safely

-- Drop all policies first
DO $$ 
BEGIN
  -- Users table policies
  DROP POLICY IF EXISTS "Users can read own data" ON public.users;
  DROP POLICY IF EXISTS "Users can update own data" ON public.users;
  DROP POLICY IF EXISTS "Public can read basic user info" ON public.users;
  
  -- Tracks table policies
  DROP POLICY IF EXISTS "Anyone can read tracks" ON public.tracks;
  
  -- User tracks policies
  DROP POLICY IF EXISTS "Users can read own enrollments" ON public.user_tracks;
  DROP POLICY IF EXISTS "Users can enroll in tracks" ON public.user_tracks;
  DROP POLICY IF EXISTS "Users can update own enrollments" ON public.user_tracks;
  
  -- Certifications policies
  DROP POLICY IF EXISTS "Users can read own certifications" ON public.certifications;
  DROP POLICY IF EXISTS "Users can submit certifications" ON public.certifications;
  DROP POLICY IF EXISTS "Users can update own certifications" ON public.certifications;
  DROP POLICY IF EXISTS "Public can read approved certifications" ON public.certifications;
  
  -- Titles policies
  DROP POLICY IF EXISTS "Anyone can read titles" ON public.titles;
  
  -- User titles policies
  DROP POLICY IF EXISTS "Users can read own titles" ON public.user_titles;
  DROP POLICY IF EXISTS "Public can read user titles" ON public.user_titles;
  DROP POLICY IF EXISTS "System can award titles" ON public.user_titles;
  
  -- Admin users policies
  DROP POLICY IF EXISTS "Admins can read admin list" ON public.admin_users;
  
  -- Mission contents policies
  DROP POLICY IF EXISTS "Anyone can read active missions" ON public.mission_contents;
  DROP POLICY IF EXISTS "Admins can manage missions" ON public.mission_contents;
END $$;

-- Drop functions
DROP FUNCTION IF EXISTS public.get_user_streak(UUID, UUID);
DROP FUNCTION IF EXISTS public.get_user_total_certifications(UUID, UUID);
DROP FUNCTION IF EXISTS public.get_leaderboard(UUID, INTEGER);
DROP FUNCTION IF EXISTS public.is_admin(UUID);
DROP FUNCTION IF EXISTS public.update_updated_at_column();

-- Drop triggers
DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;
DROP TRIGGER IF EXISTS update_tracks_updated_at ON public.tracks;
DROP TRIGGER IF EXISTS update_user_tracks_updated_at ON public.user_tracks;
DROP TRIGGER IF EXISTS update_certifications_updated_at ON public.certifications;
DROP TRIGGER IF EXISTS update_titles_updated_at ON public.titles;
DROP TRIGGER IF EXISTS update_admin_users_updated_at ON public.admin_users;
DROP TRIGGER IF EXISTS update_mission_contents_updated_at ON public.mission_contents;

-- Drop types
DROP TYPE IF EXISTS public.title_type CASCADE;
DROP TYPE IF EXISTS public.certification_status CASCADE;
DROP TYPE IF EXISTS public.track_type CASCADE;

-- Drop tables (in reverse order of dependencies)
DROP TABLE IF EXISTS public.user_titles CASCADE;
DROP TABLE IF EXISTS public.titles CASCADE;
DROP TABLE IF EXISTS public.certifications CASCADE;
DROP TABLE IF EXISTS public.user_tracks CASCADE;
DROP TABLE IF EXISTS public.tracks CASCADE;
DROP TABLE IF EXISTS public.mission_contents CASCADE;
DROP TABLE IF EXISTS public.admin_users CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;

-- Now run the complete migration

