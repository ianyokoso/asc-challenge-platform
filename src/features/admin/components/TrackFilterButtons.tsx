'use client';

import { Button } from '@/components/ui/button';
import { TRACK_FILTER_OPTIONS } from '@/constants/tracks';

interface TrackFilterButtonsProps {
  selectedFilter: string;
  onFilterChange: (filter: string) => void;
}

export function TrackFilterButtons({ selectedFilter, onFilterChange }: TrackFilterButtonsProps) {
  return (
    <div className="flex gap-2">
      {TRACK_FILTER_OPTIONS.map(option => (
        <Button
          key={option.value}
          variant={selectedFilter === option.value ? 'default' : 'outline'}
          size="sm"
          onClick={() => onFilterChange(option.value)}
        >
          {option.label}
        </Button>
      ))}
    </div>
  );
}

