'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { signInWithDiscord, getUser } from '@/lib/supabase/client';
import { AlertCircle, CheckCircle } from 'lucide-react';

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [isSupabaseConfigured, setIsSupabaseConfigured] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    checkUser();
    checkSupabaseConfig();
  }, []);

  const checkUser = async () => {
    const currentUser = await getUser();
    setUser(currentUser);
  };

  const checkSupabaseConfig = () => {
    const hasUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const hasKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    setIsSupabaseConfigured(!!(hasUrl && hasKey));
  };

  const handleDiscordLogin = async () => {
    try {
      setIsLoading(true);
      await signInWithDiscord();
    } catch (error) {
      console.error('❌ Login failed:', error);
      alert('로그인에 실패했습니다. 다시 시도해주세요.');
      setIsLoading(false);
    }
  };

  const handleDemoLogin = () => {
    alert('데모 계정 기능은 준비 중입니다. Discord 로그인을 이용해주세요.');
  };

  if (user) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-gray-50">
        <Card className="w-full max-w-md p-8">
          <div className="text-center">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              이미 로그인되어 있습니다
            </h1>
            <p className="text-gray-600 mb-6">
              환영합니다, {user.email}
            </p>
            <div className="space-y-3">
              <Link href="/certify" className="block">
                <Button className="w-full bg-primary hover:bg-primary-hover text-primary-foreground font-semibold py-3">
                  인증 페이지로 이동
                </Button>
              </Link>
              <Link href="/" className="block">
                <Button variant="outline" className="w-full">
                  홈으로 돌아가기
                </Button>
              </Link>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="w-full max-w-md">
        {/* 로고 및 제목 */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <Image
              src="/easynext.png"
              alt="ASC 챌린지"
              width={80}
              height={80}
              className="rounded-lg"
            />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            ASC 챌린지
          </h1>
          <p className="text-lg text-gray-600">
            크리에이터 인증 플랫폼
          </p>
        </div>

        {/* Supabase 설정 경고 */}
        {!isSupabaseConfigured && (
          <Card className="p-4 mb-6 border-orange-200 bg-orange-50">
            <div className="flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-orange-800 mb-1">
                  설정이 필요합니다
                </h3>
                <p className="text-sm text-orange-700">
                  Supabase 환경 변수가 설정되지 않았습니다. 로그인 기능을 사용하려면 설정을 완료해주세요.
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* 로그인 카드 */}
        <Card className="p-8">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-6">
            로그인
          </h2>

          {/* Discord 로그인 버튼 */}
          <Button
            className="w-full bg-[#5865F2] hover:bg-[#4752C4] text-white font-semibold py-4 text-lg mb-4"
            onClick={handleDiscordLogin}
            disabled={isLoading || !isSupabaseConfigured}
          >
            {isLoading ? (
              <>로그인 중...</>
            ) : (
              <>
                <svg
                  className="w-6 h-6 mr-3"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z" />
                </svg>
                Discord로 로그인
              </>
            )}
          </Button>

          {/* 구분선 */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">또는</span>
            </div>
          </div>

          {/* 데모 계정 로그인 */}
          <Button
            variant="outline"
            className="w-full font-semibold py-4 text-lg mb-6"
            onClick={handleDemoLogin}
            disabled={!isSupabaseConfigured}
          >
            데모 계정으로 체험하기
          </Button>

          {/* 안내 정보 */}
          <div className="text-center space-y-4">
            <p className="text-sm text-gray-600">
              로그인하면 다음 서비스를 이용할 수 있습니다:
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              <Badge variant="secondary">트랙 인증</Badge>
              <Badge variant="secondary">리더보드</Badge>
              <Badge variant="secondary">프로필 관리</Badge>
              <Badge variant="secondary">진행 상황 추적</Badge>
            </div>
          </div>

          {/* 이용약관 링크 */}
          <div className="mt-6 text-center">
            <p className="text-xs text-gray-500">
              로그인 시{' '}
              <Link href="/terms" className="text-blue-600 hover:underline">
                이용약관
              </Link>
              에 동의한 것으로 간주됩니다.
            </p>
          </div>

          {/* 홈으로 돌아가기 */}
          <div className="mt-8 text-center">
            <Link
              href="/"
              className="text-sm text-gray-500 hover:text-gray-700 hover:underline"
            >
              ← 홈으로 돌아가기
            </Link>
          </div>
        </Card>

        {/* 추가 정보 */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            처음이신가요?{' '}
            <Link href="/contact-admin" className="text-blue-600 hover:underline">
              트랙 배정 문의
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

