'use client';

import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { 
  Calendar,
  ExternalLink,
  FileText,
  Link as LinkIcon,
  User,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import type { CertificationFeedItem } from '@/lib/supabase/certification-tracking';

interface CertificationFeedViewProps {
  items: CertificationFeedItem[];
  isLoading?: boolean;
}

/**
 * 빌더/세일즈 트랙 인증 피드 컴포넌트
 * Discord 채팅 형태로 인증 내용을 표시
 */
export function CertificationFeedView({ 
  items, 
  isLoading = false 
}: CertificationFeedViewProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="p-6 animate-pulse">
            <div className="flex gap-4">
              <div className="h-12 w-12 rounded-full bg-gray-200" />
              <div className="flex-1 space-y-3">
                <div className="h-4 w-32 bg-gray-200 rounded" />
                <div className="h-20 bg-gray-200 rounded" />
                <div className="h-4 w-48 bg-gray-200 rounded" />
              </div>
            </div>
          </Card>
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <Card className="p-12 text-center">
        <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-h4 font-heading text-gray-900 mb-2">
          인증 내역이 없습니다
        </h3>
        <p className="text-body text-gray-600">
          아직 제출된 인증이 없습니다.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {items.map((item) => {
        const submittedDate = new Date(item.submittedAt);
        const certDate = new Date(item.certificationDate);
        
        return (
          <Card 
            key={item.id} 
            className="p-6 hover:shadow-md transition-shadow"
          >
            {/* 사용자 정보 헤더 */}
            <div className="flex items-start gap-4 mb-4">
              <Avatar className="h-12 w-12 flex-shrink-0">
                {item.userAvatar ? (
                  <img 
                    src={item.userAvatar} 
                    alt={item.userName}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="h-full w-full flex items-center justify-center bg-primary/10 text-primary font-semibold text-lg">
                    {item.userName.charAt(0).toUpperCase()}
                  </div>
                )}
              </Avatar>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <h4 className="text-body-lg font-semibold text-gray-900">
                    {item.userName}
                  </h4>
                  <Badge 
                    variant="outline" 
                    className={`
                      ${item.status === 'approved' 
                        ? 'bg-green-50 text-green-700 border-green-200' 
                        : 'bg-blue-50 text-blue-700 border-blue-200'
                      }
                    `}
                  >
                    {item.status === 'approved' ? (
                      <>
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        승인됨
                      </>
                    ) : (
                      <>
                        <Clock className="h-3 w-3 mr-1" />
                        제출됨
                      </>
                    )}
                  </Badge>
                </div>
                
                <div className="flex items-center gap-3 text-body-sm text-gray-600 flex-wrap">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>
                      인증일: {format(certDate, 'yyyy년 M월 d일 (E)', { locale: ko })}
                    </span>
                  </div>
                  <span className="text-gray-400">·</span>
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" />
                    <span>
                      제출: {format(submittedDate, 'M월 d일 HH:mm', { locale: ko })}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* 인증 메모 내용 */}
            {item.notes && (
              <div className="mb-4">
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start gap-2 mb-2">
                    <FileText className="h-4 w-4 text-gray-500 mt-0.5 flex-shrink-0" />
                    <span className="text-body-sm font-medium text-gray-700">
                      과제 인증 내용
                    </span>
                  </div>
                  <p className="text-body text-gray-900 whitespace-pre-wrap break-words pl-6">
                    {item.notes}
                  </p>
                </div>
              </div>
            )}

            {/* 인증 URL (있는 경우) */}
            {item.url && (
              <div className="pt-3 border-t border-gray-100">
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 hover:underline text-body-sm"
                >
                  <LinkIcon className="h-4 w-4 flex-shrink-0" />
                  <span className="break-all">인증 링크 열기</span>
                  <ExternalLink className="h-3.5 w-3.5 flex-shrink-0" />
                </a>
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}

