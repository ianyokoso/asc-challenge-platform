// Supabase database operations
import { createClient } from './client';
import {
  toKSTMidnight,
  isBeforeKST,
  isAfterKST,
  isWithinRangeKST,
} from '../utils/date-helpers';
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

export async function getTrackParticipantCount(
  trackId: string,
): Promise<number> {
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

export async function getAllTracksWithParticipants(): Promise<
  (Track & { participant_count: number })[]
> {
  const supabase = createClient();

  const { data: tracks, error: tracksError } = await supabase
    .from('tracks')
    .select('*')
    .eq('is_active', true)
    .order('type');

  if (tracksError) {
    console.error('Error fetching tracks:', tracksError);
    return [];
  }

  const { data: userTracks, error: userTracksError } = await supabase
    .from('user_tracks')
    .select('track_id')
    .eq('is_active', true);

  if (userTracksError) {
    console.error('Error fetching user tracks:', userTracksError);
    return [];
  }

  const participantCounts = userTracks.reduce(
    (acc, userTrack) => {
      acc[userTrack.track_id] = (acc[userTrack.track_id] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  const tracksWithCounts = tracks.map((track) => ({
    ...track,
    participant_count: participantCounts[track.id] || 0,
  }));

  return tracksWithCounts;
}

// ============================================
// USER TRACK OPERATIONS
// ============================================

export async function enrollUserInTrack(
  userId: string,
  trackId: string,
): Promise<UserTrack | null> {
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
        throw new Error(
          '트랙 재활성화에 실패했습니다: ' +
            (updateError.message || JSON.stringify(updateError)),
        );
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
    throw new Error(
      '트랙 등록에 실패했습니다: ' + (error.message || JSON.stringify(error)),
    );
  }

  return data;
}

export async function getUserTracks(userId: string): Promise<UserTrack[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('user_tracks')
    .select('*, track:tracks(*)')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('track(type)', {
      ascending: true,
      foreignTable: 'tracks',
    });

  if (error) {
    console.error('Error getUserTracks:', {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
      fullError: error,
    });
    return []; // Return empty array instead of throwing to prevent app crash
  }

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
  notes?: string;
}): Promise<Certification | null> {
  const supabase = createClient();

  try {
    // 1. 활성 기수 조회
    const { data: activePeriod, error: periodError } = await supabase
      .from('periods')
      .select('*')
      .eq('is_active', true)
      .maybeSingle();

    if (periodError) {
      console.error('Error fetching active period:', periodError);
    }

    // 2. 인증 날짜가 활성 기수 기간 내에 있는지 확인 (KST 기준)
    if (activePeriod) {
      const certDate = toKSTMidnight(data.certification_date);
      const startDate = toKSTMidnight(activePeriod.start_date);
      const endDate = toKSTMidnight(activePeriod.end_date);

      const isWithinPeriod = isWithinRangeKST(certDate, startDate, endDate);

      // 시작일 이전
      if (isBeforeKST(certDate, startDate)) {
        throw new Error(
          `${activePeriod.term_number}기는 ${activePeriod.start_date}부터 시작됩니다.`,
        );
      }

      // 종료일 이후
      if (isAfterKST(certDate, endDate)) {
        throw new Error(
          `${activePeriod.term_number}기는 ${activePeriod.end_date}에 종료되었습니다.`,
        );
      }
    }

    // 3. 인증 제출 (period_id 자동 할당)
    const { data: certification, error } = await supabase
      .from('certifications')
      .upsert({
        user_id: data.user_id,
        track_id: data.track_id,
        user_track_id: data.user_track_id,
        certification_url: data.certification_url,
        certification_date: data.certification_date,
        status: 'submitted',
        period_id: activePeriod?.id || null, // 활성 기수 ID 자동 할당
        notes: data.notes,
      })
      .select()
      .single();

    if (error) {
      console.error('Error submitting certification:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
        fullError: error,
      });
      throw new Error(`인증 제출 실패: ${error.message || '알 수 없는 오류'}`);
    }
    return certification;
  } catch (err: any) {
    console.error('Critical error:', err);
    throw err;
  }
}

export async function getCertifications(
  userId: string,
  trackId?: string,
  year?: number,
  month?: number,
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
    query = query
      .gte('certification_date', startDate)
      .lte('certification_date', endDate);
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
  month: number,
): Promise<CalendarCertification[]> {
  const certifications = await getCertifications(userId, trackId, year, month);

  // Convert to calendar format
  const calendarData: CalendarCertification[] = [];
  const daysInMonth = new Date(year, month, 0).getDate();

  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(
      day,
    ).padStart(2, '0')}`;
    const certification = certifications.find(
      (c) => c.certification_date === dateStr,
    );

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

export async function getLeaderboard(
  trackId?: string,
  limit: number = 100,
  isAdmin: boolean = false,
): Promise<LeaderboardEntry[]> {
  const supabase = createClient();

  // 관리자용 함수 사용 여부 결정
  const rpcFunction = isAdmin ? 'get_admin_leaderboard' : 'get_leaderboard';

  const { data, error } = await supabase.rpc(rpcFunction, {
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

export async function getUserStreak(
  userId: string,
  trackId: string,
): Promise<number> {
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

export async function getUserTotalCertifications(
  userId: string,
  trackId?: string,
): Promise<number> {
  const supabase = createClient();

  const { data, error } = await supabase.rpc(
    'get_user_total_certifications',
    {
      p_user_id: userId,
      p_track_id: trackId || null,
    },
  );

  if (error) {
    console.error('Error fetching total certifications:', error);
    return 0;
  }

  return data || 0;
}

// ============================================
// ADMIN OPERATIONS
// ============================================

// Admin functions are now in src/lib/supabase/admin.ts
export {
  isUserAdmin,
  getAdminStats,
  getAllUsersWithStats,
  getDropoutCandidates,
} from './admin';

// ============================================
// MISSION CONTENT OPERATIONS
// ============================================

export async function getMissionContent(
  trackId: string,
  date: string,
): Promise<any | null> {
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
  date: string,
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
  trackId: string,
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

// Admin track management functions are now in src/lib/supabase/admin.ts
export { assignUserToTracks, getUsersWithTracks } from './admin';
