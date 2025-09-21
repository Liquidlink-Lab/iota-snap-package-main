'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

interface ActionContextType {
  amount: string;
  setSendAmount: (value: string) => void;
  receiver: string;
  setReceiveUser: (value: string) => void;
}

const ActionContext = createContext<ActionContextType | undefined>(undefined);

export function ActionProvider({ children }: { children: ReactNode }) {
  const [amount, setSendAmount] = useState<string>('');
  const [receiver, setReceiveUser] = useState<string>('');

  return (
    <ActionContext.Provider
      value={{ amount, setSendAmount, receiver, setReceiveUser }}
    >
      {children}
    </ActionContext.Provider>
  );
}

export function useAction() {
  const context = useContext(ActionContext);
  if (!context) {
    throw new Error('useAction need to be use in ActionProvider');
  }
  return context;
}
