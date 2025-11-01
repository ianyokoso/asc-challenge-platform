'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AdminPageGuard } from '@/components/guards/AdminPageGuard';

/**
 * 관리자 메인 페이지 - 인증 현황으로 리다이렉트
 */
function AdminRedirect() {
  const router = useRouter();

  useEffect(() => {
    // 관리자 페이지 진입 시 인증 현황으로 자동 이동
    router.replace('/admin/tracking');
  }, [router]);

  return null;
}

export default function AdminPage() {
  return (
    <AdminPageGuard>
      <AdminRedirect />
    </AdminPageGuard>
  );
}