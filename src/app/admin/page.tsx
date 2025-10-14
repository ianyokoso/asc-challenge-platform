'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AdminSidebar } from '@/components/layout/admin-sidebar';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Loader2,
  AlertCircle,
  Video,
  FileText,
  Code,
  TrendingUp,
  Calendar
} from 'lucide-react';
import { AdminPageGuard } from '@/components/guards/AdminPageGuard';
import { useActivePeriod } from '@/hooks/useActivePeriod';
import { getDashboardData, DashboardData } from '@/lib/api/dashboard';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

// 트랙 타입 정의
type TrackKey = 'short-form' | 'long-form' | 'builder' | 'sales';

// 트랙 아이콘 반환 함수
function getTrackIcon(trackKey: TrackKey) {
  switch (trackKey) {
    case 'short-form':
      return <Video className="h-6 w-6" />;
    case 'long-form':
      return <FileText className="h-6 w-6" />;
    case 'builder':
      return <Code className="h-6 w-6" />;
    case 'sales':
      return <TrendingUp className="h-6 w-6" />;
    default:
      return <Video className="h-6 w-6" />;
  }
}

interface TrackData {
  key: TrackKey;
  name: string;
  description: string;
  icon: React.ReactNode;
  today: {
    completed: number;
    targets: number;
    rate: number;
  };
  dropCandidates: number;
  todayIsDue: boolean;
  badge?: string;
}

interface DashboardData {
  cohort: {
    start: string;
    end: string;
    termNumber: number;
  };
  tracks: TrackData[];
}

/**
 * 관리자 대시보드 - 현재 기수 4개 트랙 카드 뷰
 */
function AdminDashboardContent() {
  const router = useRouter();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 활성 기수 정보 가져오기
  const { data: activePeriod, isLoading: periodLoading } = useActivePeriod();

  // 대시보드 데이터 로드
  useEffect(() => {
    const loadDashboardData = async () => {
      if (!activePeriod) return;

      try {
        setIsLoading(true);
        setError(null);

        // 실제 API 호출
        const data = await getDashboardData(activePeriod.id);
        
        // 아이콘 추가
        const dataWithIcons = {
          ...data,
          tracks: data.tracks.map(track => ({
            ...track,
            icon: getTrackIcon(track.key)
          }))
        };

        setDashboardData(dataWithIcons);
      } catch (err) {
        console.error('대시보드 데이터 로드 실패:', err);
        setError('대시보드 데이터를 불러오는데 실패했습니다.');
      } finally {
        setIsLoading(false);
      }
    };

    loadDashboardData();
  }, [activePeriod]);

  // 카드 클릭 핸들러
  const handleCardClick = (trackKey: TrackKey) => {
    router.push(`/admin/tracking?track=${trackKey}`);
  };

  // 로딩 상태
  if (isLoading || periodLoading) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <AdminSidebar />
        <main className="flex-1 p-8 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
            <p className="text-body text-gray-600">대시보드 데이터를 불러오는 중...</p>
          </div>
        </main>
      </div>
    );
  }

  // 에러 상태
  if (error || !dashboardData) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <AdminSidebar />
        <main className="flex-1 p-8 flex items-center justify-center">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-h4 font-heading text-gray-900 mb-2">데이터 로드 실패</h3>
            <p className="text-body text-gray-600 mb-4">{error}</p>
            <button 
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover"
            >
              다시 시도
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <AdminSidebar />
      
      <main className="flex-1 p-8">
        {/* 페이지 헤더 */}
        <div className="mb-8">
          <h1 className="text-h2 font-heading text-gray-900 mb-2">
            관리자 대시보드
          </h1>
          <div className="flex items-center gap-3 text-body text-gray-600">
            <Calendar className="h-5 w-5" />
            <span>현재 진행 중인 기수</span>
            <span className="font-semibold text-gray-900">
              {dashboardData.cohort.termNumber}기
            </span>
            <span>
              {format(new Date(dashboardData.cohort.start), 'yyyy.MM.dd', { locale: ko })} ~ {format(new Date(dashboardData.cohort.end), 'yyyy.MM.dd', { locale: ko })}
            </span>
          </div>
        </div>

        {/* 트랙 카드 그리드 */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          {dashboardData.tracks.map((track) => (
            <Card
              key={track.key}
              className="p-6 cursor-pointer hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 bg-white border-gray-200"
              onClick={() => handleCardClick(track.key)}
              role="button"
              tabIndex={0}
              aria-label={`${track.name} 트랙 - 오늘 ${track.today.completed}/${track.today.targets} 인증 완료, 탈락 후보 ${track.dropCandidates}명`}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleCardClick(track.key);
                }
              }}
            >
              {/* 카드 헤더 */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg text-primary">
                    {track.icon}
                  </div>
                  <div>
                    <h3 className="text-h5 font-heading text-gray-900">
                      {track.name}
                    </h3>
                    <p className="text-body-sm text-gray-500">
                      {track.description}
                    </p>
                  </div>
                </div>
                {track.badge && (
                  <Badge 
                    variant="outline" 
                    className={`text-xs ${
                      track.badge.includes('오늘') 
                        ? 'bg-blue-50 text-blue-700 border-blue-200' 
                        : 'bg-gray-50 text-gray-700 border-gray-200'
                    }`}
                  >
                    {track.badge}
                  </Badge>
                )}
              </div>

              {/* 오늘 인증 현황 */}
              <div className="mb-4">
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-2xl font-bold text-gray-900">
                    {track.today.completed}
                  </span>
                  <span className="text-body text-gray-500">/</span>
                  <span className="text-xl font-semibold text-gray-700">
                    {track.today.targets}
                  </span>
                </div>
                <p className="text-body-sm text-gray-500">
                  오늘: {track.today.completed} / {track.today.targets} ({track.today.rate}%)
                </p>
              </div>

              {/* 탈락 후보 */}
              <div className="pt-4 border-t border-gray-100">
                <div className="flex items-center justify-between">
                  <span className="text-body-sm text-gray-600">탈락 후보</span>
                  <span className={`text-lg font-semibold ${
                    track.dropCandidates > 0 ? 'text-red-600' : 'text-green-600'
                  }`}>
                    {track.dropCandidates}명
                  </span>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* 하단 여백 */}
        <div className="h-12" />
      </main>
    </div>
  );
}

export default function AdminDashboard() {
  return (
    <AdminPageGuard>
      <AdminDashboardContent />
    </AdminPageGuard>
  );
}