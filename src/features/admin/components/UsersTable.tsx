'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Settings, Search } from 'lucide-react';

interface UsersTableProps {
  users: any[];
  onManageClick: (user: any) => void;
}

export function UsersTable({ users, onManageClick }: UsersTableProps) {
  if (users.length === 0) {
    return (
      <div className="text-center py-12">
        <Search className="h-12 w-12 text-gray-400 mx-auto mb-3" />
        <p className="text-body text-gray-600">
          검색 결과가 없습니다
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b">
            <th className="text-left py-3 px-4 text-body-sm font-semibold text-gray-700">
              사용자
            </th>
            <th className="text-left py-3 px-4 text-body-sm font-semibold text-gray-700">
              트랙
            </th>
            <th className="text-center py-3 px-4 text-body-sm font-semibold text-gray-700">
              경고
            </th>
            <th className="text-center py-3 px-4 text-body-sm font-semibold text-gray-700">
              상태
            </th>
            <th className="text-center py-3 px-4 text-body-sm font-semibold text-gray-700">
              작업
            </th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => {
            const userTrack = user.user_tracks?.[0];
            
            return (
              <tr key={user.id} className="border-b hover:bg-gray-50">
                <td className="py-4 px-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage
                        src={user.discord_avatar_url || undefined}
                        alt={user.discord_username}
                      />
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        {user.discord_username?.[0]?.toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-body font-medium text-gray-900">
                        {user.discord_username}
                      </p>
                      <p className="text-body-sm text-gray-500">
                        {user.discord_id}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="py-4 px-4">
                  <div className="flex flex-wrap gap-1">
                    {user.user_tracks && user.user_tracks.length > 0 ? (
                      user.user_tracks
                        .filter((ut: any) => ut.is_active)
                        .map((ut: any) => (
                          <Badge key={ut.id} className="bg-primary/10 text-primary text-xs">
                            {ut.track?.name || '트랙'}
                          </Badge>
                        ))
                    ) : (
                      <Badge className="bg-gray-100 text-gray-600 text-xs">
                        트랙 추가 대기중
                      </Badge>
                    )}
                  </div>
                </td>
                <td className="py-4 px-4 text-center">
                  {userTrack && userTrack.dropout_warnings > 0 ? (
                    <Badge className="bg-destructive/10 text-destructive">
                      {userTrack.dropout_warnings}회
                    </Badge>
                  ) : (
                    <span className="text-body-sm text-gray-500">-</span>
                  )}
                </td>
                <td className="py-4 px-4 text-center">
                  {user.is_active ? (
                    <Badge className="bg-green-100 text-green-700">
                      활성
                    </Badge>
                  ) : (
                    <Badge className="bg-gray-200 text-gray-700">
                      비활성
                    </Badge>
                  )}
                </td>
                <td className="py-4 px-4 text-center">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onManageClick(user)}
                  >
                    <Settings className="h-4 w-4 mr-1" />
                    관리
                  </Button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

