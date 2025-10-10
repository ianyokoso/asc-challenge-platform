// Supabase database operations
import { createClient } from './client';
import type {
  User,
  Track,
  UserTrack,
  Certification,
  LeaderboardEntry,
  CalendarCertification,
  UserTitle,
  Title,
  TrackType,
} from './types';

// ============================================
// USER OPERATIONS
// ============================================

export async function upsertUserProfile(userData: {
  id: string;
  discord_id: string;
  discord_username: string;
  discord_discriminator?: string;
  discord_avatar_url?: string;
  discord_global_name?: string;
  email?: string;
}): Promise<User | null> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('users')
    .upsert({
      id: userData.id,
      discord_id: userData.discord_id,
      discord_username: userData.discord_username,
      discord_discriminator: userData.discord_discriminator || null,
      discord_avatar_url: userData.discord_avatar_url || null,
      discord_global_name: userData.discord_global_name || null,
      email: userData.email || null,
    })
    .select()
    .single();

  if (error) {
    console.error('Error upserting user profile:', error);
    return null;
  }

  return data;
}

export async function getUserProfile(userId: string): Promise<User | null> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .maybeSingle(); // Use maybeSingle() instead of single() to handle no rows

  if (error) {
    console.error('Error fetching user profile:', error);
    return null;
  }

  if (!data) {
    console.warn('No user profile found for userId:', userId);
    return null;
  }

  return data;
}

// ============================================
// TRACK OPERATIONS
// ============================================

export async function getAllTracks(): Promise<Track[]> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('tracks')
    .select('*')
    .eq('is_active', true)
    .order('type');

  if (error) {
    console.error('Error fetching tracks:', error);
    return [];
  }

  return data || [];
}

export async function getTrackById(trackId: string): Promise<Track | null> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('tracks')
    .select('*')
    .eq('id', trackId)
    .single();

  if (error) {
    console.error('Error fetching track:', error);
    return null;
  }

  return data;
}

export async function getTrackParticipantCount(trackId: string): Promise<number> {
  const supabase = createClient();
  
  const { count, error } = await supabase
    .from('user_tracks')
    .select('*', { count: 'exact', head: true })
    .eq('track_id', trackId)
    .eq('is_active', true);

  if (error) {
    console.error('Error fetching track participant count:', error);
    return 0;
  }

  return count || 0;
}

export async function getAllTracksWithParticipants(): Promise<(Track & { participant_count: number })[]> {
  const supabase = createClient();
  
  const tracks = await getAllTracks();
  
  const tracksWithCounts = await Promise.all(
    tracks.map(async (track) => {
      const count = await getTrackParticipantCount(track.id);
      return {
        ...track,
        participant_count: count,
      };
    })
  );

  return tracksWithCounts;
}

// ============================================
// USER TRACK OPERATIONS
// ============================================

export async function enrollUserInTrack(userId: string, trackId: string): Promise<UserTrack | null> {
  const supabase = createClient();
  
  // First check if user is already enrolled
  const { data: existing } = await supabase
    .from('user_tracks')
    .select('*')
    .eq('user_id', userId)
    .eq('track_id', trackId)
    .maybeSingle();

  if (existing) {
    // If already enrolled but inactive, reactivate
    if (!existing.is_active) {
      const { data: updated, error: updateError } = await supabase
        .from('user_tracks')
        .update({ is_active: true })
        .eq('id', existing.id)
        .select('*, track:tracks(*)')
        .single();

      if (updateError) {
        console.error('Error reactivating track enrollment:', updateError);
        throw new Error('트랙 재활성화에 실패했습니다: ' + (updateError.message || JSON.stringify(updateError)));
      }

      return updated;
    }
    
    // Already enrolled and active
    return existing as UserTrack;
  }

  // Create new enrollment
  const { data, error } = await supabase
    .from('user_tracks')
    .insert({
      user_id: userId,
      track_id: trackId,
      is_active: true,
    })
    .select('*, track:tracks(*)')
    .single();

  if (error) {
    console.error('Error enrolling user in track:', error);
    throw new Error('트랙 등록에 실패했습니다: ' + (error.message || JSON.stringify(error)));
  }

  return data;
}

export async function getUserTracks(userId: string): Promise<UserTrack[]> {
  const supabase = createClient();
  
  console.log('[getUserTracks] Fetching tracks for user:', userId);
  
  const { data, error } = await supabase
    .from('user_tracks')
    .select('*, track:tracks(*)')
    .eq('user_id', userId)
    .eq('is_active', true);

  if (error) {
    console.error('❌ [getUserTracks] Error:', {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
      fullError: error,
    });
    return []; // Return empty array instead of throwing to prevent app crash
  }

  console.log('✅ [getUserTracks] Success:', data?.length || 0, 'tracks found');
  return data || [];
}

