import React, { createContext, useContext, useState, useCallback, useRef } from 'react';

export type ToastTone = 'info' | 'success' | 'warning' | 'error';

interface ToastContextType {
  showToast: (msg: string, tone?: ToastTone) => void;
}

const ToastContext = createContext<ToastContextType>({ showToast: () => {} });

export const useToast = () => useContext(ToastContext);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [msg, setMsg] = useState<string | null>(null);
  const [tone, setTone] = useState<ToastTone>('info');
  const [visible, setVisible] = useState(false);
  const timer = useRef(0);

  const showToast = useCallback((message: string, nextTone: ToastTone = 'info') => {
    clearTimeout(timer.current);
    setMsg(message);
    setTone(nextTone);
    setVisible(true);
    timer.current = window.setTimeout(() => setVisible(false), nextTone === 'error' ? 4500 : 3200);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className={`toast toast--${tone} ${visible ? 'toast--visible' : ''}`} role="status">
        {msg}
      </div>
    </ToastContext.Provider>
  );
};
