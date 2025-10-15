-- 관리자용 리더보드 함수 (모든 사용자 포함)
CREATE OR REPLACE FUNCTION public.get_admin_leaderboard(
  p_track_id UUID DEFAULT NULL,
  p_limit INTEGER DEFAULT 100
)
RETURNS TABLE (
  user_id UUID,
  discord_username TEXT,
  discord_avatar_url TEXT,
  total_certifications BIGINT,
  current_streak INTEGER,
  rank BIGINT,
  is_active BOOLEAN
) AS $$
BEGIN
  IF p_track_id IS NULL THEN
    -- Global leaderboard (모든 사용자 포함)
    RETURN QUERY
    SELECT
      u.id,
      u.discord_username,
      u.discord_avatar_url,
      COUNT(c.id) as total_certifications,
      0 as current_streak, -- Will be calculated separately if needed
      ROW_NUMBER() OVER (ORDER BY COUNT(c.id) DESC) as rank,
      u.is_active
    FROM public.users u
    LEFT JOIN public.certifications c ON u.id = c.user_id
      AND c.status IN ('submitted', 'approved')
    GROUP BY u.id, u.discord_username, u.discord_avatar_url, u.is_active
    ORDER BY total_certifications DESC
    LIMIT p_limit;
  ELSE
    -- Track-specific leaderboard (모든 사용자 포함)
    RETURN QUERY
    SELECT
      u.id,
      u.discord_username,
      u.discord_avatar_url,
      COUNT(c.id) as total_certifications,
      public.get_user_streak(u.id, p_track_id) as current_streak,
      ROW_NUMBER() OVER (ORDER BY COUNT(c.id) DESC) as rank,
      u.is_active
    FROM public.users u
    INNER JOIN public.user_tracks ut ON u.id = ut.user_id
    LEFT JOIN public.certifications c ON u.id = c.user_id
      AND c.track_id = p_track_id
      AND c.status IN ('submitted', 'approved')
    WHERE ut.track_id = p_track_id
    GROUP BY u.id, u.discord_username, u.discord_avatar_url, u.is_active
    ORDER BY total_certifications DESC
    LIMIT p_limit;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.get_admin_leaderboard IS 'Get leaderboard rankings for all users (admin view)';
