'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Loader2 } from 'lucide-react';
import type { Track } from '@/lib/supabase/types';

interface TrackAssignmentDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  user: any;
  tracks: Track[];
  onSave: (trackIds: string[]) => Promise<void>;
}

export function TrackAssignmentDialog({
  isOpen,
  onOpenChange,
  user,
  tracks,
  onSave,
}: TrackAssignmentDialogProps) {
  const [selectedTrackIds, setSelectedTrackIds] = useState<string[]>([]);
  const [isAssigning, setIsAssigning] = useState(false);

  // 다이얼로그가 열릴 때마다 사용자의 기존 트랙을 초기화
  useEffect(() => {
    if (isOpen && user) {
      console.log('[TrackAssignmentDialog] 🔄 Initializing with user:', user);
      console.log('[TrackAssignmentDialog] 📋 User tracks:', user.user_tracks);
      
      const existingTrackIds = user?.user_tracks
        ?.filter((ut: any) => ut.is_active)
        .map((ut: any) => ut.track_id) || [];
      
      console.log('[TrackAssignmentDialog] ✅ Existing track IDs:', existingTrackIds);
      setSelectedTrackIds(existingTrackIds);
    } else if (!isOpen) {
      // 다이얼로그가 닫힐 때 상태 초기화
      console.log('[TrackAssignmentDialog] 🔄 Dialog closed, resetting state');
      setSelectedTrackIds([]);
    }
  }, [isOpen, user?.id, JSON.stringify(user?.user_tracks)]);

  const handleTrackToggle = (trackId: string) => {
    setSelectedTrackIds(prev => {
      if (prev.includes(trackId)) {
        return prev.filter(id => id !== trackId);
      }
      return [...prev, trackId];
    });
  };

  const handleSave = async () => {
    setIsAssigning(true);
    try {
      await onSave(selectedTrackIds);
      onOpenChange(false); // 성공 시에만 다이얼로그 닫기
    } catch (error) {
      console.error('Error saving track assignment:', error);
      // 에러 발생 시 다이얼로그를 닫지 않고 사용자가 에러를 확인할 수 있도록 함
    } finally {
      setIsAssigning(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>트랙 배정 관리</DialogTitle>
          <DialogDescription>
            {user?.discord_username}에게 배정할 트랙을 선택하세요 (모든 트랙 해제 시 "트랙 추가 대기중" 상태)
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4 space-y-4">
          {selectedTrackIds.length === 0 && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                ℹ️ 모든 트랙을 해제하면 "트랙 추가 대기중" 상태가 됩니다.
              </p>
            </div>
          )}
          {tracks.map(track => {
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
            onClick={() => onOpenChange(false)}
            disabled={isAssigning}
          >
            취소
          </Button>
          <Button
            onClick={handleSave}
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
  );
}

