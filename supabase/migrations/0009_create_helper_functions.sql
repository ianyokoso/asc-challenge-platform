-- Helper function: Get current streak for a user in a track
CREATE OR REPLACE FUNCTION public.get_user_streak(
  p_user_id UUID,
  p_track_id UUID
)
RETURNS INTEGER AS $$
DECLARE
  v_streak INTEGER := 0;
  v_track_type public.track_type;
  v_current_date DATE := CURRENT_DATE;
  v_check_date DATE;
BEGIN
  -- Get track type
  SELECT type INTO v_track_type FROM public.tracks WHERE id = p_track_id;
  
  -- Different logic for daily vs weekly tracks
  IF v_track_type = 'shortform' THEN
    -- Daily track (Mon-Fri)
    v_check_date := v_current_date;
    
    WHILE EXISTS (
      SELECT 1 FROM public.certifications
      WHERE user_id = p_user_id
        AND track_id = p_track_id
        AND certification_date = v_check_date
        AND status IN ('submitted', 'approved')
    ) LOOP
      v_streak := v_streak + 1;
      v_check_date := v_check_date - INTERVAL '1 day';
      
      -- Skip weekends
      WHILE EXTRACT(DOW FROM v_check_date) IN (0, 6) LOOP
        v_check_date := v_check_date - INTERVAL '1 day';
      END LOOP;
    END LOOP;
  ELSE
    -- Weekly tracks
    v_check_date := v_current_date;
    
    WHILE EXISTS (
      SELECT 1 FROM public.certifications
      WHERE user_id = p_user_id
        AND track_id = p_track_id
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

-- Helper function: Get total certifications count
CREATE OR REPLACE FUNCTION public.get_user_total_certifications(
  p_user_id UUID,
  p_track_id UUID DEFAULT NULL
)
RETURNS INTEGER AS $$
BEGIN
  IF p_track_id IS NULL THEN
    RETURN (
      SELECT COUNT(*)
      FROM public.certifications
      WHERE user_id = p_user_id
        AND status IN ('submitted', 'approved')
    );
  ELSE
    RETURN (
      SELECT COUNT(*)
      FROM public.certifications
      WHERE user_id = p_user_id
        AND track_id = p_track_id
        AND status IN ('submitted', 'approved')
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function: Get leaderboard data
CREATE OR REPLACE FUNCTION public.get_leaderboard(
  p_track_id UUID DEFAULT NULL,
  p_limit INTEGER DEFAULT 100
)
RETURNS TABLE (
  user_id UUID,
  discord_username TEXT,
  discord_avatar_url TEXT,
  total_certifications BIGINT,
  current_streak INTEGER,
  rank BIGINT
) AS $$
BEGIN
  IF p_track_id IS NULL THEN
    -- Global leaderboard
    RETURN QUERY
    SELECT
      u.id,
      u.discord_username,
      u.discord_avatar_url,
      COUNT(c.id) as total_certifications,
      0 as current_streak, -- Will be calculated separately if needed
      ROW_NUMBER() OVER (ORDER BY COUNT(c.id) DESC) as rank
    FROM public.users u
    LEFT JOIN public.certifications c ON u.id = c.user_id
      AND c.status IN ('submitted', 'approved')
    WHERE u.is_active = true
    GROUP BY u.id, u.discord_username, u.discord_avatar_url
    ORDER BY total_certifications DESC
    LIMIT p_limit;
  ELSE
    -- Track-specific leaderboard
    RETURN QUERY
    SELECT
      u.id,
      u.discord_username,
      u.discord_avatar_url,
      COUNT(c.id) as total_certifications,
      public.get_user_streak(u.id, p_track_id) as current_streak,
      ROW_NUMBER() OVER (ORDER BY COUNT(c.id) DESC) as rank
    FROM public.users u
    INNER JOIN public.user_tracks ut ON u.id = ut.user_id
    LEFT JOIN public.certifications c ON u.id = c.user_id
      AND c.track_id = p_track_id
      AND c.status IN ('submitted', 'approved')
    WHERE ut.track_id = p_track_id
      AND ut.is_active = true
      AND u.is_active = true
    GROUP BY u.id, u.discord_username, u.discord_avatar_url
    ORDER BY total_certifications DESC
    LIMIT p_limit;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comments
COMMENT ON FUNCTION public.get_user_streak IS 'Calculate current certification streak for a user';
COMMENT ON FUNCTION public.get_user_total_certifications IS 'Get total certification count for a user';
COMMENT ON FUNCTION public.get_leaderboard IS 'Get leaderboard rankings for users';

