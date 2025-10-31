'use client';

import { Search } from 'lucide-react';

export const EmptyState = () => (
  <div className="text-center py-12">
    <Search className="h-12 w-12 text-gray-400 mx-auto mb-3" />
    <p className="text-body text-gray-600">검색 결과가 없습니다</p>
  </div>
);
