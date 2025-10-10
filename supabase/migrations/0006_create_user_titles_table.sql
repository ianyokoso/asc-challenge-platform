-- Create user_titles table (titles earned by users)
CREATE TABLE IF NOT EXISTS public.user_titles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title_id UUID NOT NULL REFERENCES public.titles(id) ON DELETE CASCADE,
  track_id UUID REFERENCES public.tracks(id) ON DELETE CASCADE, -- Track where title was earned
  earned_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(user_id, title_id, track_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_titles_user_id ON public.user_titles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_titles_title_id ON public.user_titles(title_id);
CREATE INDEX IF NOT EXISTS idx_user_titles_track_id ON public.user_titles(track_id);

-- Enable Row Level Security
ALTER TABLE public.user_titles ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can read their own titles
CREATE POLICY "Users can read own titles"
  ON public.user_titles
  FOR SELECT
  USING (auth.uid() = user_id);

-- Public can read user titles (for leaderboard and profiles)
CREATE POLICY "Public can read user titles"
  ON public.user_titles
  FOR SELECT
  USING (true);

-- System can insert titles (via function/trigger)
CREATE POLICY "System can award titles"
  ON public.user_titles
  FOR INSERT
  WITH CHECK (true);

-- Add comment
COMMENT ON TABLE public.user_titles IS 'Titles earned by users based on their achievements';

