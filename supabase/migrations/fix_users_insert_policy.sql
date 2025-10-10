-- Add INSERT policy for users table
-- This allows users to create their own profile on first login

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;

-- Create INSERT policy
CREATE POLICY "Users can insert own profile"
  ON public.users
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Also ensure the table has proper RLS enabled
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

