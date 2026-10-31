import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { CampaignPerformancePanel } from './CampaignPerformancePanel';
import type { CampaignPerformance } from '../../types';

// Shaped like GET /analytics/campaigns/:id/content-performance for a campaign
// with no affiliate tracking: sales figures are null, not zero.
const performance = (over: Partial<CampaignPerformance> = {}): CampaignPerformance => ({
  total_content: 14,
  published_content: 9,
  total_views: 182000,
  total_likes: 9100,
  total_comments: 640,
  total_engagement: 9740,
  avg_engagement_rate: '5.35',
  total_cost: 3950,
  total_revenue: null,
  total_conversions: null,
  has_sales_data: false,
  roi: null,
  ...over,
});

function renderAnalytics(perfData: CampaignPerformance | null) {
  render(
    <CampaignPerformancePanel
      activeTab="analytics"
      perfData={perfData}
      funnelData={null}
      activities={[]}
      recalculating={false}
      handleRecalculate={vi.fn()}
    />,
  );
}

// A KPI card is its label plus the value (and hint) rendered beside it.
const kpi = (label: string) => within(screen.getByText(label).parentElement as HTMLElement);

describe('CampaignPerformancePanel analytics', () => {
  it('renders em dash when has_sales_data is false', () => {
    renderAnalytics(performance());

    for (const label of ['Total Revenue', 'Conversions', 'ROI']) {
      expect(kpi(label).getByText('—')).toBeInTheDocument();
      expect(kpi(label).getByText('No sales data yet')).toBeInTheDocument();
    }
    // Nothing invented where the unknowns are.
    expect(screen.queryByText(/\$0/)).not.toBeInTheDocument();
    expect(screen.queryByText('0.00x')).not.toBeInTheDocument();
    expect(screen.queryByText('N/A')).not.toBeInTheDocument();
  });

  it('shows revenue, conversions and ROI once there is sales data', () => {
    renderAnalytics(
      performance({
        has_sales_data: true,
        total_revenue: 12400,
        total_conversions: 212,
        roi: 3.13924,
      }),
    );

    expect(kpi('Total Revenue').getByText('$12,400.00')).toBeInTheDocument();
    expect(kpi('Conversions').getByText('212')).toBeInTheDocument();
    expect(kpi('ROI').getByText('3.14x')).toBeInTheDocument();
    expect(screen.queryByText('No sales data yet')).not.toBeInTheDocument();
  });

  it('keeps a real zero as zero when affiliate tracking exists', () => {
    renderAnalytics(
      performance({ has_sales_data: true, total_revenue: 0, total_conversions: 0, roi: 0 }),
    );

    expect(kpi('Total Revenue').getByText('$0.00')).toBeInTheDocument();
    expect(kpi('Conversions').getByText('0')).toBeInTheDocument();
    expect(kpi('ROI').getByText('0.00x')).toBeInTheDocument();
  });

  it('explains an unknown ROI when there are sales but no creator fees to compare', () => {
    renderAnalytics(
      performance({
        has_sales_data: true,
        total_revenue: 500,
        total_conversions: 9,
        total_cost: 0,
        roi: null,
      }),
    );

    expect(kpi('Total Revenue').getByText('$500.00')).toBeInTheDocument();
    expect(kpi('ROI').getByText('—')).toBeInTheDocument();
    expect(kpi('ROI').getByText('No creator fees yet')).toBeInTheDocument();
    expect(screen.queryByText('No sales data yet')).not.toBeInTheDocument();
  });

  it('calls agreed fees "Creator fees" and formats them as money', () => {
    renderAnalytics(performance({ total_cost: 3950 }));

    expect(kpi('Creator fees').getByText('$3,950.00')).toBeInTheDocument();
    expect(screen.queryByText(/total spend/i)).not.toBeInTheDocument();
  });

  it('does not show money as zero before the performance has loaded', () => {
    renderAnalytics(null);

    for (const label of ['Creator fees', 'Total Revenue', 'Conversions', 'ROI']) {
      expect(kpi(label).getByText('—')).toBeInTheDocument();
    }
    // Nothing is known yet, so it must not claim there are no sales.
    expect(screen.queryByText('No sales data yet')).not.toBeInTheDocument();
    expect(screen.queryByText(/\$0/)).not.toBeInTheDocument();
  });
});
