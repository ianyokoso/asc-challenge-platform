'use client';

import { useState, useEffect } from 'react';
import { format, isBefore, addDays } from 'date-fns';
import { ko } from 'date-fns/locale';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useQueryClient } from '@tanstack/react-query';
import { AdminSidebar } from '@/components/layout/admin-sidebar';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { AdminPageGuard } from '@/components/guards/AdminPageGuard';
import { AlertTriangle, Database, CheckCircle, RotateCcw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { EditableText } from '@/components/EditableText';
import { usePageContents } from '@/hooks/usePageContents';
import { useEditMode } from '@/contexts/EditModeContext';

// Zod 스키마: 전체 리셋 폼 검증
const resetFormSchema = z.object({
  beforeDate: z.string().min(1, '기준 날짜를 선택해주세요'),
  seasonStartDate: z.string().min(1, '다음 기수 시작일을 선택해주세요'),
  seasonEndDate: z.string().min(1, '다음 기수 종료일을 선택해주세요'),
  newTermNumber: z.union([
    z.string().transform((val) => val === '' ? undefined : parseInt(val, 10)),
    z.number(),
    z.undefined()
  ]).refine((val) => val === undefined || (typeof val === 'number' && val >= 1), {
    message: '기수 번호는 1 이상의 숫자여야 합니다'
  }).optional(),
  reason: z.string().optional(),
}).refine((data) => {
  // 시작일이 종료일보다 이전이어야 함
  const start = new Date(data.seasonStartDate);
  const end = new Date(data.seasonEndDate);
  return isBefore(start, end);
}, {
  message: '시작일은 종료일보다 이전이어야 합니다',
  path: ['seasonEndDate'],
});

type ResetFormValues = z.infer<typeof resetFormSchema>;

/**
 * 관리자 전용 - 인증 기록 관리 페이지
 * 
 * 기능:
 * - 전체 리셋 (인증 삭제 + 참여자 대기 전환) + 기수 시작/종료일 설정
 * - 백업 자동 생성
 * - 삭제 확인 모달
 */
function CertificationManagementPageContent() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
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


  // 전체 리셋 (React Hook Form 사용)
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  
  const resetForm = useForm<ResetFormValues>({
    resolver: zodResolver(resetFormSchema),
    defaultValues: {
      beforeDate: today,
      seasonStartDate: format(new Date(), 'yyyy-MM-dd'),
      seasonEndDate: format(addDays(new Date(), 30), 'yyyy-MM-dd'),
      newTermNumber: undefined, // undefined로 초기화
      reason: '',
    },
  });


  // 전체 리셋 확인 모달 열기
  const handleOpenResetModal = async () => {
    const isValid = await resetForm.trigger();
    if (!isValid) {
      toast({
        variant: 'destructive',
        title: '입력값을 확인해주세요',
        description: '모든 필수 항목을 올바르게 입력해주세요.',
      });
      return;
    }
    setIsResetModalOpen(true);
  };

  // 전체 리셋 실행
  const handleReset = async (data: ResetFormValues) => {
    setIsResetting(true);
    try {
      const response = await fetch('/api/admin/certifications/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          beforeDate: data.beforeDate,
          seasonStartDate: data.seasonStartDate,
          seasonEndDate: data.seasonEndDate,
          newTermNumber: data.newTermNumber && typeof data.newTermNumber === 'number' ? data.newTermNumber : undefined,
          reason: data.reason || undefined,
        }),
      });

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData.error || 'Failed to reset');
      }

      const periodInfo = responseData.data.newPeriod 
        ? `${responseData.data.newPeriod.termNumber}기` 
        : '다음 기수';
      
      toast({
        title: '전체 리셋 완료 ✅',
        description: `${responseData.data.certificationsDeleted}개의 인증 기록 삭제 및 ${responseData.data.participantsUpdated}명의 참여자 상태가 대기로 전환되었습니다. ${periodInfo}: ${format(new Date(data.seasonStartDate), 'yyyy.MM.dd', { locale: ko })} ~ ${format(new Date(data.seasonEndDate), 'yyyy.MM.dd', { locale: ko })}`,
      });

      // 캐시 무효화하여 기수 정보 즉시 업데이트
      queryClient.invalidateQueries({ queryKey: ['active-period'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      queryClient.invalidateQueries({ queryKey: ['users-with-tracks'] });
      
      // 모달 닫기 및 폼 초기화
      setIsResetModalOpen(false);
      resetForm.reset();
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

              <div className="bg-white border border-orange-200 rounded-md p-4 mb-4">
                <p className="text-body-sm font-medium text-gray-900 mb-2">
                  ⚠️ 리셋 실행 시 수행되는 작업:
                </p>
                <ul className="text-body-sm text-gray-700 space-y-1 list-disc list-inside">
                  <li>기준 날짜 이전의 모든 인증 기록 삭제 (백업됨)</li>
                  <li>모든 참여자의 트랙 상태를 대기(is_active = false)로 변경</li>
                  <li>다음 기수 시작일/종료일 설정</li>
                  <li>챌린지를 완전히 초기화하고 새로 시작할 때 사용</li>
                </ul>
              </div>

              <Form {...resetForm}>
                <form className="space-y-4">
                  <FormField
                    control={resetForm.control}
                    name="beforeDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-body font-medium text-gray-900">
                          기준 날짜 (이 날짜 이전 삭제)
                        </FormLabel>
                        <FormControl>
                          <Input type="date" max={today} {...field} />
                        </FormControl>
                        <FormDescription className="text-body-sm text-gray-500">
                          {field.value && (
                            <>
                              {format(new Date(field.value), 'yyyy년 M월 d일', { locale: ko })} 이전의 기록이 삭제됩니다.
                            </>
                          )}
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={resetForm.control}
                      name="seasonStartDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-body font-medium text-gray-900">
                            다음 기수 시작일 *
                          </FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormDescription className="text-body-sm text-gray-500">
                            다음 챌린지가 시작되는 날짜
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={resetForm.control}
                      name="seasonEndDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-body font-medium text-gray-900">
                            다음 기수 종료일 *
                          </FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormDescription className="text-body-sm text-gray-500">
                            다음 챌린지가 종료되는 날짜
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={resetForm.control}
                    name="newTermNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-body font-medium text-gray-900">
                          다음 기수 번호 (선택)
                        </FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            placeholder="예: 2 (입력하지 않으면 자동 계산)"
                            min="1"
                            {...field}
                            value={field.value || ''}
                            onChange={(e) => {
                              const value = e.target.value;
                              field.onChange(value === '' ? undefined : parseInt(value, 10));
                            }}
                          />
                        </FormControl>
                        <FormDescription className="text-body-sm text-gray-500">
                          기수 번호를 직접 설정하거나 비워두면 자동으로 계산됩니다.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={resetForm.control}
                    name="reason"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-body font-medium text-gray-900">
                          리셋 사유 (선택)
                        </FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="예: 2기 시작으로 인한 전체 초기화"
                            rows={3}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button
                    type="button"
                    onClick={handleOpenResetModal}
                    className="w-full sm:w-auto bg-orange-600 hover:bg-orange-700 text-white"
                  >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    전체 리셋 실행
                  </Button>
                </form>
              </Form>
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
                  <strong>{format(new Date(resetForm.getValues('beforeDate')), 'yyyy년 M월 d일', { locale: ko })} 이전</strong>의 
                  인증 기록을 삭제하고, <strong>모든 참여자를 대기 상태로 전환</strong>하시겠습니까?
                </p>
                
                <div className="bg-blue-50 border border-blue-200 rounded-md p-3 space-y-2">
                  <p className="text-sm font-medium text-blue-800">📅 다음 기수 일정:</p>
                  <div className="text-sm text-blue-700 space-y-1">
                    <p>
                      • 시작일: <strong>{format(new Date(resetForm.getValues('seasonStartDate')), 'yyyy년 M월 d일', { locale: ko })}</strong>
                    </p>
                    <p>
                      • 종료일: <strong>{format(new Date(resetForm.getValues('seasonEndDate')), 'yyyy년 M월 d일', { locale: ko })}</strong>
                    </p>
                  </div>
                </div>

                {resetForm.getValues('reason') && (
                  <div className="bg-gray-50 p-3 rounded-md">
                    <p className="text-sm font-medium text-gray-700">리셋 사유:</p>
                    <p className="text-sm text-gray-600 mt-1">{resetForm.getValues('reason')}</p>
                  </div>
                )}
                
                <div className="bg-orange-50 border border-orange-200 rounded-md p-3 space-y-2">
                  <p className="text-sm font-medium text-orange-800">실행 내용:</p>
                  <ul className="text-sm text-orange-700 space-y-1 list-disc list-inside">
                    <li>인증 기록 삭제 (백업됨)</li>
                    <li>모든 참여자를 대기 상태로 전환</li>
                    <li>다음 기수 시작/종료일 설정</li>
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
                onClick={resetForm.handleSubmit(handleReset)}
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

