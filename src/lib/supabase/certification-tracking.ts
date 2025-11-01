/**
 * 트랙별 인증 현황 추적 관련 함수
 * 관리자가 모든 참여자의 인증 현황을 한눈에 볼 수 있도록 데이터 제공
 */

import { createClient } from './client';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isWeekend, getDay } from 'date-fns';

export interface CertificationTrackingData {
  userId: string;
  discordUsername: string;
  discordAvatarUrl: string | null;
  tracks: {
    [trackId: string]: {
      trackName: string;
      trackType: string;
      certifications: {
        [date: string]: {
          status: 'certified' | 'pending' | 'missing' | 'not-required';
          url: string | null;
          submittedAt: string | null;
          notes: string | null;
        };
      };
      totalCertified: number;
      totalRequired: number;
      completionRate: number;
    };
  };
}

export interface TrackCertificationSummary {
  trackId: string;
  trackName: string;
  trackType: string;
  participants: {
    userId: string;
    discordUsername: string;
    discordAvatarUrl: string | null;
    certifications: {
      [date: string]: {
        status: 'certified' | 'pending' | 'missing' | 'not-required';
        url: string | null;
        submittedAt: string | null;
        notes: string | null;
      };
    };
    totalCertified: number;
    totalRequired: number;
    completionRate: number;
  }[];
  dates: string[]; // 해당 트랙의 인증 필요 날짜 목록
}

export interface CertificationFeedItem {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string | null;
  trackId: string;
  trackName: string;
  trackType: string;
  certificationDate: string;
  submittedAt: string;
  notes: string | null;
  url: string | null;
  status: string;
}

/**
 * 특정 트랙 타입에 대해 인증이 필요한 날짜인지 확인
 */
function isRequiredDate(date: Date, trackType: string): boolean {
  const dayOfWeek = getDay(date);
  
  switch (trackType) {
    case 'short-form':
      // 월~금 (1-5)
      return dayOfWeek >= 1 && dayOfWeek <= 5;
    case 'long-form':
    case 'builder':
      // 일요일 (0)
      return dayOfWeek === 0;
    case 'sales':
      // 화요일 (2)
      return dayOfWeek === 2;
    default:
      return false;
  }
}

/**
 * 특정 월의 트랙별 인증이 필요한 날짜 목록 생성
 */
function getRequiredDates(year: number, month: number, trackType: string): string[] {
  const start = startOfMonth(new Date(year, month - 1));
  const end = endOfMonth(new Date(year, month - 1));
  const allDates = eachDayOfInterval({ start, end });
  
  return allDates
    .filter(date => isRequiredDate(date, trackType))
    .map(date => format(date, 'yyyy-MM-dd'));
}

/**
 * 모든 트랙의 인증 현황 데이터 조회 (관리자 전용)
 */
