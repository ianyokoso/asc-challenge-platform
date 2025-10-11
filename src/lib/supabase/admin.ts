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
    
    // 1. 먼저 기존 user_tracks를 조회
    console.log('[assignUserToTracks] Fetching existing tracks...');
    const { data: existingTracks, error: fetchError } = await supabase
      .from('user_tracks')
      .select('id, track_id')
      .eq('user_id', userId);

    if (fetchError) {
      console.error('[assignUserToTracks] Error fetching existing tracks:', fetchError);
      throw new Error(`기존 트랙 조회 실패: ${fetchError.message}`);
    }

    console.log('[assignUserToTracks] Existing tracks:', existingTracks);

    // 2. 제거할 트랙과 유지할 트랙을 구분
    const existingTrackIds = existingTracks?.map(t => t.track_id) || [];
    const tracksToRemove = existingTracks?.filter(t => !trackIds.includes(t.track_id)) || [];
    const tracksToAdd = trackIds.filter(id => !existingTrackIds.includes(id));

    console.log('[assignUserToTracks] Tracks to remove:', tracksToRemove.map(t => t.track_id));
    console.log('[assignUserToTracks] Tracks to add:', tracksToAdd);

    // 3. 제거할 트랙이 있으면 해당 user_track_id를 가진 인증 레코드의 user_track_id를 NULL로 설정
    if (tracksToRemove.length > 0) {
      const userTrackIdsToRemove = tracksToRemove.map(t => t.id);
      
      console.log('[assignUserToTracks] 🔄 User track IDs to remove:', userTrackIdsToRemove);
      
      // 먼저 영향받는 인증 레코드 확인
      console.log('[assignUserToTracks] 🔍 Checking certifications with these user_track_ids...');
      const { data: affectedCerts, error: checkError } = await supabase
        .from('certifications')
        .select('id, user_track_id')
        .in('user_track_id', userTrackIdsToRemove);
      
      console.log('[assignUserToTracks] 📋 Affected certifications:', affectedCerts);
      
      if (affectedCerts && affectedCerts.length > 0) {
        console.log('[assignUserToTracks] 🔄 Updating certifications to NULL for removed tracks...');
        const { data: updatedData, error: certUpdateError } = await supabase
          .from('certifications')
          .update({ user_track_id: null })
          .in('user_track_id', userTrackIdsToRemove)
          .select();

        if (certUpdateError) {
          console.error('[assignUserToTracks] ❌ Error updating certifications:', certUpdateError);
          throw new Error(`인증 레코드 업데이트 실패: ${certUpdateError.message}`);
        }
        
        console.log('[assignUserToTracks] ✅ Updated certifications:', updatedData);
      } else {
        console.log('[assignUserToTracks] ℹ️ No certifications to update');
      }

      console.log('[assignUserToTracks] 🗑️ Deleting removed tracks...');
      const { data: deletedData, error: deleteError } = await supabase
        .from('user_tracks')
        .delete()
        .eq('user_id', userId)
        .in('id', userTrackIdsToRemove)
        .select();

      if (deleteError) {
        console.error('[assignUserToTracks] ❌ Error deleting tracks:', deleteError);
        throw new Error(`트랙 삭제 실패: ${deleteError.message}`);
      }

      console.log('[assignUserToTracks] ✅ Successfully deleted tracks:', deletedData);
    }

    // 4. 새로운 트랙 추가
    if (tracksToAdd.length > 0) {
      console.log('[assignUserToTracks] Inserting new tracks...');
      const tracksToInsert = tracksToAdd.map(trackId => ({
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
        throw new Error(`트랙 추가 실패: ${insertError.message}`);
      }
      
      console.log('[assignUserToTracks] Successfully inserted new tracks');
    }
    
    console.log(`[assignUserToTracks] Successfully assigned ${trackIds.length} tracks to user ${userId}`);
    return true;
  } catch (error: any) {
    console.error('[assignUserToTracks] Unexpected error:', error);
    throw error; // 에러를 상위로 전파하여 토스트 메시지에 표시
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

