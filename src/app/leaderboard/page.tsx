'use client';

export const dynamic = 'force-dynamic';

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { PeriodBanner } from '@/components/PeriodBanner';
import { Trophy, Medal, Award, Loader2 } from 'lucide-react';
import { useLeaderboard } from '@/hooks/useLeaderboard';
import { useTracks } from '@/hooks/useTracks';
import { useIsAdmin } from '@/hooks/useAdmin';

const tracks = ['all', 'shortform', 'longform', 'builder', 'sales'] as const;
type Track = (typeof tracks)[number];

const trackLabels: Record<Track, string> = {
  all: '전체',
  shortform: 'Short-form',
  longform: 'Long-form',
  builder: 'Builder',
  sales: 'Sales',
};

export default function LeaderboardPage() {
  const [selectedTrack, setSelectedTrack] = useState<Track>('all');
  
  // 관리자 권한 확인
  const { data: isAdmin, isLoading: adminLoading } = useIsAdmin();
  
  // Fetch all tracks to get track IDs
  const { data: tracksData } = useTracks();
  
  // Get track ID for selected track
  const selectedTrackId = useMemo(() => {
    if (selectedTrack === 'all') return undefined;
    return tracksData?.find(t => t.type === selectedTrack)?.id;
  }, [selectedTrack, tracksData]);
  
  // Fetch leaderboard data (관리자는 모든 사용자, 일반 사용자는 활성 사용자만)
  const { data: leaderboardData, isLoading, error } = useLeaderboard(selectedTrackId, 100, isAdmin);

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="h-6 w-6 text-accent" />;
      case 2:
        return <Medal className="h-6 w-6 text-gray-400" />;
      case 3:
        return <Award className="h-6 w-6 text-[#CD7F32]" />;
      default:
        return null;
    }
  };

  const getRankStyle = (rank: number) => {
    switch (rank) {
      case 1:
        return 'bg-gradient-to-r from-accent/20 to-accent/10 border-accent/30';
      case 2:
        return 'bg-gradient-to-r from-gray-200 to-gray-100 border-gray-300';
      case 3:
        return 'bg-gradient-to-r from-[#CD7F32]/20 to-[#CD7F32]/10 border-[#CD7F32]/30';
      default:
        return 'bg-background border-gray-200';
    }
  };

  const topThree = leaderboardData?.slice(0, 3) || [];
  const allUsers = leaderboardData || [];

  return (
    <>
      <Navbar />
      <PeriodBanner />
      <main className="min-h-screen py-12 px-4">
        <div className="container mx-auto max-w-6xl">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-h2 font-heading text-gray-900 mb-2">
              리더보드
            </h1>
            <p className="text-body text-gray-600">
              챌린지 참가자들의 순위를 확인하고 동기부여를 받으세요
            </p>
          </div>

          {/* Track Filter */}
          <Card className="p-4 mb-6">
            <div className="flex gap-2 flex-wrap">
              {tracks.map((track) => (
                <Button
                  key={track}
                  variant={selectedTrack === track ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedTrack(track)}
                  className={
                    selectedTrack === track
                      ? 'bg-primary hover:bg-primary-hover text-primary-foreground'
                      : ''
                  }
                >
                  {trackLabels[track]}
                </Button>
              ))}
            </div>
          </Card>

          {/* Loading State */}
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}

          {/* Error State */}
          {error && (
            <Card className="p-8 text-center">
              <p className="text-body text-destructive">
                리더보드를 불러오는 중 오류가 발생했습니다.
              </p>
            </Card>
          )}

          {/* Empty State */}
          {!isLoading && !error && allUsers.length === 0 && (
            <Card className="p-12 text-center">
              <Trophy className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-h4 font-heading text-gray-900 mb-2">
                아직 리더보드 데이터가 없습니다
              </h3>
              <p className="text-body text-gray-600 mb-6">
                첫 번째로 챌린지를 인증하고 1등이 되어보세요!
              </p>
              <Button asChild>
                <a href="/certify">지금 인증하기</a>
              </Button>
            </Card>
          )}

          {/* Top 3 Spotlight */}
          {!isLoading && !error && topThree.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              {topThree.map((user) => (
                <Card
                  key={user.user_id}
                  className={`p-6 text-center ${getRankStyle(user.rank)}`}
                >
                  <div className="flex justify-center mb-4">
                    {getRankIcon(user.rank)}
                  </div>
                  <Avatar className="w-20 h-20 mx-auto mb-4 border-4 border-background">
                    <AvatarImage 
                      src={user.discord_avatar_url || undefined} 
                      alt={user.discord_username} 
                    />
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {user.discord_username[0]?.toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <h3 className="text-h5 font-heading text-gray-900 mb-1">
                    {user.discord_username}
                  </h3>
                  {/* TODO: Show user title */}
                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div>
                      <p className="text-h4 font-heading text-primary">
                        {user.total_certifications}
                      </p>
                      <p className="text-body-xs text-gray-600">총 인증</p>
                    </div>
                    <div>
                      <p className="text-h4 font-heading text-accent">
                        {user.current_streak}
                      </p>
                      <p className="text-body-xs text-gray-600">연속</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {/* Full Leaderboard */}
          {!isLoading && !error && allUsers.length > 0 && (
            <Card className="p-6">
              <h2 className="text-h4 font-heading text-gray-900 mb-6">
                전체 순위
              </h2>
              <div className="space-y-3">
                {allUsers.map((user) => (
                  <div
                    key={user.user_id}
                    className={`flex items-center gap-4 p-4 rounded-lg border-2 transition-all hover:shadow-md ${
                      user.rank <= 3
                        ? getRankStyle(user.rank)
                        : 'border-gray-200 hover:border-primary/30'
                    }`}
                  >
                    {/* Rank */}
                    <div className="flex items-center justify-center w-12 h-12">
                      {user.rank <= 3 ? (
                        getRankIcon(user.rank)
                      ) : (
                        <span className="text-h5 font-heading text-gray-600">
                          {user.rank}
                        </span>
                      )}
                    </div>

                    {/* Avatar & Name */}
                    <Avatar className="w-12 h-12">
                      <AvatarImage 
                        src={user.discord_avatar_url || undefined} 
                        alt={user.discord_username} 
                      />
                      <AvatarFallback className="bg-secondary text-secondary-foreground">
                        {user.discord_username[0]?.toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <h3 className="text-body font-semibold text-gray-900">
                        {user.discord_username}
                      </h3>
                      {/* TODO: Show user title */}
                    </div>

                    {/* Stats */}
                    <div className="flex gap-6 text-center">
                      <div>
                        <p className="text-h5 font-heading text-primary">
                          {user.total_certifications}
                        </p>
                        <p className="text-body-xs text-gray-500">인증</p>
                      </div>
                      <div>
                        <p className="text-h5 font-heading text-accent">
                          {user.current_streak}
                        </p>
                        <p className="text-body-xs text-gray-500">연속</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
