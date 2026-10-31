import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createShipment } from '../../lib/api';
import { toast } from '../../lib/toast';
import { ShipmentModal } from './ShipmentModal';

vi.mock('../../lib/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../lib/api')>()),
  createShipment: vi.fn(),
}));
vi.mock('../../lib/toast', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

describe('ShipmentModal', () => {
  it('shows the backend reason when the shipment cannot be created', async () => {
    // The response interceptor rejects with the backend envelope itself.
    vi.mocked(createShipment).mockRejectedValue({
      success: false,
      error: 'Shipping address is incomplete',
    });
    render(
      <ShipmentModal
        isOpen
        onClose={vi.fn()}
        onSuccess={vi.fn()}
        creator={{ id: 'creator-maya', full_name: 'Maya Ortiz' }}
        partnership={{ id: 'p-fall', campaign_id: 'campaign-fall' }}
      />,
    );
    fireEvent.submit(screen.getByRole('button', { name: /create shipment/i }).closest('form')!);
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        'Failed to create shipment: Shipping address is incomplete',
      ),
    );
    expect(vi.mocked(toast.error).mock.calls[0][0]).not.toContain('[object Object]');
  });
});
