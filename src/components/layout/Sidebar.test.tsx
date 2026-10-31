import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Sidebar, type NavGroup } from './Sidebar';
import type { AuthUser } from '../../types';

// Sidebar reads the signed-in user from AuthContext. Mock the hook instead of
// mounting AuthProvider (which calls /me on mount); tests set `auth.user` per render.
const auth = vi.hoisted(() => ({ user: null as AuthUser | null }));
vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: auth.user, logout: vi.fn() }),
}));

// Client users trigger a brand lookup for the header name — keep it off the network.
vi.mock('../../lib/api', () => ({ getBrands: vi.fn().mockResolvedValue([]) }));

const makeUser = (role: string, userType: AuthUser['user_type']): AuthUser => ({
  id: `${role}-id`,
  full_name: 'Test User',
  email: `${role}@example.com`,
  role,
  user_type: userType,
  client_id: userType === 'client' ? 'client-1' : null,
});

const superAdmin = makeUser('super_admin', 'internal');
const operator = makeUser('operator', 'internal');
const clientAdmin = makeUser('client_admin', 'client');
const clientMarketing = makeUser('client_marketing', 'client');

const HEADINGS = ['Work', 'Pipeline', 'Insights', 'Admin'];

function renderSidebar(
  user: AuthUser | null,
  { isOpen = true, navGroups }: { isOpen?: boolean; navGroups?: NavGroup[] } = {},
) {
  auth.user = user;
  return render(
    <MemoryRouter
      initialEntries={['/dashboard']}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <Sidebar isOpen={isOpen} onClose={vi.fn()} onToggle={vi.fn()} navGroups={navGroups} />
    </MemoryRouter>,
  );
}

const linkNames = (scope: HTMLElement) =>
  within(scope)
    .getAllByRole('link')
    .map((a) => a.textContent);

