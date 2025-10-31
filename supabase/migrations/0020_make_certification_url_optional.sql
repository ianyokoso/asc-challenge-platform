-- Make certification_url optional for tracks that don't require URL (builder, sales)
-- These tracks will use the task content field instead

ALTER TABLE public.certifications 
ALTER COLUMN certification_url DROP NOT NULL;

-- Add comment for clarity
COMMENT ON COLUMN public.certifications.certification_url IS 
'Certification URL - Optional for builder and sales tracks which use task content field instead';