export async function getAllTracksCertificationData(
  year: number,
  month: number
): Promise<TrackCertificationSummary[]> {
  const supabase = createClient();
  
  try {
    console.log('[getAllTracksCertificationData] 🚀 Fetching data for:', { year, month });
    
    // 1. 모든 트랙 정보 가져오기
    const { data: tracks, error: tracksError } = await supabase
      .from('tracks')
      .select('id, name, type')
      .eq('is_active', true);

    if (tracksError) {
      console.error('[getAllTracksCertificationData] ❌ Error fetching tracks:', tracksError);
      throw tracksError;
    }

    if (!tracks || tracks.length === 0) {
      console.log('[getAllTracksCertificationData] ⚠️ No active tracks found');
      return [];
    }
    
    console.log('[getAllTracksCertificationData] ✅ Found tracks:', tracks.length);

    // 2. 각 트랙별로 데이터 처리
    const trackSummaries: TrackCertificationSummary[] = [];

    for (const track of tracks) {
      // 해당 트랙의 인증 필요 날짜 목록
      const requiredDates = getRequiredDates(year, month, track.type);

      // 해당 트랙에 참여하는 모든 사용자 조회
      const { data: userTracks, error: userTracksError } = await supabase
        .from('user_tracks')
        .select(`
          user_id,
          user:users!inner(
            id,
            discord_username,
            discord_avatar_url
          )
        `)
        .eq('track_id', track.id)
        .eq('is_active', true);

      if (userTracksError) {
        console.error(`[getAllTracksCertificationData] Error fetching user tracks for ${track.name}:`, userTracksError);
        continue;
      }

      if (!userTracks || userTracks.length === 0) {
        // 참여자가 없는 트랙도 표시
        trackSummaries.push({
          trackId: track.id,
          trackName: track.name,
          trackType: track.type,
          participants: [],
          dates: requiredDates,
        });
        continue;
      }

      // 해당 트랙의 해당 월 모든 인증 데이터 조회
      const startDate = format(startOfMonth(new Date(year, month - 1)), 'yyyy-MM-dd');
      const endDate = format(endOfMonth(new Date(year, month - 1)), 'yyyy-MM-dd');

      const { data: certifications, error: certificationsError } = await supabase
        .from('certifications')
        .select('user_id, certification_date, certification_url, submitted_at, status, notes')
        .eq('track_id', track.id)
        .gte('certification_date', startDate)
        .lte('certification_date', endDate);

      if (certificationsError) {
        console.error(`[getAllTracksCertificationData] ❌ Error fetching certifications for ${track.name}:`, certificationsError);
      } else {
        console.log(`[getAllTracksCertificationData] ✅ Fetched ${certifications?.length || 0} certifications for ${track.name}`);
      }

      // 사용자별로 인증 데이터 매핑
      const participants = userTracks.map((ut: any) => {
        const user = ut.user;
        const userCerts = certifications?.filter(c => c.user_id === user.id) || [];
        
        // 날짜별 인증 상태 맵핑
        const certificationsByDate: {
          [date: string]: {
            status: 'certified' | 'pending' | 'missing' | 'not-required';
            url: string | null;
            submittedAt: string | null;
          };
        } = {};

        requiredDates.forEach(date => {
          const cert = userCerts.find(c => c.certification_date === date);
          
          if (cert) {
            // 상태 판단: submitted 또는 approved는 certified로 표시
            const certStatus = (cert.status === 'approved' || cert.status === 'submitted') 
              ? 'certified' 
              : (cert.status === 'rejected' ? 'missing' : 'pending');
            
            certificationsByDate[date] = {
              status: certStatus,
              url: cert.certification_url,
              submittedAt: cert.submitted_at,
              notes: cert.notes,
            };
            
            console.log(`[getAllTracksCertificationData] 📅 ${user.discord_username} - ${date}: ${cert.status} → ${certStatus}`);
          } else {
            // 오늘 이후 날짜는 'not-required', 이전 날짜는 'missing'
            const today = format(new Date(), 'yyyy-MM-dd');
            certificationsByDate[date] = {
              status: date > today ? 'not-required' : 'missing',
              url: null,
              submittedAt: null,
              notes: null,
            };
          }
        });

        const totalCertified = Object.values(certificationsByDate).filter(c => c.status === 'certified').length;
        const totalRequired = requiredDates.filter(date => date <= format(new Date(), 'yyyy-MM-dd')).length;
        const completionRate = totalRequired > 0 ? (totalCertified / totalRequired) * 100 : 0;

        return {
          userId: user.id,
          discordUsername: user.discord_username || 'Unknown User',
          discordAvatarUrl: user.discord_avatar_url,
          certifications: certificationsByDate,
          totalCertified,
          totalRequired,
          completionRate: Math.round(completionRate * 10) / 10, // 소수점 1자리
        };
      });

      trackSummaries.push({
        trackId: track.id,
        trackName: track.name,
        trackType: track.type,
        participants,
        dates: requiredDates,
      });
    }

    console.log('[getAllTracksCertificationData] ✅ Successfully processed', trackSummaries.length, 'tracks');
    return trackSummaries;
  } catch (error) {
    console.error('[getAllTracksCertificationData] ❌ Unexpected error:', error);
    throw error;
  }
}

