'use client';

import { Avatar } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';

interface ParticipantSummary {
  userId: string;
  discordUsername: string;
  discordAvatarUrl: string | null;
  tracks: {
    trackName: string;
    trackType: string;
    totalCertified: number;
    totalRequired: number;
    completionRate: number;
  }[];
  overallCertified: number;
  overallRequired: number;
  overallCompletionRate: number;
}

interface CertificationSummaryTableProps {
  data: any[]; // trackData from API
}

type SortField = 'name' | 'completed' | 'missing' | 'completion';
type SortDirection = 'asc' | 'desc';

export function CertificationSummaryTable({ data }: CertificationSummaryTableProps) {
  const [sortField, setSortField] = useState<SortField>('completion');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // 모든 참여자를 집계
  const participantMap = new Map<string, ParticipantSummary>();

  data.forEach((track) => {
    track.participants.forEach((participant: any) => {
      const existing = participantMap.get(participant.userId);
      
      if (existing) {
        existing.tracks.push({
          trackName: track.trackName,
          trackType: track.trackType,
          totalCertified: participant.totalCertified,
          totalRequired: participant.totalRequired,
          completionRate: participant.completionRate,
        });
        existing.overallCertified += participant.totalCertified;
        existing.overallRequired += participant.totalRequired;
      } else {
        participantMap.set(participant.userId, {
          userId: participant.userId,
          discordUsername: participant.discordUsername,
          discordAvatarUrl: participant.discordAvatarUrl,
          tracks: [{
            trackName: track.trackName,
            trackType: track.trackType,
            totalCertified: participant.totalCertified,
            totalRequired: participant.totalRequired,
            completionRate: participant.completionRate,
          }],
          overallCertified: participant.totalCertified,
          overallRequired: participant.totalRequired,
          overallCompletionRate: 0, // 나중에 계산
        });
      }
    });
  });

  // 전체 완료율 계산
  participantMap.forEach((participant) => {
    participant.overallCompletionRate = 
      participant.overallRequired > 0
        ? Math.round((participant.overallCertified / participant.overallRequired) * 1000) / 10
        : 0;
  });

  // 참여자 배열로 변환
  let participants = Array.from(participantMap.values());

  // 정렬
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  participants = participants.sort((a, b) => {
    let comparison = 0;

    if (sortField === 'name') {
      comparison = a.discordUsername.localeCompare(b.discordUsername, 'ko');
    } else if (sortField === 'completed') {
      comparison = a.overallCertified - b.overallCertified;
    } else if (sortField === 'missing') {
      const aMissing = a.overallRequired - a.overallCertified;
      const bMissing = b.overallRequired - b.overallCertified;
      comparison = aMissing - bMissing;
    } else if (sortField === 'completion') {
      comparison = a.overallCompletionRate - b.overallCompletionRate;
    }

    return sortDirection === 'asc' ? comparison : -comparison;
  });

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? (
      <ChevronUp className="h-4 w-4 inline-block ml-1" />
    ) : (
      <ChevronDown className="h-4 w-4 inline-block ml-1" />
    );
  };

  if (participants.length === 0) {
    return (
      <Card className="p-12 text-center">
        <p className="text-body text-gray-600">
          참여자가 없습니다.
        </p>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th 
                className="px-6 py-4 text-left text-sm font-semibold text-gray-900 cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => handleSort('name')}
              >
                멤버 <SortIcon field="name" />
              </th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                참여 트랙
              </th>
              <th 
                className="px-6 py-4 text-center text-sm font-semibold text-gray-900 cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => handleSort('completed')}
              >
                이행 <SortIcon field="completed" />
              </th>
              <th 
                className="px-6 py-4 text-center text-sm font-semibold text-gray-900 cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => handleSort('missing')}
              >
                미이행 <SortIcon field="missing" />
              </th>
              <th 
                className="px-6 py-4 text-center text-sm font-semibold text-gray-900 cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => handleSort('completion')}
              >
                완료율 <SortIcon field="completion" />
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {participants.map((participant) => {
              const missing = participant.overallRequired - participant.overallCertified;
              
              return (
                <tr key={participant.userId} className="hover:bg-gray-50 transition-colors">
                  {/* 멤버 */}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        {participant.discordAvatarUrl ? (
                          <img 
                            src={participant.discordAvatarUrl} 
                            alt={participant.discordUsername}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center bg-primary/10 text-primary font-semibold text-lg">
                            {participant.discordUsername.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </Avatar>
                      <div>
                        <div className="font-medium text-gray-900">
                          {participant.discordUsername}
                        </div>
                        <div className="text-sm text-gray-500">
                          {participant.tracks.length}개 트랙
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* 참여 트랙 */}
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1.5">
                      {participant.tracks.map((track, idx) => (
                        <Badge 
                          key={idx}
                          variant="outline" 
                          className="text-xs"
                        >
                          {track.trackName}
                        </Badge>
                      ))}
                    </div>
                  </td>

                  {/* 이행 */}
                  <td className="px-6 py-4 text-center">
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-50 rounded-lg">
                      <span className="text-2xl font-bold text-green-700">
                        {participant.overallCertified}
                      </span>
                      <span className="text-sm text-gray-500">
                        / {participant.overallRequired}
                      </span>
                    </div>
                  </td>

                  {/* 미이행 */}
                  <td className="px-6 py-4 text-center">
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-red-50 rounded-lg">
                      <span className="text-2xl font-bold text-red-700">
                        {missing}
                      </span>
                      <span className="text-sm text-gray-500">
                        / {participant.overallRequired}
                      </span>
                    </div>
                  </td>

                  {/* 완료율 */}
                  <td className="px-6 py-4">
                    <div className="flex flex-col items-center gap-2">
                      <div className="flex items-center gap-2">
                        <div className="text-2xl font-bold text-gray-900">
                          {participant.overallCompletionRate}%
                        </div>
                      </div>
                      <div className="w-full max-w-[120px] h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all ${
                            participant.overallCompletionRate >= 80 ? 'bg-green-500' :
                            participant.overallCompletionRate >= 50 ? 'bg-yellow-500' :
                            'bg-red-500'
                          }`}
                          style={{ width: `${Math.min(participant.overallCompletionRate, 100)}%` }}
                        />
                      </div>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

