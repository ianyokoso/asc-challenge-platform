import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyAdminUser } from '@/lib/api/admin-guard';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/**
 * GET /api/admin/page-contents
 * 특정 페이지의 모든 콘텐츠 조회
 * 
 * Query Parameters:
 * - pagePath: string - 페이지 경로 (예: '/admin/tracking')
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const pagePath = searchParams.get('pagePath');

    if (!pagePath) {
      return NextResponse.json(
        { error: 'pagePath is required' },
        { status: 400 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    const { data, error } = await supabase
      .from('page_contents')
      .select('*')
      .eq('page_path', pagePath)
      .order('content_key');

    if (error) {
      console.error('[Page Contents API] GET error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch page contents' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data,
    });

  } catch (error) {
    console.error('[Page Contents API] Unexpected error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/page-contents
 * 여러 콘텐츠를 한 번에 업데이트
 * 
 * Request Body:
 * - contents: Array<{ id: string; content_value: string }>
 */
export async function POST(request: NextRequest) {
  try {
    // 관리자 인증 확인
    const adminEmail = await verifyAdminUser(request);
    console.log('[Page Contents API] Admin verified:', adminEmail);

    const body = await request.json();
    const { contents } = body;

    if (!contents || !Array.isArray(contents) || contents.length === 0) {
      return NextResponse.json(
        { error: 'contents array is required' },
        { status: 400 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // 관리자 사용자 ID 조회
    const { data: adminUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', adminEmail)
      .single();

    // 각 콘텐츠 업데이트
    const updates = contents.map(async (content: { id: string; content_value: string }) => {
      const { error } = await supabase
        .from('page_contents')
        .update({
          content_value: content.content_value,
          updated_by: adminUser?.id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', content.id);

      if (error) {
        console.error('[Page Contents API] Update error:', error);
        throw error;
      }
    });

    await Promise.all(updates);

    return NextResponse.json({
      success: true,
      message: 'Page contents updated successfully',
      updatedCount: contents.length,
    });

  } catch (error) {
    console.error('[Page Contents API] Unexpected error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