/**
 * 특정 트랙의 인증 현황 데이터 조회
 */
export async function getTrackCertificationData(
  trackId: string,
  year: number,
  month: number
): Promise<TrackCertificationSummary | null> {
  const supabase = createClient();
  
  try {
    // 1. 트랙 정보 가져오기
    const { data: track, error: trackError } = await supabase
      .from('tracks')
      .select('id, name, type')
      .eq('id', trackId)
      .eq('is_active', true)
      .maybeSingle();

    if (trackError) {
      console.error('[getTrackCertificationData] Error fetching track:', trackError);
      throw trackError;
    }

    if (!track) {
      return null;
    }

    // 해당 트랙의 인증 필요 날짜 목록
    const requiredDates = getRequiredDates(year, month, track.type);

    // 2. 해당 트랙에 참여하는 모든 사용자 조회
    const { data: userTracks, error: userTracksError } = await supabase
      .from('user_tracks')
      .select(`
        user_id,
        user:users!inner(
          id,
          discord_username,
          discord_avatar_url
        )
      `)
      .eq('track_id', track.id)
      .eq('is_active', true);

    if (userTracksError) {
      console.error('[getTrackCertificationData] Error fetching user tracks:', userTracksError);
      throw userTracksError;
    }

    if (!userTracks || userTracks.length === 0) {
      return {
        trackId: track.id,
        trackName: track.name,
        trackType: track.type,
        participants: [],
        dates: requiredDates,
      };
    }

    // 3. 해당 트랙의 해당 월 모든 인증 데이터 조회
    const startDate = format(startOfMonth(new Date(year, month - 1)), 'yyyy-MM-dd');
    const endDate = format(endOfMonth(new Date(year, month - 1)), 'yyyy-MM-dd');

    const { data: certifications, error: certificationsError } = await supabase
      .from('certifications')
      .select('user_id, certification_date, certification_url, submitted_at, status, notes')
      .eq('track_id', track.id)
      .gte('certification_date', startDate)
      .lte('certification_date', endDate);

    if (certificationsError) {
      console.error('[getTrackCertificationData] Error fetching certifications:', certificationsError);
      throw certificationsError;
    }

    // 4. 사용자별로 인증 데이터 매핑
    const participants = userTracks.map((ut: any) => {
      const user = ut.user;
      const userCerts = certifications?.filter(c => c.user_id === user.id) || [];
      
      // 날짜별 인증 상태 맵핑
      const certificationsByDate: {
        [date: string]: {
          status: 'certified' | 'pending' | 'missing' | 'not-required';
          url: string | null;
          submittedAt: string | null;
        };
      } = {};

      requiredDates.forEach(date => {
        const cert = userCerts.find(c => c.certification_date === date);
        
        if (cert) {
          // 상태 판단: submitted 또는 approved는 certified로 표시
          const certStatus = (cert.status === 'approved' || cert.status === 'submitted') 
            ? 'certified' 
            : (cert.status === 'rejected' ? 'missing' : 'pending');
          
          certificationsByDate[date] = {
            status: certStatus,
            url: cert.certification_url,
            submittedAt: cert.submitted_at,
            notes: cert.notes,
          };
        } else {
          // 오늘 이후 날짜는 'not-required', 이전 날짜는 'missing'
          const today = format(new Date(), 'yyyy-MM-dd');
          certificationsByDate[date] = {
            status: date > today ? 'not-required' : 'missing',
            url: null,
            submittedAt: null,
            notes: null,
          };
        }
      });

      const totalCertified = Object.values(certificationsByDate).filter(c => c.status === 'certified').length;
      const totalRequired = requiredDates.filter(date => date <= format(new Date(), 'yyyy-MM-dd')).length;
      const completionRate = totalRequired > 0 ? (totalCertified / totalRequired) * 100 : 0;

      return {
        userId: user.id,
        discordUsername: user.discord_username || 'Unknown User',
        discordAvatarUrl: user.discord_avatar_url,
        certifications: certificationsByDate,
        totalCertified,
        totalRequired,
        completionRate: Math.round(completionRate * 10) / 10,
      };
    });

    return {
      trackId: track.id,
      trackName: track.name,
      trackType: track.type,
      participants,
      dates: requiredDates,
    };
  } catch (error) {
    console.error('[getTrackCertificationData] Unexpected error:', error);
    throw error;
  }
}