// ============================================
// CERTIFICATION OPERATIONS
// ============================================

export async function submitCertification(data: {
  user_id: string;
  track_id: string;
  user_track_id: string;
  certification_url: string;
  certification_date: string;
}): Promise<Certification | null> {
  const supabase = createClient();
  
  const { data: certification, error } = await supabase
    .from('certifications')
    .upsert({
      user_id: data.user_id,
      track_id: data.track_id,
      user_track_id: data.user_track_id,
      certification_url: data.certification_url,
      certification_date: data.certification_date,
      status: 'submitted',
    })
    .select()
    .single();

  if (error) {
    console.error('Error submitting certification:', error);
    return null;
  }

  return certification;
}

export async function getCertifications(
  userId: string,
  trackId?: string,
  year?: number,
  month?: number
): Promise<Certification[]> {
  const supabase = createClient();
  
  let query = supabase
    .from('certifications')
    .select('*, track:tracks(*)')
    .eq('user_id', userId)
    .in('status', ['submitted', 'approved'])
    .order('certification_date', { ascending: false });

  if (trackId) {
    query = query.eq('track_id', trackId);
  }

  if (year && month) {
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = `${year}-${String(month).padStart(2, '0')}-31`;
    query = query.gte('certification_date', startDate).lte('certification_date', endDate);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching certifications:', error);
    return [];
  }

  return data || [];
}

export async function getCalendarCertifications(
  userId: string,
  trackId: string,
  year: number,
  month: number
): Promise<CalendarCertification[]> {
  const certifications = await getCertifications(userId, trackId, year, month);
  
  // Convert to calendar format
  const calendarData: CalendarCertification[] = [];
  const daysInMonth = new Date(year, month, 0).getDate();

  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const certification = certifications.find(c => c.certification_date === dateStr);
    
    calendarData.push({
      date: dateStr,
      certified: !!certification,
      certification: certification || undefined,
    });
  }

  return calendarData;
}

// ============================================
// LEADERBOARD OPERATIONS
// ============================================

export async function getLeaderboard(trackId?: string, limit: number = 100): Promise<LeaderboardEntry[]> {
  const supabase = createClient();
  
  const { data, error } = await supabase.rpc('get_leaderboard', {
    p_track_id: trackId || null,
    p_limit: limit,
  });

  if (error) {
    console.error('Error fetching leaderboard:', error);
    return [];
  }

  return data || [];
}

// ============================================
// TITLE OPERATIONS
// ============================================

export async function getUserTitles(userId: string): Promise<UserTitle[]> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('user_titles')
    .select('*, title:titles(*), track:tracks(*)')
    .eq('user_id', userId)
    .order('earned_at', { ascending: false });

  if (error) {
    console.error('Error fetching user titles:', error);
    return [];
  }

  return data || [];
}

export async function getAllTitles(): Promise<Title[]> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('titles')
    .select('*')
    .eq('is_active', true)
    .order('display_order');

  if (error) {
    console.error('Error fetching titles:', error);
    return [];
  }

  return data || [];
}

// ============================================
// STREAK OPERATIONS
// ============================================

export async function getUserStreak(userId: string, trackId: string): Promise<number> {
  const supabase = createClient();
  
  const { data, error } = await supabase.rpc('get_user_streak', {
    p_user_id: userId,
    p_track_id: trackId,
  });

  if (error) {
    console.error('Error fetching user streak:', error);
    return 0;
  }

  return data || 0;
}

export async function getUserTotalCertifications(userId: string, trackId?: string): Promise<number> {
  const supabase = createClient();
  
  const { data, error } = await supabase.rpc('get_user_total_certifications', {
    p_user_id: userId,
    p_track_id: trackId || null,
  });

  if (error) {
    console.error('Error fetching total certifications:', error);
    return 0;
  }

  return data || 0;
}

// ============================================
// ADMIN OPERATIONS
// ============================================

export async function isUserAdmin(userId: string): Promise<boolean> {
  const supabase = createClient();
  
  const { data, error } = await supabase.rpc('is_admin', {
    check_user_id: userId,
  });

  if (error) {
    console.error('Error checking admin status:', error);
    return false;
  }

  return data || false;
}

