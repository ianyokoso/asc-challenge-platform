'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Footer } from '@/components/layout/footer';

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-1 flex items-center justify-center px-4">
        <div className="text-center space-y-8 max-w-2xl">
          <h1 className="text-6xl font-bold text-gray-900">
            ASC 챌린지
          </h1>
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
        </div>
      </main>
      <Footer />
    </div>
  );
}
