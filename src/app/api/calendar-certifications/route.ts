import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { format, eachDayOfInterval, startOfMonth, endOfMonth } from 'date-fns';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const trackId = searchParams.get('trackId');
    const year = parseInt(searchParams.get('year') || '2025');
    const month = parseInt(searchParams.get('month') || '10');

    if (!userId || !trackId) {
      return NextResponse.json(
        { error: 'userId와 trackId가 필요합니다.' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // 해당 월의 모든 날짜 생성
    const monthStart = startOfMonth(new Date(year, month - 1));
    const monthEnd = endOfMonth(new Date(year, month - 1));
    const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

    // 해당 사용자의 트랙에 대한 인증 데이터 조회
    const { data: certifications, error: certError } = await supabase
      .from('certifications')
      .select('certification_date, status')
      .eq('user_id', userId)
      .eq('track_id', trackId)
      .gte('certification_date', format(monthStart, 'yyyy-MM-dd'))
      .lte('certification_date', format(monthEnd, 'yyyy-MM-dd'));

    console.log(`[API] 🔍 Calendar certifications query:`, {
      userId,
      trackId,
      monthStart: format(monthStart, 'yyyy-MM-dd'),
      monthEnd: format(monthEnd, 'yyyy-MM-dd'),
      certificationsFound: certifications?.length || 0,
      certifications: certifications
    });

    if (certError) {
      console.error('[API] ❌ Error fetching certifications:', certError);
      return NextResponse.json(
        { error: '인증 데이터를 조회할 수 없습니다.' },
        { status: 500 }
      );
    }

    // 인증된 날짜들을 Set으로 변환 (빠른 검색을 위해)
    const certifiedDates = new Set(
      certifications?.map(cert => cert.certification_date) || []
    );

    // 각 날짜별 인증 상태 생성
    const calendarData = daysInMonth.map(date => {
      const dateStr = format(date, 'yyyy-MM-dd');
      const isCertified = certifiedDates.has(dateStr);
      
      return {
        date: dateStr,
        certified: isCertified,
      };
    });

    console.log(`[API] ✅ Calendar data for ${year}-${month}:`, {
      userId,
      trackId,
      totalDays: calendarData.length,
      certifiedCount: calendarData.filter(d => d.certified).length,
    });

    return NextResponse.json(calendarData);
  } catch (error) {
    console.error('[API] ❌ Unexpected error in calendar-certifications:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
