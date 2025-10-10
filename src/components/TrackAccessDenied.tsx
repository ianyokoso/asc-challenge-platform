'use client';

import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { AlertCircle } from 'lucide-react';

export function TrackAccessDenied() {
  const router = useRouter();

  return (
    <>
      <Navbar />
      <main className="min-h-screen py-12 px-4 flex items-center justify-center">
        <Card className="p-8 max-w-lg text-center">
          <AlertCircle className="h-16 w-16 text-accent mx-auto mb-4" />
          <h2 className="text-h3 font-heading text-gray-900 mb-3">
            트랙 배정 대기 중
          </h2>
          <p className="text-body text-gray-600 mb-6">
            아직 관리자가 트랙을 배정하지 않았습니다.
            <br />
            관리자에게 문의하여 트랙을 배정받으세요.
          </p>
          <div className="bg-accent/10 border border-accent/30 rounded-lg p-4 mb-6">
            <p className="text-body-sm text-gray-700">
              💡 <strong>안내:</strong> 챌린지에 참여하려면 관리자가 먼저 트랙을 배정해야 합니다.
              <br />
              Discord 채널에서 관리자에게 문의해주세요.
            </p>
          </div>
          <Button onClick={() => router.push('/')}>홈으로 돌아가기</Button>
        </Card>
      </main>
      <Footer />
    </>
  );
}

