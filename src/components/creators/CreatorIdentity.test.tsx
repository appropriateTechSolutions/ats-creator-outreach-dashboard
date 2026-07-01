import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CreatorAvatar, CreatorSocialLinks } from './CreatorIdentity';
import type { Creator } from '../../types';

describe('CreatorAvatar', () => {
  it('renders the leading initial when there is no picture', () => {
    render(
      <CreatorAvatar creator={{ full_name: 'Jane Doe', handle: 'jane', profile_pic: null }} />,
    );
    expect(screen.getByText('J')).toBeInTheDocument();
  });

  it('renders an <img> when a profile picture is present', () => {
    const { container } = render(
      <CreatorAvatar
        creator={{ full_name: 'Jane', handle: 'jane', profile_pic: 'https://x/y.jpg' }}
      />,
    );
    const img = container.querySelector('img');
    expect(img?.getAttribute('src')).toBe('https://x/y.jpg');
  });

  it('does not crash for a null creator', () => {
    const { container } = render(<CreatorAvatar creator={null} />);
    expect(container).toBeTruthy();
  });
});

describe('CreatorSocialLinks', () => {
  it('renders only the platforms the creator is on', () => {
    render(
      <CreatorSocialLinks
        creator={
          {
            handle: 'jane',
            has_instagram: true,
            has_youtube: false,
            has_tiktok: true,
            profiles: [],
          } as unknown as Creator
        }
      />,
    );
    expect(screen.getByTitle('Instagram')).toBeInTheDocument();
    expect(screen.getByTitle('TikTok')).toBeInTheDocument();
    expect(screen.queryByTitle('YouTube')).toBeNull();
  });
});
