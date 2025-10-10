import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// Auth helpers
export const signInWithDiscord = async () => {
  const supabase = createClient();
  
  console.log('🔍 [signInWithDiscord] Starting OAuth flow...');
  console.log('🔍 [signInWithDiscord] Redirect URL:', `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`);
  
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'discord',
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
    },
  });

  if (error) {
    console.error('❌ [signInWithDiscord] Discord login error:', error);
    throw error;
  }

  console.log('✅ [signInWithDiscord] OAuth initiated successfully:', data);
  return data;
};

export const signOut = async () => {
  const supabase = createClient();
  const { error } = await supabase.auth.signOut();
  
  if (error) {
    console.error('Sign out error:', error);
    throw error;
  }
};

export const getUser = async () => {
  try {
    console.log('🔍 [getUser] Starting user fetch...');
    const supabase = createClient();
    
    // First check session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    console.log('🔍 [getUser] Session:', session ? 'exists' : 'missing');
    console.log('🔍 [getUser] Session error:', sessionError);
    
    // Then get user
    const { data: { user }, error } = await supabase.auth.getUser();
    console.log('🔍 [getUser] User:', user ? `found (${user.email})` : 'not found');
    console.log('🔍 [getUser] User error:', error);
    
    if (error) {
      // Session missing is not an error in our case - user is just not logged in
      if (error.message.includes('session_missing') || error.message.includes('Auth session missing')) {
        console.log('⚠️ [getUser] Session missing - user not logged in');
        return null;
      }
      console.error('❌ [getUser] Get user error:', error);
      return null;
    }
    
    console.log('✅ [getUser] User fetched successfully:', user?.email);
    return user;
  } catch (error) {
    // Catch any unexpected errors
    console.error('❌ [getUser] Unexpected error getting user:', error);
    return null;
  }
};

export const getSession = async () => {
  try {
    const supabase = createClient();
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      // Session missing is not an error - user is just not logged in
      if (error.message.includes('session_missing') || error.message.includes('Auth session missing')) {
        return null;
      }
      console.error('Get session error:', error);
      return null;
    }
    
    return session;
  } catch (error) {
    // Catch any unexpected errors
    console.error('Unexpected error getting session:', error);
    return null;
  }
};
