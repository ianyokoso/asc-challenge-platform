'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { AdminSidebar } from '@/components/layout/admin-sidebar';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ChevronLeft, 
  ChevronRight, 
  Loader2,
  AlertCircle,
  Calendar,
  BarChart3,
  Wifi,
  WifiOff
} from 'lucide-react';
import { CertificationTrackingTable } from '@/components/admin/CertificationTrackingTable';
import { useAllTracksCertificationData } from '@/hooks/useCertificationTracking';
import { AdminPageGuard } from '@/components/guards/AdminPageGuard';

/**
 * 관리자 전용 - 트랙별 인증 현황 추적 페이지
 * 
 * 기능:
 * - 모든 트랙의 참여자별 인증 현황을 한눈에 확인
 * - 월별 데이터 탐색
 * - 구글 시트 스타일 테이블로 시각화
 * - 인증 완료율 통계
 */
function CertificationTrackingPageContent() {
  const today = new Date();
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth() + 1);

  const { 
    data: trackData, 
    isLoading, 
    error,
    refetch 
  } = useAllTracksCertificationData(currentYear, currentMonth);

  // 이전 달로 이동
  const goToPreviousMonth = () => {
    if (currentMonth === 1) {
      setCurrentYear(prev => prev - 1);
      setCurrentMonth(12);
    } else {
      setCurrentMonth(prev => prev - 1);
    }
  };

  // 다음 달로 이동
  const goToNextMonth = () => {
    if (currentMonth === 12) {
      setCurrentYear(prev => prev + 1);
      setCurrentMonth(1);
    } else {
      setCurrentMonth(prev => prev + 1);
    }
  };

  // 오늘 날짜로 이동
  const goToToday = () => {
    setCurrentYear(today.getFullYear());
    setCurrentMonth(today.getMonth() + 1);
  };

  // 현재 월 표시 문자열
  const currentMonthDisplay = format(
    new Date(currentYear, currentMonth - 1),
    'yyyy년 M월',
    { locale: ko }
  );

  // 전체 통계 계산
  const overallStats = trackData ? {
    totalTracks: trackData.length,
    totalParticipants: trackData.reduce((sum, track) => sum + track.participants.length, 0),
    totalCertifications: trackData.reduce((sum, track) => 
      sum + track.participants.reduce((pSum, p) => pSum + p.totalCertified, 0), 0
    ),
    totalRequired: trackData.reduce((sum, track) => 
      sum + track.participants.reduce((pSum, p) => pSum + p.totalRequired, 0), 0
    ),
  } : null;

  const overallCompletionRate = overallStats && overallStats.totalRequired > 0
    ? Math.round((overallStats.totalCertifications / overallStats.totalRequired) * 1000) / 10
    : 0;

  return (
    <div className="flex min-h-screen bg-gray-50">
      <AdminSidebar />
      
      <main className="flex-1 p-8">
        {/* 페이지 헤더 */}
        <div className="mb-8">
          <h1 className="text-h2 font-heading text-gray-900 mb-2">
            인증 현황 추적
          </h1>
          <p className="text-body-lg text-gray-600">
            트랙별 참여자의 인증 현황을 한눈에 확인하세요
          </p>
        </div>

        {/* 날짜 네비게이션 및 통계 */}
        <div className="mb-6 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
          {/* 날짜 네비게이션 */}
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={goToPreviousMonth}
              className="px-3"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            <div className="flex items-center gap-2 min-w-[180px] justify-center">
              <Calendar className="h-5 w-5 text-primary" />
              <span className="text-h4 font-heading text-gray-900">
                {currentMonthDisplay}
              </span>
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={goToNextMonth}
              className="px-3"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={goToToday}
            >
              오늘
            </Button>
          </div>

          {/* 전체 통계 및 실시간 상태 */}
          {overallStats && (
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-gray-400" />
                <div className="text-body-sm">
                  <span className="text-gray-600">전체 완료율:</span>
                  <span className="ml-2 font-semibold text-gray-900">
                    {overallCompletionRate}%
                  </span>
                  <span className="ml-1 text-gray-500">
                    ({overallStats.totalCertifications}/{overallStats.totalRequired})
                  </span>
                </div>
              </div>

              {/* 실시간 업데이트 상태 표시 */}
              <Badge 
                variant="outline" 
                className="flex items-center gap-1.5 bg-green-50 text-green-700 border-green-200"
              >
                <Wifi className="h-3.5 w-3.5" />
                <span className="text-xs">실시간 연결됨</span>
              </Badge>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
              >
                새로고침
              </Button>
            </div>
          )}
        </div>

        {/* 로딩 상태 */}
        {isLoading && (
          <Card className="p-12 text-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
            <p className="text-body text-gray-600">
              인증 현황 데이터를 불러오는 중...
            </p>
          </Card>
        )}

        {/* 에러 상태 */}
        {error && (
          <Card className="p-8 text-center border-red-200 bg-red-50">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-h4 font-heading text-gray-900 mb-2">
              데이터 로드 실패
            </h3>
            <p className="text-body text-gray-600 mb-4">
              {error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.'}
            </p>
            <Button onClick={() => refetch()}>
              다시 시도
            </Button>
          </Card>
        )}

        {/* 트랙별 테이블 */}
        {!isLoading && !error && trackData && (
          <div className="space-y-8">
            {trackData.length === 0 ? (
              <Card className="p-12 text-center">
                <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-body text-gray-600">
                  활성화된 트랙이 없습니다.
                </p>
              </Card>
            ) : (
              trackData.map((track) => (
                <CertificationTrackingTable
                  key={track.trackId}
                  data={track}
                />
              ))
            )}
          </div>
        )}

        {/* 하단 여백 */}
        <div className="h-12" />
      </main>
    </div>
  );
}

export default function CertificationTrackingPage() {
  return (
    <AdminPageGuard>
      <CertificationTrackingPageContent />
    </AdminPageGuard>
  );
}

