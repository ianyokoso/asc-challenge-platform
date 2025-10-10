import { createClient } from './client';
import type { Track } from './types';

// ============================================
// ADMIN USER-TRACK MANAGEMENT
// ============================================

/**
 * 사용자에게 트랙을 배정합니다.
 * 기존 트랙을 모두 제거하고 새로운 트랙으로 교체합니다.
 * 
 * @param userId - 사용자 ID
 * @param trackIds - 배정할 트랙 ID 배열
 * @returns 성공 여부
 */
export async function assignUserToTracks(
  userId: string,
  trackIds: string[]
): Promise<boolean> {
  const supabase = createClient();
  
  try {
    console.log(`[assignUserToTracks] Starting assignment for user ${userId} with tracks:`, trackIds);
    
    // 빈 배열은 허용하지 않음
    if (trackIds.length === 0) {
      console.error('[assignUserToTracks] Error: Empty track IDs array');
      return false;
    }
    
    // 1. 기존 트랙 모두 삭제
    console.log('[assignUserToTracks] Deleting existing tracks...');
    const { error: deleteError } = await supabase
      .from('user_tracks')
      .delete()
      .eq('user_id', userId);

    if (deleteError) {
      console.error('[assignUserToTracks] Error deleting existing tracks:', deleteError);
      return false;
    }

    console.log('[assignUserToTracks] Successfully deleted existing tracks');

    // 2. 새로운 트랙 추가
    console.log('[assignUserToTracks] Inserting new tracks...');
    const tracksToInsert = trackIds.map(trackId => ({
      user_id: userId,
      track_id: trackId,
      is_active: true,
      dropout_warnings: 0,
    }));

    const { error: insertError } = await supabase
      .from('user_tracks')
      .insert(tracksToInsert);

    if (insertError) {
      console.error('[assignUserToTracks] Error inserting new tracks:', insertError);
      return false;
    }
    
    console.log('[assignUserToTracks] Successfully inserted new tracks');
    console.log(`[assignUserToTracks] Successfully assigned ${trackIds.length} tracks to user ${userId}`);
    return true;
  } catch (error) {
    console.error('[assignUserToTracks] Unexpected error:', error);
    return false;
  }
}

/**
 * 모든 사용자와 그들의 트랙 정보를 가져옵니다.
 * 트랙이 없는 사용자도 포함됩니다.
 * 
 * @returns 사용자 목록 (트랙 정보 포함)
 */
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
        dropout_warnings,
        track:tracks(*)
      )
    `)
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching users with tracks:', error);
    return [];
  }

  // Filter to only show active tracks in the returned data
  const usersWithActiveTracks = (data || []).map(user => ({
    ...user,
    user_tracks: user.user_tracks?.filter((ut: any) => ut.is_active) || [],
  }));

  return usersWithActiveTracks;
}

/**
 * 관리자 통계 정보를 가져옵니다.
 */
export async function getAdminStats() {
  const supabase = createClient();
  
  // 전체 사용자 수
  const { count: totalUsers } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true);

  // 오늘의 인증 수
  const today = new Date().toISOString().split('T')[0];
  const { count: todayCertifications } = await supabase
    .from('certifications')
    .select('*', { count: 'exact', head: true })
    .eq('certification_date', today);

  // 경고 대상자 수
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

/**
 * 탈락 위기 사용자 목록을 가져옵니다.
 */
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

/**
 * 모든 사용자와 통계를 가져옵니다.
 */
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

/**
 * 사용자의 관리자 권한을 확인합니다.
 * 
 * @param userId - 확인할 사용자 ID
 * @returns 관리자 여부
 */
export async function isUserAdmin(userId: string): Promise<boolean> {
  const supabase = createClient();
  
  console.log('🔍 [isUserAdmin] Checking admin status for user:', userId);
  
  const { data, error } = await supabase.rpc('is_admin', {
    check_user_id: userId,
  });

  if (error) {
    console.error('❌ [isUserAdmin] Error checking admin status:', error);
    return false;
  }

  console.log('✅ [isUserAdmin] Admin check result:', data);
  return data || false;
}

