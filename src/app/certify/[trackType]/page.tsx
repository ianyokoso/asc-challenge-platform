  'use client';

  import { useState, useEffect } from 'react';
  import { useRouter, useParams } from 'next/navigation';
  import { Button } from '@/components/ui/button';
  import { Card } from '@/components/ui/card';
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
  import { Navbar } from '@/components/layout/navbar';
  import { Footer } from '@/components/layout/footer';
  import { CheckCircle2, Loader2, AlertCircle, Edit, Calendar as CalendarIcon } from 'lucide-react';
  import { getUser } from '@/lib/supabase/client';
  import { useUserTracks } from '@/hooks/useUserTracks';
  import { useActivePeriod, isWithinActivePeriod } from '@/hooks/useActivePeriod';
  import { submitCertification, getCertificationByDateAndTrack, getLastCertificationDate } from '@/lib/supabase/database';
  import { format, parseISO } from 'date-fns';
  import { ko } from 'date-fns/locale';
  import { getNow } from '@/lib/utils/demo-time';
  import { TrackType } from '@/lib/supabase/types';
import {
  getCertificationGuideMessage
} from '@/lib/utils/certificationDates';

  export default function TrackCertifyPage() {
    const router = useRouter();
    const params = useParams();
    const trackType = (params?.trackType as string) as TrackType;

    const [userId, setUserId] = useState<string | null>(null);
    const [certificationUrl, setCertificationUrl] = useState('');
    const [notes, setNotes] = useState('');
    const [certificationDate, setCertificationDate] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [lastCertDate, setLastCertDate] = useState<Date | undefined>();
    
    // Duplicate certification dialog
    const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);
    const [existingCertification, setExistingCertification] = useState<any | null>(null);
    const [isEditMode, setIsEditMode] = useState(false);
    
    // Period validation state
    const [isPeriodValid, setIsPeriodValid] = useState(true);
    const [periodValidationMessage, setPeriodValidationMessage] = useState<string | null>(null);

    // Get current user
    useEffect(() => {
      const fetchUser = async () => {
        const user = await getUser();
        setUserId(user?.id || null);
      };
      fetchUser();
    }, []);

    // Fetch user tracks
    const { data: userTracks, isLoading: tracksLoading } = useUserTracks(userId || undefined);

    // Fetch active period
    const { data: activePeriod, isLoading: periodLoading } = useActivePeriod();

    // Get track for this specific track type
    const currentTrack = userTracks?.find(ut => ut.track?.type === trackType);

    // Fetch last certification date for weekly tracks
    useEffect(() => {
      const fetchLastCert = async () => {
        if (!userId || !currentTrack?.track_id) return;
        
        try {
          const lastDate = await getLastCertificationDate(userId, currentTrack.track_id);
          setLastCertDate(lastDate || undefined);
        } catch (err) {
          console.error('Error fetching last certification date:', err);
        }
      };

      if (trackType !== 'short-form') {
        fetchLastCert();
      }
    }, [userId, currentTrack?.track_id, trackType]);

    // Set certification date to today only (anti-fraud measure)
    useEffect(() => {
      const today = format(new Date(), 'yyyy-MM-dd');
      setCertificationDate(today);
    }, []);


  // Validate today's date against active period
  useEffect(() => {
    if (activePeriod) {
      const today = new Date();
      const validation = localValidate(trackType, today, activePeriod, lastCertDate);
      setIsPeriodValid(validation.ok);
      setPeriodValidationMessage(validation.message ?? null);
      if (!validation.ok) {
        console.log('[CertifyPage] ⚠️ Period validation failed:', validation.message);
      }
    } else {
      // No active period - allow certification
      setIsPeriodValid(true);
      setPeriodValidationMessage(null);
    }
  }, [activePeriod, trackType, lastCertDate]);

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      
      if (!userId) {
        setError('로그인이 필요합니다.');
        return;
      }

      if (!currentTrack) {
        setError('등록된 트랙이 없습니다. 먼저 트랙을 선택해주세요.');
        return;
      }

      if (!certificationUrl.trim()) {
        setError('인증 URL을 입력해주세요.');
        return;
      }

      // Validate URL format
      try {
        new URL(certificationUrl);
      } catch {
        setError('올바른 URL 형식이 아닙니다. (예: https://example.com)');
        return;
      }

    // 당일 날짜 검증 (부정행위 방지)
    const today = new Date();
    const selectedDate = new Date(certificationDate);
    
    // 날짜가 당일이 아닌 경우 차단
    if (today.toDateString() !== selectedDate.toDateString()) {
      setError('부정행위 방지를 위해 당일 날짜로만 인증이 가능합니다.');
      return;
    }
    
    // 기간 및 트랙 규칙 검증
    const v = localValidate(trackType, today, activePeriod, lastCertDate);
    if (!v.ok) {
      setError(v.message || '오늘은 인증할 수 없는 날짜입니다.');
      return;
    }

      setIsSubmitting(true);
      setError(null);

      try {
        // Check for existing certification before submitting
        const existing = await getCertificationByDateAndTrack(
          userId,
          currentTrack.track_id,
          certificationDate
        );

        if (existing) {
          // Show duplicate dialog
          setExistingCertification(existing);
          setShowDuplicateDialog(true);
          setIsSubmitting(false);
          return;
        }

        console.log('[CertifyPage] 🚀 Submitting certification...');
        const result = await submitCertification({
          user_id: userId,
          track_id: currentTrack.track_id,
          user_track_id: currentTrack.id,
          certification_url: certificationUrl.trim(),
          certification_date: certificationDate,
        });

        if (result) {
          console.log('[CertifyPage] ✅ Certification submitted successfully:', result.id);
          // Success! Navigate to success page
          router.push('/certify/success');
        } else {
          console.error('[CertifyPage] ❌ Certification submission returned null');
          setError('인증 제출에 실패했습니다. 다시 시도해주세요.');
        }
      } catch (err: any) {
        console.error('[CertifyPage] ❌ Certification submission error:', err);
        setError(err.message || '인증 제출 중 오류가 발생했습니다.');
      } finally {
        console.log('[CertifyPage] 🔄 Setting isSubmitting to false');
        setIsSubmitting(false);
      }
    };

    // Handle edit mode
    const handleEditMode = () => {
      if (existingCertification) {
        setCertificationUrl(existingCertification.certification_url);
        setIsEditMode(true);
      }
      setShowDuplicateDialog(false);
    };

    // Handle cancel edit
    const handleCancelEdit = () => {
      setShowDuplicateDialog(false);
      router.push('/calendar');
    };

    // Not logged in
    if (!userId && !tracksLoading) {
      return (
        <>
          <Navbar />
          <main className="min-h-screen py-12 px-4 bg-gray-50 flex items-center justify-center">
            <Card className="p-8 text-center">
              <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
              <h2 className="text-h4 font-heading text-gray-900 mb-2">로그인이 필요합니다</h2>
              <p className="text-body text-gray-600 mb-6">
                인증 페이지에 접근하려면 먼저 로그인해주세요.
              </p>
              <Button onClick={() => router.push('/login')}>로그인 페이지로 이동</Button>
            </Card>
          </main>
          <Footer />
        </>
      );
    }

    // Loading tracks
    if (tracksLoading) {
      return (
        <>
          <Navbar />
          <main className="min-h-screen py-12 px-4 bg-gray-50 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-3 text-body text-gray-700">트랙 정보를 불러오는 중...</span>
          </main>
          <Footer />
        </>
      );
    }

    // Not enrolled in this track
    if (!currentTrack) {
      return (
        <>
          <Navbar />
          <main className="min-h-screen py-12 px-4 bg-gray-50 flex items-center justify-center">
            <Card className="p-8 text-center max-w-md">
              <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
              <h2 className="text-2xl font-semibold text-gray-900 mb-2">참여 중인 트랙이 없습니다</h2>
              <p className="text-lg text-gray-600 mb-6">
                관리자에게 트랙 배정을 요청해주세요.
              </p>
              <Button onClick={() => router.push('/contact-admin')}>관리자 문의하기</Button>
            </Card>
          </main>
          <Footer />
        </>
      );
    }

    return (
      <>
        <Navbar />
        
        {/* Duplicate Certification Dialog */}
        <Dialog open={showDuplicateDialog} onOpenChange={setShowDuplicateDialog}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                이미 인증이 완료되었습니다
              </DialogTitle>
              <DialogDescription>
                {format(parseISO(certificationDate), 'yyyy년 M월 d일 (EEE)', { locale: ko })}에 이미 인증을 완료했습니다.
              </DialogDescription>
            </DialogHeader>

            {existingCertification && (
              <div className="py-4">
                <Card className="p-4 bg-gray-50">
                  <p className="text-body-sm text-gray-600 mb-2">기존 인증 URL</p>
                  <a 
                    href={existingCertification.certification_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-body text-primary hover:underline break-all"
                  >
                    {existingCertification.certification_url}
                  </a>
                  <p className="text-body-xs text-gray-500 mt-3">
                    제출 시각: {format(parseISO(existingCertification.created_at), 'HH:mm', { locale: ko })}
                  </p>
                </Card>
              </div>
            )}

            <DialogDescription className="text-body-sm">
              인증 내용을 수정하시겠습니까?
            </DialogDescription>

            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button
                variant="outline"
                onClick={handleCancelEdit}
                className="w-full sm:w-auto"
              >
                캘린더로 이동
              </Button>
              <Button
                onClick={handleEditMode}
                className="w-full sm:w-auto"
              >
                <Edit className="mr-2 h-4 w-4" />
                수정하기
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <main className="min-h-screen py-12 px-4 bg-gray-50">
          <div className="container mx-auto max-w-2xl">
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-h2 font-heading text-gray-900 mb-2">
                {currentTrack.track?.name} 인증
              </h1>
              <p className="text-body text-gray-600">
                {getCertificationGuideMessage(trackType)}
              </p>
            </div>

            {/* Active Period Info */}
            {activePeriod && (
              <Card className="p-4 mb-6 bg-blue-50 border-blue-200">
                <div className="flex items-center gap-3">
                  <div className="bg-blue-500 text-white rounded-full w-10 h-10 flex items-center justify-center font-bold">
                    {activePeriod.term_number}기
                  </div>
                  <div>
                    <p className="text-body-sm font-medium text-gray-900">
                      현재 진행 중인 기수
                    </p>
                    <p className="text-body-xs text-gray-600">
                      {format(new Date(activePeriod.start_date), 'yyyy.MM.dd', { locale: ko })} ~ {format(new Date(activePeriod.end_date), 'yyyy.MM.dd', { locale: ko })}
                    </p>
                  </div>
                </div>
              </Card>
            )}

            {/* Track Info */}
            <Card className="p-6 mb-6 bg-gradient-to-r from-primary/10 to-secondary/10 border-primary/20">
              <div className="flex items-start gap-4">
                <CalendarIcon className="h-8 w-8 text-primary flex-shrink-0 mt-1" />
                <div>
                  <h3 className="text-h5 font-heading text-gray-900 mb-2">
                    {currentTrack.track?.name}
                  </h3>
                  <p className="text-body-sm text-gray-600 mb-3">
                    {currentTrack.track?.description}
                  </p>
                  {lastCertDate && trackType !== 'short-form' && (
                    <p className="text-body-sm text-primary font-medium">
                      마지막 인증: {format(lastCertDate, 'yyyy년 M월 d일 (EEE)', { locale: ko })}
                    </p>
                  )}
                </div>
              </div>
            </Card>

            {/* Certification Form */}
            <Card className="p-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-h4 font-heading text-gray-900">
                  {isEditMode ? '인증 수정하기' : '챌린지 인증하기'}
                </h2>
                {isEditMode && (
                  <span className="text-body-sm text-primary bg-primary/10 px-3 py-1 rounded-full">
                    수정 모드
                  </span>
                )}
              </div>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Date - 당일로 고정 */}
                <div>
                  <Label className="text-body font-medium text-gray-900">
                    인증 날짜
                  </Label>
                  <div className="mt-2 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                    <div className="flex items-center gap-2">
                      <CalendarIcon className="h-5 w-5 text-gray-600" />
                      <span className="text-body font-medium text-gray-900">
                        {format(new Date(), 'yyyy년 MM월 dd일 (EEE)', { locale: ko })}
                      </span>
                      <span className="text-body-sm text-gray-500">
                        (당일만 인증 가능)
                      </span>
                    </div>
                  </div>
                  <p className="text-body-sm text-gray-500 mt-1">
                    부정행위 방지를 위해 당일 날짜로만 인증이 가능합니다.
                  </p>
                </div>

                {/* URL */}
                <div>
                  <Label htmlFor="url" className="text-body font-medium text-gray-900">
                    인증 URL *
                  </Label>
                  <Input
                    id="url"
                    type="url"
                    placeholder="https://example.com/your-work"
                    value={certificationUrl}
                    onChange={(e) => setCertificationUrl(e.target.value)}
                    required
                    className="mt-2"
                  />
                  <p className="text-body-sm text-gray-500 mt-1">
                    챌린지 결과물의 URL을 입력하세요 (예: YouTube, Medium, GitHub 등)
                  </p>
                </div>

                {/* Notes (Optional) */}
                <div>
                  <Label htmlFor="notes" className="text-body font-medium text-gray-900">
                    메모 (선택)
                  </Label>
                  <Textarea
                    id="notes"
                    placeholder="추가적인 메모를 남겨주세요."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    className="mt-2"
                  />
                </div>

                {/* Error Message */}
                {error && (
                  <div className="p-4 bg-destructive/10 border border-destructive/30 rounded-lg">
                    <p className="text-body-sm text-destructive flex items-center gap-2">
                      <AlertCircle className="h-4 w-4" />
                      {error}
                    </p>
                  </div>
                )}

                {/* Submit Button */}
                <div className="space-y-3">
                  {/* Period validation info for disabled button */}
                  {!isPeriodValid && periodValidationMessage && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-body-sm text-red-800 font-medium flex items-center gap-2">
                        <AlertCircle className="h-4 w-4" />
                        인증 불가: {periodValidationMessage}
                      </p>
                      <p className="text-body-xs text-red-700 mt-1">
                        다른 날짜를 선택하거나 활성 기수 기간을 확인해주세요.
                      </p>
                    </div>
                  )}
                  
                  <div className="flex gap-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => router.back()}
                      disabled={isSubmitting}
                      className="flex-1"
                    >
                      취소
                    </Button>
                    <Button
                      type="submit"
                      disabled={isSubmitting || !isPeriodValid}
                      className="flex-1 bg-primary hover:bg-primary-hover text-primary-foreground disabled:opacity-50 disabled:cursor-not-allowed"
                      title={!isPeriodValid ? periodValidationMessage || '인증 불가능한 기간입니다' : undefined}
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          {isEditMode ? '수정 중...' : '제출 중...'}
                        </>
                      ) : (
                        <>
                          {isEditMode ? (
                            <>
                              <Edit className="h-4 w-4 mr-2" />
                              인증 수정하기
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="h-4 w-4 mr-2" />
                              인증하기
                            </>
                          )}
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </form>
            </Card>

            {/* Tips */}
            <Card className="p-6 mt-6 bg-gray-100 border-gray-200">
              <h3 className="text-h5 font-heading text-gray-900 mb-3">
                💡 챌린지 인증 팁
              </h3>
              <ul className="list-disc list-inside space-y-2 text-body-sm text-gray-700">
                <li>
                  인증 URL은 공개적으로 접근 가능한 링크여야 합니다.
                </li>
                {trackType === 'short-form' && (
                  <li>
                    평일(월~금) 매일 인증하여 연속 기록을 쌓으세요!
                  </li>
                )}
                {trackType !== 'short-form' && (
                  <li>
                    마감일 1주일 전부터 미리 인증할 수 있습니다.
                  </li>
                )}
                <li>
                  궁금한 점은 Discord 커뮤니티에 문의해주세요.
                </li>
              </ul>
            </Card>
          </div>
        </main>
        <Footer />
      </>
    );
  }

