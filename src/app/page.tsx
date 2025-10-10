'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Footer } from '@/components/layout/footer';
import { getUser, signOut } from '@/lib/supabase/client';

export default function Home() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    console.log('🔍 [Home] Checking user status...');
    const currentUser = await getUser();
    console.log('🔍 [Home] User:', currentUser ? currentUser.email : 'not logged in');
    setUser(currentUser);
    setLoading(false);
  };

  const handleSignOut = async () => {
    await signOut();
    setUser(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <main className="flex-1 flex items-center justify-center px-4">
          <div className="text-center space-y-8 max-w-2xl">
            <p className="text-2xl text-gray-600">로딩 중...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-1 flex items-center justify-center px-4">
        <div className="text-center space-y-8 max-w-2xl">
          <h1 className="text-6xl font-bold text-gray-900">
            ASC 챌린지
          </h1>
          
          {user ? (
            <>
              <div className="space-y-4">
                <p className="text-2xl text-green-600 font-semibold">
                  ✅ 로그인 성공!
                </p>
                <p className="text-lg text-gray-600">
                  환영합니다, {user.email}
                </p>
                <div className="pt-4 flex gap-4 justify-center">
                  <Link href="/certify">
                    <Button className="bg-primary hover:bg-primary-hover text-primary-foreground font-semibold text-xl px-12 py-8 rounded-xl">
                      인증 페이지로 이동
                    </Button>
                  </Link>
                  <Button
                    onClick={handleSignOut}
                    className="bg-red-500 hover:bg-red-600 text-white font-semibold text-xl px-12 py-8 rounded-xl"
                  >
                    로그아웃
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <>
              <p className="text-2xl text-gray-600">
                로그인 테스트
              </p>
              <div className="pt-8">
                <Link href="/login">
                  <Button className="bg-primary hover:bg-primary-hover text-primary-foreground font-semibold text-xl px-12 py-8 rounded-xl">
                    Discord로 로그인
                  </Button>
                </Link>
              </div>
            </>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
