'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import {
  Trophy,
  Calendar,
  Award,
  TrendingUp,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import { getUser } from '@/lib/supabase/client';
import { useUserProfile, useUserStats, useUserCertifications } from '@/hooks/useUserProfile';
import { useUserTracks } from '@/hooks/useTracks';
import { getUserTitles } from '@/lib/supabase/database';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

export default function ProfilePage() {
  const [userId, setUserId] = useState<string | null>(null);

  // Get current user
  useEffect(() => {
    const fetchUser = async () => {
      console.log('🔍 Fetching user...');
      const user = await getUser();
      console.log('👤 User from getUser():', user);
      setUserId(user?.id || null);
      console.log('✅ UserId set to:', user?.id || 'null');
    };
    fetchUser();
  }, []);

  // Fetch user profile
  const { data: profile, isLoading: profileLoading } = useUserProfile(userId || undefined);
  
  // Fetch user tracks
  const { data: userTracks, isLoading: tracksLoading } = useUserTracks(userId || undefined);
  
  // Get first active track for stats
  const activeTrack = userTracks?.[0];
  
  // Fetch user stats
  const { streak, totalCertifications, isLoading: statsLoading } = useUserStats(
    userId || undefined,
    activeTrack?.track_id
  );

  // Fetch user titles
  const { data: userTitles, isLoading: titlesLoading } = useQuery({
    queryKey: ['user-titles', userId],
    queryFn: () => (userId ? getUserTitles(userId) : Promise.resolve([])),
    enabled: !!userId,
  });

  // Fetch recent certifications
  const { data: certifications, isLoading: certificationsLoading } = useUserCertifications(
    userId || undefined
  );

  const recentCertifications = certifications?.slice(0, 5) || [];

  const isLoading = profileLoading || tracksLoading || statsLoading || titlesLoading;

  if (isLoading) {
    return (
      <>
        <Navbar />
        <main className="min-h-screen py-12 px-4 bg-gray-50">
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </main>
        <Footer />
      </>
    );
  }

  if (!profile) {
    return (
      <>
        <Navbar />
        <main className="min-h-screen py-12 px-4 bg-gray-50">
          <div className="container mx-auto max-w-6xl">
            <Card className="p-12 text-center">
              <h2 className="text-h3 font-heading text-gray-900 mb-4">
                프로필을 찾을 수 없습니다
              </h2>
              <p className="text-body text-gray-600 mb-6">
                로그인이 필요합니다.
              </p>
              <Button asChild>
                <a href="/login">로그인하기</a>
              </Button>
            </Card>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  const displayName = profile.discord_global_name || profile.discord_username;
  const username = `${profile.discord_username}${profile.discord_discriminator ? `#${profile.discord_discriminator}` : ''}`;

  return (
    <>
      <Navbar />
      <main className="min-h-screen py-12 px-4 bg-gray-50">
        <div className="container mx-auto max-w-6xl">
          {/* Profile Header */}
          <Card className="p-8 mb-6">
            <div className="flex flex-col md:flex-row gap-6 items-start md:items-center">
              {/* Avatar */}
              <Avatar className="w-24 h-24 border-4 border-primary">
                <AvatarImage
                  src={profile.discord_avatar_url || undefined}
                  alt={displayName}
                />
                <AvatarFallback className="bg-primary text-primary-foreground text-h3">
                  {displayName[0]?.toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>

              {/* User Info */}
              <div className="flex-1">
                <h1 className="text-h3 font-heading text-gray-900 mb-2">
                  {displayName}
                </h1>
                <p className="text-body text-gray-600 mb-3">{username}</p>
                <div className="flex gap-2 flex-wrap">
                  {userTracks?.map((ut) => (
                    <Badge key={ut.id} className="bg-primary text-primary-foreground">
                      {ut.track?.name || '트랙'}
                    </Badge>
                  ))}
                  {userTitles && userTitles.length > 0 && (
                    <Badge className="bg-accent text-accent-foreground">
                      {userTitles[0]?.title?.name}
                    </Badge>
                  )}
                </div>
              </div>

              {/* Edit Button (Placeholder) */}
              <Button variant="outline" disabled>
                프로필 수정
              </Button>
            </div>
          </Card>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            <Card className="p-6">
              <div className="flex items-center gap-3 mb-2">
                <Trophy className="h-5 w-5 text-primary" />
                <span className="text-body-sm text-gray-600">총 인증</span>
              </div>
              <p className="text-h2 font-heading text-primary">
                {totalCertifications}
              </p>
            </Card>

            <Card className="p-6">
              <div className="flex items-center gap-3 mb-2">
                <Calendar className="h-5 w-5 text-secondary" />
                <span className="text-body-sm text-gray-600">연속 인증</span>
              </div>
              <p className="text-h2 font-heading text-secondary">{streak}일</p>
            </Card>

            <Card className="p-6">
              <div className="flex items-center gap-3 mb-2">
                <Award className="h-5 w-5 text-accent" />
                <span className="text-body-sm text-gray-600">획득 칭호</span>
              </div>
              <p className="text-h2 font-heading text-accent">
                {userTitles?.length || 0}
              </p>
            </Card>

            <Card className="p-6">
              <div className="flex items-center gap-3 mb-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                <span className="text-body-sm text-gray-600">현재 순위</span>
              </div>
              <p className="text-h2 font-heading text-primary">-</p>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Achievements */}
            <div className="lg:col-span-2">
              <Card className="p-6">
                <h2 className="text-h4 font-heading text-gray-900 mb-6">
                  획득 칭호
                </h2>
                {userTitles && userTitles.length > 0 ? (
                  <div className="space-y-3">
                    {userTitles.map((userTitle) => (
                      <div
                        key={userTitle.id}
                        className="flex items-center justify-between p-4 rounded-lg border-2 border-accent/30 bg-accent/5"
                      >
                        <div className="flex items-center gap-3">
                          <CheckCircle2 className="h-6 w-6 text-accent" />
                          <div>
                            <h3 className="text-body font-semibold text-gray-900">
                              {userTitle.title?.name}
                            </h3>
                            <p className="text-body-sm text-gray-600">
                              {format(new Date(userTitle.earned_at), 'yyyy년 MM월 dd일', { locale: ko })}에 획득
                            </p>
                          </div>
                        </div>
                        <Badge className="bg-accent text-accent-foreground">
                          획득
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Award className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-body text-gray-600">
                      아직 획득한 칭호가 없습니다
                    </p>
                    <p className="text-body-sm text-gray-500 mt-2">
                      챌린지를 인증하고 칭호를 획득해보세요!
                    </p>
                  </div>
                )}
              </Card>

              {/* Recent Certifications */}
              <Card className="p-6 mt-6">
                <h2 className="text-h4 font-heading text-gray-900 mb-6">
                  최근 인증 기록
                </h2>
                {recentCertifications.length > 0 ? (
                  <div className="space-y-3">
                    {recentCertifications.map((cert) => (
                      <div
                        key={cert.id}
                        className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-primary/30 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <CheckCircle2 className="h-5 w-5 text-accent" />
                          <div>
                            <p className="text-body font-semibold text-gray-900">
                              {format(new Date(cert.certification_date), 'yyyy년 MM월 dd일', { locale: ko })}
                            </p>
                            <Badge className="bg-primary/10 text-primary text-body-xs mt-1">
                              {cert.track?.name || '트랙'}
                            </Badge>
                          </div>
                        </div>
                        <a
                          href={cert.certification_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-body-sm text-primary hover:underline"
                        >
                          링크 보기
                        </a>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <CheckCircle2 className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-body text-gray-600">
                      아직 인증 기록이 없습니다
                    </p>
                    <p className="text-body-sm text-gray-500 mt-2">
                      첫 번째 챌린지를 인증해보세요!
                    </p>
                    <Button asChild className="mt-4">
                      <a href="/certify">지금 인증하기</a>
                    </Button>
                  </div>
                )}
              </Card>
            </div>

            {/* Activity Summary */}
            <div className="lg:col-span-1 space-y-6">
              <Card className="p-6">
                <h3 className="text-h5 font-heading text-gray-900 mb-4">
                  활동 요약
                </h3>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-body-sm mb-2">
                      <span className="text-gray-600">이번 주 인증률</span>
                      <span className="font-semibold text-gray-900">
                        - %
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-primary h-2 rounded-full"
                        style={{ width: '0%' }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-body-sm mb-2">
                      <span className="text-gray-600">이번 달 인증률</span>
                      <span className="font-semibold text-gray-900">- %</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-secondary h-2 rounded-full"
                        style={{ width: '0%' }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-body-sm mb-2">
                      <span className="text-gray-600">전체 인증률</span>
                      <span className="font-semibold text-gray-900">- %</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-accent h-2 rounded-full"
                        style={{ width: '0%' }}
                      />
                    </div>
                  </div>
                  <p className="text-body-xs text-gray-500 mt-4">
                    * 인증률 계산은 곧 업데이트 예정입니다
                  </p>
                </div>
              </Card>

              <Card className="p-6">
                <h3 className="text-h5 font-heading text-gray-900 mb-4">
                  가입 정보
                </h3>
                <div className="space-y-3 text-body-sm">
                  <div>
                    <span className="text-gray-600 block mb-1">
                      가입일
                    </span>
                    <span className="text-gray-900 font-semibold">
                      {format(new Date(profile.created_at), 'yyyy년 MM월 dd일', { locale: ko })}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600 block mb-1">
                      활동 일수
                    </span>
                    <span className="text-gray-900 font-semibold">
                      {Math.floor(
                        (new Date().getTime() - new Date(profile.created_at).getTime()) /
                          (1000 * 60 * 60 * 24)
                      )}일
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600 block mb-1">
                      Discord ID
                    </span>
                    <span className="text-gray-900 font-semibold">
                      {username}
                    </span>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
