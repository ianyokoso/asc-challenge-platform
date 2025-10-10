'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { AdminSidebar } from '@/components/layout/admin-sidebar';
import {
  Save,
  Bell,
  Calendar,
  Award,
  Settings as SettingsIcon,
} from 'lucide-react';

export default function AdminSettingsPage() {
  const [discordWebhook, setDiscordWebhook] = useState(
    'https://discord.com/api/webhooks/...'
  );
  const [shortformMission, setShortformMission] = useState(
    '오늘 배운 것이나 경험한 것을 60초 이내의 숏폼 영상으로 제작하고 공유하세요.'
  );

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
    </div>
  );
}

