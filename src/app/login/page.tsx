'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Trophy } from 'lucide-react';
import { signInWithDiscord } from '@/lib/supabase/client';

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);

  // Check if Supabase is configured
  const isSupabaseConfigured =
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_URL !== 'https://placeholder.supabase.co';

  const handleDiscordLogin = async () => {
    if (!isSupabaseConfigured) {
      alert(
        'Discord OAuth2가 아직 설정되지 않았습니다.\n\n' +
          '설정 방법은 DISCORD_OAUTH_SETUP.md 파일을 참고하세요.\n' +
          '지금은 "데모 계정으로 체험하기" 버튼을 사용하세요.'
      );
      return;
    }

    try {
      console.log('🔍 [LoginPage] Starting Discord login...');
      setIsLoading(true);
      await signInWithDiscord();
      console.log('✅ [LoginPage] Discord login initiated successfully');
    } catch (error) {
      console.error('❌ [LoginPage] Login failed:', error);
      alert('로그인에 실패했습니다. 다시 시도해주세요.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/10 flex items-center justify-center px-4">
      <Card className="w-full max-w-md p-8">
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <div className="bg-primary text-primary-foreground rounded-lg p-4">
            <Trophy className="h-12 w-12" />
          </div>
        </div>

        {/* Title */}
        <h1 className="text-h3 font-heading text-gray-900 text-center mb-2">
          ASC 챌린지
        </h1>
        <p className="text-body text-gray-600 text-center mb-8">
          Discord 계정으로 로그인하세요
        </p>

        {/* Configuration Warning */}
        {!isSupabaseConfigured && (
          <div className="mb-4 p-4 bg-accent/10 border border-accent/30 rounded-lg">
            <p className="text-body-sm text-gray-700">
              ⚠️ Discord OAuth2가 설정되지 않았습니다.
              <br />
              <code className="text-body-xs bg-gray-100 px-1 py-0.5 rounded">
                DISCORD_OAUTH_SETUP.md
              </code>{' '}
              파일을 참고하여 설정하세요.
            </p>
          </div>
        )}

        {/* Discord Login Button */}
        <Button
          className="w-full bg-[#5865F2] hover:bg-[#4752C4] text-white font-semibold py-6 mb-4"
          onClick={handleDiscordLogin}
          disabled={isLoading || !isSupabaseConfigured}
        >
          {isLoading ? (
            <>로그인 중...</>
          ) : (
            <>
              <svg
                className="w-5 h-5 mr-2"
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

        {/* Info Text */}
        <p className="text-body-sm text-gray-500 text-center mb-4">
          로그인하면{' '}
          <a href="#" className="text-primary hover:underline">
            이용약관
          </a>{' '}
          및{' '}
          <a href="#" className="text-primary hover:underline">
            개인정보처리방침
          </a>
          에 동의하는 것으로 간주됩니다.
        </p>

        {/* Demo Login Button */}
        <div className="relative mb-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200"></div>
          </div>
          <div className="relative flex justify-center text-body-sm">
            <span className="px-2 bg-card text-gray-500">또는</span>
          </div>
        </div>

        <Link href="/tracks">
          <Button
            variant="outline"
            className="w-full py-6 border-2 hover:bg-gray-50"
          >
            데모 계정으로 체험하기
          </Button>
        </Link>

        {/* Back to Home */}
        <div className="mt-6 text-center">
          <Link
            href="/"
            className="text-body-sm text-primary hover:underline"
          >
            홈으로 돌아가기
          </Link>
        </div>
      </Card>
    </div>
  );
}

