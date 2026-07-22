'use client';

import React, { useEffect } from 'react';

export interface ToastProps {
  type: 'success' | 'error' | null;
  message: string;
  onClose: () => void;
  duration?: number; // ms, default 3500
}

export default function Toast({ type, message, onClose, duration = 3500 }: ToastProps) {
  useEffect(() => {
    if (!type || !message) return;

    const timer = setTimeout(() => {
      onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [type, message, duration, onClose]);

  if (!type || !message) return null;

  return (
    <div className={`toast-container toast-${type}`}>
      <div className="toast-content">
        <span className="toast-icon">
          {type === 'success' ? '✓' : '⚠️'}
        </span>
        <span className="toast-message">{message}</span>
        <button type="button" className="toast-close" onClick={onClose} title="Dismiss">
          ✕
        </button>
      </div>
    </div>
  );
}
