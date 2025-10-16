// 관리자 대시보드 데이터 계산 API

import { createClient } from '@/lib/supabase/client';
import { TrackType } from '@/lib/supabase/types';

// KST 시간대 유틸리티
const KST_OFFSET = 9 * 60 * 60 * 1000; // 9시간 (밀리초)
const DAY = 24 * 60 * 60 * 1000;

const toKST = (date: Date) => new Date(date.getTime() + KST_OFFSET);
const startOfDayKST = (date: Date) => {
  const kst = toKST(date);
  return new Date(Date.UTC(kst.getUTCFullYear(), kst.getUTCMonth(), kst.getUTCDate()));
};
const getKSTDay = (date: Date) => toKST(date).getUTCDay(); // 0=일, 1=월, 2=화, ...

// 트랙별 오늘 대상 계산
function getTodayTargets(trackType: TrackType, today: Date): number {
  const dayOfWeek = getKSTDay(today);
  
  switch (trackType) {
    case 'short-form':
      // 월~금만 대상 (주말 제외)
      return (dayOfWeek >= 1 && dayOfWeek <= 5) ? 1 : 0;
    
    case 'long-form':
    case 'builder':
      // 일요일이면 대상
      return dayOfWeek === 0 ? 1 : 0;
    
    case 'sales':
      // 화요일이면 대상
      return dayOfWeek === 2 ? 1 : 0;
    
    default:
      return 0;
  }
}

// 트랙별 탈락 후보 계산 규칙
function getDropCandidates(trackType: TrackType, missCount: number): boolean {
  switch (trackType) {
    case 'short-form':
      // 숏폼: 5회 이상 미이행
      return missCount >= 5;
    
    case 'long-form':
    case 'builder':
    case 'sales':
      // 주간 트랙: 1회 이상 미이행
      return missCount >= 1;
    
    default:
      return false;
  }
}

// 대시보드 데이터 타입
export interface DashboardTrackData {
  key: TrackType;
  name: string;
  description: string;
  today: {
    completed: number;
    targets: number;
    rate: number;
  };
  dropCandidates: number;
  todayIsDue: boolean;
  badge?: string;
}

export interface DashboardData {
  cohort: {
    start: string;
    end: string;
    termNumber: number;
  };
  tracks: DashboardTrackData[];
}

/**
 * 관리자 대시보드 데이터 조회
 */
