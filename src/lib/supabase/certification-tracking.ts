/**
 * 트랙별 인증 현황 추적 관련 함수
 * 관리자가 모든 참여자의 인증 현황을 한눈에 볼 수 있도록 데이터 제공
 */

import { createClient } from './client';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isWeekend, getDay } from 'date-fns';

export interface CertificationTrackingData {
  userId: string;
  userName: string;
  userAvatar: string | null;
  tracks: {
    [trackId: string]: {
      trackName: string;
      trackType: string;
      certifications: {
        [date: string]: {
          status: 'certified' | 'pending' | 'missing' | 'not-required';
          url: string | null;
          submittedAt: string | null;
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
    userName: string;
    userAvatar: string | null;
    certifications: {
      [date: string]: {
        status: 'certified' | 'pending' | 'missing' | 'not-required';
        url: string | null;
        submittedAt: string | null;
      };
    };
    totalCertified: number;
    totalRequired: number;
    completionRate: number;
  }[];
  dates: string[]; // 해당 트랙의 인증 필요 날짜 목록
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
    // 1. 모든 트랙 정보 가져오기
    const { data: tracks, error: tracksError } = await supabase
      .from('tracks')
      .select('id, name, type')
      .eq('is_active', true);

    if (tracksError) {
      console.error('[getAllTracksCertificationData] Error fetching tracks:', tracksError);
      throw tracksError;
    }

    if (!tracks || tracks.length === 0) {
      return [];
    }

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
        .select('user_id, certification_date, certification_url, submitted_at, status')
        .eq('track_id', track.id)
        .gte('certification_date', startDate)
        .lte('certification_date', endDate);

      if (certificationsError) {
        console.error(`[getAllTracksCertificationData] Error fetching certifications for ${track.name}:`, certificationsError);
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
            certificationsByDate[date] = {
              status: cert.status === 'approved' || cert.status === 'submitted' ? 'certified' : 'pending',
              url: cert.certification_url,
              submittedAt: cert.submitted_at,
            };
          } else {
            // 오늘 이후 날짜는 'not-required', 이전 날짜는 'missing'
            const today = format(new Date(), 'yyyy-MM-dd');
            certificationsByDate[date] = {
              status: date > today ? 'not-required' : 'missing',
              url: null,
              submittedAt: null,
            };
          }
        });

        const totalCertified = Object.values(certificationsByDate).filter(c => c.status === 'certified').length;
        const totalRequired = requiredDates.filter(date => date <= format(new Date(), 'yyyy-MM-dd')).length;
        const completionRate = totalRequired > 0 ? (totalCertified / totalRequired) * 100 : 0;

        return {
          userId: user.id,
          userName: user.discord_username || 'Unknown User',
          userAvatar: user.discord_avatar_url,
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

    return trackSummaries;
  } catch (error) {
    console.error('[getAllTracksCertificationData] Unexpected error:', error);
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
      .select('user_id, certification_date, certification_url, submitted_at, status')
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
          certificationsByDate[date] = {
            status: cert.status === 'approved' || cert.status === 'submitted' ? 'certified' : 'pending',
            url: cert.certification_url,
            submittedAt: cert.submitted_at,
          };
        } else {
          // 오늘 이후 날짜는 'not-required', 이전 날짜는 'missing'
          const today = format(new Date(), 'yyyy-MM-dd');
          certificationsByDate[date] = {
            status: date > today ? 'not-required' : 'missing',
            url: null,
            submittedAt: null,
          };
        }
      });

      const totalCertified = Object.values(certificationsByDate).filter(c => c.status === 'certified').length;
      const totalRequired = requiredDates.filter(date => date <= format(new Date(), 'yyyy-MM-dd')).length;
      const completionRate = totalRequired > 0 ? (totalCertified / totalRequired) * 100 : 0;

      return {
        userId: user.id,
        userName: user.discord_username || 'Unknown User',
        userAvatar: user.discord_avatar_url,
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

