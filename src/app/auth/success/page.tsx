'use client';

export const dynamic = 'force-dynamic';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

/**
 * OAuth 성공 후 중간 페이지
 * 
 * 목적:
 * 1. 서버에서 설정한 세션 쿠키가 클라이언트에 전달되도록 대기
 * 2. 클라이언트 측에서 세션을 확인한 후 /certify로 리다이렉트
 * 
 * 이 페이지는 사용자에게 보이지 않고 즉시 리다이렉트됩니다.
 */
export default function AuthSuccessPage() {
  const router = useRouter();

  useEffect(() => {
    console.log('[Auth Success] 🎉 OAuth callback successful, redirecting to /certify...');
    
    // 짧은 대기 시간 후 리다이렉트 (쿠키 전파 대기)
    const timeout = setTimeout(() => {
      router.push('/certify');
    }, 100); // 100ms 대기

    return () => clearTimeout(timeout);
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
        <p className="text-body text-gray-700">로그인 중...</p>
      </div>
    </div>
  );
}
