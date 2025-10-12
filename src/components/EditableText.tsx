'use client';

import { useEditMode } from '@/contexts/EditModeContext';
import { useRef, useEffect, HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface EditableTextProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
  contentId: string;
  defaultValue: string;
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'p' | 'span' | 'div';
}

export function EditableText({
  contentId,
  defaultValue,
  as = 'div',
  className,
  ...props
}: EditableTextProps) {
  const { isEditMode, updateContent, pendingChanges } = useEditMode();
  const elementRef = useRef<HTMLDivElement>(null);
  const Component = as;

  // 편집 모드 변경 시 contentEditable 업데이트
  useEffect(() => {
    if (elementRef.current) {
      elementRef.current.contentEditable = isEditMode ? 'true' : 'false';
    }
  }, [isEditMode]);

  // pendingChanges에서 값 가져오기
  const currentValue = pendingChanges.get(contentId) ?? defaultValue;

  // 초기 렌더링 시 현재 값 설정
  useEffect(() => {
    if (elementRef.current && elementRef.current.textContent !== currentValue) {
      elementRef.current.textContent = currentValue;
    }
  }, [currentValue]);

  const handleInput = (e: React.FormEvent<HTMLDivElement>) => {
    const value = e.currentTarget.textContent || '';
    updateContent(contentId, value);
  };

  const handleBlur = (e: React.FocusEvent<HTMLDivElement>) => {
    const value = e.currentTarget.textContent || '';
    updateContent(contentId, value);
  };

  return (
    <Component
      ref={elementRef}
      data-content-id={contentId}
      onInput={handleInput}
      onBlur={handleBlur}
      suppressContentEditableWarning
      className={cn(
        className,
        isEditMode && [
          'outline-none',
          'ring-2',
          'ring-blue-500',
          'ring-offset-2',
          'rounded',
          'px-2',
          'py-1',
          'transition-all',
          'cursor-text',
          'hover:ring-blue-600',
        ]
      )}
      {...props}
    >
      {currentValue}
    </Component>
  );
}

