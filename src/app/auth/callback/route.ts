import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import type { CookieOptions } from '@supabase/ssr';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const error = requestUrl.searchParams.get('error');
  const errorDescription = requestUrl.searchParams.get('error_description');

  // Handle OAuth errors
  if (error) {
    console.error('OAuth error:', error, errorDescription);
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(errorDescription || error)}`, requestUrl.origin)
    );
  }

  if (code) {
    const cookieStore = await cookies();
    
    const supabase = createServerClient(
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
              // The `setAll` method was called from a Server Component.
              // This can be ignored if you have middleware refreshing
              // user sessions.
            }
          },
        },
      }
    );
    
    const { data, error: sessionError } = await supabase.auth.exchangeCodeForSession(code);
    
    if (sessionError) {
      console.error('Session exchange error:', sessionError);
      return NextResponse.redirect(
        new URL(`/login?error=${encodeURIComponent(sessionError.message)}`, requestUrl.origin)
      );
    }

    if (data.session && data.user) {
      console.log('Session created successfully for user:', data.user?.email);
      
      // Sync user profile to database
      try {
        const metadata = data.user.user_metadata;
        const profileData = {
          id: data.user.id,
          discord_id: metadata.provider_id || metadata.sub || data.user.id,
          discord_username: metadata.preferred_username || metadata.name || 'User',
          discord_discriminator: metadata.discriminator || null,
          discord_avatar_url: metadata.avatar_url || null,
          discord_global_name: metadata.full_name || metadata.custom_claims?.global_name || null,
          email: data.user.email || null,
        };

        // Use server-side upsert
        await supabase.from('users').upsert(profileData);
        console.log('✅ User profile synced');
      } catch (error) {
        console.error('Failed to sync user profile:', error);
        // Continue anyway - profile can be synced later
      }
      
      // Force session refresh and redirect to main page
      const response = NextResponse.redirect(new URL('/', requestUrl.origin));
      
      // Ensure cookies are properly set
      const cookieOptions: CookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7, // 7 days
      };
      
      // Set auth cookies manually if needed
      if (data.session.access_token) {
        response.cookies.set('sb-access-token', data.session.access_token, cookieOptions);
      }
      if (data.session.refresh_token) {
        response.cookies.set('sb-refresh-token', data.session.refresh_token, cookieOptions);
      }
      
      return response;
    }
  }

  // No code present - redirect to login
  console.log('No code present in callback');
  return NextResponse.redirect(new URL('/login', requestUrl.origin));
}

