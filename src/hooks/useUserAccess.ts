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
    let mounted = true;
    let timeoutId: NodeJS.Timeout;
    
    const checkUserAccess = async () => {
      setIsLoading(true);
      
      // 전체 프로세스 타임아웃 (10초)
      const globalTimeout = setTimeout(() => {
        if (mounted) {
          console.warn('[useUserAccess] ⚠️ 전역 타임아웃 - 강제 종료');
          setHasAssignedTracks(false);
          setIsLoading(false);
        }
      }, 10000);
      
      try {
        const user = await getUser();
        
        if (!mounted) {
          clearTimeout(globalTimeout);
          return;
        }
        
        const currentUserId = user?.id || null;
        setUserId(currentUserId);
        
        console.log('[useUserAccess] ✅ User ID:', currentUserId);
        
        if (currentUserId) {
          try {
            const userTracks = await getUserTracks(currentUserId);
            
            if (!mounted) {
              clearTimeout(globalTimeout);
              return;
            }
            
            console.log('[useUserAccess] ✅ User tracks count:', userTracks.length);
            setHasAssignedTracks(userTracks.length > 0);
          } catch (trackError) {
            console.error('[useUserAccess] ❌ Error fetching tracks:', trackError);
            
            if (!mounted) {
              clearTimeout(globalTimeout);
              return;
            }
            
            // RLS 오류 등이 발생해도 계속 진행
            setHasAssignedTracks(false);
          }
        } else {
          console.log('[useUserAccess] ℹ️ No user logged in');
          setHasAssignedTracks(false);
        }
      } catch (error) {
        console.error('[useUserAccess] ❌ Critical error:', error);
        
        if (!mounted) {
          clearTimeout(globalTimeout);
          return;
        }
        
        setUserId(null);
        setHasAssignedTracks(false);
      } finally {
        clearTimeout(globalTimeout);
        
        if (mounted) {
          console.log('[useUserAccess] ✅ Loading complete');
          setIsLoading(false);
        }
      }
    };

    checkUserAccess();
    
    return () => {
      mounted = false;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, []);

  return {
    userId,
    hasAssignedTracks,
    isLoading,
  };
}

