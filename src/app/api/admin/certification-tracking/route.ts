import { NextRequest, NextResponse } from 'next/server';
import { createClient, createPureClient } from '@/lib/supabase/server';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, parseISO } from 'date-fns';
import { toKSTMidnight, isBeforeKST, isAfterKST } from '@/lib/utils/date-helpers';

/**
 * 관리자 전용 API: 트랙별 인증 현황 조회
 * SERVICE_ROLE_KEY를 사용하여 RLS를 우회하고 모든 데이터 조회
 */

// 트랙 타입별 인증 필요 날짜 확인
function isRequiredDate(date: Date, trackType: string): boolean {
  const dayOfWeek = getDay(date);
  
  switch (trackType) {
    case 'short-form':
    case 'shortform':
      // 숏폼 트랙은 주말(토요일=6, 일요일=0) 제외, 평일(월~금)만 인증 필요
      return dayOfWeek >= 1 && dayOfWeek <= 5; // 월요일(1) ~ 금요일(5)
    case 'long-form':
    case 'longform':
    case 'builder':
      return dayOfWeek === 0; // 일요일
    case 'sales':
      return dayOfWeek === 2; // 화요일
    default:
      return false;
  }
}

// 기수 기간 내의 인증 필요 날짜 목록 생성 (KST 기준)
function getCohortRequiredDates(
  periodStart: string,
  periodEnd: string,
  trackType: string
): string[] {
  const cohortStart = toKSTMidnight(periodStart);
  const cohortEnd = toKSTMidnight(periodEnd);
  
  console.log('[getCohortRequiredDates] 📅 Generating dates for cohort:', {
    cohortRange: `${format(cohortStart, 'yyyy-MM-dd')} ~ ${format(cohortEnd, 'yyyy-MM-dd')}`,
    trackType,
  });
  
  const allDates = eachDayOfInterval({ start: cohortStart, end: cohortEnd });
  
  const requiredDates = allDates
    .filter(date => isRequiredDate(date, trackType))
    .map(date => format(date, 'yyyy-MM-dd'));
  
  console.log('[getCohortRequiredDates] ✅ Generated', requiredDates.length, 'required dates');
  
  return requiredDates;
}

