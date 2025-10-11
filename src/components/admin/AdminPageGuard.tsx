'use client';

import { useEffect, useState, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, ShieldAlert } from 'lucide-react';
import { getUser } from '@/lib/supabase/client';
import { useIsAdmin } from '@/hooks/useAdmin';
import { useToast } from '@/hooks/use-toast';

interface AdminPageGuardProps {
  children: ReactNode;
  /**
   * 로그인하지 않은 경우 리다이렉트할 경로 (기본: /login)
   */
  loginRedirect?: string;
  /**
   * 관리자가 아닌 경우 리다이렉트할 경로 (기본: /)
   */
  unauthorizedRedirect?: string;
}

/**
 * 관리자 페이지를 보호하는 HOC 컴포넌트
 * 
 * 사용 예시:
 * ```tsx
 * export default function AdminPage() {
 *   return (
 *     <AdminPageGuard>
 *       <AdminContent />
 *     </AdminPageGuard>
 *   );
 * }
 * ```
 */
export function AdminPageGuard({
  children,
  loginRedirect = '/login',
  unauthorizedRedirect = '/',
}: AdminPageGuardProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [userId, setUserId] = useState<string | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  // 현재 사용자 가져오기
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const user = await getUser();
        setUserId(user?.id || null);
        
        if (!user) {
          console.log('[AdminPageGuard] No user found, redirecting to login');
          toast({
            title: '로그인이 필요합니다',
            description: '관리자 페이지는 로그인 후 이용 가능합니다.',
            variant: 'destructive',
          });
          router.push(loginRedirect);
        }
      } catch (error) {
        console.error('[AdminPageGuard] Error fetching user:', error);
        setUserId(null);
      } finally {
        setIsCheckingAuth(false);
      }
    };
    
    fetchUser();
  }, [router, toast, loginRedirect]);

  // 관리자 권한 확인
  const { 
    data: isAdmin, 
    isLoading: adminLoading,
    error: adminError 
  } = useIsAdmin(userId || undefined);

  // 관리자 체크 에러 처리
  useEffect(() => {
    if (adminError) {
      console.error('[AdminPageGuard] Admin check error:', adminError);
      toast({
        title: '권한 확인 실패',
        description: '관리자 권한을 확인하는 중 오류가 발생했습니다.',
        variant: 'destructive',
      });
    }
  }, [adminError, toast]);

  // 관리자가 아닌 경우 리다이렉트
  useEffect(() => {
    if (!isCheckingAuth && !adminLoading && userId && isAdmin === false) {
      console.log('[AdminPageGuard] User is not admin, redirecting');
      toast({
        title: '접근 권한 없음',
        description: '관리자만 접근할 수 있는 페이지입니다.',
        variant: 'destructive',
      });
      router.push(unauthorizedRedirect);
    }
  }, [isAdmin, adminLoading, userId, isCheckingAuth, router, toast, unauthorizedRedirect]);

  // 로딩 중
  if (isCheckingAuth || adminLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-gray-600">권한을 확인하는 중...</p>
        </div>
      </div>
    );
  }

  // 로그인하지 않은 경우
  if (!userId) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <Card className="p-12 text-center max-w-md">
          <ShieldAlert className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-2xl font-bold text-gray-900 mb-2">
            로그인이 필요합니다
          </h3>
          <p className="text-gray-600 mb-6">
            관리자 페이지는 로그인 후 이용 가능합니다
          </p>
          <Button onClick={() => router.push(loginRedirect)}>
            로그인하기
          </Button>
        </Card>
      </div>
    );
  }

  // 관리자가 아닌 경우
  if (isAdmin === false) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <Card className="p-12 text-center max-w-md">
          <ShieldAlert className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h3 className="text-2xl font-bold text-gray-900 mb-2">
            접근 권한이 없습니다
          </h3>
          <p className="text-gray-600 mb-6">
            관리자만 접근할 수 있는 페이지입니다
          </p>
          <Button onClick={() => router.push(unauthorizedRedirect)}>
            홈으로 돌아가기
          </Button>
        </Card>
      </div>
    );
  }

  // 관리자 권한 확인 완료 - 자식 컴포넌트 렌더링
  return <>{children}</>;
}

