'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

interface EditModeContextType {
  isEditMode: boolean;
  enableEditMode: () => void;
  disableEditMode: () => void;
  toggleEditMode: () => void;
  pendingChanges: Map<string, string>;
  updateContent: (id: string, value: string) => void;
  clearChanges: () => void;
  hasChanges: boolean;
  saveHandler: (() => Promise<boolean>) | null;
  setSaveHandler: (handler: (() => Promise<boolean>) | null) => void;
}

const EditModeContext = createContext<EditModeContextType | undefined>(undefined);

export function EditModeProvider({ children }: { children: ReactNode }) {
  const [isEditMode, setIsEditMode] = useState(false);
  const [pendingChanges, setPendingChanges] = useState<Map<string, string>>(new Map());
  const [saveHandler, setSaveHandler] = useState<(() => Promise<boolean>) | null>(null);

  const enableEditMode = () => setIsEditMode(true);
  const disableEditMode = () => {
    setIsEditMode(false);
    setPendingChanges(new Map());
  };
  const toggleEditMode = () => setIsEditMode(!isEditMode);

  const updateContent = (id: string, value: string) => {
    setPendingChanges(prev => {
      const next = new Map(prev);
      next.set(id, value);
      return next;
    });
  };

  const clearChanges = () => setPendingChanges(new Map());

  const hasChanges = pendingChanges.size > 0;

  return (
    <EditModeContext.Provider
      value={{
        isEditMode,
        enableEditMode,
        disableEditMode,
        toggleEditMode,
        pendingChanges,
        updateContent,
        clearChanges,
        hasChanges,
        saveHandler,
        setSaveHandler,
      }}
    >
      {children}
    </EditModeContext.Provider>
  );
}

export function useEditMode() {
  const context = useContext(EditModeContext);
  if (context === undefined) {
    throw new Error('useEditMode must be used within an EditModeProvider');
  }
  return context;
}

