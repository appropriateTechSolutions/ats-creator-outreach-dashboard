import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('./logger', () => ({
  logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

import { toast, setToastEmitter } from './toast';
import { logger } from './logger';

describe('toast bridge', () => {
  beforeEach(() => {
    setToastEmitter(null);
    vi.clearAllMocks();
  });

  it('routes each level to the registered emitter with the right type', () => {
    const emit = vi.fn();
    setToastEmitter(emit);
    toast.error('boom');
    toast.success('yay');
    toast.info('fyi');
    toast.warning('careful');
    toast.show('plain');
    expect(emit).toHaveBeenCalledWith('boom', 'error');
    expect(emit).toHaveBeenCalledWith('yay', 'success');
    expect(emit).toHaveBeenCalledWith('fyi', 'info');
    expect(emit).toHaveBeenCalledWith('careful', 'warning');
    expect(emit).toHaveBeenCalledWith('plain', 'info');
  });

  it('falls back to the logger when no provider is mounted', () => {
    toast.error('nobody home');
    expect(logger.warn).toHaveBeenCalled();
  });

  it('stops emitting once the emitter is unregistered', () => {
    const emit = vi.fn();
    setToastEmitter(emit);
    setToastEmitter(null);
    toast.error('x');
    expect(emit).not.toHaveBeenCalled();
  });
});
