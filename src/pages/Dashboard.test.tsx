import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import type { Campaign, Creator, DashboardStats } from '../types';
import Dashboard from './Dashboard';

const state = vi.hoisted(() => ({
  stats: undefined as unknown,
  creators: [] as unknown[],
  campaigns: [] as unknown[],
  statsRequests: [] as Array<string | undefined>,
}));

vi.mock('../hooks/queries', () => ({
  useCampaigns: () => ({ data: state.campaigns }),
  useAllCreators: () => ({ data: state.creators }),
  useDashboardStats: (campaignId?: string) => {
    state.statsRequests.push(campaignId);
    return { data: state.stats, isLoading: false, refetch: vi.fn() };
  },
}));
vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { role: 'super_admin' } }),
}));
// The card has its own tests; here only the campaign it is handed matters.
vi.mock('../components/dashboard/NeedsAttention', () => ({
  NeedsAttention: ({ campaignId }: { campaignId?: string }) => (
    <section data-testid="needs-attention" data-campaign-id={campaignId ?? ''} />
  ),
}));
// Radix Select needs pointer APIs jsdom lacks; a native select exposes the same props.
vi.mock('../components/ui/Select', () => ({
  Select: ({
    value,
    onChange,
    options,
    ariaLabel,
  }: {
    value: string;
    onChange: (value: string) => void;
    options: Array<{ value: string; label: string }>;
    ariaLabel?: string;
  }) => (
    <select aria-label={ariaLabel} value={value} onChange={(e) => onChange(e.target.value)}>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  ),
}));

// Shaped like GET /stats/dashboard. Sent (36), the New stage (60) and the
// creator total (60) are the backend's; the creators list below is smaller.
const dashboardStats = (): DashboardStats => ({
  kpis: {
    totalCreators: { value: 60, trend: 0 },
    totalCampaigns: { value: 6 },
    totalClients: { value: 2 },
    contacted: { value: 36 },
    replied: { value: 30, trend: 0 },
    qualified: { value: 24 },
    converted: { value: 12, trend: 0 },
  },
  funnel: { new: 60, contacted: 36, replied: 30, qualified: 24, converted: 12 },
  outreachQueue: { pending: 43, sent: 36, failed: 8 },
  recentActivity: [],
});

// A row of GET /creators that clears the dashboard's "qualified" floor.
const creator = (id: string, lifecycle: string): Creator =>
  ({
    id,
    handle: id,
    followers: 5000,
    review_status: 'approved',
    lifecycle_status: lifecycle,
    campaign_id: 'camp-fall',
    campaign_ids: ['camp-fall'],
  }) as Creator;

const kpi = (title: string) =>
  within(
    screen.getByRole('heading', { level: 3, name: title }).parentElement
      ?.parentElement as HTMLElement,
  );
// Replied, Qualified and Converted are also KPI titles, so look inside the funnel card.
const funnelRow = (label: string) => {
  const card = screen.getByRole('heading', { name: 'Pipeline Funnel' }).closest('.bg-white');
  return within(card as HTMLElement).getByText(label).parentElement as HTMLElement;
};
const queueTile = (label: string) =>
  screen.getByText(label).closest('[role=button]') as HTMLElement;

function renderDashboard() {
  render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Dashboard />
    </MemoryRouter>,
  );
}

describe('Dashboard', () => {
  beforeEach(() => {
    state.stats = dashboardStats();
    // Two of these four creators are 'contacted': the count the page used to show as sent.
    state.creators = [
      creator('a', 'contacted'),
      creator('b', 'contacted'),
      creator('c', 'engaged'),
      creator('d', 'new'),
    ];
    state.campaigns = [
      { id: 'camp-fall', name: 'Fall Flavor Drop' },
      { id: 'camp-zero', name: 'Zero Sugar Launch Seeding' },
    ] as Campaign[];
    state.statsRequests = [];
  });

  it('shows one Sent figure: the Sent KPI and the queue tile agree', () => {
    renderDashboard();

    expect(kpi('Sent').getByText('36')).toBeInTheDocument();
    expect(within(queueTile('Total Sent')).getByText('36')).toBeInTheDocument();
    expect(within(queueTile('Total Sent')).queryByText('2')).not.toBeInTheDocument();
  });

  it('opens the outreach log from the Total Sent tile, where all sent emails are listed', async () => {
    render(
      <MemoryRouter
        initialEntries={['/']}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/outreach" element={<p>Outreach log</p>} />
          <Route path="/creators" element={<p>Creators list</p>} />
        </Routes>
      </MemoryRouter>,
    );
    await userEvent.click(queueTile('Total Sent'));
    expect(await screen.findByText('Outreach log')).toBeInTheDocument();
    expect(screen.queryByText('Creators list')).not.toBeInTheDocument();
  });

  it('takes the creator total and the New stage from the backend', () => {
    renderDashboard();

    expect(kpi('Creators').getByText('60')).toBeInTheDocument();
    expect(within(funnelRow('New')).getByText('60')).toBeInTheDocument();
  });

  it('sizes the funnel bars against the backend New stage', () => {
    renderDashboard();

    const bar = (label: string) =>
      (funnelRow(label).children[1].firstElementChild as HTMLElement).style.width;
    expect(bar('New')).toBe('100%');
    // 36 of 60, not 36 of the four creators the page has loaded.
    expect(bar('Contacted')).toBe('60%');
    expect(bar('Converted')).toBe('20%');
  });

  it('explains that every funnel stage counts creators who got at least that far', () => {
    renderDashboard();

    const title = screen.getByRole('heading', { name: 'Pipeline Funnel' });
    expect(
      within(title.parentElement as HTMLElement).getByText(
        'Each stage counts creators who reached at least that stage.',
      ),
    ).toBeInTheDocument();
  });

  it('draws an empty funnel as empty', () => {
    const empty = dashboardStats();
    empty.funnel = { new: 0, contacted: 0, replied: 0, qualified: 0, converted: 0 };
    state.stats = empty;
    renderDashboard();

    for (const label of ['New', 'Contacted', 'Converted']) {
      expect((funnelRow(label).children[1].firstElementChild as HTMLElement).style.width).toBe(
        '0%',
      );
    }
  });

  it('replaces Top Discovery Leads with Needs attention', () => {
    renderDashboard();

    expect(screen.getByTestId('needs-attention')).toBeInTheDocument();
    expect(screen.queryByText('Top Discovery Leads')).not.toBeInTheDocument();
  });

  it('hands the selected campaign to the stats and to Needs attention', async () => {
    renderDashboard();
    expect(screen.getByTestId('needs-attention')).toHaveAttribute('data-campaign-id', '');

    await userEvent.selectOptions(screen.getByLabelText('Filter by campaign'), 'camp-fall');

    expect(screen.getByTestId('needs-attention')).toHaveAttribute('data-campaign-id', 'camp-fall');
    expect(state.statsRequests[state.statsRequests.length - 1]).toBe('camp-fall');
  });
});
