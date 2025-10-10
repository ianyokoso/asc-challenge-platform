-- Clean migration with CASCADE - Safe to run multiple times
-- This will completely reset the database schema

-- Drop all tables with CASCADE (removes all dependent objects)
DROP TABLE IF EXISTS public.user_titles CASCADE;
DROP TABLE IF EXISTS public.titles CASCADE;
DROP TABLE IF EXISTS public.certifications CASCADE;
DROP TABLE IF EXISTS public.user_tracks CASCADE;
DROP TABLE IF EXISTS public.tracks CASCADE;
DROP TABLE IF EXISTS public.mission_contents CASCADE;
DROP TABLE IF EXISTS public.admin_users CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;

-- Drop types with CASCADE
DROP TYPE IF EXISTS public.title_type CASCADE;
DROP TYPE IF EXISTS public.certification_status CASCADE;
DROP TYPE IF EXISTS public.track_type CASCADE;

-- Drop functions with CASCADE
DROP FUNCTION IF EXISTS public.get_user_streak(UUID, UUID) CASCADE;
DROP FUNCTION IF EXISTS public.get_user_total_certifications(UUID, UUID) CASCADE;
DROP FUNCTION IF EXISTS public.get_leaderboard(UUID, INTEGER) CASCADE;
DROP FUNCTION IF EXISTS public.is_admin(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.update_updated_at_column() CASCADE;

-- ============================================
-- NOW CREATE EVERYTHING FROM SCRATCH
-- ============================================

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create users table
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  discord_id TEXT UNIQUE NOT NULL,
  discord_username TEXT NOT NULL,
  discord_discriminator TEXT,
  discord_avatar_url TEXT,
  discord_global_name TEXT,
  email TEXT,
  is_active BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_users_discord_id ON public.users(discord_id);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON public.users(is_active);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own data" ON public.users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own data" ON public.users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Public can read basic user info" ON public.users FOR SELECT USING (true);

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE public.users IS 'User profiles with Discord authentication information';

-- Create track types enum
CREATE TYPE public.track_type AS ENUM ('shortform', 'longform', 'builder', 'sales');

-- Create tracks table
CREATE TABLE IF NOT EXISTS public.tracks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type public.track_type UNIQUE NOT NULL,
  description TEXT,
  certification_days TEXT[] NOT NULL,
  deadline_day TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

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

CREATE INDEX IF NOT EXISTS idx_tracks_type ON public.tracks(type);
CREATE INDEX IF NOT EXISTS idx_tracks_is_active ON public.tracks(is_active);

ALTER TABLE public.tracks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read tracks" ON public.tracks FOR SELECT USING (true);

CREATE TRIGGER update_tracks_updated_at
  BEFORE UPDATE ON public.tracks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE public.tracks IS 'Available challenge tracks with certification schedules';

-- Create user_tracks table
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

CREATE INDEX IF NOT EXISTS idx_user_tracks_user_id ON public.user_tracks(user_id);
CREATE INDEX IF NOT EXISTS idx_user_tracks_track_id ON public.user_tracks(track_id);
CREATE INDEX IF NOT EXISTS idx_user_tracks_is_active ON public.user_tracks(is_active);

ALTER TABLE public.user_tracks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own enrollments" ON public.user_tracks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can enroll in tracks" ON public.user_tracks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own enrollments" ON public.user_tracks FOR UPDATE USING (auth.uid() = user_id);

CREATE TRIGGER update_user_tracks_updated_at
  BEFORE UPDATE ON public.user_tracks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE public.user_tracks IS 'User track enrollments and dropout tracking';

-- Create certification status enum
CREATE TYPE public.certification_status AS ENUM ('pending', 'submitted', 'approved', 'rejected');

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

CREATE INDEX IF NOT EXISTS idx_certifications_user_id ON public.certifications(user_id);
CREATE INDEX IF NOT EXISTS idx_certifications_track_id ON public.certifications(track_id);
CREATE INDEX IF NOT EXISTS idx_certifications_user_track_id ON public.certifications(user_track_id);
CREATE INDEX IF NOT EXISTS idx_certifications_date ON public.certifications(certification_date);
CREATE INDEX IF NOT EXISTS idx_certifications_status ON public.certifications(status);

ALTER TABLE public.certifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own certifications" ON public.certifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can submit certifications" ON public.certifications FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own certifications" ON public.certifications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Public can read approved certifications" ON public.certifications FOR SELECT USING (status = 'approved' OR status = 'submitted');

CREATE TRIGGER update_certifications_updated_at
  BEFORE UPDATE ON public.certifications
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE public.certifications IS 'User certification submissions and tracking';

-- Create title types enum
CREATE TYPE public.title_type AS ENUM ('daily', 'weekly');

-- Create titles table
CREATE TABLE IF NOT EXISTS public.titles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  type public.title_type NOT NULL,
  track_type public.track_type,
  required_streak INTEGER NOT NULL,
  badge_icon TEXT,
  badge_color TEXT,
  display_order INTEGER DEFAULT 0 NOT NULL,
  is_active BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

INSERT INTO public.titles (name, description, type, track_type, required_streak, badge_icon, badge_color, display_order) VALUES
  ('일일 수행자', '5일 연속 인증 완료', 'daily', 'shortform', 5, 'Award', 'bg-blue-500', 1),
  ('습관 메이커', '15일 연속 인증 완료', 'daily', 'shortform', 15, 'Award', 'bg-accent', 2),
  ('숏폼 최종 승자', '20일 연속 인증 완료', 'daily', 'shortform', 20, 'Trophy', 'bg-accent', 3),
  ('첫걸음 챌린저', '1주차 완료', 'weekly', NULL, 1, 'Award', 'bg-primary/10', 4),
  ('실행의 핵심', '2주차 완료', 'weekly', NULL, 2, 'Target', 'bg-secondary/10', 5),
  ('빌드 전문가', '4주차 완료', 'weekly', NULL, 4, 'Trophy', 'bg-accent/10', 6)
ON CONFLICT (name) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_titles_type ON public.titles(type);
CREATE INDEX IF NOT EXISTS idx_titles_track_type ON public.titles(track_type);
CREATE INDEX IF NOT EXISTS idx_titles_is_active ON public.titles(is_active);

ALTER TABLE public.titles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read titles" ON public.titles FOR SELECT USING (true);

CREATE TRIGGER update_titles_updated_at
  BEFORE UPDATE ON public.titles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE public.titles IS 'Achievement titles and badges for users';

-- Create user_titles table
CREATE TABLE IF NOT EXISTS public.user_titles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title_id UUID NOT NULL REFERENCES public.titles(id) ON DELETE CASCADE,
  track_id UUID REFERENCES public.tracks(id) ON DELETE CASCADE,
  earned_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(user_id, title_id, track_id)
);