// ---------- 로컬 검증 유틸(이 파일 안에서만 사용) ----------
type ActivePeriod = { start_date: string | Date; end_date: string | Date; term_number?: number };

const DAY = 24 * 60 * 60 * 1000;
const KST_OFFSET = 9 * 60 * 60 * 1000;
const toKST = (d: Date | string) => new Date((typeof d === 'string' ? new Date(d) : d).getTime() + KST_OFFSET);
const startOfDayKST = (d: Date | string) => {
  const k = toKST(d);
  return new Date(Date.UTC(k.getUTCFullYear(), k.getUTCMonth(), k.getUTCDate()));
};
const addDaysKST = (d: Date | string, days: number) => new Date(startOfDayKST(d).getTime() + days * DAY);
const getKSTDay = (d: Date | string) => toKST(d).getUTCDay(); // 0=일,1=월,2=화...
const alignToSundayKST = (d: Date | string) => addDaysKST(d, -getKSTDay(d));
const alignToWeekdayKST = (d: Date | string, weekday: number) => addDaysKST(alignToSundayKST(d), weekday);

function withinCohortKST(date: Date, ap?: ActivePeriod | null) {
  if (!ap) return true;
  const s = startOfDayKST(ap.start_date);
  const e = startOfDayKST(ap.end_date);
  const d = startOfDayKST(date);
  return d.getTime() >= s.getTime() && d.getTime() <= e.getTime();
}

