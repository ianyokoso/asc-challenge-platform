-- Admin reset certifications RPC function with atomic backup and delete
CREATE OR REPLACE FUNCTION public.admin_reset_certifications(
  p_term_number INTEGER DEFAULT NULL,
  p_since DATE DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_backup_count INTEGER := 0;
  v_delete_count INTEGER := 0;
  v_result JSON;
BEGIN
  -- Ensure backup table exists
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
    source_id UUID NOT NULL
  );

  -- Create unique index if not exists
  CREATE UNIQUE INDEX IF NOT EXISTS idx_certifications_backup_source_id 
  ON public.certifications_backup(source_id);

  -- Disable RLS for backup table
  ALTER TABLE public.certifications_backup DISABLE ROW LEVEL SECURITY;

  -- Grant permissions
  GRANT SELECT, INSERT, UPDATE, DELETE ON public.certifications_backup TO service_role;
  GRANT USAGE ON SCHEMA public TO service_role;

  -- Start transaction for atomic backup and delete
  BEGIN
    -- Step 1: Backup certifications based on conditions
    IF p_term_number IS NOT NULL AND p_since IS NOT NULL THEN
      -- Both term and date conditions
      WITH backup_data AS (
        INSERT INTO public.certifications_backup (
          id, user_id, track_id, user_track_id, certification_url, 
          certification_date, submitted_at, status, notes, 
          admin_override, admin_override_by, admin_override_at,
          created_at, updated_at, backup_at, term_number, source_id
        )
        SELECT 
          gen_random_uuid(),
          user_id, track_id, user_track_id, certification_url,
          certification_date, submitted_at, status, notes,
          admin_override, admin_override_by, admin_override_at,
          created_at, updated_at, NOW(), 
          COALESCE(term_number, 1), id
        FROM public.certifications 
        WHERE term_number = p_term_number 
          AND certification_date >= p_since
        ON CONFLICT (source_id) DO NOTHING
        RETURNING 1
      )
      SELECT COUNT(*) INTO v_backup_count FROM backup_data;

      -- Step 2: Delete the backed up records
      DELETE FROM public.certifications 
      WHERE term_number = p_term_number 
        AND certification_date >= p_since;
      
      GET DIAGNOSTICS v_delete_count = ROW_COUNT;

    ELSIF p_term_number IS NOT NULL THEN
      -- Only term condition
      WITH backup_data AS (
        INSERT INTO public.certifications_backup (
          id, user_id, track_id, user_track_id, certification_url, 
          certification_date, submitted_at, status, notes, 
          admin_override, admin_override_by, admin_override_at,
          created_at, updated_at, backup_at, term_number, source_id
        )
        SELECT 
          gen_random_uuid(),
          user_id, track_id, user_track_id, certification_url,
          certification_date, submitted_at, status, notes,
          admin_override, admin_override_by, admin_override_at,
          created_at, updated_at, NOW(), 
          COALESCE(term_number, 1), id
        FROM public.certifications 
        WHERE term_number = p_term_number
        ON CONFLICT (source_id) DO NOTHING
        RETURNING 1
      )
      SELECT COUNT(*) INTO v_backup_count FROM backup_data;

      DELETE FROM public.certifications WHERE term_number = p_term_number;
      GET DIAGNOSTICS v_delete_count = ROW_COUNT;

    ELSIF p_since IS NOT NULL THEN
      -- Only date condition
      WITH backup_data AS (
        INSERT INTO public.certifications_backup (
          id, user_id, track_id, user_track_id, certification_url, 
          certification_date, submitted_at, status, notes, 
          admin_override, admin_override_by, admin_override_at,
          created_at, updated_at, backup_at, term_number, source_id
        )
        SELECT 
          gen_random_uuid(),
          user_id, track_id, user_track_id, certification_url,
          certification_date, submitted_at, status, notes,
          admin_override, admin_override_by, admin_override_at,
          created_at, updated_at, NOW(), 
          COALESCE(term_number, 1), id
        FROM public.certifications 
        WHERE certification_date >= p_since
        ON CONFLICT (source_id) DO NOTHING
        RETURNING 1
      )
      SELECT COUNT(*) INTO v_backup_count FROM backup_data;

      DELETE FROM public.certifications WHERE certification_date >= p_since;
      GET DIAGNOSTICS v_delete_count = ROW_COUNT;

    ELSE
      -- No conditions - backup all
      WITH backup_data AS (
        INSERT INTO public.certifications_backup (
          id, user_id, track_id, user_track_id, certification_url, 
          certification_date, submitted_at, status, notes, 
          admin_override, admin_override_by, admin_override_at,
          created_at, updated_at, backup_at, term_number, source_id
        )
        SELECT 
          gen_random_uuid(),
          user_id, track_id, user_track_id, certification_url,
          certification_date, submitted_at, status, notes,
          admin_override, admin_override_by, admin_override_at,
          created_at, updated_at, NOW(), 
          COALESCE(term_number, 1), id
        FROM public.certifications
        ON CONFLICT (source_id) DO NOTHING
        RETURNING 1
      )
      SELECT COUNT(*) INTO v_backup_count FROM backup_data;

      DELETE FROM public.certifications;
      GET DIAGNOSTICS v_delete_count = ROW_COUNT;
    END IF;

    -- Return success result
    v_result := json_build_object(
      'ok', true,
      'backedUp', v_backup_count,
      'deleted', v_delete_count,
      'mode', 'rpc'
    );

    RETURN v_result;

  EXCEPTION
    WHEN OTHERS THEN
      -- Rollback and return error
      RAISE EXCEPTION 'RPC failed: %', SQLERRM;
  END;
END;
$$;

-- Grant execute permission to service_role
GRANT EXECUTE ON FUNCTION public.admin_reset_certifications(INTEGER, DATE) TO service_role;