CREATE INDEX IF NOT EXISTS idx_user_titles_user_id ON public.user_titles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_titles_title_id ON public.user_titles(title_id);
CREATE INDEX IF NOT EXISTS idx_user_titles_track_id ON public.user_titles(track_id);

ALTER TABLE public.user_titles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own titles" ON public.user_titles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Public can read user titles" ON public.user_titles FOR SELECT USING (true);
CREATE POLICY "System can award titles" ON public.user_titles FOR INSERT WITH CHECK (true);

COMMENT ON TABLE public.user_titles IS 'Titles earned by users based on their achievements';

-- Create admin_users table
CREATE TABLE IF NOT EXISTS public.admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  discord_id TEXT UNIQUE NOT NULL,
  role TEXT DEFAULT 'admin' NOT NULL,
  permissions TEXT[] DEFAULT ARRAY['read', 'write'] NOT NULL,
  granted_by UUID REFERENCES public.users(id),
  granted_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  is_active BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_admin_users_user_id ON public.admin_users(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_users_discord_id ON public.admin_users(discord_id);
CREATE INDEX IF NOT EXISTS idx_admin_users_is_active ON public.admin_users(is_active);

ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can read admin list" ON public.admin_users FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid() AND is_active = true)
);

CREATE TRIGGER update_admin_users_updated_at
  BEFORE UPDATE ON public.admin_users
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.is_admin(check_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE user_id = check_user_id AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON TABLE public.admin_users IS 'Administrator users with elevated permissions';

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

CREATE INDEX IF NOT EXISTS idx_mission_contents_track_id ON public.mission_contents(track_id);
CREATE INDEX IF NOT EXISTS idx_mission_contents_dates ON public.mission_contents(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_mission_contents_is_active ON public.mission_contents(is_active);

ALTER TABLE public.mission_contents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read active missions" ON public.mission_contents FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can manage missions" ON public.mission_contents FOR ALL USING (public.is_admin(auth.uid()));

CREATE TRIGGER update_mission_contents_updated_at
  BEFORE UPDATE ON public.mission_contents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE public.mission_contents IS 'Mission content and instructions for each track';

-- Create helper functions
CREATE OR REPLACE FUNCTION public.get_user_streak(p_user_id UUID, p_track_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_streak INTEGER := 0;
  v_track_type public.track_type;
  v_current_date DATE := CURRENT_DATE;
  v_check_date DATE;
BEGIN
  SELECT type INTO v_track_type FROM public.tracks WHERE id = p_track_id;
  
  IF v_track_type = 'shortform' THEN
    v_check_date := v_current_date;
    WHILE EXISTS (
      SELECT 1 FROM public.certifications
      WHERE user_id = p_user_id AND track_id = p_track_id
        AND certification_date = v_check_date
        AND status IN ('submitted', 'approved')
    ) LOOP
      v_streak := v_streak + 1;
      v_check_date := v_check_date - INTERVAL '1 day';
      WHILE EXTRACT(DOW FROM v_check_date) IN (0, 6) LOOP
        v_check_date := v_check_date - INTERVAL '1 day';
      END LOOP;
    END LOOP;
  ELSE
    v_check_date := v_current_date;
    WHILE EXISTS (
      SELECT 1 FROM public.certifications
      WHERE user_id = p_user_id AND track_id = p_track_id
        AND certification_date >= v_check_date - INTERVAL '7 days'
        AND certification_date <= v_check_date
        AND status IN ('submitted', 'approved')
    ) LOOP
      v_streak := v_streak + 1;
      v_check_date := v_check_date - INTERVAL '7 days';
    END LOOP;
  END IF;
  
  RETURN v_streak;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_user_total_certifications(p_user_id UUID, p_track_id UUID DEFAULT NULL)
RETURNS INTEGER AS $$
BEGIN
  IF p_track_id IS NULL THEN
    RETURN (SELECT COUNT(*) FROM public.certifications WHERE user_id = p_user_id AND status IN ('submitted', 'approved'));
  ELSE
    RETURN (SELECT COUNT(*) FROM public.certifications WHERE user_id = p_user_id AND track_id = p_track_id AND status IN ('submitted', 'approved'));
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_leaderboard(p_track_id UUID DEFAULT NULL, p_limit INTEGER DEFAULT 100)
RETURNS TABLE (
  user_id UUID, discord_username TEXT, discord_avatar_url TEXT,
  total_certifications BIGINT, current_streak INTEGER, rank BIGINT
) AS $$
BEGIN
  IF p_track_id IS NULL THEN
    RETURN QUERY
    SELECT u.id, u.discord_username, u.discord_avatar_url,
      COUNT(c.id) as total_certifications, 0 as current_streak,
      ROW_NUMBER() OVER (ORDER BY COUNT(c.id) DESC) as rank
    FROM public.users u
    LEFT JOIN public.certifications c ON u.id = c.user_id AND c.status IN ('submitted', 'approved')
    WHERE u.is_active = true
    GROUP BY u.id, u.discord_username, u.discord_avatar_url
    ORDER BY total_certifications DESC
    LIMIT p_limit;
  ELSE
    RETURN QUERY
    SELECT u.id, u.discord_username, u.discord_avatar_url,
      COUNT(c.id) as total_certifications,
      public.get_user_streak(u.id, p_track_id) as current_streak,
      ROW_NUMBER() OVER (ORDER BY COUNT(c.id) DESC) as rank
    FROM public.users u
    INNER JOIN public.user_tracks ut ON u.id = ut.user_id
    LEFT JOIN public.certifications c ON u.id = c.user_id AND c.track_id = p_track_id AND c.status IN ('submitted', 'approved')
    WHERE ut.track_id = p_track_id AND ut.is_active = true AND u.is_active = true
    GROUP BY u.id, u.discord_username, u.discord_avatar_url
    ORDER BY total_certifications DESC
    LIMIT p_limit;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.get_user_streak IS 'Calculate current certification streak for a user';
COMMENT ON FUNCTION public.get_user_total_certifications IS 'Get total certification count for a user';
COMMENT ON FUNCTION public.get_leaderboard IS 'Get leaderboard rankings for users';

