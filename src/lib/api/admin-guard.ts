import { NextRequest, NextResponse } from 'next/server';
import { checkAdminPermission } from '@/lib/supabase/auth-server';

/**
 * API 라우트를 관리자 전용으로 보호하는 미들웨어
 * 
 * @example
 * ```typescript
 * export async function GET(request: NextRequest) {
 *   const adminCheck = await withAdminAuth(request);
 *   if (adminCheck instanceof NextResponse) return adminCheck;
 *   
 *   const { user } = adminCheck;
 *   // 관리자 전용 로직...
 * }
 * ```
 */
export async function withAdminAuth(request: NextRequest) {
  const { isAdmin, user, error } = await checkAdminPermission();
  
  // 로그인하지 않은 경우
  if (!user) {
    return NextResponse.json(
      { 
        error: '인증이 필요합니다',
        code: 'UNAUTHORIZED',
        message: '로그인 후 다시 시도해주세요.'
      },
      { status: 401 }
    );
  }
  
  // 관리자가 아닌 경우
  if (!isAdmin) {
    return NextResponse.json(
      { 
        error: '권한이 없습니다',
        code: 'FORBIDDEN',
        message: '관리자만 접근할 수 있습니다.',
        userId: user.id
      },
      { status: 403 }
    );
  }
  
  // RPC 호출 에러
  if (error) {
    console.error('[withAdminAuth] Admin check error:', error);
    return NextResponse.json(
      { 
        error: '권한 확인 실패',
        code: 'INTERNAL_ERROR',
        message: '관리자 권한 확인 중 오류가 발생했습니다.'
      },
      { status: 500 }
    );
  }
  
  // 권한 확인 성공
  return { user, isAdmin: true };
}

/**
 * 서버 액션을 관리자 전용으로 보호하는 헬퍼
 * 
 * @example
 * ```typescript
 * 'use server';
 * 
 * export async function deleteUser(userId: string) {
 *   await requireAdminForAction();
 *   // 관리자 전용 로직...
 * }
 * ```
 */
export async function requireAdminForAction() {
  const { isAdmin, user, error } = await checkAdminPermission();
  
  if (!user) {
    throw new Error('인증이 필요합니다. 로그인 후 다시 시도해주세요.');
  }
  
  if (!isAdmin) {
    throw new Error('관리자 권한이 필요합니다.');
  }
  
  if (error) {
    throw new Error('관리자 권한 확인 중 오류가 발생했습니다.');
  }
  
  return user;
}

/**
 * API 라우트에서 관리자 권한을 확인하고 이메일을 반환하는 헬퍼
 * 
 * @throws {Error} 권한이 없거나 인증되지 않은 경우
 * @returns {Promise<string>} 관리자 이메일
 * 
 * @example
 * ```typescript
 * export async function POST(request: NextRequest) {
 *   const adminEmail = await verifyAdminUser(request);
 *   // 관리자 전용 로직...
 * }
 * ```
 */
export async function verifyAdminUser(request: NextRequest): Promise<string> {
  const { isAdmin, user, error } = await checkAdminPermission();
  
  if (!user || !user.email) {
    throw new Error('Unauthorized: User not authenticated');
  }
  
  if (!isAdmin) {
    throw new Error('Forbidden: Admin access required');
  }
  
  if (error) {
    throw new Error('Internal error: Failed to verify admin permission');
  }
  
  return user.email;
}

