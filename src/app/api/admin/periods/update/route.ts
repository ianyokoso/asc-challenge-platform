import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();

    // 1. 관리자 권한 확인
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('[Update Period API] ❌ Auth error:', authError);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: adminUser, error: adminError } = await supabase
      .from('admin_users')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (adminError || !adminUser) {
      console.error('[Update Period API] ❌ Not an admin:', user.id);
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // 2. 요청 본문 파싱
    const body = await request.json();
    const { period_id, start_date, end_date, description } = body;

    // 3. 입력 검증
    if (!period_id) {
      return NextResponse.json({ error: 'Period ID is required' }, { status: 400 });
    }

    if (!start_date || !end_date) {
      return NextResponse.json(
        { error: 'Start date and end date are required' },
        { status: 400 }
      );
    }

    const startDate = new Date(start_date);
    const endDate = new Date(end_date);

    if (startDate >= endDate) {
      return NextResponse.json(
        { error: 'Start date must be before end date' },
        { status: 400 }
      );
    }

    console.log('[Update Period API] 📝 Updating period:', period_id, {
      start_date,
      end_date,
      description,
    });

    // 4. 기수 정보 업데이트
    const { data: updatedPeriod, error: updateError } = await supabase
      .from('periods')
      .update({
        start_date,
        end_date,
        description: description || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', period_id)
      .select()
      .single();

    if (updateError) {
      console.error('[Update Period API] ❌ Update failed:', updateError);
      return NextResponse.json(
        { error: 'Failed to update period', details: updateError.message },
        { status: 500 }
      );
    }

    console.log('[Update Period API] ✅ Period updated successfully:', updatedPeriod?.id);

    return NextResponse.json({
      message: 'Period updated successfully',
      data: updatedPeriod,
    });
  } catch (error: any) {
    console.error('[Update Period API] ❌ Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

