import { describe, it, expect, vi } from 'vitest';
import type { KeyboardEvent } from 'react';
import { clickable, clickableStop, dismissOverlay } from './a11y';

const keyEvent = (key: string) =>
  ({ key, preventDefault: vi.fn(), stopPropagation: vi.fn() }) as unknown as KeyboardEvent;

describe('clickable', () => {
  it('exposes button semantics and the click handler', () => {
    const fn = vi.fn();
    const p = clickable(fn);
    expect(p.role).toBe('button');
    expect(p.tabIndex).toBe(0);
    expect(p.onClick).toBe(fn);
  });
  it('activates on Enter and Space, preventing default scroll', () => {
    const fn = vi.fn();
    const { onKeyDown } = clickable(fn);
    const enter = keyEvent('Enter');
    onKeyDown(enter);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(enter.preventDefault).toHaveBeenCalled();
    onKeyDown(keyEvent(' '));
    expect(fn).toHaveBeenCalledTimes(2);
  });
  it('ignores other keys', () => {
    const fn = vi.fn();
    clickable(fn).onKeyDown(keyEvent('a'));
    expect(fn).not.toHaveBeenCalled();
  });
});

describe('clickableStop', () => {
  it('stops propagation on click so the parent handler does not fire', () => {
    const fn = vi.fn();
    const stopPropagation = vi.fn();
    clickableStop(fn).onClick({ stopPropagation });
    expect(stopPropagation).toHaveBeenCalled();
    expect(fn).toHaveBeenCalled();
  });
  it('stops propagation and activates on Enter', () => {
    const fn = vi.fn();
    const enter = keyEvent('Enter');
    clickableStop(fn).onKeyDown(enter);
    expect(enter.stopPropagation).toHaveBeenCalled();
    expect(fn).toHaveBeenCalled();
  });
});

describe('dismissOverlay', () => {
  it('is not a tab stop and is labelled', () => {
    const p = dismissOverlay(vi.fn());
    expect(p.role).toBe('button');
    expect(p.tabIndex).toBe(-1);
    expect(p['aria-label']).toBe('Close');
  });
  it('dismisses on Escape and Enter, ignoring other keys', () => {
    const fn = vi.fn();
    const { onKeyDown } = dismissOverlay(fn);
    onKeyDown(keyEvent('Escape'));
    onKeyDown(keyEvent('Enter'));
    expect(fn).toHaveBeenCalledTimes(2);
    onKeyDown(keyEvent('a'));
    expect(fn).toHaveBeenCalledTimes(2);
  });
});
