'use client';

import { useState, useMemo } from 'react';
import { format, parse } from 'date-fns';
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

  // 정렬된 참여자 목록
  const sortedParticipants = useMemo(() => {
    const participants = [...data.participants];
    
    participants.sort((a, b) => {
      let comparison = 0;
      
      if (sortField === 'name') {
        comparison = a.userName.localeCompare(b.userName, 'ko');
      } else if (sortField === 'completion') {
        comparison = a.completionRate - b.completionRate;
      }
      
      return sortDirection === 'asc' ? comparison : -comparison;
    });
    
    return participants;
  }, [data.participants, sortField, sortDirection]);

  // 정렬 토글
  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
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
          </p>
        </div>
        <Badge className="bg-primary/10 text-primary">
          {data.trackType}
        </Badge>
      </div>

      {/* 테이블 컨테이너 - 스크롤 가능 */}
      <div className="relative border border-gray-200 rounded-lg overflow-hidden bg-white">
        {/* 가로 스크롤 래퍼 */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            {/* 고정 헤더 */}
            <thead className="bg-gray-50 sticky top-0 z-20">
              <tr>
                {/* 사용자명 열 (고정) */}
                <th 
                  className="sticky left-0 z-30 bg-gray-50 border-r border-b border-gray-200 px-4 py-3 text-left"
                  style={{ minWidth: '180px' }}
                >
                  <button
                    onClick={() => toggleSort('name')}
                    className="flex items-center gap-2 text-body-sm font-semibold text-gray-700 hover:text-gray-900"
                  >
                    사용자
                    {sortField === 'name' && (
                      sortDirection === 'asc' ? 
                        <ChevronUp className="h-4 w-4" /> : 
                        <ChevronDown className="h-4 w-4" />
                    )}
                  </button>
                </th>

                {/* 완료율 열 */}
                <th 
                  className="border-b border-gray-200 px-4 py-3 text-center bg-gray-50"
                  style={{ minWidth: '100px' }}
                >
                  <button
                    onClick={() => toggleSort('completion')}
                    className="flex items-center justify-center gap-2 text-body-sm font-semibold text-gray-700 hover:text-gray-900 mx-auto"
                  >
                    완료율
                    {sortField === 'completion' && (
                      sortDirection === 'asc' ? 
                        <ChevronUp className="h-4 w-4" /> : 
                        <ChevronDown className="h-4 w-4" />
                    )}
                  </button>
                </th>

                {/* 날짜 열들 */}
                {data.dates.map((date) => (
                  <th
                    key={date}
                    className="border-b border-l border-gray-200 px-3 py-3 text-center bg-gray-50"
                    style={{ minWidth: compact ? '80px' : '100px' }}
                  >
                    <div className="text-body-sm font-semibold text-gray-700">
                      {formatDateShort(date)}
                    </div>
                  </th>
                ))}
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
                >
                  {/* 사용자 정보 (고정 열) */}
                  <td 
                    className={`
                      sticky left-0 z-10 border-r border-b border-gray-200 px-4 py-3
                      ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-25'}
                    `}
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        {participant.userAvatar ? (
                          <img 
                            src={participant.userAvatar} 
                            alt={participant.userName}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center bg-primary/10 text-primary font-semibold">
                            {participant.userName.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </Avatar>
                      <span className="text-body font-medium text-gray-900 truncate">
                        {participant.userName}
                      </span>
                    </div>
                  </td>

                  {/* 완료율 */}
                  <td className="border-b border-gray-200 px-4 py-3 text-center">
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-body font-semibold text-gray-900">
                        {participant.completionRate}%
                      </span>
                      <span className="text-body-sm text-gray-600">
                        {participant.totalCertified}/{participant.totalRequired}
                      </span>
                    </div>
                  </td>

                  {/* 날짜별 인증 상태 */}
                  {data.dates.map((date) => {
                    const cert = participant.certifications[date];
                    const display = getCertificationDisplay(cert.status, cert.url);

                    return (
                      <td
                        key={date}
                        className="border-b border-l border-gray-200 p-2 text-center"
                      >
                        {display.clickable && cert.url ? (
                          <a
                            href={cert.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`
                              inline-flex items-center justify-center w-full h-full py-2
                              ${display.color} ${display.bgColor}
                              rounded transition-all cursor-pointer
                              group relative
                            `}
                            title={display.tooltip}
                          >
                            {display.icon}
                            <ExternalLink className="h-3 w-3 ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </a>
                        ) : (
                          <div
                            className={`
                              inline-flex items-center justify-center w-full py-2
                              ${display.color} ${display.bgColor}
                              rounded
                            `}
                            title={display.tooltip}
                          >
                            {display.icon}
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

        {/* 스크롤 힌트 (모바일) */}
        <div className="md:hidden bg-gray-100 border-t border-gray-200 px-4 py-2 text-center">
          <p className="text-body-sm text-gray-600">
            ← 좌우로 스크롤하여 전체 날짜를 확인하세요 →
          </p>
        </div>
      </div>

      {/* 범례 */}
      <div className="mt-4 flex flex-wrap gap-4 text-body-sm text-gray-600">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <span>인증 완료</span>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-yellow-600" />
          <span>인증 대기</span>
        </div>
        <div className="flex items-center gap-2">
          <XCircle className="h-4 w-4 text-red-600" />
          <span>미인증</span>
        </div>
        <div className="flex items-center gap-2">
          <Minus className="h-4 w-4 text-gray-400" />
          <span>인증 불필요</span>
        </div>
      </div>
    </div>
  );
}

