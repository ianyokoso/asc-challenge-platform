import { Video, FileText, Code, TrendingUp } from 'lucide-react';
import type { TrackType } from '@/lib/supabase/types';

export const TRACK_ICONS: Record<TrackType, any> = {
  'short-form': Video,
  'long-form': FileText,
  'builder': Code,
  'sales': TrendingUp,
};

export const TRACK_SCHEDULES: Record<TrackType, string> = {
  'short-form': '월~금 (평일)',
  'long-form': '일요일 마감',
  'builder': '일요일 마감',
  'sales': '화요일 마감',
};

export const TRACK_FILTER_OPTIONS = [
  { value: 'all', label: '전체' },
  { value: 'shortform', label: 'Short-form' },
  { value: 'longform', label: 'Long-form' },
  { value: 'builder', label: 'Builder' },
  { value: 'sales', label: 'Sales' },
] as const;