export async function getAdminStats() {
  const supabase = createClient();
  
  // Get total users
  const { count: totalUsers } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true);

  // Get today's certifications
  const today = new Date().toISOString().split('T')[0];
  const { count: todayCertifications } = await supabase
    .from('certifications')
    .select('*', { count: 'exact', head: true })
    .eq('certification_date', today);

  // Get dropout candidates (users with warnings)
  const { count: dropoutCandidates } = await supabase
    .from('user_tracks')
    .select('*', { count: 'exact', head: true })
    .gt('dropout_warnings', 0)
    .eq('is_active', true);

  return {
    totalUsers: totalUsers || 0,
    todayCertifications: todayCertifications || 0,
    dropoutCandidates: dropoutCandidates || 0,
  };
}

export async function getAllUsersWithStats() {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('users')
    .select(`
      *,
      user_tracks!inner(
        id,
        track_id,
        is_active,
        dropout_warnings,
        track:tracks(*)
      )
    `)
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching users with stats:', error);
    return [];
  }

  return data || [];
}

export async function getDropoutCandidates() {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('user_tracks')
    .select(`
      *,
      user:users(*),
      track:tracks(*)
    `)
    .gt('dropout_warnings', 0)
    .eq('is_active', true)
    .order('dropout_warnings', { ascending: false });

  if (error) {
    console.error('Error fetching dropout candidates:', error);
    return [];
  }

  return data || [];
}

// ============================================
// MISSION CONTENT OPERATIONS
// ============================================

export async function getMissionContent(trackId: string, date: string): Promise<any | null> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('mission_contents')
    .select('*')
    .eq('track_id', trackId)
    .eq('target_date', date)
    .maybeSingle();

  if (error) {
    console.error('Error fetching mission content:', error);
    return null;
  }

  return data;
}

export async function createCertification(certData: {
  user_id: string;
  track_id: string;
  certification_date: string;
  certification_url: string;
  status?: 'pending' | 'approved' | 'rejected' | 'completed';
}): Promise<Certification | null> {
  const supabase = createClient();
  
  // First check if certification already exists for this date and track
  const { data: existing } = await supabase
    .from('certifications')
    .select('*')
    .eq('user_id', certData.user_id)
    .eq('track_id', certData.track_id)
    .eq('certification_date', certData.certification_date)
    .maybeSingle();

  if (existing) {
    // Update existing certification
    const { data, error } = await supabase
      .from('certifications')
      .update({
        certification_url: certData.certification_url,
        status: certData.status || 'completed',
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating certification:', error);
      return null;
    }

    return data;
  } else {
    // Create new certification
    const { data, error } = await supabase
      .from('certifications')
      .insert({
        user_id: certData.user_id,
        track_id: certData.track_id,
        certification_date: certData.certification_date,
        certification_url: certData.certification_url,
        status: certData.status || 'completed',
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating certification:', error);
      return null;
    }

    return data;
  }
}

export async function getCertificationByDateAndTrack(
  userId: string,
  trackId: string,
  date: string
): Promise<Certification | null> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('certifications')
    .select('*')
    .eq('user_id', userId)
    .eq('track_id', trackId)
    .eq('certification_date', date)
    .maybeSingle();

  if (error) {
    console.error('Error fetching certification:', error);
    return null;
  }

  return data;
}

export async function getLastCertificationDate(
  userId: string,
  trackId: string
): Promise<Date | null> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('certifications')
    .select('certification_date')
    .eq('user_id', userId)
    .eq('track_id', trackId)
    .order('certification_date', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('Error fetching last certification date:', error);
    return null;
  }

  if (!data) {
    return null;
  }

  return new Date(data.certification_date);
}

// ============================================
// ADMIN USER-TRACK MANAGEMENT
// ============================================

export async function assignUserToTracks(
  userId: string,
  trackIds: string[]
): Promise<boolean> {
  const supabase = createClient();
  
  try {
    // 1. 모든 트랙 비활성화
    await supabase
      .from('user_tracks')
      .update({ is_active: false })
      .eq('user_id', userId);

    // 2. 선택된 트랙들 활성화 또는 생성
    if (trackIds.length > 0) {
      const tracksToUpsert = trackIds.map(trackId => ({
        user_id: userId,
        track_id: trackId,
        is_active: true,
        dropout_warnings: 0,
      }));

      const { error } = await supabase
        .from('user_tracks')
        .upsert(tracksToUpsert, {
          onConflict: 'user_id,track_id',
        });

      if (error) {
        console.error('Error assigning user to tracks:', error);
        return false;
      }
    }

    return true;
  } catch (error) {
    console.error('Error in assignUserToTracks:', error);
    return false;
  }
}

export async function getUsersWithTracks(): Promise<any[]> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('users')
    .select(`
      *,
      user_tracks(
        id,
        track_id,
        is_active,
        track:tracks(*)
      )
    `)
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching users with tracks:', error);
    return [];
  }

  return data || [];
}


