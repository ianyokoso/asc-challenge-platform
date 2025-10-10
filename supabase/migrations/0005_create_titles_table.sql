-- Create title types enum
CREATE TYPE public.title_type AS ENUM (
  'daily',    -- Based on consecutive daily certifications
  'weekly'    -- Based on consecutive weekly certifications
);

-- Create titles table
CREATE TABLE IF NOT EXISTS public.titles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  type public.title_type NOT NULL,
  track_type public.track_type, -- NULL means applies to all tracks
  required_streak INTEGER NOT NULL, -- Required consecutive certifications
  badge_icon TEXT, -- Icon name from lucide-react
  badge_color TEXT, -- Tailwind color class
  display_order INTEGER DEFAULT 0 NOT NULL,
  is_active BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Insert default titles based on PRD
INSERT INTO public.titles (name, description, type, track_type, required_streak, badge_icon, badge_color, display_order) VALUES
  -- Daily track titles (Short-form)
  ('일일 수행자', '5일 연속 인증 완료', 'daily', 'shortform', 5, 'Award', 'bg-blue-500', 1),
  ('습관 메이커', '15일 연속 인증 완료', 'daily', 'shortform', 15, 'Award', 'bg-accent', 2),
  ('숏폼 최종 승자', '20일 연속 인증 완료', 'daily', 'shortform', 20, 'Trophy', 'bg-accent', 3),
  
  -- Weekly track titles (Long-form, Builder, Sales)
  ('첫걸음 챌린저', '1주차 완료', 'weekly', NULL, 1, 'Award', 'bg-primary/10', 4),
  ('실행의 핵심', '2주차 완료', 'weekly', NULL, 2, 'Target', 'bg-secondary/10', 5),
  ('빌드 전문가', '4주차 완료', 'weekly', NULL, 4, 'Trophy', 'bg-accent/10', 6)
ON CONFLICT (name) DO NOTHING;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_titles_type ON public.titles(type);
CREATE INDEX IF NOT EXISTS idx_titles_track_type ON public.titles(track_type);
CREATE INDEX IF NOT EXISTS idx_titles_is_active ON public.titles(is_active);

-- Enable Row Level Security
ALTER TABLE public.titles ENABLE ROW LEVEL SECURITY;

-- RLS Policies - All users can read titles
CREATE POLICY "Anyone can read titles"
  ON public.titles
  FOR SELECT
  USING (true);

-- Create updated_at trigger
CREATE TRIGGER update_titles_updated_at
  BEFORE UPDATE ON public.titles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add comment
COMMENT ON TABLE public.titles IS 'Achievement titles and badges for users';