describe('Sidebar', () => {
  it('renders group headings in order', () => {
    renderSidebar(superAdmin);
    const nav = screen.getByRole('navigation');

    const headings = within(nav).getAllByText(new RegExp(`^(${HEADINGS.join('|')})$`));
    expect(headings.map((h) => h.textContent)).toEqual(HEADINGS);

    // Dashboard is the heading-less lead item: it sits before the first heading.
    const dashboard = within(nav).getByRole('link', { name: 'Dashboard' });
    expect(dashboard.compareDocumentPosition(headings[0]) & Node.DOCUMENT_POSITION_FOLLOWING).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );

    // The old catch-all "Menu" caption is gone now that the groups carry their own headings.
    expect(screen.queryByText('Menu')).not.toBeInTheDocument();
  });

  it('lists each group with its items in order', () => {
    renderSidebar(superAdmin);
    const group = (name: string) => screen.getByRole('group', { name });

    expect(linkNames(group('Work'))).toEqual([
      'Inbox',
      'Review Queue',
      'Campaigns',
      'Creators',
      'My Creators',
      'Outreach',
    ]);
    expect(linkNames(group('Pipeline'))).toEqual([
      'Partnerships',
      'Shipments',
      'Content',
      'Meetings',
    ]);
    expect(linkNames(group('Insights'))).toEqual(['Affiliate Performance']);
    expect(linkNames(group('Admin'))).toEqual(['Clients', 'Brands', 'Users']);

    // Dashboard leads the whole nav, outside every headed group.
    const allLinks = linkNames(screen.getByRole('navigation'));
    expect(allLinks[0]).toBe('Dashboard');
    expect(allLinks).toHaveLength(15);
  });

  it('Inbox links to /conversations', () => {
    renderSidebar(superAdmin);
    expect(screen.getByRole('link', { name: 'Inbox' })).toHaveAttribute('href', '/conversations');
    expect(screen.queryByRole('link', { name: 'Conversations' })).not.toBeInTheDocument();
  });

  it('links Outreach to /outreach', () => {
    renderSidebar(superAdmin);
    expect(screen.getByRole('link', { name: 'Outreach' })).toHaveAttribute('href', '/outreach');
  });

  it('drops Analytics from the nav and files Content under Pipeline', () => {
    renderSidebar(superAdmin);
    expect(screen.queryByRole('link', { name: /analytics/i })).not.toBeInTheDocument();
    expect(linkNames(screen.getByRole('group', { name: 'Pipeline' }))).toContain('Content');
  });

  it('hides Admin heading for a non-admin client user with no visible admin items', () => {
    // The real Admin group always contains Brands (visible to every role), so exercise the
    // rule with an Admin group made only of role-gated items.
    const gatedAdmin: NavGroup[] = [
      { items: [{ name: 'Dashboard', path: '/dashboard', icon: null }] },
      { heading: 'Work', items: [{ name: 'Inbox', path: '/conversations', icon: null }] },
      {
        heading: 'Admin',
        items: [
          { name: 'Clients', path: '/clients', icon: null, internalOnly: true },
          { name: 'Users', path: '/users', icon: null, adminOnly: true },
        ],
      },
    ];

    // Control: an admin sees the heading for this exact config...
    const { unmount } = renderSidebar(superAdmin, { navGroups: gatedAdmin });
    expect(screen.getByText('Admin')).toBeInTheDocument();
    unmount();

    // ...a non-admin client user does not, and the other groups are untouched.
    renderSidebar(clientMarketing, { navGroups: gatedAdmin });
    expect(screen.queryByText('Admin')).not.toBeInTheDocument();
    expect(screen.queryByRole('group', { name: 'Admin' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Clients' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Users' })).not.toBeInTheDocument();
    expect(screen.getByText('Work')).toBeInTheDocument();
  });

  it.each([
    ['super_admin', superAdmin, { Clients: true, 'Review Queue': true, Users: true }],
    ['operator', operator, { Clients: true, 'Review Queue': true, Users: false }],
    ['client_admin', clientAdmin, { Clients: false, 'Review Queue': true, Users: true }],
    ['client_marketing', clientMarketing, { Clients: false, 'Review Queue': false, Users: false }],
  ])('keeps role gating for %s', (_role, user, expected) => {
    renderSidebar(user);
    for (const [name, shown] of Object.entries(expected)) {
      expect(screen.queryByRole('link', { name }) !== null, name).toBe(shown);
    }
    // Brands is unflagged: every role keeps it.
    expect(screen.getByRole('link', { name: 'Brands' })).toBeInTheDocument();
  });

  describe('collapsed rail', () => {
    it('hides group headings and draws a hairline divider between groups', () => {
      renderSidebar(superAdmin, { isOpen: false });

      for (const heading of HEADINGS) {
        expect(screen.queryByText(heading)).not.toBeInTheDocument();
      }
      // Dashboard + four headed groups = five groups, four dividers.
      expect(screen.getAllByRole('separator')).toHaveLength(4);

      // Items stay reachable by name in the icon-only rail.
      expect(screen.getByRole('link', { name: 'Inbox' })).toHaveAttribute('href', '/conversations');
    });

    it('draws no divider for a group with nothing visible', () => {
      const groups: NavGroup[] = [
        { items: [{ name: 'Dashboard', path: '/dashboard', icon: null }] },
        {
          heading: 'Admin',
          items: [{ name: 'Users', path: '/users', icon: null, adminOnly: true }],
        },
        { heading: 'Work', items: [{ name: 'Inbox', path: '/conversations', icon: null }] },
      ];
      renderSidebar(clientMarketing, { isOpen: false, navGroups: groups });

      // Admin is empty for this user, leaving two groups and exactly one divider.
      expect(screen.getAllByRole('separator')).toHaveLength(1);
    });

    it('does not draw dividers when expanded (headings separate the groups instead)', () => {
      renderSidebar(superAdmin, { isOpen: true });
      expect(screen.queryAllByRole('separator')).toHaveLength(0);
    });
  });
});
