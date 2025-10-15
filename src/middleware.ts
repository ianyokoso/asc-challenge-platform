import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  // Allow auth-related routes to pass through without authentication checks
  const { pathname } = request.nextUrl;
  const isAuthRoute = pathname.startsWith('/auth/') || 
                     pathname.startsWith('/login') || 
                     pathname.startsWith('/api/auth/');
  
  if (isAuthRoute) {
    console.debug('[Middleware] 🔓 Auth route detected, allowing access:', pathname);
    return supabaseResponse;
  }

  // Check if Supabase environment variables are set
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    console.warn('[Middleware] ⚠️ Supabase environment variables not set, skipping auth middleware');
    return supabaseResponse;
  }

  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              request.cookies.set(name, value)
            );
            supabaseResponse = NextResponse.next({
              request,
            });
            cookiesToSet.forEach(({ name, value, options }) =>
              supabaseResponse.cookies.set(name, value, options)
            );
          },
        },
      }
    );

    // Refreshing the auth token
    const { data: { user } } = await supabase.auth.getUser();
    
    // If user exists, ensure session is valid
    if (user) {
      await supabase.auth.getSession();
    }

    // 관리자 페이지 접근 보호 (서버 사이드)
    if (request.nextUrl.pathname.startsWith('/admin')) {
      // 로그인하지 않은 경우 로그인 페이지로 리다이렉션
      if (!user) {
        console.debug('[Middleware] 🚫 Unauthorized access to admin page, redirecting to login');
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('error', '로그인이 필요합니다');
        loginUrl.searchParams.set('redirect', request.nextUrl.pathname);
        return NextResponse.redirect(loginUrl);
      }

      // 관리자 권한 확인
      const { data: isAdmin, error } = await supabase.rpc('is_admin', {
        check_user_id: user.id,
      });

      if (error || !isAdmin) {
        console.debug('[Middleware] 🚫 Non-admin user tried to access admin page:', user.id);
        const homeUrl = new URL('/', request.url);
        homeUrl.searchParams.set('error', '관리자만 접근할 수 있습니다');
        return NextResponse.redirect(homeUrl);
      }

      console.debug('[Middleware] ✅ Admin access granted for user:', user.id);
    }
  } catch (error) {
    console.error('[Middleware] ❌ Middleware error:', error);
    // Continue even if there's an error
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};

