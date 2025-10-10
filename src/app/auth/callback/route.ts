import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const error = requestUrl.searchParams.get('error');
  const errorDescription = requestUrl.searchParams.get('error_description');

  console.log('🔍 [Callback] Starting OAuth callback processing...');
  console.log('🔍 [Callback] Code:', code ? 'present' : 'missing');
  console.log('🔍 [Callback] Error:', error);

  // Handle OAuth errors
  if (error) {
    console.error('❌ [Callback] OAuth error:', error, errorDescription);
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(errorDescription || error)}`, requestUrl.origin)
    );
  }

  if (code) {
    const cookieStore = await cookies();
    const response = NextResponse.redirect(new URL('/certify', requestUrl.origin));
    
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              response.cookies.set(name, value, options);
            });
          },
        },
      }
    );
    
    console.log('🔍 [Callback] Exchanging code for session...');
    const { data, error: sessionError } = await supabase.auth.exchangeCodeForSession(code);
    
    if (sessionError) {
      console.error('❌ [Callback] Session exchange error:', sessionError);
      return NextResponse.redirect(
        new URL(`/login?error=${encodeURIComponent(sessionError.message)}`, requestUrl.origin)
      );
    }

    if (data.session && data.user) {
      console.log('✅ [Callback] Session created for user:', data.user?.email);
      
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

        await supabase.from('users').upsert(profileData);
        console.log('✅ [Callback] User profile synced');
      } catch (error) {
        console.error('❌ [Callback] Failed to sync user profile:', error);
      }
      
      console.log('✅ [Callback] Redirecting to home page...');
      return response;
    } else {
      console.error('❌ [Callback] No session or user data received');
    }
  }

  // No code present - redirect to login
  console.log('⚠️ [Callback] No code present, redirecting to login');
  return NextResponse.redirect(new URL('/login', requestUrl.origin));
}

