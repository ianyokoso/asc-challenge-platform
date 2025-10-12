import { NextRequest, NextResponse } from 'next/server';
import { createClient, createPureClient } from '@/lib/supabase/server';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay } from 'date-fns';

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
      return dayOfWeek >= 1 && dayOfWeek <= 5; // 월~금
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

// 특정 월의 인증 필요 날짜 목록 생성
function getRequiredDates(year: number, month: number, trackType: string): string[] {
  const start = startOfMonth(new Date(year, month - 1));
  const end = endOfMonth(new Date(year, month - 1));
  const allDates = eachDayOfInterval({ start, end });
  
  return allDates
    .filter(date => isRequiredDate(date, trackType))
    .map(date => format(date, 'yyyy-MM-dd'));
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
    const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString());
    const month = parseInt(searchParams.get('month') || (new Date().getMonth() + 1).toString());

    console.log('[API] 🚀 Fetching certification tracking data:', { year, month });

    // 1. 모든 활성 트랙 조회
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
      return NextResponse.json({ data: [] });
    }

    console.log('[API] ✅ Found tracks:', tracks.length);

    const trackSummaries = [];

    // 2. 각 트랙별로 데이터 처리
    for (const track of tracks) {
      const requiredDates = getRequiredDates(year, month, track.type);

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

      // 해당 트랙의 해당 월 인증 데이터 조회
      const startDate = format(startOfMonth(new Date(year, month - 1)), 'yyyy-MM-dd');
      const endDate = format(endOfMonth(new Date(year, month - 1)), 'yyyy-MM-dd');

      const { data: certifications, error: certificationsError } = await supabase
        .from('certifications')
        .select('user_id, certification_date, certification_url, submitted_at, status')
        .eq('track_id', track.id)
        .gte('certification_date', startDate)
        .lte('certification_date', endDate);

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
          const cert = userCerts.find(c => c.certification_date === date);
          
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
    return NextResponse.json({ data: trackSummaries });

  } catch (error) {
    console.error('[API] ❌ Unexpected error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