function localValidate(
  track: TrackType,
  certDate: Date,
  activePeriod?: ActivePeriod | null,
  _lastCertDate?: Date
): { ok: boolean; message?: string } {
  // 1) 기수 범위 우선
  if (!withinCohortKST(certDate, activePeriod)) {
    return { ok: false, message: '현재 진행 중인 기수 기간 밖의 날짜입니다.' };
  }

  const dow = getKSTDay(certDate);

  // 2) 트랙별 규칙
  if (track === 'short-form') {
    // 월~금만
    if (dow === 0 || dow === 6) {
      return { ok: false, message: '숏폼 트랙은 주말(토·일) 인증이 불가합니다.' };
    }
    return { ok: true };
  }

  if (track === 'sales') {
    // 세일즈 트랙: 기수 기간 내에서만 인증 가능 (매주 화요일 마감)
    const c = startOfDayKST(certDate);
    const dow = getKSTDay(certDate); // 0=일, 1=월, 2=화, 3=수, 4=목, 5=금, 6=토
    
    // 기수 시작일 이후부터만 인증 가능
    if (activePeriod) {
      const cohortStart = startOfDayKST(activePeriod.start_date);
      if (c.getTime() < cohortStart.getTime()) {
        return { ok: false, message: '세일즈 트랙은 기수 시작일 이후부터 인증할 수 있습니다.' };
      }
    }
    
    // 주간 트랙이므로 특별한 요일 제한은 없음 (기수 기간 내에서만)
    return { ok: true };
  }

  // long-form / builder 등: 필요 시 동일 패턴으로 분기 추가
  return { ok: true };
}