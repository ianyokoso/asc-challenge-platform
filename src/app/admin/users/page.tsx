'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { AdminSidebar } from '@/components/layout/admin-sidebar';
import {
  Search,
  Link2,
  Loader2,
  ShieldAlert,
  Download,
  UserPlus,
  Settings,
} from 'lucide-react';
import { getUser } from '@/lib/supabase/client';
import { useIsAdmin, useAllUsersWithStats } from '@/hooks/useAdmin';
import { useRouter } from 'next/navigation';
import { getAllTracks, assignUserToTracks, getUsersWithTracks } from '@/lib/supabase/database';
import { useToast } from '@/hooks/use-toast';

export default function AdminUsersPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [userId, setUserId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTrack, setFilterTrack] = useState<string>('all');
  const [copied, setCopied] = useState(false);
  
  // Track assignment dialog state
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [selectedTrackIds, setSelectedTrackIds] = useState<string[]>([]);
  const [allTracks, setAllTracks] = useState<any[]>([]);
  const [isAssigning, setIsAssigning] = useState(false);
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
    
    // Get current active track IDs
    const currentTrackIds = user.user_tracks
      ?.filter((ut: any) => ut.is_active)
      .map((ut: any) => ut.track_id) || [];
    
    setSelectedTrackIds(currentTrackIds);
    setIsAssignDialogOpen(true);
  };

  // Toggle track selection
  const handleTrackToggle = (trackId: string) => {
    setSelectedTrackIds(prev => {
      if (prev.includes(trackId)) {
        return prev.filter(id => id !== trackId);
      } else {
        return [...prev, trackId];
      }
    });
  };

  // Save track assignment
  const handleSaveTrackAssignment = async () => {
    if (!selectedUser) return;
    
    setIsAssigning(true);
    try {
      const success = await assignUserToTracks(selectedUser.id, selectedTrackIds);
      
      if (success) {
        toast({
          title: '트랙 배정 완료',
          description: `${selectedUser.discord_username}에게 ${selectedTrackIds.length}개의 트랙이 배정되었습니다.`,
        });
        
        // Refresh users list
        const usersData = await getUsersWithTracks();
        setUsers(usersData);
        setIsAssignDialogOpen(false);
      } else {
        toast({
          title: '트랙 배정 실패',
          description: '트랙 배정 중 오류가 발생했습니다.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error assigning tracks:', error);
      toast({
        title: '트랙 배정 실패',
        description: '트랙 배정 중 오류가 발생했습니다.',
        variant: 'destructive',
      });
    } finally {
      setIsAssigning(false);
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
            <div className="flex gap-2">
              <Button
                variant={filterTrack === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterTrack('all')}
              >
                전체
              </Button>
              <Button
                variant={filterTrack === 'shortform' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterTrack('shortform')}
              >
                Short-form
              </Button>
              <Button
                variant={filterTrack === 'longform' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterTrack('longform')}
              >
                Long-form
              </Button>
              <Button
                variant={filterTrack === 'builder' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterTrack('builder')}
              >
                Builder
              </Button>
              <Button
                variant={filterTrack === 'sales' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterTrack('sales')}
              >
                Sales
              </Button>
            </div>

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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <Card className="p-4">
            <h3 className="text-body-sm text-gray-600 mb-1">전체 사용자</h3>
            <p className="text-h3 font-heading text-primary">
              {users?.length || 0}
            </p>
          </Card>
          <Card className="p-4">
            <h3 className="text-body-sm text-gray-600 mb-1">검색 결과</h3>
            <p className="text-h3 font-heading text-secondary">
              {filteredUsers.length}
            </p>
          </Card>
          <Card className="p-4">
            <h3 className="text-body-sm text-gray-600 mb-1">활성 사용자</h3>
            <p className="text-h3 font-heading text-accent">
              {users?.filter(u => u.is_active).length || 0}
            </p>
          </Card>
        </div>

        {/* Users Table */}
        <Card className="p-6">
          <div className="overflow-x-auto">
            {filteredUsers.length > 0 ? (
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
                  {filteredUsers.map((user) => {
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
                                  <Badge key={ut.id} className="bg-primary/10 text-primary text-body-xs">
                                    {ut.track?.name || '트랙'}
                                  </Badge>
                                ))
                            ) : (
                              <span className="text-body-sm text-gray-500">미배정</span>
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
                            onClick={() => handleOpenAssignDialog(user)}
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
            ) : (
              <div className="text-center py-12">
                <Search className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <p className="text-body text-gray-600">
                  검색 결과가 없습니다
                </p>
              </div>
            )}
          </div>
        </Card>

        {/* Track Assignment Dialog */}
        <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>트랙 배정 관리</DialogTitle>
              <DialogDescription>
                {selectedUser?.discord_username}에게 배정할 트랙을 선택하세요
              </DialogDescription>
            </DialogHeader>
            
            <div className="py-4 space-y-4">
              {allTracks.map(track => {
                const isSelected = selectedTrackIds.includes(track.id);
                
                return (
                  <div
                    key={track.id}
                    className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                    onClick={() => handleTrackToggle(track.id)}
                  >
                    <Checkbox
                      id={track.id}
                      checked={isSelected}
                      onCheckedChange={() => handleTrackToggle(track.id)}
                    />
                    <label
                      htmlFor={track.id}
                      className="flex-1 cursor-pointer"
                    >
                      <div className="font-medium text-gray-900">{track.name}</div>
                      <div className="text-body-sm text-gray-600">{track.description}</div>
                    </label>
                    {isSelected && (
                      <Badge className="bg-primary/10 text-primary">선택됨</Badge>
                    )}
                  </div>
                );
              })}
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsAssignDialogOpen(false)}
                disabled={isAssigning}
              >
                취소
              </Button>
              <Button
                onClick={handleSaveTrackAssignment}
                disabled={isAssigning}
              >
                {isAssigning ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    저장 중...
                  </>
                ) : (
                  '저장'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
