-- Create certification status enum
CREATE TYPE public.certification_status AS ENUM (
  'pending',
  'submitted',
  'approved',
  'rejected'
);

-- Create certifications table
CREATE TABLE IF NOT EXISTS public.certifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  track_id UUID NOT NULL REFERENCES public.tracks(id) ON DELETE CASCADE,
  user_track_id UUID NOT NULL REFERENCES public.user_tracks(id) ON DELETE CASCADE,
  certification_url TEXT NOT NULL,
  certification_date DATE NOT NULL,
  submitted_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  status public.certification_status DEFAULT 'submitted' NOT NULL,
  notes TEXT,
  admin_override BOOLEAN DEFAULT false NOT NULL,
  admin_override_by UUID REFERENCES public.users(id),
  admin_override_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(user_id, track_id, certification_date)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_certifications_user_id ON public.certifications(user_id);
CREATE INDEX IF NOT EXISTS idx_certifications_track_id ON public.certifications(track_id);
CREATE INDEX IF NOT EXISTS idx_certifications_user_track_id ON public.certifications(user_track_id);
CREATE INDEX IF NOT EXISTS idx_certifications_date ON public.certifications(certification_date);
CREATE INDEX IF NOT EXISTS idx_certifications_status ON public.certifications(status);

-- Enable Row Level Security
ALTER TABLE public.certifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can read their own certifications
CREATE POLICY "Users can read own certifications"
  ON public.certifications
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own certifications
CREATE POLICY "Users can submit certifications"
  ON public.certifications
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own certifications (before deadline)
CREATE POLICY "Users can update own certifications"
  ON public.certifications
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Public can read approved certifications (for leaderboard)
CREATE POLICY "Public can read approved certifications"
  ON public.certifications
  FOR SELECT
  USING (status = 'approved' OR status = 'submitted');

-- Create updated_at trigger
CREATE TRIGGER update_certifications_updated_at
  BEFORE UPDATE ON public.certifications
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add comment
COMMENT ON TABLE public.certifications IS 'User certification submissions and tracking';

