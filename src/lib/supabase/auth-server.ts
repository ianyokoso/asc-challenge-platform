import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

/**
 * 서버 컴포넌트/라우트 핸들러용 Supabase 클라이언트 생성
 */
export async function createServerSupabaseClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // 서버 컴포넌트에서는 쿠키 설정이 불가능할 수 있음
          }
        },
      },
    }
  );
}

/**
 * 서버 사이드에서 현재 사용자 가져오기
 */
export async function getServerUser() {
  const supabase = await createServerSupabaseClient();
  
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
      console.log('[getServerUser] No user found or error:', error?.message);
      return null;
    }
    
    return user;
  } catch (error) {
    console.error('[getServerUser] Unexpected error:', error);
    return null;
  }
}

/**
 * 서버 사이드에서 관리자 권한 확인
 */
export async function checkAdminPermission(userId?: string): Promise<{ 
  isAdmin: boolean; 
  user: any | null;
  error?: string;
}> {
  try {
    const supabase = await createServerSupabaseClient();
    
    // 사용자 ID가 제공되지 않으면 현재 사용자 가져오기
    const user = userId 
      ? { id: userId } 
      : await getServerUser();
    
    if (!user) {
      return { 
        isAdmin: false, 
        user: null,
        error: 'No authenticated user' 
      };
    }
    
    // Supabase RPC로 관리자 권한 확인
    const { data: isAdmin, error } = await supabase.rpc('is_admin', {
      check_user_id: user.id,
    });
    
    if (error) {
      console.error('[checkAdminPermission] Error checking admin status:', error);
      return { 
        isAdmin: false, 
        user,
        error: error.message 
      };
    }
    
    console.log(`[checkAdminPermission] User ${user.id} is ${isAdmin ? 'an admin' : 'not an admin'}`);
    
    return { 
      isAdmin: isAdmin || false, 
      user 
    };
  } catch (error) {
    console.error('[checkAdminPermission] Unexpected error:', error);
    return { 
      isAdmin: false, 
      user: null,
      error: String(error) 
    };
  }
}

/**
 * 관리자 권한을 확인하고, 권한이 없으면 에러를 던집니다.
 * API 라우트나 서버 액션에서 사용
 */
export async function requireAdmin() {
  const { isAdmin, user, error } = await checkAdminPermission();
  
  if (!user) {
    throw new Error('인증이 필요합니다. 로그인 후 다시 시도해주세요.');
  }
  
  if (!isAdmin) {
    throw new Error('관리자 권한이 필요합니다.');
  }
  
  return user;
}

