'use client';

import { User, UserTrack } from '@/lib/supabase/types';
import { EmptyState } from './EmptyState';
import { UsersTable } from './UsersTable';

interface UsersTableFeatureProps {
  users: (User & { user_tracks: UserTrack[] })[];
  onManageClick: (user: User) => void;
}

export const UsersTableFeature = ({
  users,
  onManageClick,
}: UsersTableFeatureProps) => {
  if (users.length === 0) {
    return <EmptyState />;
  }

  return <UsersTable users={users} onManageClick={onManageClick} />;
};
