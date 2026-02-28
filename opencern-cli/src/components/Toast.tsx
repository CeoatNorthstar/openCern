import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import { getTheme } from '../tui/theme.js';

export type ToastVariant = 'info' | 'success' | 'warning' | 'error';

export interface ToastMessage {
  id: number;
  message: string;
  variant: ToastVariant;
  duration: number;
}

let toastId = 0;
const listeners = new Set<(toasts: ToastMessage[]) => void>();
let currentToasts: ToastMessage[] = [];

function notifyListeners() {
  listeners.forEach(fn => fn([...currentToasts]));
}

export function showToast(message: string, variant: ToastVariant = 'info', duration = 3000) {
  const id = ++toastId;
  currentToasts.push({ id, message, variant, duration });
  notifyListeners();

  setTimeout(() => {
    currentToasts = currentToasts.filter(t => t.id !== id);
    notifyListeners();
  }, duration);
}

export function ToastContainer(): React.JSX.Element | null {
  const theme = getTheme();
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    listeners.add(setToasts);
    return () => { listeners.delete(setToasts); };
  }, []);

  if (toasts.length === 0) return null;

  const variantColor = (v: ToastVariant) => {
    switch (v) {
      case 'success': return theme.success;
      case 'warning': return theme.warning;
      case 'error': return theme.error;
      default: return theme.info;
    }
  };

  const variantIcon = (v: ToastVariant) => {
    switch (v) {
      case 'success': return '✓';
      case 'warning': return '△';
      case 'error': return '✗';
      default: return 'ℹ';
    }
  };

  return (
    <Box flexDirection="column" position="absolute" marginLeft={2} marginTop={1}>
      {toasts.slice(-3).map(toast => (
        <Box key={toast.id} paddingX={1}>
          <Text color={variantColor(toast.variant)}>
            {variantIcon(toast.variant)}{' '}
          </Text>
          <Text color={theme.text}>{toast.message}</Text>
        </Box>
      ))}
    </Box>
  );
}
