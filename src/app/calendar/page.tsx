'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import {
  CertificationCalendar,
  type CertificationRecord,
} from '@/components/CertificationCalendar';
import { Calendar as CalendarIcon, CheckCircle2, Award, Loader2 } from 'lucide-react';
import { getUser } from '@/lib/supabase/client';
import { useUserTracks } from '@/hooks/useUserTracks';
import { useCalendarCertifications, useUserStats } from '@/hooks/useCertifications';
import { useActivePeriod } from '@/hooks/useActivePeriod';

export default function CalendarPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [selectedTrackId, setSelectedTrackId] = useState<string>('');
  const [currentDate, setCurrentDate] = useState(new Date());

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
  
  // Auto-select first track if not selected (prioritize ORDER)
  useEffect(() => {
    if (userTracks && userTracks.length > 0 && !selectedTrackId) {
      const ORDER = ["short-form", "long-form", "builder", "sales"];
      const sortedTracks = userTracks.sort((a, b) => {
        const aIndex = ORDER.indexOf(a.track?.type || '');
        const bIndex = ORDER.indexOf(b.track?.type || '');
        return aIndex - bIndex;
      });
      setSelectedTrackId(sortedTracks[0].track_id);
    }
  }, [userTracks, selectedTrackId]);
  
  // Get selected track
  const selectedTrack = userTracks?.find(ut => ut.track_id === selectedTrackId);
  
  // Fetch calendar certifications for current month
  const { data: calendarData, isLoading: calendarLoading } = useCalendarCertifications(
    userId || undefined,
    selectedTrackId || undefined,
    currentDate.getFullYear(),
    currentDate.getMonth() + 1
  );

  // Fetch user stats
  const { streak, totalCertifications, isLoading: statsLoading } = useUserStats(
    userId || undefined,
    selectedTrackId || undefined
  );

  // Convert calendar data to CertificationRecord format
  const certificationRecords: CertificationRecord[] = useMemo(() => {
    console.log('[CalendarPage] 📅 Calendar data:', calendarData);
    const records = calendarData?.map(item => ({
      date: item.date,
      certified: item.certified,
    })) || [];
    console.log('[CalendarPage] 📊 Certification records:', records);
    return records;
  }, [calendarData]);

  // Handler for when a certified date is clicked
  const handleDateClick = (date: string) => {
    console.log('Clicked date:', date);
    router.push(`/certify?date=${date}`);
  };

  const isLoading = tracksLoading || calendarLoading || statsLoading || periodLoading;

  return (
    <>
      <Navbar />
      <main className="min-h-screen py-12 px-4">
        <div className="container mx-auto max-w-6xl">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-h2 font-heading text-gray-900 mb-2">
              챌린지 캘린더
            </h1>
            <p className="text-body text-gray-600">
              나의 챌린지 진행 상황을 한눈에 확인하세요
            </p>
          </div>

          {/* Not logged in */}
          {!userId && !isLoading && (
            <Card className="p-12 text-center">
              <CalendarIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-h4 font-heading text-gray-900 mb-2">
                로그인이 필요합니다
              </h3>
              <p className="text-body text-gray-600 mb-6">
                캘린더를 보려면 로그인해주세요
              </p>
              <Button asChild>
                <Link href="/login">로그인하기</Link>
              </Button>
            </Card>
          )}

          {/* No tracks enrolled */}
          {userId && !isLoading && (!userTracks || userTracks.length === 0) && (
            <Card className="p-12 text-center">
              <CalendarIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-h4 font-heading text-gray-900 mb-2">
                등록된 트랙이 없습니다
              </h3>
              <p className="text-body text-gray-600 mb-6">
                트랙을 선택하고 챌린지를 시작해보세요
              </p>
              <Button asChild>
                <Link href="/contact-admin">관리자에게 문의</Link>
              </Button>
            </Card>
          )}

          {/* Loading */}
          {isLoading && (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}

          {/* Calendar View */}
          {userId && !isLoading && userTracks && userTracks.length > 0 && (
            <>
              {/* Track Selection */}
              <Card className="p-6 mb-6">
                <Label htmlFor="calendar-track-select" className="text-body font-medium text-gray-900 mb-2 block">
                  트랙 선택
                </Label>
                <Select value={selectedTrackId} onValueChange={setSelectedTrackId}>
                  <SelectTrigger id="calendar-track-select" className="w-full">
                    <SelectValue placeholder="트랙을 선택하세요" />
                  </SelectTrigger>
                  <SelectContent>
                    {userTracks
                      .sort((a, b) => {
                        const ORDER = ["short-form", "long-form", "builder", "sales"];
                        const aIndex = ORDER.indexOf(a.track?.type || '');
                        const bIndex = ORDER.indexOf(b.track?.type || '');
                        return aIndex - bIndex;
                      })
                      .map((ut) => (
                        <SelectItem key={ut.track_id} value={ut.track_id}>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{ut.track?.name}</span>
                            <span className="text-gray-500 text-sm">
                              ({ut.track?.type})
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                {selectedTrack && (
                  <p className="text-body-sm text-gray-600 mt-3">
                    {selectedTrack.track?.description}
                  </p>
                )}
              </Card>

              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Calendar (Main) */}
                <div className="lg:col-span-3">
                  <Card className="p-6">
                    <div className="mb-4">
                      <h3 className="text-h5 font-heading text-gray-900 mb-2">
                        {selectedTrack?.track?.name || '트랙'} 인증 캘린더
                      </h3>
                      <p className="text-body-sm text-gray-600">
                        날짜를 클릭하면 해당 날짜의 인증 내역을 확인하거나 수정할 수 있습니다.
                      </p>
                  </div>
                  <CertificationCalendar
                    records={certificationRecords}
                    track={selectedTrack?.track?.type as any || 'short-form'}
                    onDateClick={handleDateClick}
                    initialMonth={currentDate}
                    activePeriod={activePeriod}
                  />
                </Card>
              </div>

              {/* Sidebar Stats */}
              <div className="lg:col-span-1 space-y-6">
                {/* Current Streak */}
                <Card className="p-6">
                  <h3 className="text-h5 font-heading text-gray-900 mb-4">
                    현재 연속 인증
                  </h3>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 text-secondary">
                      <CalendarIcon className="w-5 h-5" />
                      <span className="text-body text-gray-700">연속 인증일</span>
                    </div>
                    <span className="text-h4 font-heading text-primary">{streak}일</span>
                  </div>
                </Card>

                {/* Total Certifications */}
                <Card className="p-6">
                  <h3 className="text-h5 font-heading text-gray-900 mb-4">
                    총 인증 횟수
                  </h3>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 text-secondary">
                      <CheckCircle2 className="w-5 h-5" />
                      <span className="text-body text-gray-700">완료한 챌린지</span>
                    </div>
                    <span className="text-h4 font-heading text-primary">{totalCertifications}회</span>
                  </div>
                </Card>

                {/* Action Button */}
                <Card className="p-6 bg-gradient-to-br from-primary/10 to-secondary/10 border-primary/20">
                  <h3 className="text-h5 font-heading text-gray-900 mb-4">
                    오늘 인증하기
                  </h3>
                  <p className="text-body-sm text-gray-600 mb-4">
                    오늘의 챌린지를 인증하고 연속 기록을 이어가세요!
                  </p>
                  <Button asChild className="w-full">
                    <Link href="/certify">지금 인증하기</Link>
                  </Button>
                </Card>
              </div>
              </div>
            </>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
