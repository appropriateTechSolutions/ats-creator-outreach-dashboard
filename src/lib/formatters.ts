import type { Creator } from '../types';

// ─── Shared display/formatting helpers ────────────────────────────────
// Single source of truth. Previously each of these was copy-pasted (and had
// drifted) across 3–6 page/component files; consolidating here guarantees the
// same creator metric renders identically everywhere.

/**
 * Engagement-rate rating relative to follower tier. Returns null when there
 * isn't enough data to rate (no followers or no engagement).
 */
export const getErRating = (
  followers: number,
  er: number,
): { label: string; colorClass: string } | null => {
  if (followers <= 0 || er <= 0) return null;

  let goodThreshold = 0;
  let avgLower = 0;

  if (followers < 10000) {
    goodThreshold = 6.0;
    avgLower = 3.0;
  } else if (followers < 100000) {
    goodThreshold = 4.0;
    avgLower = 1.5;
  } else if (followers < 500000) {
    goodThreshold = 2.0;
    avgLower = 0.7;
  } else if (followers < 1000000) {
    goodThreshold = 1.5;
    avgLower = 0.5;
  } else {
    goodThreshold = 1.0;
    avgLower = 0.3;
  }

  if (er >= goodThreshold) {
    return {
      label: 'Good ER',
      colorClass: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    };
  } else if (er >= avgLower) {
    return { label: 'Avg ER', colorClass: 'bg-blue-50 text-blue-700 border border-blue-200' };
  } else {
    return { label: 'Below Avg', colorClass: 'bg-rose-50 text-rose-700 border border-rose-200' };
  }
};

/** Abbreviate a follower count (e.g. 1500 → "1.5K", 2_500_000 → "2.5M"). */
export const formatFollowers = (n: number | null | undefined): string => {
  if (n === null || n === undefined) return '0';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(n >= 10_000 ? 0 : 1)}K`;
  return String(n);
};

/** The creator's handle for a given platform, stripped of a leading "@". */
export const getPlatformHandle = (creator: Creator, platform: string): string => {
  const profileHandle = creator.profiles?.find(
    (p) => p.platform.toLowerCase() === platform,
  )?.handle;
  return (profileHandle || creator.handle || '').replace(/^@/, '');
};

/** Compact relative time ("Just now", "5m ago", "3h ago", "2d ago"). */
export const getRelativeTime = (timestamp: string | number | Date | null | undefined): string => {
  try {
    if (!timestamp) return 'Just now';
    const now = new Date();
    const then = new Date(timestamp);
    if (isNaN(then.getTime())) return 'Just now';

    const diffMs = now.getTime() - then.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSecs < 60) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  } catch {
    return 'Just now';
  }
};

/**
 * Strip quoted replies and email-client boilerplate (signatures, "On … wrote:",
 * ">" quotes) so only the latest inbound message body remains.
 */
export const cleanMessageText = (text: string): string => {
  if (!text) return '';
  const normalizedText = text.replace(/\r/g, '');
  const lines = normalizedText.split('\n');
  const cleanedLines: string[] = [];

  for (const line of lines) {
    const trimmedLine = line.trim();
    if (!trimmedLine && cleanedLines.length === 0) continue;

    if (
      /^\s*(On|From|Sent|To|Subject):/i.test(trimmedLine) ||
      /wrote:$/i.test(trimmedLine) ||
      trimmedLine.includes('Original Message') ||
      trimmedLine.startsWith('---') ||
      trimmedLine.startsWith('___')
    ) {
      break;
    }

    if (trimmedLine.startsWith('>') || trimmedLine.startsWith('>>')) {
      continue;
    }

    cleanedLines.push(line);
  }

  return cleanedLines.join('\n').trim();
};
