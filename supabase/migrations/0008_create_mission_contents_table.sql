-- Create mission_contents table
CREATE TABLE IF NOT EXISTS public.mission_contents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id UUID NOT NULL REFERENCES public.tracks(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  is_active BOOLEAN DEFAULT true NOT NULL,
  created_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_mission_contents_track_id ON public.mission_contents(track_id);
CREATE INDEX IF NOT EXISTS idx_mission_contents_dates ON public.mission_contents(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_mission_contents_is_active ON public.mission_contents(is_active);

-- Enable Row Level Security
ALTER TABLE public.mission_contents ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Anyone can read active missions
CREATE POLICY "Anyone can read active missions"
  ON public.mission_contents
  FOR SELECT
  USING (is_active = true);

-- Only admins can manage missions
CREATE POLICY "Admins can manage missions"
  ON public.mission_contents
  FOR ALL
  USING (public.is_admin(auth.uid()));

-- Create updated_at trigger
CREATE TRIGGER update_mission_contents_updated_at
  BEFORE UPDATE ON public.mission_contents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add comment
COMMENT ON TABLE public.mission_contents IS 'Mission content and instructions for each track';

