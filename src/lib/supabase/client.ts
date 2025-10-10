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
    
    // First try to get session to refresh if needed
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    // If no session, try to refresh
    if (!session && !sessionError) {
      const { data: { session: refreshedSession }, error: refreshError } = await supabase.auth.refreshSession();
      if (refreshError) {
        console.log('No active session and refresh failed:', refreshError.message);
        return null;
      }
    }
    
    // Now get user
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error) {
      // Session missing is not an error in our case - user is just not logged in
      if (error.message.includes('session_missing') || error.message.includes('Auth session missing')) {
        return null;
      }
      console.error('Get user error:', error);
      return null;
    }
    
    return user;
  } catch (error) {
    // Catch any unexpected errors
    console.error('Unexpected error getting user:', error);
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
