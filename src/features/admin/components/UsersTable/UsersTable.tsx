'use client';

import { User, UserTrack } from '@/lib/supabase/types';
import { UsersTableRow } from './UsersTableRow';

interface UsersTableProps {
  users: (User & { user_tracks: UserTrack[] })[];
  onManageClick: (user: User) => void;
}

export const UsersTable = ({ users, onManageClick }: UsersTableProps) => (
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
        {users.map((user) => (
          <UsersTableRow
            key={user.id}
            user={user}
            onManageClick={onManageClick}
          />
        ))}
      </tbody>
    </table>
  </div>
);
