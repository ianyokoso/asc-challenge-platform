'use client';

import { User, UserTrack } from '@/lib/supabase/types';
import { EmptyState } from './EmptyState';
import { UsersTableComponent } from './UsersTableComponent';

interface UsersTableProps {
  users: (User & { user_tracks: UserTrack[] })[];
  onManageClick: (user: User) => void;
}

export const UsersTable = ({
  users,
  onManageClick,
}: UsersTableProps) => {
  if (users.length === 0) {
    return <EmptyState />;
  }

  return <UsersTableComponent users={users} onManageClick={onManageClick} />;
};
