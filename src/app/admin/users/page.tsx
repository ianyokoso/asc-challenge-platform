'use client';

import { useState, useEffect, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AdminSidebar } from '@/components/layout/admin-sidebar';
import { TrackAssignmentDialog } from '@/features/admin/components/TrackAssignmentDialog';
import { UsersTable } from '@/features/admin/components/UsersTable';
import { StatsCards } from '@/features/admin/components/StatsCards';
import { TrackFilterButtons } from '@/features/admin/components/TrackFilterButtons';
import {
  Search,
  Link2,
  Loader2,
  ShieldAlert,
  Download,
  UserPlus,
} from 'lucide-react';
import { getUser } from '@/lib/supabase/client';
import { useIsAdmin } from '@/hooks/useAdmin';
import { useRouter } from 'next/navigation';
import { getAllTracks } from '@/lib/supabase/database';
import { assignUserToTracks, getUsersWithTracks } from '@/lib/supabase/admin';
import { useToast } from '@/hooks/use-toast';

export default function AdminUsersPage() {
  const router = useRouter();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [userId, setUserId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTrack, setFilterTrack] = useState<string>('all');
  const [copied, setCopied] = useState(false);
  
  // Track assignment state
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [allTracks, setAllTracks] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);

  // Get current user
  useEffect(() => {
    const fetchUser = async () => {
      const user = await getUser();
      setUserId(user?.id || null);
    };
    fetchUser();
  }, []);

  // Check if user is admin
  const { data: isAdmin, isLoading: adminLoading } = useIsAdmin(userId || undefined);
  
  // Fetch all users with tracks
  useEffect(() => {
    const fetchData = async () => {
      setUsersLoading(true);
      const usersData = await getUsersWithTracks();
      const tracksData = await getAllTracks();
      setUsers(usersData);
      setAllTracks(tracksData);
      setUsersLoading(false);
    };
    
    if (isAdmin) {
      fetchData();
    }
  }, [isAdmin]);

  const isLoading = adminLoading || usersLoading;

  // Redirect if not admin
  useEffect(() => {
    if (!adminLoading && userId && isAdmin === false) {
      router.push('/');
    }
  }, [isAdmin, adminLoading, userId, router]);

  // Filter users
  const filteredUsers = useMemo(() => {
    if (!users) return [];
    
    return users.filter((user) => {
      const matchesSearch =
        user.discord_username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.discord_id?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesTrack =
        filterTrack === 'all' ||
        user.user_tracks?.some((ut: any) => ut.track?.type === filterTrack);
      
      return matchesSearch && matchesTrack;
    });
  }, [users, searchQuery, filterTrack]);

  // Copy invite link
  const handleCopyInviteLink = () => {
    const inviteUrl = `${window.location.origin}/login`;
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Export to CSV
  const handleExportCSV = () => {
    if (!filteredUsers.length) return;

    const headers = ['사용자명', 'Discord ID', '트랙', '경고', '상태', '가입일'];
    const rows = filteredUsers.map(user => {
      const userTrack = user.user_tracks?.[0];
      return [
        user.discord_username || '',
        user.discord_id || '',
        userTrack?.track?.name || '미등록',
        userTrack?.dropout_warnings || 0,
        user.is_active ? '활성' : '비활성',
        new Date(user.created_at).toLocaleDateString('ko-KR'),
      ];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(',')),
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `users_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  // Open track assignment dialog
  const handleOpenAssignDialog = (user: any) => {
    setSelectedUser(user);
    setIsAssignDialogOpen(true);
  };

  // Save track assignment
  const handleSaveTrackAssignment = async (trackIds: string[]) => {
    if (!selectedUser) return;
    
    console.log(`[handleSaveTrackAssignment] Assigning tracks to ${selectedUser.discord_username}:`, trackIds);
    
    try {
      await assignUserToTracks(selectedUser.id, trackIds);
      
      const message = trackIds.length > 0 
        ? `${selectedUser.discord_username}에게 ${trackIds.length}개의 트랙이 배정되었습니다.`
        : `${selectedUser.discord_username}의 모든 트랙이 제거되었습니다. (트랙 추가 대기중)`;
        
      toast({
        title: '트랙 배정 완료',
        description: message,
      });
      
      // React Query 캐시 무효화로 자동 갱신
      console.log('[handleSaveTrackAssignment] Invalidating React Query cache...');
      
      // 인증 추적 관련 쿼리들 무효화
      queryClient.invalidateQueries({
        queryKey: ['certification-tracking'],
      });
      
      // 사용자 관련 쿼리들 무효화
      queryClient.invalidateQueries({
        queryKey: ['users-with-tracks'],
      });
      
      // 트랙 관련 쿼리들 무효화
      queryClient.invalidateQueries({
        queryKey: ['tracks'],
      });
      
      // 사용자 트랙 관련 쿼리들 무효화
      queryClient.invalidateQueries({
        queryKey: ['user-tracks'],
      });
      
      console.log('[handleSaveTrackAssignment] Cache invalidation completed');
      
      // Refresh users list
      console.log('[handleSaveTrackAssignment] Refreshing users list...');
      const usersData = await getUsersWithTracks();
      setUsers(usersData);
      
      // Update selected user with fresh data
      const updatedUser = usersData.find(u => u.id === selectedUser.id);
      if (updatedUser) {
        console.log('[handleSaveTrackAssignment] Updating selected user with fresh data:', updatedUser);
        setSelectedUser(updatedUser);
      }
      
      console.log('[handleSaveTrackAssignment] Users list refreshed successfully');
    } catch (error: any) {
      console.error('[handleSaveTrackAssignment] Track assignment failed:', error);
      toast({
        title: '트랙 배정 실패',
        description: error.message || '트랙 배정 중 오류가 발생했습니다.',
        variant: 'destructive',
      });
      throw error;
    }
  };

  // Not logged in or not admin
  if (!userId && !adminLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <Card className="p-12 text-center">
          <ShieldAlert className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-h4 font-heading text-gray-900 mb-2">
            로그인이 필요합니다
          </h3>
          <Button onClick={() => router.push('/login')}>로그인하기</Button>
        </Card>
      </div>
    );
  }

  // Loading
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <AdminSidebar />
      <main className="flex-1 p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-h2 font-heading text-gray-900 mb-2">
            사용자 관리
          </h1>
          <p className="text-body text-gray-600">
            참가자 목록 및 권한 관리
          </p>
        </div>

        {/* Actions Bar */}
        <Card className="p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="사용자 검색 (이름, Discord ID)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Track Filter */}
            <TrackFilterButtons
              selectedFilter={filterTrack}
              onFilterChange={setFilterTrack}
            />

            {/* Action Buttons */}
            <Button
              variant="outline"
              onClick={handleExportCSV}
              disabled={filteredUsers.length === 0}
            >
              <Download className="h-4 w-4 mr-2" />
              CSV 내보내기
            </Button>
            
            <Button
              variant="outline"
              onClick={handleCopyInviteLink}
            >
              <Link2 className="h-4 w-4 mr-2" />
              {copied ? '복사됨!' : '초대 링크 복사'}
            </Button>

            {/* Add User Button (Disabled) */}
            <Button disabled>
              <UserPlus className="h-4 w-4 mr-2" />
              사용자 추가 (준비 중)
            </Button>
          </div>
        </Card>

        {/* Stats */}
        <div className="mb-6">
          <StatsCards
            totalUsers={users?.length || 0}
            filteredUsers={filteredUsers.length}
            activeUsers={users?.filter(u => u.is_active).length || 0}
          />
        </div>

        {/* Users Table */}
        <Card className="p-6">
          <UsersTable
            users={filteredUsers}
            onManageClick={handleOpenAssignDialog}
          />
        </Card>

        {/* Track Assignment Dialog */}
        <TrackAssignmentDialog
          isOpen={isAssignDialogOpen}
          onOpenChange={setIsAssignDialogOpen}
          user={selectedUser}
          tracks={allTracks}
          onSave={handleSaveTrackAssignment}
        />
      </main>
    </div>
  );
}
