import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();

    // 활성 기수 조회
    const { data: activePeriod, error } = await supabase
      .from('periods')
      .select('*')
      .eq('is_active', true)
      .single();

    if (error) {
      console.error('[API] ❌ Error fetching active period:', error);
      return NextResponse.json(
        { error: '활성 기수를 조회할 수 없습니다.' },
        { status: 500 }
      );
    }

    if (!activePeriod) {
      return NextResponse.json(
        { error: '활성 기수가 설정되지 않았습니다.' },
        { status: 404 }
      );
    }

    return NextResponse.json(activePeriod);
  } catch (error) {
    console.error('[API] ❌ Unexpected error in active-period:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
