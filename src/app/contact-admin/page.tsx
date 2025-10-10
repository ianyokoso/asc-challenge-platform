'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, Mail, MessageCircle } from 'lucide-react';
import { getUser } from '@/lib/supabase/client';
import { getUserTracks } from '@/lib/supabase/database';
import { useUserAccess } from '@/hooks/useUserAccess';

export default function ContactAdminPage() {
  const router = useRouter();
  const { userId, hasAssignedTracks, isLoading } = useUserAccess();
  const [userEmail, setUserEmail] = useState<string>('');

  useEffect(() => {
    const fetchUserEmail = async () => {
      if (userId) {
        const user = await getUser();
        setUserEmail(user?.email || '');
      }
    };
    
    fetchUserEmail();
  }, [userId]);

  // 로딩 중이거나 이미 트랙이 배정된 경우 리다이렉트
  useEffect(() => {
    if (!isLoading) {
      if (hasAssignedTracks) {
        router.push('/certify');
      } else if (!userId) {
        router.push('/login');
      }
    }
  }, [isLoading, hasAssignedTracks, userId, router]);

  const handleBackToHome = () => {
    router.push('/');
  };

  const handleLogin = () => {
    router.push('/login');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">확인 중...</p>
        </div>
      </div>
    );
  }

  if (!userId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-gray-800">로그인이 필요합니다</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-600 text-center">
              관리자 문의를 위해서는 먼저 로그인해주세요.
            </p>
            <Button onClick={handleLogin} className="w-full">
              로그인하기
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader className="text-center pb-6">
            <div className="mx-auto mb-4 flex items-center justify-center w-16 h-16 bg-yellow-100 rounded-full">
              <AlertCircle className="w-8 h-8 text-yellow-600" />
            </div>
            <CardTitle className="text-2xl font-bold text-gray-800">
              트랙 배정 대기 중
            </CardTitle>
            <p className="text-gray-600 mt-2">
              아직 배정된 트랙이 없습니다. 관리자에게 문의해주세요.
            </p>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <MessageCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-blue-900 mb-2">관리자에게 문의하기</h3>
                  <p className="text-blue-800 text-sm">
                    트랙 배정을 위해 관리자에게 연락해주세요. 
                    관리자가 트랙을 배정해드릴 때까지 잠시 기다려주세요.
                  </p>
                </div>
              </div>
            </div>

            {userEmail && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <div className="flex items-center space-x-3">
                  <Mail className="w-5 h-5 text-gray-600" />
                  <div>
                    <p className="text-sm text-gray-600">로그인된 계정</p>
                    <p className="font-medium text-gray-900">{userEmail}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-yellow-900 mb-2">안내사항</h3>
                  <ul className="text-yellow-800 text-sm space-y-1">
                    <li>• 관리자가 트랙을 배정하면 자동으로 인증 페이지로 이동됩니다</li>
                    <li>• 트랙 배정 후에는 해당 트랙의 미션을 수행할 수 있습니다</li>
                    <li>• 문의사항이 있으시면 관리자에게 직접 연락해주세요</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="flex space-x-3 pt-4">
              <Button 
                variant="outline" 
                onClick={handleBackToHome}
                className="flex-1"
              >
                홈으로 돌아가기
              </Button>
              <Button 
                onClick={() => window.location.reload()}
                className="flex-1"
              >
                새로고침
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
