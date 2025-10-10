'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { Video, FileText, Code, TrendingUp, ArrowRight, Loader2, AlertCircle } from 'lucide-react';
import { useTracksWithParticipants } from '@/hooks/useTracksWithParticipants';
import { enrollUserInTrack } from '@/lib/supabase/database';
import { getUser } from '@/lib/supabase/client';
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

export default function TracksPage() {
  const router = useRouter();
  const { data: tracks, isLoading, error } = useTracksWithParticipants();
  const [userId, setUserId] = useState<string | null>(null);
  const [enrolling, setEnrolling] = useState<string | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      const user = await getUser();
      setUserId(user?.id || null);
    };
    fetchUser();
  }, []);

  const handleEnroll = async (trackId: string, trackType: TrackType) => {
    if (!userId) {
      router.push('/login');
      return;
    }

    setEnrolling(trackId);
    try {
      const result = await enrollUserInTrack(userId, trackId);
      if (result) {
        // 성공: 트랙별 인증 페이지로 이동
        router.push(`/certify/${trackType}`);
      } else {
        alert('트랙 등록에 실패했습니다. 다시 시도해주세요.');
      }
    } catch (err: any) {
      console.error('Track enrollment error:', err);
      alert(err.message || '트랙 등록 중 오류가 발생했습니다.');
    } finally {
      setEnrolling(null);
    }
  };

  if (isLoading) {
    return (
      <>
        <Navbar />
        <main className="min-h-screen py-12 px-4 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-3 text-body text-gray-700">트랙 정보를 불러오는 중...</span>
        </main>
        <Footer />
      </>
    );
  }

  if (error || !tracks) {
    return (
      <>
        <Navbar />
        <main className="min-h-screen py-12 px-4 flex items-center justify-center">
          <Card className="p-8 text-center">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h2 className="text-h4 font-heading text-gray-900 mb-2">
              트랙 정보를 불러올 수 없습니다
            </h2>
            <p className="text-body text-gray-600 mb-6">
              잠시 후 다시 시도해주세요.
            </p>
            <Button onClick={() => window.location.reload()}>새로고침</Button>
          </Card>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Navbar />
      <main className="min-h-screen py-12 px-4">
        <div className="container mx-auto max-w-6xl">
          {/* Header */}
          <div className="mb-12 text-center">
            <h1 className="text-h2 font-heading text-gray-900 mb-4">
              나에게 맞는 트랙을 선택하세요
            </h1>
            <p className="text-body-lg text-gray-600 max-w-2xl mx-auto">
              각 트랙은 고유한 목표와 일정을 가지고 있습니다.
              <br />
              여러 트랙에 동시에 참여할 수 있습니다.
            </p>
          </div>

          {/* Tracks Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
            {tracks.map((track) => {
              const Icon = trackIcons[track.type] || Video;
              const schedule = trackSchedules[track.type] || '일정 미정';
              const isEnrolling = enrolling === track.id;

              return (
                <Card
                  key={track.id}
                  className="p-6 hover:shadow-xl transition-all hover:scale-[1.02]"
                >
                  {/* Icon & Badge */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="bg-primary/10 rounded-lg p-3 flex items-center justify-center">
                      <Icon className="h-8 w-8 text-primary" />
                    </div>
                    <Badge className="bg-gray-100 text-gray-700">
                      {track.participant_count}명 참여중
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
                    onClick={() => handleEnroll(track.id, track.type)}
                    disabled={isEnrolling}
                    className="w-full bg-primary hover:bg-primary-hover text-primary-foreground font-semibold"
                  >
                    {isEnrolling ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        등록 중...
                      </>
                    ) : (
                      <>
                        이 트랙 시작하기
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>
                </Card>
              );
            })}
          </div>

          {/* Info Section */}
          <Card className="p-8 bg-gradient-to-br from-primary/5 to-secondary/5 border-primary/20">
            <h3 className="text-h4 font-heading text-gray-900 mb-4">
              💡 트랙 선택 가이드
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-body-sm text-gray-700">
              <div>
                <strong className="text-gray-900">Short-form:</strong> 매일
                꾸준히 짧은 콘텐츠를 만들고 싶은 분
              </div>
              <div>
                <strong className="text-gray-900">Long-form:</strong> 주간
                단위로 깊이 있는 콘텐츠를 제작하고 싶은 분
              </div>
              <div>
                <strong className="text-gray-900">Builder:</strong> 제품/서비스
                개발을 진행하고 있는 분
              </div>
              <div>
                <strong className="text-gray-900">Sales:</strong> 판매와 고객
                개발에 집중하고 싶은 분
              </div>
            </div>
          </Card>
        </div>
      </main>
      <Footer />
    </>
  );
}

