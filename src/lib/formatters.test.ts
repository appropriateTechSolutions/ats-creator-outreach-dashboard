import { describe, it, expect } from 'vitest';
import { formatFollowers } from './formatters';

describe('formatFollowers', () => {
  it('returns raw counts below 1K', () => {
    expect(formatFollowers(0)).toBe('0');
    expect(formatFollowers(999)).toBe('999');
  });

  it('abbreviates thousands', () => {
    expect(formatFollowers(1500)).toBe('1.5K');
  });

  it('abbreviates millions', () => {
    expect(formatFollowers(2_500_000)).toBe('2.5M');
  });

  it('treats nullish as zero', () => {
    expect(formatFollowers(undefined)).toBe('0');
  });
});
