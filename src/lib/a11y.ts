import type { KeyboardEvent } from 'react';

/**
 * Spread onto a non-native element (`<div>`, `<span>`) that behaves like a
 * button, so it's operable by keyboard as well as pointer:
 *
 *   <div {...clickable(() => navigate('/x'))} className="...">
 *
 * Adds `role="button"`, `tabIndex={0}`, the click handler, and an Enter/Space
 * key handler. Prefer a real `<button>`/`<a>` when the markup allows; use this
 * for cases where the interactive element must stay a div/span.
 */
export function clickable(onActivate: () => void) {
  return {
    role: 'button' as const,
    tabIndex: 0,
    onClick: onActivate,
    onKeyDown: (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onActivate();
      }
    },
  };
}

/**
 * Spread onto a dismiss backdrop / scrim `<div>` (the full-screen overlay that
 * closes a modal, drawer, or dropdown when clicked). Gives it an interactive
 * role and Enter/Escape key support to satisfy a11y, but `tabIndex={-1}` keeps
 * it out of the tab order (a backdrop should never be a tab stop — keyboard
 * users dismiss via Escape or the close control).
 */
export function dismissOverlay(onDismiss: () => void) {
  return {
    role: 'button' as const,
    tabIndex: -1,
    'aria-label': 'Close',
    onClick: onDismiss,
    onKeyDown: (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Enter') {
        onDismiss();
      }
    },
  };
}

/**
 * Like {@link clickable} but for an interactive element nested inside another
 * clickable element — stops the event from bubbling to the parent so the inner
 * action doesn't also trigger the outer one.
 */
export function clickableStop(onActivate: () => void) {
  return {
    role: 'button' as const,
    tabIndex: 0,
    onClick: (e: { stopPropagation(): void }) => {
      e.stopPropagation();
      onActivate();
    },
    onKeyDown: (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        e.stopPropagation();
        onActivate();
      }
    },
  };
}
