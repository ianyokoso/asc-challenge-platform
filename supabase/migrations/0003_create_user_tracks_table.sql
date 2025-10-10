-- Create user_tracks table (tracks that users have enrolled in)
CREATE TABLE IF NOT EXISTS public.user_tracks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  track_id UUID NOT NULL REFERENCES public.tracks(id) ON DELETE CASCADE,
  enrolled_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  is_active BOOLEAN DEFAULT true NOT NULL,
  dropout_warnings INTEGER DEFAULT 0 NOT NULL,
  last_warning_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(user_id, track_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_tracks_user_id ON public.user_tracks(user_id);
CREATE INDEX IF NOT EXISTS idx_user_tracks_track_id ON public.user_tracks(track_id);
CREATE INDEX IF NOT EXISTS idx_user_tracks_is_active ON public.user_tracks(is_active);

-- Enable Row Level Security
ALTER TABLE public.user_tracks ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can read their own enrollments
CREATE POLICY "Users can read own enrollments"
  ON public.user_tracks
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can enroll in tracks
CREATE POLICY "Users can enroll in tracks"
  ON public.user_tracks
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own enrollments
CREATE POLICY "Users can update own enrollments"
  ON public.user_tracks
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Create updated_at trigger
CREATE TRIGGER update_user_tracks_updated_at
  BEFORE UPDATE ON public.user_tracks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add comment
COMMENT ON TABLE public.user_tracks IS 'User track enrollments and dropout tracking';

