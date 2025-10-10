-- Drop all existing RLS policies to start fresh

-- TRACKS TABLE
DROP POLICY IF EXISTS "Anyone can view tracks" ON public.tracks;
DROP POLICY IF EXISTS "Everyone can view tracks" ON public.tracks;

-- USER_TRACKS TABLE
DROP POLICY IF EXISTS "Users can insert own tracks" ON public.user_tracks;
DROP POLICY IF EXISTS "Users can view own tracks" ON public.user_tracks;
DROP POLICY IF EXISTS "Users can update own tracks" ON public.user_tracks;
DROP POLICY IF EXISTS "Admins can view all tracks" ON public.user_tracks;
DROP POLICY IF EXISTS "Admins can view all user tracks" ON public.user_tracks;
DROP POLICY IF EXISTS "Admins can insert any tracks" ON public.user_tracks;
DROP POLICY IF EXISTS "Admins can insert any user tracks" ON public.user_tracks;
DROP POLICY IF EXISTS "Admins can update any tracks" ON public.user_tracks;
DROP POLICY IF EXISTS "Admins can update any user tracks" ON public.user_tracks;

-- CERTIFICATIONS TABLE
DROP POLICY IF EXISTS "Users can insert own certifications" ON public.certifications;
DROP POLICY IF EXISTS "Users can view own certifications" ON public.certifications;
DROP POLICY IF EXISTS "Users can update own certifications" ON public.certifications;
DROP POLICY IF EXISTS "Admins can view all certifications" ON public.certifications;
DROP POLICY IF EXISTS "Admins can insert any certifications" ON public.certifications;
DROP POLICY IF EXISTS "Admins can update any certifications" ON public.certifications;
DROP POLICY IF EXISTS "Admins can delete certifications" ON public.certifications;

-- MISSION_CONTENTS TABLE
DROP POLICY IF EXISTS "Anyone can view mission contents" ON public.mission_contents;
DROP POLICY IF EXISTS "Everyone can view mission contents" ON public.mission_contents;

-- TITLES TABLE
DROP POLICY IF EXISTS "Anyone can view titles" ON public.titles;
DROP POLICY IF EXISTS "Everyone can view titles" ON public.titles;

-- USER_TITLES TABLE
DROP POLICY IF EXISTS "Users can view own titles" ON public.user_titles;
DROP POLICY IF EXISTS "Admins can view all user titles" ON public.user_titles;

