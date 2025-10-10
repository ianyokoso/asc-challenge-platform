'use client';

import { useState } from 'react';
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
  const [selectedTrackIds, setSelectedTrackIds] = useState<string[]>(() => {
    return user?.user_tracks
      ?.filter((ut: any) => ut.is_active)
      .map((ut: any) => ut.track_id) || [];
  });
  const [isAssigning, setIsAssigning] = useState(false);

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
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving track assignment:', error);
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
            {user?.discord_username}에게 배정할 트랙을 선택하세요
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4 space-y-4">
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

