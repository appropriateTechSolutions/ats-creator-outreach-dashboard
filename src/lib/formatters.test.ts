import { describe, it, expect } from 'vitest';
import { formatFollowers, formatMoney } from './formatters';

describe('formatMoney', () => {
  it('adds thousands separators and always shows two decimals', () => {
    expect(formatMoney(1500, 'USD')).toBe('$1,500.00');
    expect(formatMoney(1234567.5, 'USD')).toBe('$1,234,567.50');
    expect(formatMoney(0.5, 'USD')).toBe('$0.50');
  });

  it('accepts the numeric strings Postgres DECIMAL columns arrive as', () => {
    expect(formatMoney('600.00', 'USD')).toBe('$600.00');
    expect(formatMoney('3950', 'USD')).toBe('$3,950.00');
  });

  it('uses the symbol that belongs to the currency code, not a hard-coded $', () => {
    expect(formatMoney(69416, 'INR')).toBe('₹69,416.00');
    expect(formatMoney(10, 'EUR')).toBe('€10.00');
    expect(formatMoney(10, 'gbp')).toBe('£10.00');
  });

  it('defaults to USD when the currency is missing', () => {
    expect(formatMoney(5)).toBe('$5.00');
    expect(formatMoney(5, null)).toBe('$5.00');
    expect(formatMoney(5, '')).toBe('$5.00');
  });

  it('renders an em dash for an unknown amount, never $0.00', () => {
    for (const unknown of [null, undefined, '', '   ', 'abc', NaN, Infinity]) {
      expect(formatMoney(unknown, 'USD')).toBe('—');
    }
  });

  it('still shows a real zero', () => {
    expect(formatMoney(0, 'USD')).toBe('$0.00');
    expect(formatMoney('0.00', 'USD')).toBe('$0.00');
  });

  it('falls back to the amount plus the raw code when Intl rejects the code', () => {
    expect(formatMoney(1500, 'dollars')).toBe('1,500.00 dollars');
  });
});

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
