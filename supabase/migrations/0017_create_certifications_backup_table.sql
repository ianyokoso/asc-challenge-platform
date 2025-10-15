-- Create certifications backup table with RLS disabled
CREATE TABLE IF NOT EXISTS public.certifications_backup (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  track_id UUID NOT NULL REFERENCES public.tracks(id) ON DELETE CASCADE,
  user_track_id UUID NOT NULL REFERENCES public.user_tracks(id) ON DELETE CASCADE,
  certification_url TEXT NOT NULL,
  certification_date DATE NOT NULL,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status public.certification_status NOT NULL DEFAULT 'pending',
  notes TEXT,
  admin_override BOOLEAN NOT NULL DEFAULT FALSE,
  admin_override_by UUID REFERENCES public.users(id),
  admin_override_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  backup_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  term_number INTEGER NOT NULL DEFAULT 1,
  source_id UUID NOT NULL -- 원본 certifications.id를 저장
);

-- Create unique constraint on source_id to prevent duplicates
CREATE UNIQUE INDEX IF NOT EXISTS idx_certifications_backup_source_id 
ON public.certifications_backup(source_id);

-- Disable RLS for backup table (only service role should access)
ALTER TABLE public.certifications_backup DISABLE ROW LEVEL SECURITY;

-- Create function to ensure backup table exists (for API use)
CREATE OR REPLACE FUNCTION public.create_certifications_backup_table_if_not_exists()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- This function always returns true as the table creation is handled by migration
  -- It's here for API compatibility
  RETURN TRUE;
END;
$$;

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.certifications_backup TO service_role;
GRANT USAGE ON SCHEMA public TO service_role;
