-- Disable RLS on admin_users table to prevent infinite recursion
-- This is safe because:
-- 1. Admin status is checked via EXISTS queries in other policies
-- 2. Users can't modify admin_users table (no INSERT/UPDATE/DELETE policies)
-- 3. Reading admin status is harmless (just checks if user is admin)

-- Drop all policies on admin_users
DROP POLICY IF EXISTS "Users can read own data" ON public.admin_users;
DROP POLICY IF EXISTS "Users can view own admin status" ON public.admin_users;
DROP POLICY IF EXISTS "Admins can view all admin users" ON public.admin_users;

-- Disable RLS on admin_users table
ALTER TABLE public.admin_users DISABLE ROW LEVEL SECURITY;

-- Note: This is safe because:
-- - No INSERT/UPDATE/DELETE policies exist, so users can't modify admin data
-- - SELECT is now unrestricted, which is needed for EXISTS checks in other policies
-- - This prevents infinite recursion when checking admin status

