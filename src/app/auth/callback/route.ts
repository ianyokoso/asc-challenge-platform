import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const error = requestUrl.searchParams.get('error');
  const errorDescription = requestUrl.searchParams.get('error_description');


  // Handle OAuth errors
  if (error) {
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
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          },
        },
      }
    );
    
    const { data, error: sessionError } = await supabase.auth.exchangeCodeForSession(code);
    
    if (sessionError) {
      console.error('[Auth Callback] ❌ Session exchange failed:', sessionError);
      return NextResponse.redirect(
        new URL(`/login?error=${encodeURIComponent(sessionError.message)}`, requestUrl.origin)
      );
    }

    if (data.session && data.user) {
      console.log('[Auth Callback] ✅ Session created for user:', data.user.id);
      
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
        console.log('[Auth Callback] ✅ User profile synced');
      } catch (error) {
        console.error('[Auth Callback] ⚠️ Failed to sync user profile:', error);
      }
      
      // Redirect to intermediate success page to ensure session is propagated
      return NextResponse.redirect(new URL('/auth/success', requestUrl.origin));
    }
  }

  // No code present - redirect to login
  return NextResponse.redirect(new URL('/login', requestUrl.origin));
}

