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
import { submitCertification, getCertificationByDateAndTrack, getLastCertificationDate } from '@/lib/supabase/database';
import { format, parseISO } from 'date-fns';
import { ko } from 'date-fns/locale';
import { TrackType } from '@/lib/supabase/types';
import { 
  getDefaultCertificationDate, 
  canCertifyForDate,
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

  // Set default certification date
  useEffect(() => {
    if (trackType && !certificationDate) {
      const defaultDate = getDefaultCertificationDate(trackType, lastCertDate);
      setCertificationDate(format(defaultDate, 'yyyy-MM-dd'));
    }
  }, [trackType, lastCertDate, certificationDate]);

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

    // Check if certification date is valid for this track type
    const targetDate = new Date(certificationDate);
    if (!canCertifyForDate(trackType, targetDate, lastCertDate)) {
      setError('이 날짜에는 인증할 수 없습니다. 인증 가능 기간을 확인해주세요.');
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
          <Card className="p-8 text-center">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h2 className="text-h4 font-heading text-gray-900 mb-2">이 트랙에 등록되지 않았습니다</h2>
            <p className="text-body text-gray-600 mb-6">
              {trackType} 트랙을 시작하려면 먼저 등록해주세요.
            </p>
            <Button onClick={() => router.push('/tracks')}>트랙 선택하기</Button>
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
              {/* Date */}
              <div>
                <Label htmlFor="date" className="text-body font-medium text-gray-900">
                  인증 날짜
                </Label>
                <Input
                  id="date"
                  type="date"
                  value={certificationDate}
                  onChange={(e) => setCertificationDate(e.target.value)}
                  max={trackType === 'short-form' ? format(new Date(), 'yyyy-MM-dd') : undefined}
                  required
                  className="mt-2"
                />
                <p className="text-body-sm text-gray-500 mt-1">
                  {certificationDate && format(new Date(certificationDate), 'yyyy년 MM월 dd일 (EEE)', { locale: ko })}
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
                  disabled={isSubmitting}
                  className="flex-1 bg-primary hover:bg-primary-hover text-primary-foreground"
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