/**
 * 빌더/세일즈 트랙의 인증 피드 데이터 조회 (관리자 전용)
 * 시간순으로 정렬된 인증 목록 반환
 */
export async function getTrackCertificationFeed(
  trackType: 'builder' | 'sales',
  periodId?: string
): Promise<CertificationFeedItem[]> {
  const supabase = createClient();
  
  try {
    console.log('[getTrackCertificationFeed] 🚀 Fetching feed for:', { trackType, periodId });
    
    // 1. 해당 타입의 트랙 찾기
    const { data: track, error: trackError } = await supabase
      .from('tracks')
      .select('id, name, type')
      .eq('type', trackType)
      .eq('is_active', true)
      .maybeSingle();

    if (trackError) {
      console.error('[getTrackCertificationFeed] Error fetching track:', trackError);
      throw trackError;
    }

    if (!track) {
      console.log('[getTrackCertificationFeed] No active track found for type:', trackType);
      return [];
    }

    // 2. 인증 데이터 조회 (기수 필터링 포함)
    let query = supabase
      .from('certifications')
      .select(`
        id,
        user_id,
        track_id,
        certification_date,
        certification_url,
        submitted_at,
        notes,
        status,
        user:users!inner(
          id,
          discord_username,
          discord_avatar_url
        )
      `)
      .eq('track_id', track.id)
      .in('status', ['submitted', 'approved']) // 제출/승인된 인증만
      .order('submitted_at', { ascending: false }); // 최신순

    // 기수 필터링 (periodId가 제공된 경우)
    if (periodId) {
      // user_tracks를 통해 해당 기수의 사용자만 필터링
      const { data: userTracksData, error: userTracksError } = await supabase
        .from('user_tracks')
        .select('user_id')
        .eq('track_id', track.id)
        .eq('period_id', periodId)
        .eq('is_active', true);

      if (userTracksError) {
        console.error('[getTrackCertificationFeed] Error fetching user tracks:', userTracksError);
        throw userTracksError;
      }

      if (!userTracksData || userTracksData.length === 0) {
        console.log('[getTrackCertificationFeed] No users in this period');
        return [];
      }

      const userIds = userTracksData.map(ut => ut.user_id);
      query = query.in('user_id', userIds);
    }

    const { data: certifications, error: certificationsError } = await query;

    if (certificationsError) {
      console.error('[getTrackCertificationFeed] Error fetching certifications:', certificationsError);
      throw certificationsError;
    }

    if (!certifications || certifications.length === 0) {
      console.log('[getTrackCertificationFeed] No certifications found');
      return [];
    }

    console.log('[getTrackCertificationFeed] ✅ Found', certifications.length, 'certifications');

    // 3. 데이터 변환
    const feedItems: CertificationFeedItem[] = certifications.map((cert: any) => ({
      id: cert.id,
      userId: cert.user_id,
      userName: cert.user?.discord_username || 'Unknown User',
      userAvatar: cert.user?.discord_avatar_url || null,
      trackId: track.id,
      trackName: track.name,
      trackType: track.type,
      certificationDate: cert.certification_date,
      submittedAt: cert.submitted_at,
      notes: cert.notes,
      url: cert.certification_url,
      status: cert.status,
    }));

    return feedItems;
  } catch (error) {
    console.error('[getTrackCertificationFeed] Unexpected error:', error);
    throw error;
  }
}

