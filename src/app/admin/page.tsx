'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AdminSidebar } from '@/components/layout/admin-sidebar';
import {
  Users,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  Loader2,
  ShieldAlert,
} from 'lucide-react';
import { getUser } from '@/lib/supabase/client';
import { useIsAdmin, useAdminStats, useDropoutCandidates } from '@/hooks/useAdmin';
import { useRouter } from 'next/navigation';

export default function AdminDashboardPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);

  // Get current user
  useEffect(() => {
    const fetchUser = async () => {
      const user = await getUser();
      setUserId(user?.id || null);
    };
    fetchUser();
  }, []);

  // Check if user is admin
  const { data: isAdmin, isLoading: adminLoading } = useIsAdmin(userId || undefined);
  
  // Fetch admin stats
  const { data: stats, isLoading: statsLoading } = useAdminStats();
  
  // Fetch dropout candidates
  const { data: dropoutCandidates, isLoading: dropoutLoading } = useDropoutCandidates();

  const isLoading = adminLoading || statsLoading || dropoutLoading;

  // Redirect if not admin
  useEffect(() => {
    if (!adminLoading && userId && isAdmin === false) {
      router.push('/');
    }
  }, [isAdmin, adminLoading, userId, router]);

  // Not logged in
  if (!userId && !adminLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <Card className="p-12 text-center">
          <ShieldAlert className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-h4 font-heading text-gray-900 mb-2">
            로그인이 필요합니다
          </h3>
          <p className="text-body text-gray-600 mb-6">
            관리자 페이지는 로그인 후 이용 가능합니다
          </p>
          <Button onClick={() => router.push('/login')}>로그인하기</Button>
        </Card>
      </div>
    );
  }

  // Not admin
  if (!adminLoading && userId && isAdmin === false) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <Card className="p-12 text-center">
          <ShieldAlert className="h-16 w-16 text-destructive mx-auto mb-4" />
          <h3 className="text-h4 font-heading text-gray-900 mb-2">
            접근 권한이 없습니다
          </h3>
          <p className="text-body text-gray-600 mb-6">
            관리자만 접근할 수 있는 페이지입니다
          </p>
          <Button onClick={() => router.push('/')}>홈으로 돌아가기</Button>
        </Card>
      </div>
    );
  }

  // Loading
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Calculate average certification rate (placeholder)
  const avgCertificationRate = stats?.totalUsers && stats?.todayCertifications
    ? Math.round((stats.todayCertifications / stats.totalUsers) * 100)
    : 0;

  return (
    <div className="flex min-h-screen bg-gray-50">
      <AdminSidebar />
      <main className="flex-1 p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-h2 font-heading text-gray-900 mb-2">
            관리자 대시보드
          </h1>
          <p className="text-body text-gray-600">
            ASC 챌린지 플랫폼 관리 및 모니터링
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-primary/10 rounded-lg p-3">
                <Users className="h-6 w-6 text-primary" />
              </div>
            </div>
            <h3 className="text-body-sm text-gray-600 mb-1">
              전체 참가자
            </h3>
            <p className="text-h2 font-heading text-gray-900">
              {stats?.totalUsers || 0}
            </p>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-secondary/10 rounded-lg p-3">
                <CheckCircle2 className="h-6 w-6 text-secondary" />
              </div>
            </div>
            <h3 className="text-body-sm text-gray-600 mb-1">오늘 인증</h3>
            <p className="text-h2 font-heading text-gray-900">
              {stats?.todayCertifications || 0}
            </p>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-accent/10 rounded-lg p-3">
                <TrendingUp className="h-6 w-6 text-accent" />
              </div>
              <Badge className="bg-accent/10 text-accent">
                {avgCertificationRate}%
              </Badge>
            </div>
            <h3 className="text-body-sm text-gray-600 mb-1">
              오늘 인증률
            </h3>
            <p className="text-h2 font-heading text-gray-900">
              {avgCertificationRate}%
            </p>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-destructive/10 rounded-lg p-3">
                <AlertTriangle className="h-6 w-6 text-destructive" />
              </div>
              {(stats?.dropoutCandidates || 0) > 0 && (
                <Badge className="bg-destructive/10 text-destructive">
                  주의
                </Badge>
              )}
            </div>
            <h3 className="text-body-sm text-gray-600 mb-1">
              탈락 후보
            </h3>
            <p className="text-h2 font-heading text-gray-900">
              {stats?.dropoutCandidates || 0}
            </p>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Dropout Candidates */}
          <div className="lg:col-span-2">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-h4 font-heading text-gray-900">
                  탈락 후보 관리
                </h2>
                <Badge className="bg-destructive/10 text-destructive">
                  {dropoutCandidates?.length || 0}명
                </Badge>
              </div>

              {dropoutCandidates && dropoutCandidates.length > 0 ? (
                <div className="space-y-3">
                  {dropoutCandidates.map((candidate) => (
                    <div
                      key={candidate.id}
                      className="flex items-center justify-between p-4 border border-destructive/30 rounded-lg bg-destructive/5"
                    >
                      <div>
                        <p className="text-body font-semibold text-gray-900">
                          {candidate.user?.discord_username}
                        </p>
                        <div className="flex gap-2 mt-1">
                          <Badge className="bg-primary/10 text-primary text-body-xs">
                            {candidate.track?.name}
                          </Badge>
                          <span className="text-body-sm text-gray-600">
                            미인증 {candidate.dropout_warnings}회
                          </span>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => {
                          // TODO: Implement dropout processing
                          alert('탈락 처리 기능은 곧 구현될 예정입니다.');
                        }}
                      >
                        탈락 처리
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-body text-gray-600">
                    탈락 후보가 없습니다
                  </p>
                  <p className="text-body-sm text-gray-500 mt-1">
                    모든 참가자가 열심히 인증하고 있어요! 🎉
                  </p>
                </div>
              )}
            </Card>
          </div>

          {/* Quick Actions */}
          <div className="lg:col-span-1">
            <Card className="p-6">
              <h2 className="text-h4 font-heading text-gray-900 mb-6">
                빠른 작업
              </h2>
              <div className="space-y-3">
                <Button
                  className="w-full justify-start"
                  variant="outline"
                  onClick={() => router.push('/admin/users')}
                >
                  <Users className="h-4 w-4 mr-2" />
                  사용자 관리
                </Button>
                <Button
                  className="w-full justify-start"
                  variant="outline"
                  onClick={() => router.push('/admin/settings')}
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  인증 관리
                </Button>
                <Button
                  className="w-full justify-start"
                  variant="outline"
                  disabled
                >
                  <TrendingUp className="h-4 w-4 mr-2" />
                  통계 보기 (준비 중)
                </Button>
              </div>
            </Card>

            <Card className="p-6 mt-6">
              <h3 className="text-h5 font-heading text-gray-900 mb-4">
                시스템 상태
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-body-sm text-gray-600">데이터베이스</span>
                  <Badge className="bg-green-100 text-green-700">정상</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-body-sm text-gray-600">인증</span>
                  <Badge className="bg-green-100 text-green-700">정상</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-body-sm text-gray-600">Discord 연동</span>
                  <Badge className="bg-green-100 text-green-700">정상</Badge>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
