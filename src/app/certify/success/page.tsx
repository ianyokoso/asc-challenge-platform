'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { CheckCircle2, Calendar, Edit, Loader2 } from 'lucide-react';
import { getUser } from '@/lib/supabase/client';
import { useUserStats } from '@/hooks/useUserStats';
import { useUserTracks } from '@/hooks/useUserTracks';

export default function CertifySuccessPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      const user = await getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      setUserId(user.id);
    };
    fetchUser();
  }, [router]);

  const { data: userTracks, isLoading: tracksLoading } = useUserTracks(userId || undefined);
  const activeTrack = userTracks?.find(ut => ut.is_active);
  const trackId = activeTrack?.track_id;

  const { streak, totalCertifications, titlesCount, isLoading: statsLoading } = useUserStats(
    userId || undefined,
    trackId
  );

  const isLoading = !userId || tracksLoading || statsLoading;

  if (isLoading) {
    return (
      <>
        <Navbar />
        <main className="min-h-screen py-12 px-4 bg-gray-50 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-3 text-body text-gray-700">로딩 중...</span>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Navbar />
      <main className="min-h-screen py-12 px-4 bg-gray-50 flex items-center justify-center">
        <div className="container mx-auto max-w-2xl">
          <Card className="p-12 text-center">
            {/* Success Icon */}
            <div className="flex justify-center mb-6">
              <div className="bg-accent rounded-full p-4">
                <CheckCircle2 className="h-16 w-16 text-accent-foreground" />
              </div>
            </div>

            {/* Title */}
            <h1 className="text-h2 font-heading text-gray-900 mb-4">
              인증 완료! 🎉
            </h1>
            <p className="text-body-lg text-gray-600 mb-8">
              오늘의 챌린지를 성공적으로 완료했습니다.
              <br />
              꾸준한 노력으로 목표를 달성하세요!
            </p>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 mb-8 p-6 bg-gray-50 rounded-lg">
              <div>
                <p className="text-h4 font-heading text-primary">{streak}</p>
                <p className="text-body-sm text-gray-600">연속 인증</p>
              </div>
              <div>
                <p className="text-h4 font-heading text-secondary">{totalCertifications}</p>
                <p className="text-body-sm text-gray-600">총 인증</p>
              </div>
              <div>
                <p className="text-h4 font-heading text-accent">{titlesCount}</p>
                <p className="text-body-sm text-gray-600">획득 칭호</p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-4">
              <Link href="/calendar" className="flex-1">
                <Button
                  variant="outline"
                  className="w-full h-12 border-2"
                >
                  <Calendar className="mr-2 h-4 w-4" />
                  캘린더 보기
                </Button>
              </Link>
              <Link href="/certify" className="flex-1">
                <Button
                  className="w-full h-12 bg-secondary hover:bg-secondary-hover text-secondary-foreground font-semibold"
                >
                  <Edit className="mr-2 h-4 w-4" />
                  수정하고 싶어요
                </Button>
              </Link>
            </div>

            {/* Next Steps */}
            <div className="mt-8 p-4 bg-primary/5 rounded-lg">
              <p className="text-body-sm text-gray-700">
                💡 <strong>다음 단계:</strong> 캘린더에서 진행 상황을 확인하고,
                리더보드에서 순위를 확인해보세요!
              </p>
            </div>
          </Card>
        </div>
      </main>
      <Footer />
    </>
  );
}