export async function GET(request: NextRequest) {
  try {
    // 쿠키를 포함한 클라이언트로 세션 확인
    const authClient = await createClient();
    const { data: { user } } = await authClient.auth.getUser();
    
    if (!user) {
      console.error('[API] ❌ Unauthorized: No user');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // SERVICE_ROLE_KEY로 관리자 여부 확인 (RLS 우회)
    const supabase = await createPureClient();
    const { data: adminUser } = await supabase
      .from('admin_users')
      .select('user_id')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .maybeSingle();

    if (!adminUser) {
      console.error('[API] ❌ Forbidden: Not an admin', user.email);
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    console.log('[API] ✅ Admin verified:', user.email);

    const searchParams = request.nextUrl.searchParams;
    const periodId = searchParams.get('periodId');

    console.log('[API] 🚀 Fetching certification tracking data:', { periodId });

    // 1. 모든 기수 목록 조회 (최신순)
    const { data: allPeriods, error: allPeriodsError } = await supabase
      .from('periods')
      .select('*')
      .order('term_number', { ascending: false });

    if (allPeriodsError) {
      console.error('[API] ❌ Error fetching periods:', allPeriodsError);
      return NextResponse.json({ error: 'Failed to fetch periods' }, { status: 500 });
    }

    if (!allPeriods || allPeriods.length === 0) {
      console.log('[API] ⚠️ No periods found');
      return NextResponse.json({ 
        data: [],
        periods: [],
        selectedPeriod: null,
      });
    }

    // 2. 선택된 기수 결정 (periodId가 없으면 활성 기수, 활성 기수가 없으면 최신 기수)
    let selectedPeriod = null;
    
    if (periodId) {
      selectedPeriod = allPeriods.find(p => p.id === periodId);
      if (!selectedPeriod) {
        console.warn('[API] ⚠️ Requested periodId not found, falling back to active period');
      }
    }
    
    if (!selectedPeriod) {
      // 활성 기수 찾기
      selectedPeriod = allPeriods.find(p => p.is_active);
    }
    
    if (!selectedPeriod) {
      // 가장 최신 기수 사용
      selectedPeriod = allPeriods[0];
    }

    const periodStart = selectedPeriod.start_date;
    const periodEnd = selectedPeriod.end_date;

    console.log('[API] ✅ Selected period:', {
      id: selectedPeriod.id,
      termNumber: selectedPeriod.term_number,
      startDate: periodStart,
      endDate: periodEnd,
      isActive: selectedPeriod.is_active,
    });

    // 2. 모든 활성 트랙 조회
    const { data: tracks, error: tracksError } = await supabase
      .from('tracks')
      .select('id, name, type')
      .eq('is_active', true);

    if (tracksError) {
      console.error('[API] ❌ Error fetching tracks:', tracksError);
      return NextResponse.json({ error: tracksError.message }, { status: 500 });
    }

    if (!tracks || tracks.length === 0) {
      console.log('[API] ⚠️ No active tracks found');
      return NextResponse.json({ 
        data: [],
        periods: allPeriods,
        selectedPeriod,
      });
    }

    console.log('[API] ✅ Found tracks:', tracks.length);

    const trackSummaries = [];

    // 3. 각 트랙별로 데이터 처리
    for (const track of tracks) {
      const requiredDates = getCohortRequiredDates(periodStart, periodEnd, track.type);

      // 해당 트랙의 참여자 조회 (SERVICE_ROLE로 모든 데이터 접근 가능)
      const { data: userTracks, error: userTracksError } = await supabase
        .from('user_tracks')
        .select(`
          user_id,
          users (
            id,
            discord_username,
            discord_avatar_url
          )
        `)
        .eq('track_id', track.id)
        .eq('is_active', true);

      if (userTracksError) {
        console.error(`[API] ❌ Error fetching user tracks for ${track.name}:`, userTracksError);
        continue;
      }

      if (!userTracks || userTracks.length === 0) {
        trackSummaries.push({
          trackId: track.id,
          trackName: track.name,
          trackType: track.type,
          participants: [],
          dates: requiredDates,
        });
        continue;
      }

      console.log(`[API] ✅ Found ${userTracks.length} participants for ${track.name}`);

      // 해당 트랙의 해당 기수 기간 인증 데이터 조회
      const { data: certifications, error: certificationsError } = await supabase
        .from('certifications')
        .select('user_id, certification_date, certification_url, submitted_at, status')
        .eq('track_id', track.id)
        .gte('certification_date', periodStart)
        .lte('certification_date', periodEnd);

      if (certificationsError) {
        console.error(`[API] ❌ Error fetching certifications for ${track.name}:`, certificationsError);
      } else {
        console.log(`[API] ✅ Fetched ${certifications?.length || 0} certifications for ${track.name}`);
      }

      // 참여자별 인증 데이터 매핑
      const participants = userTracks.map((ut: any) => {
        const user = ut.users;
        const userCerts = certifications?.filter(c => c.user_id === user.id) || [];
        
        const certificationsByDate: any = {};

        requiredDates.forEach(date => {
          // certification_date를 'yyyy-MM-dd' 형식으로 변환하여 비교
          const cert = userCerts.find(c => {
            const certDate = typeof c.certification_date === 'string' 
              ? c.certification_date.split('T')[0]  // ISO 문자열에서 날짜 부분만 추출
              : format(new Date(c.certification_date), 'yyyy-MM-dd');
            return certDate === date;
          });
          
          if (cert) {
            const certStatus = (cert.status === 'approved' || cert.status === 'submitted') 
              ? 'certified' 
              : (cert.status === 'rejected' ? 'missing' : 'pending');
            
            certificationsByDate[date] = {
              status: certStatus,
              url: cert.certification_url,
              submittedAt: cert.submitted_at,
            };
            
            console.log(`[API] 📅 ${user.discord_username} - ${date}: ${cert.status} → ${certStatus}`);
          } else {
            const today = format(new Date(), 'yyyy-MM-dd');
            certificationsByDate[date] = {
              status: date > today ? 'not-required' : 'missing',
              url: null,
              submittedAt: null,
            };
          }
        });

        const totalCertified = Object.values(certificationsByDate).filter((c: any) => c.status === 'certified').length;
        // 숏폼 트랙의 경우 주말이 이미 requiredDates에서 제외되어 있으므로 그대로 사용
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

      trackSummaries.push({
        trackId: track.id,
        trackName: track.name,
        trackType: track.type,
        participants,
        dates: requiredDates,
      });
    }

    console.log('[API] ✅ Successfully processed', trackSummaries.length, 'tracks');
    return NextResponse.json({ 
      data: trackSummaries,
      periods: allPeriods,
      selectedPeriod,
    });

  } catch (error) {
    console.error('[API] ❌ Unexpected error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

