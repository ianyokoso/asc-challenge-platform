'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { AdminSidebar } from '@/components/layout/admin-sidebar';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Loader2,
  AlertCircle,
  Calendar,
  BarChart3,
  Wifi,
  Video,
  FileText,
  Code,
  TrendingUp
} from 'lucide-react';
import { CertificationTrackingTable } from '@/components/admin/CertificationTrackingTable';
import { CertificationSummaryTable } from '@/components/admin/CertificationSummaryTable';
import { useAllTracksCertificationData } from '@/hooks/useCertificationTracking';
import { AdminPageGuard } from '@/components/guards/AdminPageGuard';
import { useToast } from '@/hooks/use-toast';

/**
 * 관리자 전용 - 트랙별 인증 현황 추적 페이지
 * 
 * 기능:
 * - 모든 트랙의 참여자별 인증 현황을 한눈에 확인
 * - 기수별 데이터 탐색
 * - 구글 시트 스타일 테이블로 시각화
 * - 인증 완료율 통계
 */
function CertificationTrackingPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  
  // URL 쿼리에서 periodId와 track 읽기
  const periodIdFromUrl = searchParams.get('periodId');
  const trackFromUrl = searchParams.get('track');
  const [selectedPeriodId, setSelectedPeriodId] = useState<string | undefined>(periodIdFromUrl || undefined);
  const [selectedTrack, setSelectedTrack] = useState<string | undefined>(trackFromUrl || undefined);

  const { 
    data: apiResponse, 
    isLoading, 
    error,
    refetch,
    realtimeStatus 
  } = useAllTracksCertificationData(selectedPeriodId);

  // API 응답에서 데이터 분리
  const trackData = apiResponse?.data || null;
  const periods = apiResponse?.periods || [];
  const selectedPeriod = apiResponse?.selectedPeriod || null;

  // 선택된 기수가 변경되면 URL 업데이트
  useEffect(() => {
    if (selectedPeriod && selectedPeriod.id !== periodIdFromUrl) {
      const params = new URLSearchParams(searchParams.toString());
      params.set('periodId', selectedPeriod.id);
      router.replace(`/admin/tracking?${params.toString()}`, { scroll: false });
    }
  }, [selectedPeriod, periodIdFromUrl, router, searchParams]);

  // 기수 선택 핸들러
  const handlePeriodChange = (periodId: string) => {
    setSelectedPeriodId(periodId);
    const params = new URLSearchParams(searchParams.toString());
    params.set('periodId', periodId);
    router.replace(`/admin/tracking?${params.toString()}`, { scroll: false });
  };

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
            기수별 트랙 참여자의 인증 현황을 확인하세요
          </p>
        </div>

        {/* 기수 선택 토글 및 통계 */}
        <div className="mb-6 space-y-4">
          {/* 기수 선택 토글 */}
          {periods.length > 0 && (
            <Card className="p-4">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-primary" />
                  <span className="text-body font-semibold text-gray-900">기수 선택:</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {periods.map((period) => (
                    <Button
                      key={period.id}
                      variant={selectedPeriod?.id === period.id ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handlePeriodChange(period.id)}
                      className={`
                        ${selectedPeriod?.id === period.id 
                          ? 'bg-primary text-primary-foreground' 
                          : 'hover:bg-gray-100'
                        }
                      `}
                    >
                      <span className="font-semibold">{period.term_number}기</span>
                      {period.is_active && (
                        <Badge className="ml-2 bg-green-500 text-white text-xs">진행중</Badge>
                      )}
                    </Button>
                  ))}
                </div>
              </div>
              
              {/* 선택된 기수 정보 */}
              {selectedPeriod && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <div className="flex items-center gap-4 text-body-sm text-gray-600">
                    <span className="font-semibold text-gray-900">
                      {selectedPeriod.term_number}기
                    </span>
                    <span>
                      {selectedPeriod.start_date} ~ {selectedPeriod.end_date}
                    </span>
                    {selectedPeriod.description && (
                      <span className="text-gray-500">· {selectedPeriod.description}</span>
                    )}
                  </div>
                </div>
              )}
            </Card>
          )}

          {/* 전체 통계 및 실시간 상태 */}
          {overallStats && (
            <Card className="p-4">
              <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
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

                <div className="flex items-center gap-3">
                  {/* 실시간 업데이트 상태 표시 */}
                  <Badge 
                    variant="outline" 
                    className={`flex items-center gap-1.5 ${
                      realtimeStatus === 'connected' 
                        ? 'bg-green-50 text-green-700 border-green-200' 
                        : realtimeStatus === 'connecting'
                        ? 'bg-yellow-50 text-yellow-700 border-yellow-200'
                        : realtimeStatus === 'error'
                        ? 'bg-red-50 text-red-700 border-red-200'
                        : 'bg-gray-50 text-gray-700 border-gray-200'
                    }`}
                  >
                    {realtimeStatus === 'connected' && <Wifi className="h-3.5 w-3.5" />}
                    {realtimeStatus === 'connecting' && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    {realtimeStatus === 'error' && <AlertCircle className="h-3.5 w-3.5" />}
                    {realtimeStatus === 'disconnected' && <Wifi className="h-3.5 w-3.5 opacity-50" />}
                    <span className="text-xs">
                      {realtimeStatus === 'connected' && '실시간 연결됨'}
                      {realtimeStatus === 'connecting' && '연결 중...'}
                      {realtimeStatus === 'error' && '연결 오류'}
                      {realtimeStatus === 'disconnected' && '연결 끊김'}
                    </span>
                  </Badge>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => refetch()}
                  >
                    새로고침
                  </Button>
                </div>
              </div>
            </Card>
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

        {/* 트랙별 탭 */}
        {!isLoading && !error && trackData && (
          <Tabs 
            defaultValue={selectedTrack || "all"} 
            className="w-full"
            onValueChange={(value) => {
              setSelectedTrack(value);
              const params = new URLSearchParams(searchParams.toString());
              if (value === "all") {
                params.delete('track');
              } else {
                params.set('track', value);
              }
              router.replace(`/admin/tracking?${params.toString()}`, { scroll: false });
            }}
          >
            <TabsList className="grid w-full grid-cols-5 mb-6">
              <TabsTrigger value="all" className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                <span>전체</span>
              </TabsTrigger>
              <TabsTrigger value="short-form" className="flex items-center gap-2">
                <Video className="h-4 w-4" />
                <span>숏폼 (일일)</span>
              </TabsTrigger>
              <TabsTrigger value="long-form" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                <span>롱폼 (주간)</span>
              </TabsTrigger>
              <TabsTrigger value="builder" className="flex items-center gap-2">
                <Code className="h-4 w-4" />
                <span>빌더 (주간)</span>
              </TabsTrigger>
              <TabsTrigger value="sales" className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                <span>세일즈 (주간)</span>
              </TabsTrigger>
            </TabsList>

            {/* 전체 트랙 - 요약 뷰 */}
            <TabsContent value="all" className="space-y-6">
              {trackData.length === 0 ? (
                <Card className="p-12 text-center">
                  <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-body text-gray-600">
                    활성화된 트랙이 없습니다.
                  </p>
                </Card>
              ) : (
                <>
                  <div className="mb-4">
                    <h2 className="text-h3 font-heading text-gray-900">
                      전체 현황 요약
                    </h2>
                    <p className="text-body text-gray-600 mt-1">
                      모든 트랙의 멤버별 이행/미이행 현황을 한눈에 확인하세요
                    </p>
                  </div>
                  <CertificationSummaryTable data={trackData} />
                </>
              )}
            </TabsContent>

            {/* 숏폼 트랙 (일일) */}
            <TabsContent value="short-form">
              {trackData.filter(t => t.trackType === 'shortform' || t.trackType === 'short-form').map((track) => (
                <CertificationTrackingTable
                  key={track.trackId}
                  data={track}
                />
              ))}
              {trackData.filter(t => t.trackType === 'shortform' || t.trackType === 'short-form').length === 0 && (
                <Card className="p-12 text-center">
                  <Video className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-body text-gray-600">
                    숏폼 트랙 참여자가 없습니다.
                  </p>
                </Card>
              )}
            </TabsContent>

            {/* 롱폼 트랙 (주간) */}
            <TabsContent value="long-form">
              {trackData.filter(t => t.trackType === 'longform' || t.trackType === 'long-form').map((track) => (
                <CertificationTrackingTable
                  key={track.trackId}
                  data={track}
                />
              ))}
              {trackData.filter(t => t.trackType === 'longform' || t.trackType === 'long-form').length === 0 && (
                <Card className="p-12 text-center">
                  <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-body text-gray-600">
                    롱폼 트랙 참여자가 없습니다.
                  </p>
                </Card>
              )}
            </TabsContent>

            {/* 빌더 트랙 (주간) */}
            <TabsContent value="builder">
              {trackData.filter(t => t.trackType === 'builder').map((track) => (
                <CertificationTrackingTable
                  key={track.trackId}
                  data={track}
                />
              ))}
              {trackData.filter(t => t.trackType === 'builder').length === 0 && (
                <Card className="p-12 text-center">
                  <Code className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-body text-gray-600">
                    빌더 트랙 참여자가 없습니다.
                  </p>
                </Card>
              )}
            </TabsContent>

            {/* 세일즈 트랙 (주간) */}
            <TabsContent value="sales">
              {trackData.filter(t => t.trackType === 'sales').map((track) => (
                <CertificationTrackingTable
                  key={track.trackId}
                  data={track}
                />
              ))}
              {trackData.filter(t => t.trackType === 'sales').length === 0 && (
                <Card className="p-12 text-center">
                  <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-body text-gray-600">
                    세일즈 트랙 참여자가 없습니다.
                  </p>
                </Card>
              )}
            </TabsContent>
          </Tabs>
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

