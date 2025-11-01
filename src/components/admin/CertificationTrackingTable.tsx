'use client';

import { useState, useMemo } from 'react';
import { format, parse, getDay, startOfMonth, isSameDay } from 'date-fns';
import { ko } from 'date-fns/locale';
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Minus, 
  ChevronUp, 
  ChevronDown,
  ExternalLink,
  User
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import type { TrackCertificationSummary } from '@/lib/supabase/certification-tracking';
import { CertificationDetailDialog } from '@/components/admin/CertificationDetailDialog';

interface CertificationTrackingTableProps {
  data: TrackCertificationSummary;
  compact?: boolean;
}

type SortField = 'name' | 'completion';
type SortDirection = 'asc' | 'desc';

/**
 * 구글 시트 스타일의 인증 현황 테이블 컴포넌트
 * 
 * 특징:
 * - 고정 헤더 및 첫 번째 열 (사용자명)
 * - 가로/세로 스크롤 지원
 * - 인증 상태 시각화 (아이콘 + 색상)
 * - 정렬 기능
 * - 반응형 디자인
 */
export function CertificationTrackingTable({ 
  data, 
  compact = false 
}: CertificationTrackingTableProps) {
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedCertification, setSelectedCertification] = useState<{
    status: 'certified' | 'pending' | 'missing' | 'not-required';
    url: string | null;
    submittedAt: string | null;
    notes: string | null;
    date: string;
    userName: string;
    userAvatar: string | null;
    trackName: string;
  } | null>(null);

  // 참여자별 미이행 횟수 계산
  const participantsWithStats = useMemo(() => {
    return data.participants.map(participant => {
      let missingCount = 0;
      
      // 각 날짜별로 미인증 체크
      data.dates.forEach(date => {
        const certification = participant.certifications[date];
        if (certification && certification.status === 'missing') {
          missingCount++;
        }
      });
      
      return {
        ...participant,
        missingCount,
      };
    });
  }, [data.participants, data.dates]);

  // 정렬된 참여자 목록
  const sortedParticipants = useMemo(() => {
    const participants = [...participantsWithStats];
    
    participants.sort((a, b) => {
      let comparison = 0;
      
      if (sortField === 'name') {
        comparison = a.discordUsername.localeCompare(b.discordUsername, 'ko');
      } else if (sortField === 'completion') {
        comparison = a.completionRate - b.completionRate;
      }
      
      return sortDirection === 'asc' ? comparison : -comparison;
    });
    
    return participants;
  }, [participantsWithStats, sortField, sortDirection]);

  // 정렬 토글
  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // 인증 상세 보기
  const handleCertificationClick = (
    cert: { status: string; url: string | null; submittedAt: string | null; notes: string | null },
    date: string,
    userName: string,
    userAvatar: string | null
  ) => {
    setSelectedCertification({
      status: cert.status as 'certified' | 'pending' | 'missing' | 'not-required',
      url: cert.url,
      submittedAt: cert.submittedAt,
      notes: cert.notes,
      date,
      userName,
      userAvatar,
      trackName: data.trackName,
    });
    setDialogOpen(true);
  };

  // 인증 상태에 따른 아이콘 및 색상
  const getCertificationDisplay = (status: string, url: string | null) => {
    switch (status) {
      case 'certified':
        return {
          icon: <CheckCircle2 className="h-5 w-5" />,
          color: 'text-green-600',
          bgColor: 'bg-green-50 hover:bg-green-100',
          tooltip: '인증 완료',
          clickable: !!url,
        };
      case 'pending':
        return {
          icon: <Clock className="h-5 w-5" />,
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-50 hover:bg-yellow-100',
          tooltip: '인증 대기',
          clickable: !!url,
        };
      case 'missing':
        return {
          icon: <XCircle className="h-5 w-5" />,
          color: 'text-red-600',
          bgColor: 'bg-red-50 hover:bg-red-100',
          tooltip: '미인증',
          clickable: false,
        };
      case 'not-required':
      default:
        return {
          icon: <Minus className="h-5 w-5" />,
          color: 'text-gray-400',
          bgColor: 'bg-gray-50',
          tooltip: '인증 불필요',
          clickable: false,
        };
    }
  };

  // 날짜 포맷팅 (간략하게)
  const formatDateShort = (dateStr: string) => {
    const date = parse(dateStr, 'yyyy-MM-dd', new Date());
    return format(date, 'M/d (E)', { locale: ko });
  };

  // 트랙별 주 시작 요일 (0=일요일, 1=월요일, 2=화요일)
  const getWeekStartDay = (trackType: string): number => {
    switch (trackType) {
      case 'short-form':
      case 'shortform':
        return 1; // 월요일
      case 'long-form':
      case 'longform':
      case 'builder':
        return 0; // 일요일
      case 'sales':
        return 2; // 화요일
      default:
        return 1; // 기본값: 월요일
    }
  };

  // 주 시작일 체크
  const isWeekStart = (dateStr: string, trackType: string): boolean => {
    const date = parse(dateStr, 'yyyy-MM-dd', new Date());
    const dayOfWeek = getDay(date);
    const weekStartDay = getWeekStartDay(trackType);
    return dayOfWeek === weekStartDay;
  };

  // 월 시작일 체크
  const isMonthStart = (dateStr: string): boolean => {
    const date = parse(dateStr, 'yyyy-MM-dd', new Date());
    const monthStart = startOfMonth(date);
    return isSameDay(date, monthStart);
  };

  if (!data || data.participants.length === 0) {
    return (
      <Card className="p-8 text-center">
        <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p className="text-body text-gray-600">
          {data?.trackName || '이 트랙'}에 참여하는 사용자가 없습니다.
        </p>
      </Card>
    );
  }

  return (
    <div className="w-full">
      {/* 트랙 정보 헤더 */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-h4 font-heading text-gray-900">
            {data.trackName}
          </h3>
          <p className="text-body-sm text-gray-600">
            참여자 {data.participants.length}명 · 인증일 {data.dates.length}일
            {(data.trackType === 'short-form' || data.trackType === 'shortform') && (
              <span className="ml-2 text-blue-600 font-medium">
                (주말 제외)
              </span>
            )}
          </p>
        </div>
        <Badge className="bg-primary/10 text-primary">
          {data.trackType}
        </Badge>
      </div>

      {/* 테이블 컨테이너 - 반응형, 스크롤 최소화 */}
      <div className="relative border border-gray-200 rounded-lg overflow-hidden bg-white">
        {/* 가로 스크롤 래퍼 (모바일만) */}
        <div className="overflow-x-auto lg:overflow-x-visible">
          <table className="w-full border-collapse" style={{ tableLayout: 'fixed' }}>
            {/* 컬럼 폭 정의 */}
            <colgroup>
              {/* 사용자명: 고정 폭 */}
              <col className="w-40 lg:w-48" />
              {/* 완료율: 고정 폭 */}
              <col className="w-20 lg:w-24" />
              {/* 미이행: 고정 폭 */}
              <col className="w-20 lg:w-24" />
              {/* 날짜 칼럼들: 균등 분배 */}
              {data.dates.map((date) => (
                <col key={date} className="w-16 lg:w-20" />
              ))}
            </colgroup>

            {/* 고정 헤더 */}
            <thead className="bg-gray-50 sticky top-0 z-20">
              <tr>
                {/* 사용자명 열 (고정) */}
                <th 
                  className="sticky left-0 z-30 bg-gray-50 border-r border-b border-gray-200 px-2 lg:px-4 py-3 text-left"
                  aria-label="사용자 이름"
                >
                  <button
                    onClick={() => toggleSort('name')}
                    className="flex items-center gap-1 lg:gap-2 text-xs lg:text-sm font-semibold text-gray-700 hover:text-gray-900 w-full"
                    aria-label="사용자명으로 정렬"
                  >
                    <span className="truncate">사용자</span>
                    {sortField === 'name' && (
                      sortDirection === 'asc' ? 
                        <ChevronUp className="h-3 w-3 lg:h-4 lg:w-4 flex-shrink-0" aria-hidden="true" /> : 
                        <ChevronDown className="h-3 w-3 lg:h-4 lg:w-4 flex-shrink-0" aria-hidden="true" />
                    )}
                  </button>
                </th>

                {/* 완료율 열 */}
                <th 
                  className="border-b border-gray-200 px-1 lg:px-2 py-3 text-center bg-gray-50"
                  aria-label="완료율"
                >
                  <button
                    onClick={() => toggleSort('completion')}
                    className="flex items-center justify-center gap-1 text-xs lg:text-sm font-semibold text-gray-700 hover:text-gray-900 mx-auto"
                    aria-label="완료율로 정렬"
                  >
                    <span className="truncate">완료율</span>
                    {sortField === 'completion' && (
                      sortDirection === 'asc' ? 
                        <ChevronUp className="h-3 w-3 lg:h-4 lg:w-4 flex-shrink-0" aria-hidden="true" /> : 
                        <ChevronDown className="h-3 w-3 lg:h-4 lg:w-4 flex-shrink-0" aria-hidden="true" />
                    )}
                  </button>
                </th>

                {/* 미이행 횟수 열 */}
                <th 
                  className="border-b border-l border-gray-200 px-1 lg:px-2 py-3 text-center bg-gray-50"
                  aria-label="미이행 횟수"
                >
                  <div className="text-xs lg:text-sm font-semibold text-gray-700 truncate">
                    미이행
                  </div>
                </th>

                {/* 날짜 열들 */}
                {data.dates.map((date, idx) => {
                  const isWeekBoundary = isWeekStart(date, data.trackType);
                  const isMonthBoundary = isMonthStart(date);
                  const dateObj = parse(date, 'yyyy-MM-dd', new Date());
                  
                  return (
                    <th
                      key={date}
                      className={`
                        border-b border-l border-gray-200 px-1 lg:px-2 py-3 text-center bg-gray-50
                        ${isWeekBoundary ? 'border-l-2 border-l-blue-400' : ''}
                        ${isMonthBoundary ? 'bg-blue-50' : ''}
                      `}
                      aria-label={`${format(dateObj, 'M월 d일 EEEE', { locale: ko })}`}
                    >
                      <div className="text-xs lg:text-sm font-semibold text-gray-700 truncate">
                        {formatDateShort(date)}
                      </div>
                      {isMonthBoundary && (
                        <div className="text-xs text-blue-600 mt-1" aria-hidden="true">
                          {format(dateObj, 'M월', { locale: ko })}
                        </div>
                      )}
                    </th>
                  );
                })}
              </tr>
            </thead>

            {/* 테이블 바디 */}
            <tbody>
              {sortedParticipants.map((participant, idx) => (
                <tr 
                  key={participant.userId}
                  className={`
                    hover:bg-gray-50 transition-colors
                    ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-25'}
                  `}
                  role="row"
                >
                  {/* 사용자 정보 (고정 열) */}
                  <td 
                    className={`
                      sticky left-0 z-10 border-r border-b border-gray-200 px-2 lg:px-4 py-3
                      ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-25'}
                    `}
                    role="cell"
                  >
                    <div className="flex items-center gap-2 overflow-hidden" title={participant.discordUsername}>
                      <Avatar className="h-6 w-6 lg:h-8 lg:w-8 flex-shrink-0">
                        {participant.discordAvatarUrl ? (
                          <img 
                            src={participant.discordAvatarUrl} 
                            alt=""
                            className="h-full w-full object-cover"
                            aria-hidden="true"
                          />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center bg-primary/10 text-primary font-semibold text-xs lg:text-sm" aria-hidden="true">
                            {participant.discordUsername.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </Avatar>
                      <span className="text-xs lg:text-sm font-medium text-gray-900 truncate min-w-0">
                        {participant.discordUsername}
                      </span>
                      <span className="sr-only">{participant.discordUsername}</span>
                    </div>
                  </td>

                  {/* 완료율 */}
                  <td 
                    className="border-b border-gray-200 px-1 lg:px-2 py-3 text-center"
                    role="cell"
                    aria-label={`완료율 ${participant.completionRate}%, ${participant.totalCertified}개 중 ${participant.totalRequired}개 완료`}
                  >
                    <div className="flex flex-col items-center gap-0.5 lg:gap-1">
                      <span className="text-xs lg:text-sm font-semibold text-gray-900 whitespace-nowrap">
                        {participant.completionRate}%
                      </span>
                      <span className="text-xs text-gray-600 whitespace-nowrap hidden lg:inline">
                        {participant.totalCertified}/{participant.totalRequired}
                      </span>
                    </div>
                  </td>

                  {/* 미이행 횟수 */}
                  <td 
                    className="border-b border-l border-gray-200 px-1 lg:px-2 py-3 text-center"
                    role="cell"
                    aria-label={`미이행 ${participant.missingCount}회`}
                  >
                    <div className="flex flex-col items-center gap-0.5">
                      <span className={`
                        text-xs lg:text-sm font-semibold whitespace-nowrap
                        ${participant.missingCount === 0 ? 'text-green-600' : 'text-red-600'}
                      `}>
                        {participant.missingCount}
                        <span className="hidden lg:inline">회</span>
                      </span>
                      {participant.missingCount > 0 && (
                        <span className="text-xs text-gray-500 whitespace-nowrap hidden lg:inline">
                          ({((participant.missingCount / participant.totalRequired) * 100).toFixed(0)}%)
                        </span>
                      )}
                    </div>
                  </td>

                  {/* 날짜별 인증 상태 */}
                  {data.dates.map((date) => {
                    const cert = participant.certifications[date];
                    const display = getCertificationDisplay(cert.status, cert.url);
                    const isWeekBoundary = isWeekStart(date, data.trackType);
                    const isMonthBoundary = isMonthStart(date);
                    const dateObj = parse(date, 'yyyy-MM-dd', new Date());
                    const dateLabel = format(dateObj, 'M월 d일', { locale: ko });

                    return (
                      <td
                        key={date}
                        className={`
                          border-b border-l border-gray-200 p-1 lg:p-2 text-center
                          ${isWeekBoundary ? 'border-l-2 border-l-blue-400' : ''}
                          ${isMonthBoundary ? 'bg-blue-50/30' : ''}
                        `}
                        role="cell"
                        aria-label={`${dateLabel} ${display.tooltip}`}
                      >
                        {display.clickable ? (
                          <button
                            onClick={() => handleCertificationClick(
                              cert,
                              date,
                              participant.discordUsername,
                              participant.discordAvatarUrl
                            )}
                            className={`
                              inline-flex items-center justify-center w-full h-full py-1 lg:py-2
                              ${display.color} ${display.bgColor}
                              rounded transition-all cursor-pointer
                              group relative
                              border-0
                            `}
                            aria-label={`${dateLabel} ${display.tooltip}, 상세 정보 보기`}
                            title={`${display.tooltip} (클릭하여 상세 정보 보기)`}
                          >
                            <span className="scale-75 lg:scale-100" aria-hidden="true">
                              {display.icon}
                            </span>
                            <span className="sr-only">{display.tooltip}</span>
                            <ExternalLink className="h-2 w-2 lg:h-3 lg:w-3 ml-0.5 lg:ml-1 opacity-0 group-hover:opacity-100 transition-opacity" aria-hidden="true" />
                          </button>
                        ) : (
                          <div
                            className={`
                              inline-flex items-center justify-center w-full py-1 lg:py-2
                              ${display.color} ${display.bgColor}
                              rounded
                            `}
                            role="img"
                            aria-label={display.tooltip}
                            title={display.tooltip}
                          >
                            <span className="scale-75 lg:scale-100" aria-hidden="true">
                              {display.icon}
                            </span>
                            <span className="sr-only">{display.tooltip}</span>
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 스크롤 힌트 (작은 화면만) */}
        <div className="lg:hidden bg-gray-100 border-t border-gray-200 px-4 py-2 text-center">
          <p className="text-xs text-gray-600">
            ← 좌우로 스크롤하여 전체 날짜를 확인하세요 →
          </p>
        </div>
      </div>

      {/* 범례 */}
      <div className="mt-4 space-y-2" role="note" aria-label="테이블 범례">
        <div className="flex flex-wrap gap-3 lg:gap-4 text-xs lg:text-sm text-gray-600">
          <div className="flex items-center gap-1.5 lg:gap-2">
            <CheckCircle2 className="h-3 w-3 lg:h-4 lg:w-4 text-green-600 flex-shrink-0" aria-hidden="true" />
            <span>인증 완료 (클릭하여 상세 정보 보기)</span>
          </div>
          <div className="flex items-center gap-1.5 lg:gap-2">
            <Clock className="h-3 w-3 lg:h-4 lg:w-4 text-yellow-600 flex-shrink-0" aria-hidden="true" />
            <span>인증 대기 (클릭하여 상세 정보 보기)</span>
          </div>
          <div className="flex items-center gap-1.5 lg:gap-2">
            <XCircle className="h-3 w-3 lg:h-4 lg:w-4 text-red-600 flex-shrink-0" aria-hidden="true" />
            <span>미인증</span>
          </div>
          <div className="flex items-center gap-1.5 lg:gap-2">
            <Minus className="h-3 w-3 lg:h-4 lg:w-4 text-gray-400 flex-shrink-0" aria-hidden="true" />
            <span>인증 불필요</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-3 lg:gap-4 text-xs lg:text-sm text-gray-500">
          <div className="flex items-center gap-1.5 lg:gap-2">
            <div className="w-2 h-2 lg:w-3 lg:h-3 border-l-2 border-l-blue-400 flex-shrink-0" aria-hidden="true" />
            <span className="truncate">주 시작 (숏폼=월, 롱폼/빌더=일, 세일즈=화)</span>
          </div>
          <div className="flex items-center gap-1.5 lg:gap-2">
            <div className="w-2 h-2 lg:w-3 lg:h-3 bg-blue-50 border border-blue-200 flex-shrink-0" aria-hidden="true" />
            <span>월 시작</span>
          </div>
          {(data.trackType === 'short-form' || data.trackType === 'shortform') && (
            <div className="flex items-center gap-1.5 lg:gap-2">
              <div className="w-2 h-2 lg:w-3 lg:h-3 bg-blue-100 border border-blue-300 flex-shrink-0" aria-hidden="true" />
              <span className="text-blue-600 font-medium">숏폼 트랙은 월~금만 인증 가능</span>
            </div>
          )}
        </div>
      </div>

      {/* 인증 상세 정보 Dialog */}
      <CertificationDetailDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        detail={selectedCertification}
      />
    </div>
  );
}

