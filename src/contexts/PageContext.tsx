import React, { createContext, useContext, useState, ReactNode, useCallback, useMemo } from 'react';

interface PageContextType {
  title: string;
  actions: ReactNode;
  setPageHeader: (title: string, actions?: ReactNode) => void;
}

const PageContext = createContext<PageContextType | undefined>(undefined);

export const PageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [title, setTitle] = useState('');
  const [actions, setActions] = useState<ReactNode>(null);

  const setPageHeader = useCallback((newTitle: string, newActions?: ReactNode) => {
    setTitle(newTitle);
    setActions(newActions || null);
  }, []);

  const value = useMemo(() => ({
    title,
    actions,
    setPageHeader
  }), [title, actions, setPageHeader]);

  return (
    <PageContext.Provider value={value}>
      {children}
    </PageContext.Provider>
  );
};

export const usePageHeader = () => {
  const context = useContext(PageContext);
  if (!context) {
    throw new Error('usePageHeader must be used within PageProvider');
  }
  return context;
};

