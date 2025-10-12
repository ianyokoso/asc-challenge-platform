'use client';

import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

interface PageContent {
  id: string;
  page_path: string;
  content_key: string;
  content_type: string;
  content_value: string;
  description: string | null;
}

export function usePageContents(pagePath: string) {
  const [contents, setContents] = useState<PageContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  // 페이지 콘텐츠 불러오기
  useEffect(() => {
    async function fetchContents() {
      try {
        setLoading(true);
        const response = await fetch(`/api/admin/page-contents?pagePath=${encodeURIComponent(pagePath)}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch contents');
        }

        setContents(data.data || []);
      } catch (error) {
        console.error('Failed to fetch page contents:', error);
        toast({
          variant: 'destructive',
          title: '콘텐츠 불러오기 실패',
          description: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.',
        });
      } finally {
        setLoading(false);
      }
    }

    fetchContents();
  }, [pagePath, toast]);

  // 콘텐츠 저장
  const saveContents = useCallback(async (changes: Map<string, string>) => {
    try {
      // 변경사항이 없으면 조기 반환
      if (changes.size === 0) {
        toast({
          title: '변경사항 없음',
          description: '저장할 내용이 없습니다.',
        });
        return true;
      }

      setSaving(true);

      const updates = Array.from(changes.entries()).map(([id, content_value]) => ({
        id,
        content_value,
      }));

      const response = await fetch('/api/admin/page-contents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: updates }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save contents');
      }

      // 로컬 상태 업데이트
      setContents(prev => 
        prev.map(content => {
          const newValue = changes.get(content.id);
          return newValue !== undefined
            ? { ...content, content_value: newValue }
            : content;
        })
      );

      toast({
        title: '저장 완료 ✅',
        description: `${data.updatedCount}개의 콘텐츠가 저장되었습니다.`,
      });

      return true;
    } catch (error) {
      console.error('Failed to save page contents:', error);
      toast({
        variant: 'destructive',
        title: '저장 실패',
        description: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.',
      });
      return false;
    } finally {
      setSaving(false);
    }
  }, [toast]);

  // content_key로 콘텐츠 찾기
  const getContentByKey = (key: string): PageContent | undefined => {
    return contents.find(c => c.content_key === key);
  };

  // content_key로 값 가져오기
  const getValueByKey = (key: string, defaultValue = ''): string => {
    return getContentByKey(key)?.content_value || defaultValue;
  };

  return {
    contents,
    loading,
    saving,
    saveContents,
    getContentByKey,
    getValueByKey,
  };
}

