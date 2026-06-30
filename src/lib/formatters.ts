export const getErRating = (er: number) => {
  if (er >= 5) return { label: 'Excellent', color: 'text-emerald-600', bg: 'bg-emerald-100', border: 'border-emerald-200' };
  if (er >= 3) return { label: 'Good', color: 'text-blue-600', bg: 'bg-blue-100', border: 'border-blue-200' };
  if (er >= 1.5) return { label: 'Average', color: 'text-amber-600', bg: 'bg-amber-100', border: 'border-amber-200' };
  return { label: 'Poor', color: 'text-red-600', bg: 'bg-red-100', border: 'border-red-200' };
};

export const formatFollowers = (count: number | undefined) => {
  if (count === undefined || count === null) return '0';
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
  return count.toString();
};

export const getPlatformHandle = (url: string | undefined, platform: string | undefined) => {
  if (!url) return '';
  try {
    const parsed = new URL(url);
    const path = parsed.pathname.replace(/^\/|\/$/g, '');
    if (platform === 'youtube' && path.startsWith('@')) return path;
    if (platform === 'youtube' && path.startsWith('c/')) return path.substring(2);
    if (platform === 'youtube' && path.startsWith('channel/')) return path.substring(8);
    return '@' + path.split('/')[0];
  } catch (e) {
    // If not a valid URL, check if it's already a handle
    if (url.startsWith('@')) return url;
    return '@' + url.replace(/^https?:\/\/(www\.)?[^\/]+\//, '').split('/')[0];
  }
};

export const getRelativeTime = (timestamp: any) => {
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
  } catch (e) {
    return 'Just now';
  }
};
