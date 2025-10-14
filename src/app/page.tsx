'use client';

import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Footer } from '@/components/layout/footer';
import { PeriodBanner } from '@/components/PeriodBanner';
import { getUser, signOut } from '@/lib/supabase/client';
import { useToast } from '@/hooks/use-toast';

function HomeContent() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const searchParams = useSearchParams();
  const { toast } = useToast();

  useEffect(() => {
    checkUser();
  }, []);

  // URL 파라미터에서 에러 메시지 확인
  useEffect(() => {
    const error = searchParams.get('error');
    if (error) {
      toast({
        title: '알림',
        description: decodeURIComponent(error),
        variant: 'destructive',
      });
    }
  }, [searchParams, toast]);

  const checkUser = async () => {
    const currentUser = await getUser();
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
      <main className="flex-1">
        {/* Period Banner */}
        <PeriodBanner />
        
        {/* Hero Section */}
        <section className="bg-gradient-to-br from-blue-50 to-indigo-100 py-20">
          <div className="container mx-auto px-4 text-center">
            <div className="max-w-4xl mx-auto">
              <h1 className="text-5xl md:text-7xl font-bold text-gray-900 mb-6">
                ASC 챌린지
              </h1>
              <p className="text-xl md:text-2xl text-gray-600 mb-8">
                디지털 콘텐츠 크리에이터를 위한 종합 인증 플랫폼
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                {user ? (
                  <>
                    <Link href="/certify">
                      <Button size="lg" className="bg-primary hover:bg-primary-hover text-primary-foreground font-semibold text-lg px-8 py-6 rounded-xl">
                        인증 시작하기
                      </Button>
                    </Link>
                    <Button
                      variant="outline"
                      size="lg"
                      onClick={handleSignOut}
                      className="font-semibold text-lg px-8 py-6 rounded-xl"
                    >
                      로그아웃
                    </Button>
                  </>
                ) : (
                  <>
                    <Link href="/login">
                      <Button size="lg" className="bg-primary hover:bg-primary-hover text-primary-foreground font-semibold text-lg px-8 py-6 rounded-xl">
                        Discord로 시작하기
                      </Button>
                    </Link>
                    <Link href="/contact-admin">
                      <Button variant="outline" size="lg" className="font-semibold text-lg px-8 py-6 rounded-xl">
                        트랙 배정 문의
                      </Button>
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex flex-col">
        <main className="flex-1 flex items-center justify-center px-4">
          <div className="text-center space-y-8 max-w-2xl">
            <p className="text-2xl text-gray-600">로딩 중...</p>
          </div>
        </main>
        <Footer />
      </div>
    }>
      <HomeContent />
    </Suspense>
  );
}
