'use client';

import { useState, useEffect } from 'react';
import { getUser } from '@/lib/supabase/client';
import { getUserTracks } from '@/lib/supabase/database';

interface UserAccessResult {
  userId: string | null;
  hasAssignedTracks: boolean;
  isLoading: boolean;
}

/**
 * 사용자의 로그인 상태 및 트랙 배정 여부를 확인하는 훅
 * @returns {UserAccessResult} 사용자 ID, 트랙 배정 여부, 로딩 상태
 */
export function useUserAccess(): UserAccessResult {
  const [userId, setUserId] = useState<string | null>(null);
  const [hasAssignedTracks, setHasAssignedTracks] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkUserAccess = async () => {
      setIsLoading(true);
      
      try {
        const user = await getUser();
        const currentUserId = user?.id || null;
        setUserId(currentUserId);
        
        console.log('[useUserAccess] User ID:', currentUserId);
        
        if (currentUserId) {
          try {
            const userTracks = await getUserTracks(currentUserId);
            console.log('[useUserAccess] User tracks:', userTracks.length);
            setHasAssignedTracks(userTracks.length > 0);
          } catch (trackError) {
            console.error('[useUserAccess] Error fetching tracks:', trackError);
            // RLS 오류 등이 발생해도 계속 진행
            setHasAssignedTracks(false);
          }
        } else {
          console.log('[useUserAccess] No user logged in');
          setHasAssignedTracks(false);
        }
      } catch (error) {
        console.error('[useUserAccess] Error checking user access:', error);
        setUserId(null);
        setHasAssignedTracks(false);
      } finally {
        console.log('[useUserAccess] Loading complete');
        setIsLoading(false);
      }
    };

    checkUserAccess();
  }, []);

  return {
    userId,
    hasAssignedTracks,
    isLoading,
  };
}

