import { Instagram, Youtube, Activity } from 'lucide-react';
import { getPlatformHandle } from '../../lib/formatters';
import type { Creator } from '../../types';

// Shared presentational pieces for a creator's identity. These two blocks were
// previously copy-pasted across ~15 files (Creators, Dashboard, ReviewQueue,
// Content, Shipments, drawers, …); consolidating them here removes hundreds of
// duplicated lines and gives every list one avatar/social implementation.

interface CreatorAvatarProps {
  /** May be a nested relation (e.g. shipment.Creator) that is sometimes absent. */
  creator: Pick<Creator, 'profile_pic' | 'full_name' | 'handle'> | null | undefined;
  /** Full wrapper styling (size / shape / bg). Defaults to the list-row look. */
  className?: string;
}

export function CreatorAvatar({
  creator,
  className = 'w-9 h-9 rounded-full bg-primary-100 text-primary-700 text-sm ring-2 ring-white shadow-sm',
}: CreatorAvatarProps) {
  return (
    <div
      className={`flex flex-shrink-0 items-center justify-center font-normal uppercase overflow-hidden ${className}`}
    >
      {creator?.profile_pic ? (
        <img
          src={creator.profile_pic}
          alt=""
          className="w-full h-full object-cover"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.onerror = null;
            target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
              creator.full_name || creator.handle || 'C',
            )}&background=E0E7FF&color=4338CA`;
          }}
        />
      ) : (
        (creator?.full_name || creator?.handle)?.charAt(0)
      )}
    </div>
  );
}

interface CreatorSocialLinksProps {
  creator: Creator;
  iconSize?: number;
  /** Show the "@handle" text next to each icon (list rows) or icons only (compact). */
  showHandles?: boolean;
  className?: string;
}

export function CreatorSocialLinks({
  creator: c,
  iconSize = 14,
  showHandles = false,
  className = 'flex gap-2 mt-1.5',
}: CreatorSocialLinksProps) {
  const handle = c.handle?.replace(/^@/, '');
  const links = [
    {
      has: c.has_instagram,
      platform: 'instagram',
      color: 'text-[#E1306C]',
      Icon: Instagram,
      url:
        c.profiles?.find((p) => p.platform.toLowerCase() === 'instagram')?.profile_url ||
        `https://instagram.com/${handle}`,
      title: 'Instagram',
    },
    {
      has: c.has_youtube,
      platform: 'youtube',
      color: 'text-[#FF0000]',
      Icon: Youtube,
      url:
        c.profiles?.find((p) => p.platform.toLowerCase() === 'youtube')?.profile_url ||
        `https://youtube.com/@${handle}`,
      title: 'YouTube',
    },
    {
      has: c.has_tiktok,
      platform: 'tiktok',
      color: 'text-gray-900',
      Icon: Activity,
      url:
        c.profiles?.find((p) => p.platform.toLowerCase() === 'tiktok')?.profile_url ||
        `https://tiktok.com/@${handle}`,
      title: 'TikTok',
    },
  ];

  return (
    <div className={className}>
      {links
        .filter((l) => l.has)
        .map(({ platform, color, Icon, url, title }) => (
          <a
            key={platform}
            href={url}
            target="_blank"
            rel="noreferrer"
            className={`inline-flex items-center gap-1 ${color} hover:scale-[1.02] transition-transform`}
            title={title}
          >
            <Icon size={iconSize} />
            {showHandles && (
              <span className="text-[11px] text-gray-500 normal-case tracking-normal">
                @{getPlatformHandle(c, platform)}
              </span>
            )}
          </a>
        ))}
    </div>
  );
}
