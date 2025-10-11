'use client';

import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Footer } from '@/components/layout/footer';
import { getUser, signOut } from '@/lib/supabase/client';
import { CheckCircle, Users, Trophy, Calendar, AlertCircle } from 'lucide-react';
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

        {/* Features Section */}
        <section className="py-20 bg-white">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold text-gray-900 mb-4">
                ASC 챌린지가 특별한 이유
              </h2>
              <p className="text-xl text-gray-600">
                전문적인 인증 시스템으로 여러분의 크리에이터 여정을 지원합니다
              </p>
            </div>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              <Card className="p-8 text-center hover:shadow-lg transition-shadow">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="w-8 h-8 text-blue-600" />
                </div>
                <h3 className="text-xl font-semibold mb-3">4가지 전문 트랙</h3>
                <p className="text-gray-600">
                  숏폼, 롱폼, 빌더, 세일즈 트랙으로 다양한 분야의 전문성을 인증받으세요
                </p>
              </Card>

              <Card className="p-8 text-center hover:shadow-lg transition-shadow">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-xl font-semibold mb-3">체계적인 인증</h3>
                <p className="text-gray-600">
                  단계별 미션과 평가를 통해 실질적인 성장을 확인할 수 있습니다
                </p>
              </Card>

              <Card className="p-8 text-center hover:shadow-lg transition-shadow">
                <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Trophy className="w-8 h-8 text-purple-600" />
                </div>
                <h3 className="text-xl font-semibold mb-3">리더보드 시스템</h3>
                <p className="text-gray-600">
                  다른 크리에이터들과 경쟁하며 동기부여를 얻고 성장하세요
                </p>
              </Card>

              <Card className="p-8 text-center hover:shadow-lg transition-shadow">
                <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Calendar className="w-8 h-8 text-orange-600" />
                </div>
                <h3 className="text-xl font-semibold mb-3">유연한 일정</h3>
                <p className="text-gray-600">
                  본인의 페이스에 맞춰 언제든지 인증을 진행할 수 있습니다
                </p>
              </Card>
            </div>
          </div>
        </section>

        {/* Tracks Section */}
        <section className="py-20 bg-gray-50">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold text-gray-900 mb-4">
                전문 트랙 선택하기
              </h2>
              <p className="text-xl text-gray-600">
                여러분의 전문 분야에 맞는 트랙을 선택하여 시작하세요
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="p-6 hover:shadow-lg transition-shadow">
                <div className="text-center">
                  <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl">🎬</span>
                  </div>
                  <h3 className="text-lg font-semibold mb-2">숏폼 크리에이터</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    짧고 강력한 콘텐츠로 많은 사람들에게 전달하는 전문가
                  </p>
                  <Badge variant="secondary">인기</Badge>
                </div>
              </Card>

              <Card className="p-6 hover:shadow-lg transition-shadow">
                <div className="text-center">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl">📺</span>
                  </div>
                  <h3 className="text-lg font-semibold mb-2">롱폼 크리에이터</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    깊이 있는 스토리텔링으로 관객을 사로잡는 전문가
                  </p>
                  <Badge variant="outline">전문</Badge>
                </div>
              </Card>

              <Card className="p-6 hover:shadow-lg transition-shadow">
                <div className="text-center">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl">🛠️</span>
                  </div>
                  <h3 className="text-lg font-semibold mb-2">빌더</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    기술과 창의성을 결합해 새로운 것을 만드는 전문가
                  </p>
                  <Badge variant="outline">기술</Badge>
                </div>
              </Card>

              <Card className="p-6 hover:shadow-lg transition-shadow">
                <div className="text-center">
                  <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl">💼</span>
                  </div>
                  <h3 className="text-lg font-semibold mb-2">세일즈</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    효과적인 마케팅과 판매로 성과를 창출하는 전문가
                  </p>
                  <Badge variant="outline">비즈니스</Badge>
                </div>
              </Card>
            </div>

            <div className="text-center mt-12">
              <Link href="/contact-admin">
                <Button size="lg" variant="outline" className="font-semibold text-lg px-8 py-6 rounded-xl">
                  트랙 배정 문의하기
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 bg-primary">
          <div className="container mx-auto px-4 text-center">
            <div className="max-w-3xl mx-auto">
              <h2 className="text-4xl font-bold text-primary-foreground mb-6">
                지금 바로 시작하세요
              </h2>
              <p className="text-xl text-primary-foreground/90 mb-8">
                ASC 챌린지와 함께 여러분의 크리에이터 여정을 시작하고, 전문성을 인증받아보세요
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                {user ? (
                  <>
                    <Link href="/certify">
                      <Button size="lg" variant="secondary" className="font-semibold text-lg px-8 py-6 rounded-xl">
                        인증 진행하기
                      </Button>
                    </Link>
                    <Link href="/profile">
                      <Button size="lg" variant="outline" className="font-semibold text-lg px-8 py-6 rounded-xl border-primary-foreground text-primary-foreground hover:bg-primary-foreground hover:text-primary">
                        프로필 보기
                      </Button>
                    </Link>
                  </>
                ) : (
                  <>
                    <Link href="/login">
                      <Button size="lg" variant="secondary" className="font-semibold text-lg px-8 py-6 rounded-xl">
                        무료로 시작하기
                      </Button>
                    </Link>
                    <Link href="/leaderboard">
                      <Button size="lg" variant="outline" className="font-semibold text-lg px-8 py-6 rounded-xl border-primary-foreground text-primary-foreground hover:bg-primary-foreground hover:text-primary">
                        리더보드 보기
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
