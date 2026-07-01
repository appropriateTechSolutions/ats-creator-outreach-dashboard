import { logger } from './logger';
import type { ToastType } from '../components/ui/Toast';

/**
 * Imperative toast API — a thin bridge over the React `ToastProvider`.
 *
 * `useToast()` is still the idiomatic way to raise a toast from a component,
 * but this module lets non-hook code (SSE handlers, error paths, utilities)
 * surface the same toasts. `ToastProvider` wires `setToastEmitter` on mount.
 */

type Emit = (message: string, type: ToastType) => void;

let emit: Emit | null = null;

export function setToastEmitter(fn: Emit | null) {
  emit = fn;
}

function show(message: string, type: ToastType) {
  if (emit) {
    emit(message, type);
  } else {
    // Provider not mounted (e.g. during an early boot error) — don't lose the message.
    logger.warn(`[toast:${type}] ${message}`);
  }
}

export const toast = {
  show: (message: string, type: ToastType = 'info') => show(message, type),
  success: (message: string) => show(message, 'success'),
  error: (message: string) => show(message, 'error'),
  warning: (message: string) => show(message, 'warning'),
  info: (message: string) => show(message, 'info'),
};
