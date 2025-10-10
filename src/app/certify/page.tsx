'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { Video, FileText, Code, TrendingUp, ArrowRight, Loader2, AlertCircle } from 'lucide-react';
import { getUser } from '@/lib/supabase/client';
import { useUserTracks } from '@/hooks/useUserTracks';
import { TrackType } from '@/lib/supabase/types';

// Track type 별 아이콘 맵핑
const trackIcons: Record<TrackType, any> = {
  'short-form': Video,
  'long-form': FileText,
  'builder': Code,
  'sales': TrendingUp,
};

// Track type 별 일정 맵핑
const trackSchedules: Record<TrackType, string> = {
  'short-form': '월~금 (평일)',
  'long-form': '일요일 마감',
  'builder': '일요일 마감',
  'sales': '화요일 마감',
};

export default function CertifyIndexPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);

  // Get current user
  useEffect(() => {
    const fetchUser = async () => {
      console.log('🔍 [CertifyPage] Fetching user...');
      const user = await getUser();
      console.log('🔍 [CertifyPage] User result:', user ? `found (${user.email})` : 'not found');
      setUserId(user?.id || null);
    };
    fetchUser();
  }, []);

  // Fetch user tracks
  const { data: userTracks, isLoading: tracksLoading } = useUserTracks(userId || undefined);

  // If user has only one track, auto-redirect
  useEffect(() => {
    if (userTracks && userTracks.length === 1) {
      router.push(`/certify/${userTracks[0].track?.type}`);
    }
  }, [userTracks, router]);

  // Not logged in
  if (!userId && !tracksLoading) {
    return (
      <>
        <Navbar />
        <main className="min-h-screen py-12 px-4 bg-gray-50 flex items-center justify-center">
          <Card className="p-8 text-center">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h2 className="text-h4 font-heading text-gray-900 mb-2">로그인이 필요합니다</h2>
            <p className="text-body text-gray-600 mb-6">
              인증 페이지에 접근하려면 먼저 로그인해주세요.
            </p>
            <Button onClick={() => router.push('/login')}>로그인 페이지로 이동</Button>
          </Card>
        </main>
        <Footer />
      </>
    );
  }

  // Loading tracks
  if (tracksLoading) {
    return (
      <>
        <Navbar />
        <main className="min-h-screen py-12 px-4 bg-gray-50 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-3 text-body text-gray-700">트랙 정보를 불러오는 중...</span>
        </main>
        <Footer />
      </>
    );
  }

  // No active track
  if (!userTracks || userTracks.length === 0) {
    return (
      <>
        <Navbar />
        <main className="min-h-screen py-12 px-4 bg-gray-50 flex items-center justify-center">
          <Card className="p-8 text-center">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h2 className="text-h4 font-heading text-gray-900 mb-2">등록된 트랙이 없습니다</h2>
            <p className="text-body text-gray-600 mb-6">
              챌린지를 시작하려면 먼저 트랙을 선택해주세요.
            </p>
            <Button onClick={() => router.push('/tracks')}>트랙 선택하기</Button>
          </Card>
        </main>
        <Footer />
      </>
    );
  }

  // Multiple tracks - show selection
  return (
    <>
      <Navbar />
      <main className="min-h-screen py-12 px-4">
        <div className="container mx-auto max-w-4xl">
          {/* Header */}
          <div className="mb-12 text-center">
            <h1 className="text-h2 font-heading text-gray-900 mb-4">
              어떤 트랙을 인증하시겠어요?
            </h1>
            <p className="text-body-lg text-gray-600 max-w-2xl mx-auto">
              현재 참여 중인 트랙 중에서 선택하세요
            </p>
          </div>

          {/* Tracks Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {userTracks.map((userTrack) => {
              const track = userTrack.track;
              if (!track) return null;

              const Icon = trackIcons[track.type] || Video;
              const schedule = trackSchedules[track.type] || '일정 미정';

              return (
                <Card
                  key={userTrack.id}
                  className="p-6 hover:shadow-xl transition-all hover:scale-[1.02] cursor-pointer"
                  onClick={() => router.push(`/certify/${track.type}`)}
                >
                  {/* Icon & Badge */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="bg-primary/10 rounded-lg p-3 flex items-center justify-center">
                      <Icon className="h-8 w-8 text-primary" />
                    </div>
                    <Badge className="bg-green-100 text-green-700">
                      참여 중
                    </Badge>
                  </div>

                  {/* Title & Description */}
                  <h2 className="text-h4 font-heading text-gray-900 mb-2">
                    {track.name}
                  </h2>
                  <p className="text-body text-gray-600 mb-4">
                    {track.description}
                  </p>

                  {/* Schedule */}
                  <div className="flex items-center gap-2 mb-6">
                    <span className="text-body-sm text-gray-500">일정:</span>
                    <Badge className="bg-secondary/10 text-secondary">
                      {schedule}
                    </Badge>
                  </div>

                  {/* CTA Button */}
                  <Button
                    onClick={() => router.push(`/certify/${track.type}`)}
                    className="w-full bg-primary hover:bg-primary-hover text-primary-foreground font-semibold"
                  >
                    이 트랙 인증하기
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Card>
              );
            })}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
