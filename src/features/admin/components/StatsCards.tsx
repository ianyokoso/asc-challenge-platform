'use client';

import { Card } from '@/components/ui/card';

interface StatsCardsProps {
  totalUsers: number;
  filteredUsers: number;
  activeUsers: number;
}

export function StatsCards({ totalUsers, filteredUsers, activeUsers }: StatsCardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <Card className="p-4">
        <h3 className="text-body-sm text-gray-600 mb-1">전체 사용자</h3>
        <p className="text-h3 font-heading text-primary">
          {totalUsers}
        </p>
      </Card>
      <Card className="p-4">
        <h3 className="text-body-sm text-gray-600 mb-1">검색 결과</h3>
        <p className="text-h3 font-heading text-secondary">
          {filteredUsers}
        </p>
      </Card>
      <Card className="p-4">
        <h3 className="text-body-sm text-gray-600 mb-1">활성 사용자</h3>
        <p className="text-h3 font-heading text-accent">
          {activeUsers}
        </p>
      </Card>
    </div>
  );
}