export async function getDashboardData(periodId?: string): Promise<DashboardData> {
  const supabase = createClient();
  
  try {
    // 활성 기수 정보 조회
    let periodQuery = supabase
      .from('periods')
      .select('*')
      .eq('is_active', true)
      .single();
    
    if (periodId) {
      periodQuery = supabase
        .from('periods')
        .select('*')
        .eq('id', periodId)
        .single();
    }
    
    const { data: period, error: periodError } = await periodQuery;
    
    if (periodError || !period) {
      throw new Error('활성 기수를 찾을 수 없습니다.');
    }

    // 현재 KST 기준 날짜
    const today = startOfDayKST(new Date());
    const todayStr = today.toISOString().split('T')[0];

    // 트랙 정보 조회
    const { data: tracks, error: tracksError } = await supabase
      .from('tracks')
      .select('*')
      .eq('is_active', true)
      .in('type', ['shortform', 'longform', 'builder', 'sales']);

    console.log('[getDashboardData] 🔍 Tracks query result:', {
      tracksFound: tracks?.length || 0,
      tracks: tracks?.map(t => ({ id: t.id, name: t.name, type: t.type })),
      error: tracksError
    });

    if (tracksError || !tracks) {
      throw new Error('트랙 정보를 조회할 수 없습니다.');
    }

    // 각 트랙별 데이터 계산
    const trackDataPromises = tracks.map(async (track) => {
      const trackType = track.type as TrackType;
      
      console.log(`[getDashboardData] 🔍 Processing track: ${track.name} (${trackType})`, {
        trackId: track.id,
        trackName: track.name,
        trackType: trackType
      });
      
      // 해당 트랙의 참여자 조회 (관리자용 - 모든 사용자 포함)
      const { data: userTracks, error: userTracksError } = await supabase
        .from('user_tracks')
        .select(`
          id,
          user_id,
          is_active,
          users!inner(id, discord_username, is_active)
        `)
        .eq('track_id', track.id);

      if (userTracksError || !userTracks) {
        console.error(`트랙 ${track.name} 참여자 조회 실패:`, userTracksError);
        return null;
      }

      // 활성 사용자만 필터링 (관리자용)
      const activeUserTracks = userTracks.filter(ut => ut.is_active && (ut.users as any)?.is_active);
      const participantIds = activeUserTracks.map(ut => ut.user_id);
      
      console.log(`[getDashboardData] 👥 Track ${track.name} participants:`, {
        totalUserTracks: userTracks.length,
        activeUserTracks: activeUserTracks.length,
        participantIds: participantIds.length
      });
      
      if (participantIds.length === 0) {
        return {
          key: trackType,
          name: track.name,
          description: track.description,
          today: { completed: 0, targets: 0, rate: 0 },
          dropCandidates: 0,
          todayIsDue: false,
          badge: undefined
        };
      }

      // 오늘 인증 완료 수 조회
      const { data: todayCertifications, error: certError } = await supabase
        .from('certifications')
        .select('id')
        .eq('track_id', track.id)
        .eq('certification_date', todayStr)
        .in('user_id', participantIds)
        .in('status', ['submitted', 'approved']);

      if (certError) {
        console.error(`트랙 ${track.name} 오늘 인증 조회 실패:`, certError);
      }

      const todayCompleted = todayCertifications?.length || 0;
      const todayTargets = getTodayTargets(trackType, today) * participantIds.length;
      const todayRate = todayTargets > 0 ? Math.round((todayCompleted / todayTargets) * 1000) / 10 : 0;

      console.log(`[getDashboardData] 📊 Track ${track.name} today stats:`, {
        todayStr,
        todayCompleted,
        todayTargets,
        todayRate,
        participantCount: participantIds.length,
        getTodayTargetsResult: getTodayTargets(trackType, today)
      });

      // 탈락 후보 계산 (누적 미이행 기준)
      let dropCandidates = 0;
      
      if (trackType === 'short-form') {
        // 숏폼: 최근 5일간 미이행 체크
        const fiveDaysAgo = new Date(today.getTime() - 5 * DAY);
        const fiveDaysAgoStr = startOfDayKST(fiveDaysAgo).toISOString().split('T')[0];
        
        for (const participantId of participantIds) {
          const { data: recentCerts, error: recentError } = await supabase
            .from('certifications')
            .select('certification_date')
            .eq('track_id', track.id)
            .eq('user_id', participantId)
            .gte('certification_date', fiveDaysAgoStr)
            .lte('certification_date', todayStr)
            .in('status', ['submitted', 'approved']);

          if (!recentError && recentCerts) {
            const expectedDays = 5; // 최근 5일
            const actualDays = recentCerts.length;
            const missCount = expectedDays - actualDays;
            
            if (getDropCandidates(trackType, missCount)) {
              dropCandidates++;
            }
          }
        }
      } else {
        // 주간 트랙: 최근 1주간 미이행 체크
        const oneWeekAgo = new Date(today.getTime() - 7 * DAY);
        const oneWeekAgoStr = startOfDayKST(oneWeekAgo).toISOString().split('T')[0];
        
        for (const participantId of participantIds) {
          const { data: recentCerts, error: recentError } = await supabase
            .from('certifications')
            .select('certification_date')
            .eq('track_id', track.id)
            .eq('user_id', participantId)
            .gte('certification_date', oneWeekAgoStr)
            .lte('certification_date', todayStr)
            .in('status', ['submitted', 'approved']);

          if (!recentError && recentCerts) {
            const expectedWeeks = 1; // 최근 1주
            const actualWeeks = recentCerts.length;
            const missCount = expectedWeeks - actualWeeks;
            
            if (getDropCandidates(trackType, missCount)) {
              dropCandidates++;
            }
          }
        }
      }

      // 배지 결정
      let badge: string | undefined;
      const dayOfWeek = getKSTDay(today);
      
      if (trackType === 'sales' && dayOfWeek === 2) {
        badge = '오늘 인증일';
      } else if (trackType === 'short-form' && (dayOfWeek === 0 || dayOfWeek === 6)) {
        badge = '주말(대상 없음)';
      }

      return {
        key: trackType,
        name: track.name,
        description: track.description,
        today: {
          completed: todayCompleted,
          targets: todayTargets,
          rate: todayRate
        },
        dropCandidates,
        todayIsDue: todayTargets > 0,
        badge
      };
    });

    const trackData = (await Promise.all(trackDataPromises)).filter(Boolean) as DashboardTrackData[];

    return {
      cohort: {
        start: period.start_date,
        end: period.end_date,
        termNumber: period.term_number
      },
      tracks: trackData
    };

  } catch (error) {
    console.error('대시보드 데이터 조회 실패:', error);
    throw new Error('대시보드 데이터를 조회할 수 없습니다.');
  }
}
