'use client';

import { format, parse } from 'date-fns';
import { ko } from 'date-fns/locale';
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Calendar,
  ExternalLink,
  User,
  Link as LinkIcon,
  FileText
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface CertificationDetail {
  status: 'certified' | 'pending' | 'missing' | 'not-required';
  url: string | null;
  submittedAt: string | null;
  notes: string | null;
  date: string;
  userName: string;
  userAvatar: string | null;
  trackName: string;
}

interface CertificationDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  detail: CertificationDetail | null;
}

/**
 * 인증 상세 정보 Dialog 컴포넌트
 * 
 * 특징:
 * - 인증 상태 및 날짜 표시
 * - 사용자 정보 표시
 * - 인증 URL 링크 제공
 * - 제출 시간 표시
 */
export function CertificationDetailDialog({
  open,
  onOpenChange,
  detail,
}: CertificationDetailDialogProps) {
  if (!detail) return null;

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'certified':
        return {
          icon: <CheckCircle2 className="h-6 w-6" />,
          color: 'text-green-600',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          label: '인증 완료',
          description: '이 날짜의 챌린지가 성공적으로 인증되었습니다.',
        };
      case 'pending':
        return {
          icon: <Clock className="h-6 w-6" />,
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-200',
          label: '인증 대기',
          description: '관리자 승인 대기 중입니다.',
        };
      case 'missing':
        return {
          icon: <XCircle className="h-6 w-6" />,
          color: 'text-red-600',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          label: '미인증',
          description: '이 날짜에 인증이 이루어지지 않았습니다.',
        };
      default:
        return {
          icon: <Calendar className="h-6 w-6" />,
          color: 'text-gray-600',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200',
          label: '인증 불필요',
          description: '아직 인증이 필요하지 않은 날짜입니다.',
        };
    }
  };

  const statusInfo = getStatusInfo(detail.status);
  const dateObj = parse(detail.date, 'yyyy-MM-dd', new Date());
  const formattedDate = format(dateObj, 'yyyy년 M월 d일 EEEE', { locale: ko });
  const formattedSubmitTime = detail.submittedAt 
    ? format(new Date(detail.submittedAt), 'yyyy년 M월 d일 HH:mm:ss', { locale: ko })
    : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            인증 상세 정보
          </DialogTitle>
          <DialogDescription>
            {formattedDate}의 인증 내역을 확인하세요
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* 사용자 정보 */}
          <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
            <Avatar className="h-12 w-12">
              {detail.userAvatar ? (
                <img 
                  src={detail.userAvatar} 
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="h-full w-full flex items-center justify-center bg-primary/10 text-primary font-semibold text-lg">
                  {detail.userName.charAt(0).toUpperCase()}
                </div>
              )}
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-gray-500" />
                <span className="font-semibold text-gray-900">{detail.userName}</span>
              </div>
              <div className="text-sm text-gray-600 mt-1">
                {detail.trackName}
              </div>
            </div>
          </div>

          {/* 인증 상태 */}
          <div className={`p-4 rounded-lg border-2 ${statusInfo.bgColor} ${statusInfo.borderColor}`}>
            <div className="flex items-center gap-3 mb-2">
              <div className={statusInfo.color}>
                {statusInfo.icon}
              </div>
              <div>
                <Badge className={`${statusInfo.bgColor} ${statusInfo.color} border-none`}>
                  {statusInfo.label}
                </Badge>
              </div>
            </div>
            <p className="text-sm text-gray-700 mt-2">
              {statusInfo.description}
            </p>
          </div>

          {/* 인증 날짜 */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <Calendar className="h-4 w-4" />
              <span>인증 날짜</span>
            </div>
            <div className="pl-6 text-base text-gray-900">
              {formattedDate}
            </div>
          </div>

          {/* 제출 시간 */}
          {formattedSubmitTime && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <Clock className="h-4 w-4" />
                <span>제출 시간</span>
              </div>
              <div className="pl-6 text-base text-gray-900">
                {formattedSubmitTime}
              </div>
            </div>
          )}

          {/* 인증 메모 */}
          {detail.notes && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <FileText className="h-4 w-4" />
                <span>과제 인증 내용</span>
              </div>
              <div className="pl-6">
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-sm text-gray-900 whitespace-pre-wrap break-words">
                    {detail.notes}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* 인증 URL */}
          {detail.url && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <LinkIcon className="h-4 w-4" />
                <span>인증 링크</span>
              </div>
              <div className="pl-6">
                <a
                  href={detail.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 hover:underline break-all"
                >
                  <span className="text-sm">{detail.url}</span>
                  <ExternalLink className="h-4 w-4 flex-shrink-0" />
                </a>
              </div>
            </div>
          )}

          {/* URL이 없는 경우 */}
          {!detail.url && detail.status !== 'not-required' && (
            <div className="p-3 bg-gray-100 rounded-lg">
              <p className="text-sm text-gray-600 text-center">
                인증 링크가 등록되지 않았습니다.
              </p>
            </div>
          )}
        </div>

        {/* 액션 버튼 */}
        <div className="flex gap-2 justify-end pt-4 border-t">
          {detail.url && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(detail.url!, '_blank')}
              className="gap-2"
            >
              <ExternalLink className="h-4 w-4" />
              링크 열기
            </Button>
          )}
          <Button
            variant="default"
            size="sm"
            onClick={() => onOpenChange(false)}
          >
            닫기
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

