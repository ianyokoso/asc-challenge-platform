-- Update get_leaderboard function to exclude users without active tracks
-- This ensures that users who have been removed from all tracks are not shown in the leaderboard

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
    -- Global leaderboard: Only show users who have at least one active track
    RETURN QUERY
    SELECT
      u.id,
      u.discord_username,
      u.discord_avatar_url,
      COUNT(c.id) as total_certifications,
      0 as current_streak, -- Will be calculated separately if needed
      ROW_NUMBER() OVER (ORDER BY COUNT(c.id) DESC) as rank
    FROM public.users u
    INNER JOIN public.user_tracks ut ON u.id = ut.user_id AND ut.is_active = true
    LEFT JOIN public.certifications c ON u.id = c.user_id
      AND c.status IN ('submitted', 'approved')
    WHERE u.is_active = true
    GROUP BY u.id, u.discord_username, u.discord_avatar_url
    HAVING COUNT(DISTINCT ut.id) > 0  -- Must have at least one active track
    ORDER BY total_certifications DESC
    LIMIT p_limit;
  ELSE
    -- Track-specific leaderboard: Already filtered by active user_tracks
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

COMMENT ON FUNCTION public.get_leaderboard IS 'Get leaderboard rankings for users (excludes users without active tracks)';

