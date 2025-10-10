-- Create track types enum
CREATE TYPE public.track_type AS ENUM (
  'shortform',    -- Mon-Fri (daily)
  'longform',     -- Sunday (weekly)
  'builder',      -- Sunday (weekly)
  'sales'         -- Tuesday (weekly)
);

-- Create tracks table
CREATE TABLE IF NOT EXISTS public.tracks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type public.track_type UNIQUE NOT NULL,
  description TEXT,
  certification_days TEXT[] NOT NULL, -- ['monday', 'tuesday', ...] or ['sunday']
  deadline_day TEXT NOT NULL, -- 'friday', 'sunday', 'tuesday'
  is_active BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Insert default tracks
INSERT INTO public.tracks (name, type, description, certification_days, deadline_day) VALUES
  ('Short-form Creator', 'shortform', '숏폼 콘텐츠 크리에이터 트랙 (월-금)', 
   ARRAY['monday', 'tuesday', 'wednesday', 'thursday', 'friday'], 'friday'),
  ('Long-form Creator', 'longform', '롱폼 콘텐츠 크리에이터 트랙 (일요일)', 
   ARRAY['sunday'], 'sunday'),
  ('Builder', 'builder', '빌더 트랙 (일요일)', 
   ARRAY['sunday'], 'sunday'),
  ('Sales', 'sales', '세일즈 트랙 (화요일)', 
   ARRAY['tuesday'], 'tuesday')
ON CONFLICT (type) DO NOTHING;

-- Create index
CREATE INDEX IF NOT EXISTS idx_tracks_type ON public.tracks(type);
CREATE INDEX IF NOT EXISTS idx_tracks_is_active ON public.tracks(is_active);

-- Enable Row Level Security
ALTER TABLE public.tracks ENABLE ROW LEVEL SECURITY;

-- RLS Policies - All users can read tracks
CREATE POLICY "Anyone can read tracks"
  ON public.tracks
  FOR SELECT
  USING (true);

-- Create updated_at trigger
CREATE TRIGGER update_tracks_updated_at
  BEFORE UPDATE ON public.tracks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add comment
COMMENT ON TABLE public.tracks IS 'Available challenge tracks with certification schedules';

