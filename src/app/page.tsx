'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { Trophy, Target, Users, TrendingUp } from 'lucide-react';

export default function Home() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen">
        {/* Hero Section */}
        <section className="bg-primary py-20 px-4">
          <div className="container mx-auto max-w-6xl">
            <h1 className="text-h1 font-heading text-primary-foreground mb-6">
              ASC 챌린지 인증 플랫폼
            </h1>
            <p className="text-body-lg text-primary-foreground/90 mb-8 max-w-2xl">
              ASC 디스코드 커뮤니티를 위한 웹 기반 챌린지 인증 SaaS.
              <br />
              꾸준한 습관 형성과 동기 부여를 통해 함께 성장하세요.
            </p>
            <div className="flex gap-4 flex-wrap">
              <Link href="/login">
                <Button className="bg-accent hover:bg-accent-hover active:bg-accent-active text-accent-foreground font-semibold text-body">
                  시작하기
                </Button>
              </Link>
              <Link href="/leaderboard">
                <Button className="bg-secondary hover:bg-secondary-hover active:bg-secondary-active text-secondary-foreground font-semibold text-body">
                  리더보드 보기
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-16 px-4 bg-gray-50">
          <div className="container mx-auto max-w-6xl">
            <h2 className="text-h2 font-heading text-gray-900 mb-4 text-center">
              왜 ASC 챌린지인가?
            </h2>
            <p className="text-body text-gray-600 mb-12 text-center max-w-2xl mx-auto">
              효과적인 습관 형성을 위한 모든 기능을 제공합니다
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Feature 1 */}
              <Card className="p-6 text-center hover:shadow-lg transition-shadow">
                <div className="bg-primary/10 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                  <Trophy className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-h5 font-heading text-gray-900 mb-2">
                  다양한 트랙
                </h3>
                <p className="text-body-sm text-gray-600">
                  Short-form, Long-form, Builder, Sales 등 다양한 챌린지 트랙
                </p>
              </Card>

              {/* Feature 2 */}
              <Card className="p-6 text-center hover:shadow-lg transition-shadow">
                <div className="bg-secondary/10 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                  <Target className="w-8 h-8 text-secondary" />
                </div>
                <h3 className="text-h5 font-heading text-gray-900 mb-2">
                  목표 달성
                </h3>
                <p className="text-body-sm text-gray-600">
                  일일 미션 인증으로 꾸준한 습관 형성
                </p>
              </Card>

              {/* Feature 3 */}
              <Card className="p-6 text-center hover:shadow-lg transition-shadow">
                <div className="bg-accent/10 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                  <Users className="w-8 h-8 text-accent" />
                </div>
                <h3 className="text-h5 font-heading text-gray-900 mb-2">
                  커뮤니티
                </h3>
                <p className="text-body-sm text-gray-600">
                  Discord 연동으로 함께 성장하는 커뮤니티
                </p>
              </Card>

              {/* Feature 4 */}
              <Card className="p-6 text-center hover:shadow-lg transition-shadow">
                <div className="bg-primary/10 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                  <TrendingUp className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-h5 font-heading text-gray-900 mb-2">
                  성장 추적
                </h3>
                <p className="text-body-sm text-gray-600">
                  캘린더와 리더보드로 진척도 확인
                </p>
              </Card>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 px-4">
          <div className="container mx-auto max-w-4xl">
            <Card className="p-12 text-center bg-gradient-to-br from-primary/5 to-secondary/5 border-primary/20">
              <h2 className="text-h2 font-heading text-gray-900 mb-4">
                지금 바로 시작하세요
              </h2>
              <p className="text-body-lg text-gray-600 mb-8">
                Discord 계정으로 간편하게 로그인하고
                <br />
                오늘부터 챌린지에 참여해보세요
              </p>
              <Link href="/login">
                <Button className="bg-primary hover:bg-primary-hover text-primary-foreground font-semibold text-body px-8 py-6">
                  Discord로 시작하기
                </Button>
              </Link>
            </Card>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
