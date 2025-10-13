'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { AdminSidebar } from '@/components/layout/admin-sidebar';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { AdminPageGuard } from '@/components/guards/AdminPageGuard';
import { Trash2, AlertTriangle, Database, CheckCircle, RotateCcw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { EditableText } from '@/components/EditableText';
import { usePageContents } from '@/hooks/usePageContents';
import { useEditMode } from '@/contexts/EditModeContext';

/**
 * 관리자 전용 - 인증 기록 관리 페이지
 * 
 * 기능:
 * - 기준 날짜 이전 일괄 삭제
 * - 전체 리셋 (인증 삭제 + 참여자 대기 전환)
 * - 백업 자동 생성
 * - 삭제 확인 모달
 */
function CertificationManagementPageContent() {
  const { toast } = useToast();
  const today = format(new Date(), 'yyyy-MM-dd');
  const { getContentByKey, getValueByKey, saveContents } = usePageContents('/admin/certifications');
  const { pendingChanges, setSaveHandler } = useEditMode();

  // 저장 핸들러 등록
  useEffect(() => {
    setSaveHandler(async () => {
      return await saveContents(pendingChanges);
    });

    // cleanup
    return () => setSaveHandler(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingChanges, saveContents]);

  // 일괄 삭제
  const [bulkDeleteDate, setBulkDeleteDate] = useState(today);
  const [bulkDeleteReason, setBulkDeleteReason] = useState('');
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  // 전체 리셋
  const [resetDate, setResetDate] = useState(today);
  const [resetReason, setResetReason] = useState('');
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  // 일괄 삭제 확인 모달 열기
  const handleOpenBulkDeleteModal = () => {
    if (!bulkDeleteDate) {
      toast({
        variant: 'destructive',
        title: '날짜를 입력해주세요',
        description: '삭제 기준 날짜를 선택해야 합니다.',
      });
      return;
    }
    setIsBulkDeleteModalOpen(true);
  };

  // 일괄 삭제 실행
  const handleBulkDelete = async () => {
    setIsBulkDeleting(true);
    try {
      const response = await fetch('/api/admin/certifications/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          beforeDate: bulkDeleteDate,
          reason: bulkDeleteReason || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete certifications');
      }

      toast({
        title: '삭제 완료 ✅',
        description: `${data.deletedCount}개의 인증 기록이 삭제되었습니다. (백업됨)`,
      });

      // 모달 닫기 및 초기화
      setIsBulkDeleteModalOpen(false);
      setBulkDeleteReason('');
    } catch (error) {
      console.error('Bulk delete error:', error);
      toast({
        variant: 'destructive',
        title: '삭제 실패',
        description: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.',
      });
    } finally {
      setIsBulkDeleting(false);
    }
  };

  // 전체 리셋 확인 모달 열기
  const handleOpenResetModal = () => {
    if (!resetDate) {
      toast({
        variant: 'destructive',
        title: '날짜를 입력해주세요',
        description: '리셋 기준 날짜를 선택해야 합니다.',
      });
      return;
    }
    setIsResetModalOpen(true);
  };

  // 전체 리셋 실행
  const handleReset = async () => {
    setIsResetting(true);
    try {
      const response = await fetch('/api/admin/certifications/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          beforeDate: resetDate,
          reason: resetReason || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to reset');
      }

      toast({
        title: '전체 리셋 완료 ✅',
        description: `${data.data.certificationsDeleted}개의 인증 기록 삭제 및 ${data.data.participantsUpdated}명의 참여자 상태가 대기로 전환되었습니다.`,
      });

      // 모달 닫기 및 초기화
      setIsResetModalOpen(false);
      setResetReason('');
    } catch (error) {
      console.error('Reset error:', error);
      toast({
        variant: 'destructive',
        title: '리셋 실패',
        description: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.',
      });
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <AdminSidebar />
      
      <main className="flex-1 p-8">
        {/* 페이지 헤더 */}
        <div className="mb-8">
          <EditableText
            contentId={getContentByKey('page-title')?.id || ''}
            defaultValue={getValueByKey('page-title', '인증 기록 관리')}
            as="h1"
            className="text-h2 font-heading text-gray-900 mb-2"
          />
          <EditableText
            contentId={getContentByKey('page-description')?.id || ''}
            defaultValue={getValueByKey('page-description', '인증 기록을 삭제하고 초기화할 수 있습니다. 모든 삭제는 자동으로 백업됩니다.')}
            as="p"
            className="text-body-lg text-gray-600"
          />
        </div>

        {/* 경고 메시지 */}
        <Card className="mb-6 border-yellow-200 bg-yellow-50">
          <div className="p-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-6 w-6 text-yellow-600 mt-0.5" />
              <div>
                <EditableText
                  contentId={getContentByKey('warning-title')?.id || ''}
                  defaultValue={getValueByKey('warning-title', '주의사항')}
                  as="h3"
                  className="text-h4 font-heading text-gray-900 mb-2"
                />
                <ul className="text-body text-gray-700 space-y-1 list-disc list-inside">
                  <li>삭제된 기록은 백업 테이블에 자동으로 저장됩니다.</li>
                  <li>백업은 복구를 위해 보관되며, 별도로 삭제하지 않는 한 영구 보존됩니다.</li>
                  <li>삭제 작업은 되돌릴 수 없으니 신중하게 진행하세요.</li>
                </ul>
              </div>
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-1 gap-6">
          {/* 기준 날짜 이전 일괄 삭제 */}
          <Card>
            <div className="p-6">
              <div className="flex items-start gap-3 mb-6">
                <Trash2 className="h-6 w-6 text-red-600 mt-0.5" />
                <div>
                  <EditableText
                    contentId={getContentByKey('bulk-delete-title')?.id || ''}
                    defaultValue={getValueByKey('bulk-delete-title', '기준 날짜 이전 일괄 삭제')}
                    as="h2"
                    className="text-h3 font-heading text-gray-900 mb-1"
                  />
                  <EditableText
                    contentId={getContentByKey('bulk-delete-description')?.id || ''}
                    defaultValue={getValueByKey('bulk-delete-description', '지정한 날짜 이전의 모든 인증 기록을 삭제합니다.')}
                    as="p"
                    className="text-body text-gray-600"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="bulk-delete-date" className="text-body font-medium text-gray-900">
                    기준 날짜 (이 날짜 이전 삭제)
                  </Label>
                  <Input
                    id="bulk-delete-date"
                    type="date"
                    value={bulkDeleteDate}
                    onChange={(e) => setBulkDeleteDate(e.target.value)}
                    max={today}
                    className="mt-1.5"
                  />
                  <p className="text-body-sm text-gray-500 mt-1">
                    {bulkDeleteDate && (
                      <>
                        {format(new Date(bulkDeleteDate), 'yyyy년 M월 d일', { locale: ko })} 이전의 기록이 삭제됩니다.
                      </>
                    )}
                  </p>
                </div>

                <div>
                  <Label htmlFor="bulk-delete-reason" className="text-body font-medium text-gray-900">
                    삭제 사유 (선택)
                  </Label>
                  <Textarea
                    id="bulk-delete-reason"
                    placeholder="예: 챌린지 종료로 인한 데이터 정리"
                    value={bulkDeleteReason}
                    onChange={(e) => setBulkDeleteReason(e.target.value)}
                    rows={3}
                    className="mt-1.5"
                  />
                </div>

                <Button
                  onClick={handleOpenBulkDeleteModal}
                  variant="destructive"
                  className="w-full sm:w-auto"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  일괄 삭제 실행
                </Button>
              </div>
            </div>
          </Card>

          {/* 전체 리셋 (인증 삭제 + 참여자 대기 전환) */}
          <Card className="border-orange-200 bg-orange-50">
            <div className="p-6">
              <div className="flex items-start gap-3 mb-6">
                <RotateCcw className="h-6 w-6 text-orange-600 mt-0.5" />
                <div>
                  <EditableText
                    contentId={getContentByKey('reset-title')?.id || ''}
                    defaultValue={getValueByKey('reset-title', '전체 리셋 (인증 삭제 + 참여자 대기 전환)')}
                    as="h2"
                    className="text-h3 font-heading text-gray-900 mb-1"
                  />
                  <EditableText
                    contentId={getContentByKey('reset-description')?.id || ''}
                    defaultValue={getValueByKey('reset-description', '지정한 날짜 이전의 인증 기록을 삭제하고, 모든 참여자를 대기 상태로 전환합니다.')}
                    as="p"
                    className="text-body text-gray-600"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="bg-white border border-orange-200 rounded-md p-4 mb-4">
                  <p className="text-body-sm font-medium text-gray-900 mb-2">
                    ⚠️ 리셋 실행 시 수행되는 작업:
                  </p>
                  <ul className="text-body-sm text-gray-700 space-y-1 list-disc list-inside">
                    <li>기준 날짜 이전의 모든 인증 기록 삭제 (백업됨)</li>
                    <li>모든 참여자의 트랙 상태를 대기(is_active = false)로 변경</li>
                    <li>챌린지를 완전히 초기화하고 새로 시작할 때 사용</li>
                  </ul>
                </div>

                <div>
                  <Label htmlFor="reset-date" className="text-body font-medium text-gray-900">
                    기준 날짜 (이 날짜 이전 삭제)
                  </Label>
                  <Input
                    id="reset-date"
                    type="date"
                    value={resetDate}
                    onChange={(e) => setResetDate(e.target.value)}
                    max={today}
                    className="mt-1.5"
                  />
                  <p className="text-body-sm text-gray-500 mt-1">
                    {resetDate && (
                      <>
                        {format(new Date(resetDate), 'yyyy년 M월 d일', { locale: ko })} 이전의 기록이 삭제되고, 모든 참여자가 대기 상태로 전환됩니다.
                      </>
                    )}
                  </p>
                </div>

                <div>
                  <Label htmlFor="reset-reason" className="text-body font-medium text-gray-900">
                    리셋 사유 (선택)
                  </Label>
                  <Textarea
                    id="reset-reason"
                    placeholder="예: 새 시즌 시작으로 인한 전체 초기화"
                    value={resetReason}
                    onChange={(e) => setResetReason(e.target.value)}
                    rows={3}
                    className="mt-1.5"
                  />
                </div>

                <Button
                  onClick={handleOpenResetModal}
                  className="w-full sm:w-auto bg-orange-600 hover:bg-orange-700 text-white"
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  전체 리셋 실행
                </Button>
              </div>
            </div>
          </Card>

          {/* 백업 정보 */}
          <Card className="border-blue-200 bg-blue-50">
            <div className="p-6">
              <div className="flex items-start gap-3">
                <Database className="h-6 w-6 text-blue-600 mt-0.5" />
                <div>
                  <EditableText
                    contentId={getContentByKey('backup-title')?.id || ''}
                    defaultValue={getValueByKey('backup-title', '자동 백업 시스템')}
                    as="h3"
                    className="text-h4 font-heading text-gray-900 mb-2"
                  />
                  <div className="text-body text-gray-700 space-y-2">
                    <p>
                      모든 삭제 작업은 자동으로 <code className="px-2 py-0.5 bg-white rounded text-sm">certifications_backup</code> 테이블에 백업됩니다.
                    </p>
                    <div className="mt-3 space-y-1">
                      <p className="font-medium">백업 정보:</p>
                      <ul className="list-disc list-inside space-y-1 ml-2">
                        <li>백업 시각 (backed_up_at)</li>
                        <li>백업 수행자 (backed_up_by)</li>
                        <li>백업 사유 (backup_reason)</li>
                        <li>삭제 시각 (original_deleted_at)</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* 일괄 삭제 확인 모달 */}
        <Dialog open={isBulkDeleteModalOpen} onOpenChange={setIsBulkDeleteModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="h-5 w-5" />
                인증 기록 삭제 확인
              </DialogTitle>
              <DialogDescription className="space-y-3 pt-2">
                <p>
                  <strong>{format(new Date(bulkDeleteDate), 'yyyy년 M월 d일', { locale: ko })} 이전</strong>의 
                  모든 인증 기록을 삭제하시겠습니까?
                </p>
                {bulkDeleteReason && (
                  <div className="bg-gray-50 p-3 rounded-md">
                    <p className="text-sm font-medium text-gray-700">삭제 사유:</p>
                    <p className="text-sm text-gray-600 mt-1">{bulkDeleteReason}</p>
                  </div>
                )}
                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 space-y-2">
                  <p className="text-sm font-medium text-yellow-800">확인사항:</p>
                  <ul className="text-sm text-yellow-700 space-y-1 list-disc list-inside">
                    <li>삭제된 기록은 백업 테이블에 저장됩니다.</li>
                    <li>이 작업은 되돌릴 수 없습니다.</li>
                    <li>실행 전 한 번 더 확인해주세요.</li>
                  </ul>
                </div>
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsBulkDeleteModalOpen(false)}
                disabled={isBulkDeleting}
              >
                취소
              </Button>
              <Button
                variant="destructive"
                onClick={handleBulkDelete}
                disabled={isBulkDeleting}
              >
                {isBulkDeleting ? (
                  <>
                    <span className="animate-spin mr-2">⏳</span>
                    삭제 중...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4 mr-2" />
                    삭제 실행
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 전체 리셋 확인 모달 */}
        <Dialog open={isResetModalOpen} onOpenChange={setIsResetModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-orange-600">
                <RotateCcw className="h-5 w-5" />
                전체 리셋 확인
              </DialogTitle>
              <DialogDescription className="space-y-3 pt-2">
                <p>
                  <strong>{format(new Date(resetDate), 'yyyy년 M월 d일', { locale: ko })} 이전</strong>의 
                  인증 기록을 삭제하고, <strong>모든 참여자를 대기 상태로 전환</strong>하시겠습니까?
                </p>
                {resetReason && (
                  <div className="bg-gray-50 p-3 rounded-md">
                    <p className="text-sm font-medium text-gray-700">리셋 사유:</p>
                    <p className="text-sm text-gray-600 mt-1">{resetReason}</p>
                  </div>
                )}
                <div className="bg-orange-50 border border-orange-200 rounded-md p-3 space-y-2">
                  <p className="text-sm font-medium text-orange-800">실행 내용:</p>
                  <ul className="text-sm text-orange-700 space-y-1 list-disc list-inside">
                    <li>인증 기록 삭제 (백업됨)</li>
                    <li>모든 참여자를 대기 상태로 전환</li>
                    <li>챌린지 완전 초기화</li>
                  </ul>
                </div>
                <div className="bg-red-50 border border-red-200 rounded-md p-3 space-y-2">
                  <p className="text-sm font-medium text-red-800">⚠️ 주의사항:</p>
                  <ul className="text-sm text-red-700 space-y-1 list-disc list-inside">
                    <li>이 작업은 되돌릴 수 없습니다.</li>
                    <li>모든 참여자가 비활성 상태가 됩니다.</li>
                    <li>실행 전 신중히 확인해주세요.</li>
                  </ul>
                </div>
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsResetModalOpen(false)}
                disabled={isResetting}
              >
                취소
              </Button>
              <Button
                className="bg-orange-600 hover:bg-orange-700 text-white"
                onClick={handleReset}
                disabled={isResetting}
              >
                {isResetting ? (
                  <>
                    <span className="animate-spin mr-2">⏳</span>
                    리셋 중...
                  </>
                ) : (
                  <>
                    <RotateCcw className="h-4 w-4 mr-2" />
                    전체 리셋 실행
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}

export default function CertificationManagementPage() {
  return (
    <AdminPageGuard>
      <CertificationManagementPageContent />
    </AdminPageGuard>
  );
}

