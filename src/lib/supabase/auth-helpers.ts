// Authentication helper functions
import { createClient } from './client';
import { upsertUserProfile } from './database';
import type { User } from '@supabase/supabase-js';

/**
 * Sync authenticated user with database profile
 * Creates or updates user profile in the database based on Supabase Auth user
 */
export async function syncUserProfile(authUser: User) {
  try {
    const metadata = authUser.user_metadata;
    
    const profileData = {
      id: authUser.id,
      discord_id: metadata.provider_id || metadata.sub || authUser.id,
      discord_username: metadata.preferred_username || metadata.name || 'User',
      discord_discriminator: metadata.discriminator || null,
      discord_avatar_url: metadata.avatar_url || authUser.user_metadata?.avatar_url || null,
      discord_global_name: metadata.full_name || metadata.custom_claims?.global_name || null,
      email: authUser.email || null,
    };

    const profile = await upsertUserProfile(profileData);
    
    if (!profile) {
      console.error('Failed to sync user profile');
      return null;
    }

    console.log('✅ User profile synced:', profile.discord_username);
    return profile;
  } catch (error) {
    console.error('Error syncing user profile:', error);
    return null;
  }
}

/**
 * Get current authenticated user and sync profile
 */
export async function getCurrentUserAndSync() {
  const supabase = createClient();
  
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error || !user) {
    return null;
  }

  // Sync profile
  await syncUserProfile(user);
  
  return user;
}

/**
 * Setup auth state change listener to auto-sync profiles
 */
export function setupAuthListener() {
  const supabase = createClient();
  
  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        console.log('🔐 User signed in, syncing profile...');
        await syncUserProfile(session.user);
      }
      
      if (event === 'USER_UPDATED' && session?.user) {
        console.log('🔄 User updated, syncing profile...');
        await syncUserProfile(session.user);
      }
    }
  );

  return subscription;
}

