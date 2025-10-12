'use client';

import { EditModeProvider } from '@/contexts/EditModeContext';
import { ReactNode } from 'react';

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <EditModeProvider>
      {children}
    </EditModeProvider>
  );
}

