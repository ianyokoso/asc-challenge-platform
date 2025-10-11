'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { getUser } from '@/lib/supabase/client';
import { useIsAdmin } from '@/hooks/useAdmin';
import { Loader2, ShieldAlert } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface AdminPageGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * 관리자 페이지 가드 컴포넌트
 * 
 * @description
 * - 로그인하지 않은 사용자는 로그인 페이지로 리다이렉션
 * - 관리자가 아닌 사용자는 홈페이지로 리다이렉션
 * - @tanstack/react-query를 사용하여 권한 체크 상태 관리
 * 
 * @example
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
export function AdminPageGuard({ children, fallback }: AdminPageGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();
  const [userId, setUserId] = useState<string | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  // 1단계: 사용자 인증 확인
  const { 
    data: user,
    isLoading: userLoading,
    error: userError 
  } = useQuery({
    queryKey: ['current-user'],
    queryFn: getUser,
    staleTime: 1000 * 60 * 5, // 5분
    retry: 1,
  });

  // 2단계: 관리자 권한 확인 (사용자가 로그인된 경우에만)
  const { 
    data: isAdmin,
    isLoading: adminLoading,
    error: adminError 
  } = useIsAdmin(user?.id);

  const isLoading = userLoading || adminLoading || isCheckingAuth;

  // 사용자 상태 업데이트
  useEffect(() => {
    if (!userLoading) {
      setUserId(user?.id || null);
      setIsCheckingAuth(false);
    }
  }, [user, userLoading]);

  // 로그인 체크 및 리다이렉션
  useEffect(() => {
    if (!userLoading && !user) {
      console.log('[AdminPageGuard] No user found, redirecting to login');
      toast({
        title: '로그인이 필요합니다',
        description: '관리자 페이지는 로그인 후 이용 가능합니다.',
        variant: 'destructive',
      });
      router.push(`/login?redirect=${encodeURIComponent(pathname)}`);
    }
  }, [user, userLoading, router, pathname, toast]);

  // 관리자 권한 체크 및 리다이렉션
  useEffect(() => {
    if (!userLoading && !adminLoading && user && isAdmin === false) {
      console.log('[AdminPageGuard] User is not admin, redirecting to home');
      toast({
        title: '접근 권한 없음',
        description: '관리자만 접근할 수 있는 페이지입니다.',
        variant: 'destructive',
      });
      router.push('/?error=' + encodeURIComponent('관리자만 접근할 수 있습니다'));
    }
  }, [user, isAdmin, userLoading, adminLoading, router, toast]);

  // 에러 핸들링
  useEffect(() => {
    if (userError) {
      console.error('[AdminPageGuard] User fetch error:', userError);
      toast({
        title: '사용자 인증 실패',
        description: '사용자 정보를 가져오는 중 오류가 발생했습니다.',
        variant: 'destructive',
      });
    }

    if (adminError) {
      console.error('[AdminPageGuard] Admin check error:', adminError);
      toast({
        title: '권한 확인 실패',
        description: '관리자 권한을 확인하는 중 오류가 발생했습니다.',
        variant: 'destructive',
      });
    }
  }, [userError, adminError, toast]);

  // 로딩 상태
  if (isLoading) {
    return (
      fallback || (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-body text-gray-600">권한을 확인하는 중...</p>
          </div>
        </div>
      )
    );
  }

  // 인증되지 않은 경우
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="p-8 text-center max-w-md">
          <ShieldAlert className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-h4 font-heading text-gray-900 mb-2">
            로그인이 필요합니다
          </h2>
          <p className="text-body text-gray-600 mb-6">
            관리자 페이지는 로그인 후 이용 가능합니다.
          </p>
          <Button onClick={() => router.push('/login')}>
            로그인 페이지로 이동
          </Button>
        </Card>
      </div>
    );
  }

  // 권한이 없는 경우
  if (isAdmin === false) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="p-8 text-center max-w-md">
          <ShieldAlert className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-h4 font-heading text-gray-900 mb-2">
            접근 권한 없음
          </h2>
          <p className="text-body text-gray-600 mb-6">
            관리자만 접근할 수 있는 페이지입니다.
          </p>
          <Button onClick={() => router.push('/')}>
            홈페이지로 이동
          </Button>
        </Card>
      </div>
    );
  }

  // 관리자 인증 성공 - 자식 컴포넌트 렌더링
  return <>{children}</>;
}

