'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import { AdminSidebar } from '@/components/layout/admin-sidebar';
import { useActivePeriod } from '@/hooks/useActivePeriod';
import { useToast } from '@/hooks/use-toast';
import {
  Save,
  Bell,
  Calendar,
  Award,
  Settings as SettingsIcon,
  CalendarDays,
  Edit,
  Loader2,
  PlayCircle,
  PauseCircle,
  SkipForward,
  RotateCcw,
  AlertTriangle,
} from 'lucide-react';
import {
  getNow,
  isDemoMode,
  setDemoMode,
  getDemoOffset,
  addDay,
  subtractDay,
  resetToToday,
  setDaysFromNow,
} from '@/lib/utils/demo-time';

// Form schema for period update
const periodUpdateSchema = z.object({
  start_date: z.string().min(1, '시작일을 입력해주세요'),
  end_date: z.string().min(1, '종료일을 입력해주세요'),
  description: z.string().optional(),
}).refine((data) => {
  const start = new Date(data.start_date);
  const end = new Date(data.end_date);
  return start < end;
}, {
  message: '종료일은 시작일보다 이후여야 합니다',
  path: ['end_date'],
});

type PeriodUpdateFormValues = z.infer<typeof periodUpdateSchema>;

export default function AdminSettingsPage() {
  const { toast } = useToast();
  const { data: activePeriod, isLoading: isPeriodLoading, refetch: refetchPeriod } = useActivePeriod();
  
  const [discordWebhook, setDiscordWebhook] = useState(
    'https://discord.com/api/webhooks/...'
  );
  const [shortformMission, setShortformMission] = useState(
    '오늘 배운 것이나 경험한 것을 60초 이내의 숏폼 영상으로 제작하고 공유하세요.'
  );
  const [showPeriodDialog, setShowPeriodDialog] = useState(false);
  const [isUpdatingPeriod, setIsUpdatingPeriod] = useState(false);
  
  // Demo mode state
  const [demoModeEnabled, setDemoModeEnabled] = useState(false);
  const [demoOffset, setDemoOffsetState] = useState(0);
  const [currentDemoTime, setCurrentDemoTime] = useState<Date>(new Date());

  // Initialize demo mode state
  useEffect(() => {
    setDemoModeEnabled(isDemoMode());
    setDemoOffsetState(getDemoOffset());
    setCurrentDemoTime(getNow());
  }, []);

  // Update current demo time when offset changes
  useEffect(() => {
    setCurrentDemoTime(getNow());
  }, [demoOffset]);

  // Form for period update
  const periodForm = useForm<PeriodUpdateFormValues>({
    resolver: zodResolver(periodUpdateSchema),
    defaultValues: {
      start_date: '',
      end_date: '',
      description: '',
    },
  });

  // Open dialog and populate form
  const handleOpenPeriodDialog = () => {
    if (activePeriod) {
      periodForm.reset({
        start_date: activePeriod.start_date,
        end_date: activePeriod.end_date,
        description: activePeriod.description || '',
      });
      setShowPeriodDialog(true);
    }
  };

  // Update period
  const handleUpdatePeriod = async (values: PeriodUpdateFormValues) => {
    if (!activePeriod) {
      toast({
        title: '오류',
        description: '활성 기수가 없습니다.',
        variant: 'destructive',
      });
      return;
    }

    setIsUpdatingPeriod(true);

    try {
      const response = await fetch('/api/admin/periods/update', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          period_id: activePeriod.id,
          ...values,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '기수 정보 수정에 실패했습니다');
      }

      toast({
        title: '성공',
        description: '기수 정보가 수정되었습니다.',
      });

      setShowPeriodDialog(false);
      refetchPeriod(); // Refetch active period data
    } catch (error: any) {
      console.error('[Settings] Failed to update period:', error);
      toast({
        title: '오류',
        description: error.message || '기수 정보 수정에 실패했습니다.',
        variant: 'destructive',
      });
    } finally {
      setIsUpdatingPeriod(false);
    }
  };

  // Demo mode handlers
  const handleToggleDemoMode = () => {
    const newState = !demoModeEnabled;
    setDemoMode(newState);
    setDemoModeEnabled(newState);
    
    if (newState) {
      toast({
        title: '데모 모드 활성화',
        description: '시간 시뮬레이션 모드가 활성화되었습니다.',
      });
    } else {
      toast({
        title: '데모 모드 비활성화',
        description: '실제 시간으로 돌아왔습니다.',
      });
      setDemoOffsetState(0);
      setCurrentDemoTime(new Date());
    }
  };

  const handleAddDay = () => {
    addDay();
    const newOffset = getDemoOffset();
    setDemoOffsetState(newOffset);
    toast({
      title: '다음날로 이동',
      description: `${format(getNow(), 'yyyy년 MM월 dd일 (EEE)', { locale: ko })}`,
    });
  };

  const handleSubtractDay = () => {
    subtractDay();
    const newOffset = getDemoOffset();
    setDemoOffsetState(newOffset);
    toast({
      title: '이전날로 이동',
      description: `${format(getNow(), 'yyyy년 MM월 dd일 (EEE)', { locale: ko })}`,
    });
  };

  const handleResetToToday = () => {
    resetToToday();
    setDemoOffsetState(0);
    setCurrentDemoTime(new Date());
    toast({
      title: '오늘로 리셋',
      description: '실제 오늘 날짜로 돌아왔습니다.',
    });
  };

  const handleSetDaysFromNow = (days: number) => {
    setDaysFromNow(days);
    setDemoOffsetState(days);
    toast({
      title: `${days > 0 ? '+' : ''}${days}일 이동`,
      description: `${format(getNow(), 'yyyy년 MM월 dd일 (EEE)', { locale: ko })}`,
    });
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <AdminSidebar />
      <main className="flex-1 p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-h2 font-heading text-gray-900 mb-2">
            설정
          </h1>
          <p className="text-body text-gray-600">
            플랫폼 설정 및 구성 관리
          </p>
        </div>

        <div className="space-y-6">
          {/* Period Management */}
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-primary/10 rounded-lg p-2">
                <CalendarDays className="h-5 w-5 text-primary" />
              </div>
              <h2 className="text-h4 font-heading text-gray-900">
                기수 관리
              </h2>
            </div>

            {isPeriodLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
              </div>
            ) : activePeriod ? (
              <div className="space-y-4">
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-3">
                        <h3 className="text-body font-semibold text-gray-900">
                          {activePeriod.term_number}기 챌린지
                        </h3>
                        <Badge className="bg-green-100 text-green-700 text-body-xs">
                          활성
                        </Badge>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-body-sm text-gray-600">
                          <span className="font-medium">시작일:</span>
                          <span>{format(new Date(activePeriod.start_date), 'yyyy년 MM월 dd일 (EEE)', { locale: ko })}</span>
                        </div>
                        <div className="flex items-center gap-2 text-body-sm text-gray-600">
                          <span className="font-medium">종료일:</span>
                          <span>{format(new Date(activePeriod.end_date), 'yyyy년 MM월 dd일 (EEE)', { locale: ko })}</span>
                        </div>
                        {activePeriod.description && (
                          <div className="flex items-start gap-2 text-body-sm text-gray-600 mt-2">
                            <span className="font-medium">설명:</span>
                            <span>{activePeriod.description}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleOpenPeriodDialog}
                      className="flex items-center gap-2"
                    >
                      <Edit className="h-4 w-4" />
                      수정
                    </Button>
                  </div>
                </div>

                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-body-sm text-blue-800">
                    💡 기수 기간을 수정하면 인증 가능 날짜가 즉시 변경됩니다.
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-body-sm text-yellow-800">
                  ⚠️ 활성 기수가 없습니다. 전체 리셋을 통해 새로운 기수를 생성하세요.
                </p>
              </div>
            )}
          </Card>

          {/* Demo Mode - Time Simulation */}
          <Card className="p-6 border-2 border-orange-200 bg-orange-50/50">
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-orange-100 rounded-lg p-2">
                <PlayCircle className="h-5 w-5 text-orange-600" />
              </div>
              <div className="flex-1">
                <h2 className="text-h4 font-heading text-gray-900">
                  🧪 데모 모드 (시간 시뮬레이션)
                </h2>
                <p className="text-body-sm text-gray-600 mt-1">
                  시간을 조작하여 다음날 시나리오를 테스트합니다
                </p>
              </div>
              <Button
                variant={demoModeEnabled ? "destructive" : "default"}
                onClick={handleToggleDemoMode}
                className="flex items-center gap-2"
              >
                {demoModeEnabled ? (
                  <>
                    <PauseCircle className="h-4 w-4" />
                    비활성화
                  </>
                ) : (
                  <>
                    <PlayCircle className="h-4 w-4" />
                    활성화
                  </>
                )}
              </Button>
            </div>

            {demoModeEnabled ? (
              <div className="space-y-6">
                {/* Current Demo Time Display */}
                <div className="p-4 bg-white rounded-lg border-2 border-orange-300">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-body-sm font-medium text-gray-700">
                      현재 데모 시간
                    </span>
                    <Badge className="bg-orange-100 text-orange-700">
                      {demoOffset > 0 ? `+${demoOffset}일` : demoOffset < 0 ? `${demoOffset}일` : '오늘'}
                    </Badge>
                  </div>
                  <div className="text-h3 font-bold text-gray-900">
                    {format(currentDemoTime, 'yyyy년 MM월 dd일 (EEEE)', { locale: ko })}
                  </div>
                  <div className="text-body-sm text-gray-500 mt-1">
                    실제 시간: {format(new Date(), 'yyyy년 MM월 dd일', { locale: ko })}
                  </div>
                </div>

                {/* Time Control Buttons */}
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    variant="outline"
                    onClick={handleSubtractDay}
                    className="flex items-center justify-center gap-2"
                  >
                    <RotateCcw className="h-4 w-4" />
                    -1일 (이전날)
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleAddDay}
                    className="flex items-center justify-center gap-2"
                  >
                    <SkipForward className="h-4 w-4" />
                    +1일 (다음날)
                  </Button>
                </div>

                {/* Quick Jump Buttons */}
                <div className="space-y-2">
                  <Label className="text-body-sm font-medium text-gray-700">
                    빠른 이동
                  </Label>
                  <div className="grid grid-cols-4 gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSetDaysFromNow(7)}
                    >
                      +7일
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSetDaysFromNow(14)}
                    >
                      +14일
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSetDaysFromNow(30)}
                    >
                      +30일
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSetDaysFromNow(365)}
                    >
                      +365일
                    </Button>
                  </div>
                </div>

                {/* Reset Button */}
                <Button
                  variant="secondary"
                  onClick={handleResetToToday}
                  className="w-full flex items-center justify-center gap-2"
                >
                  <RotateCcw className="h-4 w-4" />
                  오늘로 리셋
                </Button>

                {/* Warning Notice */}
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                    <div className="text-body-sm text-yellow-800">
                      <p className="font-semibold mb-1">⚠️ 주의사항</p>
                      <ul className="list-disc list-inside space-y-1">
                        <li>데모 모드는 <strong>테스트 전용</strong>입니다</li>
                        <li>실제 데이터베이스는 변경되지 않습니다</li>
                        <li>시간 변경은 <strong>현재 브라우저에만</strong> 적용됩니다</li>
                        <li>페이지를 새로고침하면 변경사항이 유지됩니다</li>
                        <li>테스트 완료 후 반드시 비활성화하세요</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* How to Use */}
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-body-sm text-blue-800 font-semibold mb-2">
                    💡 사용 방법
                  </p>
                  <ol className="list-decimal list-inside space-y-1 text-body-sm text-blue-700">
                    <li>데모 모드를 활성화합니다</li>
                    <li>"다음날" 버튼을 클릭하여 시간을 이동합니다</li>
                    <li>인증 페이지에서 기간 검증을 테스트합니다</li>
                    <li>배너 색상 변화를 확인합니다</li>
                    <li>테스트 완료 후 "비활성화" 버튼을 클릭합니다</li>
                  </ol>
                </div>
              </div>
            ) : (
              <div className="p-6 bg-white rounded-lg border border-gray-200 text-center">
                <PlayCircle className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <p className="text-body text-gray-600 mb-4">
                  데모 모드를 활성화하면 시간을 조작하여<br />
                  다음날 시나리오를 테스트할 수 있습니다.
                </p>
                <Button
                  variant="outline"
                  onClick={handleToggleDemoMode}
                  className="flex items-center gap-2 mx-auto"
                >
                  <PlayCircle className="h-4 w-4" />
                  데모 모드 활성화
                </Button>
              </div>
            )}
          </Card>

          {/* Discord Integration */}
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-primary/10 rounded-lg p-2">
                <Bell className="h-5 w-5 text-primary" />
              </div>
              <h2 className="text-h4 font-heading text-gray-900">
                Discord 연동 설정
              </h2>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="webhook" className="text-body">
                  Webhook URL
                </Label>
                <Input
                  id="webhook"
                  value={discordWebhook}
                  onChange={(e) => setDiscordWebhook(e.target.value)}
                  placeholder="https://discord.com/api/webhooks/..."
                  className="mt-2"
                />
                <p className="text-body-sm text-gray-500 mt-2">
                  인증 완료 및 탈락 후보 알림을 받을 Discord Webhook URL
                </p>
              </div>

              <div className="pt-4 border-t border-gray-200">
                <h3 className="text-body font-semibold text-gray-900 mb-3">
                  알림 설정
                </h3>
                <div className="space-y-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      defaultChecked
                      className="rounded border-gray-300"
                    />
                    <span className="text-body-sm text-gray-700">
                      인증 완료 알림
                    </span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      defaultChecked
                      className="rounded border-gray-300"
                    />
                    <span className="text-body-sm text-gray-700">
                      탈락 후보 발생 알림
                    </span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      className="rounded border-gray-300"
                    />
                    <span className="text-body-sm text-gray-700">
                      일일 통계 요약
                    </span>
                  </label>
                </div>
              </div>

              <Button className="bg-primary hover:bg-primary-hover text-primary-foreground">
                <Save className="mr-2 h-4 w-4" />
                저장
              </Button>
            </div>
          </Card>

          {/* Mission Content Management */}
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-secondary/10 rounded-lg p-2">
                <Calendar className="h-5 w-5 text-secondary" />
              </div>
              <h2 className="text-h4 font-heading text-gray-900">
                미션 내용 관리
              </h2>
            </div>

            <div className="space-y-6">
              {/* Short-form Mission */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Label className="text-body">Short-form 미션</Label>
                  <Badge className="bg-primary/10 text-primary text-body-xs">
                    월~금
                  </Badge>
                </div>
                <Textarea
                  value={shortformMission}
                  onChange={(e) => setShortformMission(e.target.value)}
                  rows={3}
                  className="mt-2"
                />
              </div>

              {/* Long-form Mission */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Label className="text-body">Long-form 미션</Label>
                  <Badge className="bg-secondary/10 text-secondary text-body-xs">
                    일요일
                  </Badge>
                </div>
                <Textarea
                  defaultValue="이번 주 학습한 내용이나 프로젝트 진행 상황을 긴 형식의 콘텐츠로 정리하여 공유하세요."
                  rows={3}
                  className="mt-2"
                />
              </div>

              {/* Builder Mission */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Label className="text-body">Builder 미션</Label>
                  <Badge className="bg-accent/10 text-accent text-body-xs">
                    일요일
                  </Badge>
                </div>
                <Textarea
                  defaultValue="이번 주 제품/서비스 개발 진행 상황을 공유하고 다음 주 계획을 작성하세요."
                  rows={3}
                  className="mt-2"
                />
              </div>

              {/* Sales Mission */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Label className="text-body">Sales 미션</Label>
                  <Badge className="bg-secondary/10 text-secondary text-body-xs">
                    화요일
                  </Badge>
                </div>
                <Textarea
                  defaultValue="이번 주 판매 활동 및 고객 개발 결과를 공유하세요."
                  rows={3}
                  className="mt-2"
                />
              </div>

              <Button className="bg-primary hover:bg-primary-hover text-primary-foreground">
                <Save className="mr-2 h-4 w-4" />
                미션 내용 저장
              </Button>
            </div>
          </Card>

          {/* Achievement Titles */}
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-accent/10 rounded-lg p-2">
                <Award className="h-5 w-5 text-accent" />
              </div>
              <h2 className="text-h4 font-heading text-gray-900">
                칭호 관리
              </h2>
            </div>

            <div className="space-y-4">
              {[
                {
                  name: 'First Step Challenger',
                  requirement: '1주차 완료',
                  track: 'Weekly',
                },
                {
                  name: 'Execution Core',
                  requirement: '2주차 완료',
                  track: 'Weekly',
                },
                {
                  name: 'Build Expert',
                  requirement: '4주차 완료',
                  track: 'Weekly',
                },
                {
                  name: 'Daily Practitioner',
                  requirement: '5일 연속',
                  track: 'Daily',
                },
                {
                  name: 'Habit Maker',
                  requirement: '15일 연속',
                  track: 'Daily',
                },
                {
                  name: 'Short-form Final Winner',
                  requirement: '20일 연속',
                  track: 'Daily',
                },
              ].map((title, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-lg"
                >
                  <div>
                    <h3 className="text-body font-semibold text-gray-900">
                      {title.name}
                    </h3>
                    <p className="text-body-sm text-gray-600 mt-1">
                      달성 조건: {title.requirement}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      className={
                        title.track === 'Daily'
                          ? 'bg-primary/10 text-primary'
                          : 'bg-secondary/10 text-secondary'
                      }
                    >
                      {title.track}
                    </Badge>
                    <Button variant="outline" size="sm">
                      수정
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* General Settings */}
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-primary/10 rounded-lg p-2">
                <SettingsIcon className="h-5 w-5 text-primary" />
              </div>
              <h2 className="text-h4 font-heading text-gray-900">
                일반 설정
              </h2>
            </div>

            <div className="space-y-4">
              <div>
                <Label className="text-body">플랫폼 이름</Label>
                <Input
                  defaultValue="ASC 챌린지 인증 플랫폼"
                  className="mt-2"
                />
              </div>

              <div>
                <Label className="text-body">관리자 Discord ID</Label>
                <Input
                  defaultValue="admin#0001, admin#0002"
                  placeholder="쉼표로 구분하여 여러 ID 입력"
                  className="mt-2"
                />
              </div>

              <div>
                <Label className="text-body">탈락 기준 (Short-form)</Label>
                <Input
                  type="number"
                  defaultValue="5"
                  className="mt-2"
                />
                <p className="text-body-sm text-gray-500 mt-2">
                  미인증 횟수
                </p>
              </div>

              <div>
                <Label className="text-body">탈락 기준 (기타 트랙)</Label>
                <Input
                  type="number"
                  defaultValue="1"
                  className="mt-2"
                />
                <p className="text-body-sm text-gray-500 mt-2">
                  미인증 횟수
                </p>
              </div>

              <Button className="bg-primary hover:bg-primary-hover text-primary-foreground">
                <Save className="mr-2 h-4 w-4" />
                설정 저장
              </Button>
            </div>
          </Card>
        </div>
      </main>

      {/* Period Update Dialog */}
      <Dialog open={showPeriodDialog} onOpenChange={setShowPeriodDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>기수 기간 수정</DialogTitle>
            <DialogDescription>
              활성 기수의 시작일과 종료일을 수정합니다. 수정 즉시 인증 가능 기간이 변경됩니다.
            </DialogDescription>
          </DialogHeader>

          <Form {...periodForm}>
            <form onSubmit={periodForm.handleSubmit(handleUpdatePeriod)} className="space-y-4">
              <FormField
                control={periodForm.control}
                name="start_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>시작일 *</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        {...field}
                        disabled={isUpdatingPeriod}
                      />
                    </FormControl>
                    <FormDescription>
                      기수가 시작되는 날짜
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={periodForm.control}
                name="end_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>종료일 *</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        {...field}
                        disabled={isUpdatingPeriod}
                      />
                    </FormControl>
                    <FormDescription>
                      기수가 종료되는 날짜
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={periodForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>설명 (선택)</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="기수에 대한 설명을 입력하세요"
                        rows={3}
                        disabled={isUpdatingPeriod}
                      />
                    </FormControl>
                    <FormDescription>
                      기수에 대한 간단한 설명
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowPeriodDialog(false)}
                  disabled={isUpdatingPeriod}
                >
                  취소
                </Button>
                <Button
                  type="submit"
                  disabled={isUpdatingPeriod}
                  className="bg-primary hover:bg-primary-hover text-primary-foreground"
                >
                  {isUpdatingPeriod ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      수정 중...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      저장
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

