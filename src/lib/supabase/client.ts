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
  
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'discord',
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
    },
  });

  if (error) {
    console.error('Discord login error:', error);
    throw error;
  }

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
    const supabase = createClient();
    
    // Get the current session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error('[getUser] Session error:', sessionError);
      return null;
    }
    
    // If no session, return null immediately
    if (!session) {
      console.log('[getUser] No active session found');
      return null;
    }
    
    // Session exists, return the user from the session
    console.log('[getUser] ✅ User found from session:', session.user.id);
    return session.user;
  } catch (error) {
    // Catch any unexpected errors
    console.error('[getUser] Unexpected error:', error);
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
