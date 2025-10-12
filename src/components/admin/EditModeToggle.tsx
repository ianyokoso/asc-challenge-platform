'use client';

import { Button } from '@/components/ui/button';
import { useEditMode } from '@/contexts/EditModeContext';
import { usePageContents } from '@/hooks/usePageContents';
import { usePathname } from 'next/navigation';
import { Edit3, Save, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useState } from 'react';

export function EditModeToggle() {
  const pathname = usePathname();
  const { isEditMode, toggleEditMode, disableEditMode, pendingChanges, clearChanges, hasChanges } = useEditMode();
  const { saveContents, saving } = usePageContents(pathname);
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);

  const handleSave = async () => {
    if (!hasChanges) return;

    const success = await saveContents(pendingChanges);
    if (success) {
      disableEditMode();
    }
  };

  const handleCancel = () => {
    if (hasChanges) {
      setIsCancelDialogOpen(true);
    } else {
      disableEditMode();
    }
  };

  const handleConfirmCancel = () => {
    clearChanges();
    disableEditMode();
    setIsCancelDialogOpen(false);
  };

  if (!isEditMode) {
    return (
      <Button
        onClick={toggleEditMode}
        variant="outline"
        size="sm"
        className="gap-2"
      >
        <Edit3 className="h-4 w-4" />
        텍스트 편집
      </Button>
    );
  }

  return (
    <>
      <div className="flex items-center gap-2">
        <div className="text-sm font-medium text-blue-600 bg-blue-50 px-3 py-1.5 rounded-md">
          ✏️ 편집 모드
          {hasChanges && <span className="ml-2 text-xs">({pendingChanges.size}개 변경)</span>}
        </div>
        
        <Button
          onClick={handleSave}
          disabled={!hasChanges || saving}
          size="sm"
          className="gap-2"
        >
          {saving ? (
            <>
              <span className="animate-spin">⏳</span>
              저장 중...
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              저장
            </>
          )}
        </Button>

        <Button
          onClick={handleCancel}
          disabled={saving}
          variant="outline"
          size="sm"
          className="gap-2"
        >
          <X className="h-4 w-4" />
          취소
        </Button>
      </div>

      {/* 취소 확인 다이얼로그 */}
      <Dialog open={isCancelDialogOpen} onOpenChange={setIsCancelDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>변경 사항 버리기</DialogTitle>
            <DialogDescription>
              저장하지 않은 {pendingChanges.size}개의 변경 사항이 있습니다.
              <br />
              편집을 취소하면 모든 변경 사항이 사라집니다.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsCancelDialogOpen(false)}
            >
              계속 편집
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmCancel}
            >
              변경 사항 버리기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

