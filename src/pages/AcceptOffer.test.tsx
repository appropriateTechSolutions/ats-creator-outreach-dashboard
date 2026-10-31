import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import AcceptOffer from './AcceptOffer';

const SIGNED = 'data:image/png;base64,SIGNED';

// Shaped like GET /partnerships/public/:id (DECIMAL columns arrive as strings).
const payload = (over: Record<string, unknown> = {}) => ({
  id: 'abc-123',
  status: 'offer_sent',
  flat_fee: '600.00',
  currency: 'USD',
  affiliate_enabled: true,
  affiliate_percentage: '12.00',
  affiliate_code: 'KEISHA12',
  shipment_included: false,
  Campaign: { id: 'camp-1', name: 'Clean Skin Reset', brand_id: 'brand-1' },
  Creator: { id: 'cr-1', full_name: 'Keisha Thompson', handle: 'keishaglowsup', profile_pic: null },
  content: [
    {
      id: 'c1',
      platform: 'instagram',
      content_type: 'instagram_reel',
      due_date: '2026-11-12',
      status: 'pending',
    },
  ],
  ...over,
});

// jsdom has no 2D canvas context, so stand in for the few methods the pad calls.
const makeCtx = () => ({
  beginPath: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  stroke: vi.fn(),
  clearRect: vi.fn(),
  lineWidth: 1,
  lineCap: 'butt',
  lineJoin: 'miter',
});

let ctx: ReturnType<typeof makeCtx>;
let fetchMock: ReturnType<typeof vi.fn>;

const renderPage = (search = '', data: Record<string, unknown> = payload()) => {
  fetchMock.mockImplementation(async (_url: string, init?: RequestInit) => ({
    json: async () => (init?.method === 'POST' ? { success: true } : { success: true, data }),
  }));
  return render(
    <MemoryRouter
      initialEntries={[`/accept-offer/abc-123${search}`]}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <Routes>
        <Route path="/accept-offer/:id" element={<AcceptOffer />} />
      </Routes>
    </MemoryRouter>,
  );
};

const findPad = async () => {
  const pad = (await screen.findByLabelText('Signature pad')) as HTMLCanvasElement;
  // The bitmap is 600x200; pretend CSS shows it at half size, offset from the page origin.
  pad.getBoundingClientRect = () =>
    ({
      left: 10,
      top: 20,
      width: 300,
      height: 100,
      right: 310,
      bottom: 120,
      x: 10,
      y: 20,
      toJSON: () => ({}),
    }) as DOMRect;
  pad.setPointerCapture = vi.fn();
  return pad;
};

const touch = { pointerType: 'touch', button: 0 };

const submitButton = () => screen.getByRole('button', { name: 'Accept Offer' });

beforeEach(() => {
  ctx = makeCtx();
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
    ctx as unknown as CanvasRenderingContext2D,
  );
  vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue(SIGNED);
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('AcceptOffer signature pad', () => {
  it('signature captures pointer strokes', async () => {
    const user = userEvent.setup();
    renderPage();
    const pad = await findPad();

    await user.click(screen.getByLabelText('I agree to the deliverables and compensation above.'));
    // Agreed but nothing drawn: still cannot submit.
    expect(submitButton()).toBeDisabled();

    fireEvent.pointerDown(pad, { pointerId: 7, clientX: 110, clientY: 70, ...touch });
    fireEvent.pointerMove(pad, { pointerId: 7, clientX: 160, clientY: 45, ...touch });
    fireEvent.pointerUp(pad, { pointerId: 7, clientX: 160, clientY: 45, ...touch });

    await waitFor(() => expect(submitButton()).toBeEnabled());

    await user.click(submitButton());
    await screen.findByText('Offer Accepted!');
    const [url, init] = fetchMock.mock.calls.find(([, i]) => i?.method === 'POST')!;
    expect(String(url)).toMatch(/\/partnerships\/public\/abc-123\/accept$/);
    expect(JSON.parse(init.body)).toMatchObject({ terms_accepted: true, signature: SIGNED });
  });

  it('captures the pointer and switches off touch scrolling on the pad', async () => {
    renderPage();
    const pad = await findPad();

    // Without touch-action: none a phone scrolls the page instead of drawing.
    expect(pad.style.touchAction).toBe('none');

    fireEvent.pointerDown(pad, { pointerId: 7, clientX: 110, clientY: 70, ...touch });
    expect(pad.setPointerCapture).toHaveBeenCalledWith(7);
  });

  it('maps pointer positions into bitmap pixels when CSS scales the canvas', async () => {
    renderPage();
    const pad = await findPad();

    fireEvent.pointerDown(pad, { pointerId: 7, clientX: 110, clientY: 70, ...touch });
    fireEvent.pointerMove(pad, { pointerId: 7, clientX: 160, clientY: 45, ...touch });

    // (110-10)*600/300 = 200 and (70-20)*200/100 = 100; likewise 300 and 50.
    expect(ctx.moveTo).toHaveBeenCalledWith(200, 100);
    expect(ctx.lineTo).toHaveBeenCalledWith(300, 50);
    expect(ctx.stroke).toHaveBeenCalledTimes(1);
    // Keep the ink about 2 CSS px wide at any display size (2 * 600/300 bitmap px).
    expect(ctx.lineWidth).toBe(4);
    expect(ctx.lineCap).toBe('round');
  });

  it('strokes each segment once so a long line is not re-inked on every move', async () => {
    renderPage();
    const pad = await findPad();

    fireEvent.pointerDown(pad, { pointerId: 7, clientX: 110, clientY: 70, ...touch });
    fireEvent.pointerMove(pad, { pointerId: 7, clientX: 120, clientY: 60, ...touch });
    fireEvent.pointerMove(pad, { pointerId: 7, clientX: 130, clientY: 50, ...touch });

    // A fresh path at the start and after every segment: stroke() only inks the new piece.
    expect(ctx.stroke).toHaveBeenCalledTimes(2);
    expect(ctx.beginPath).toHaveBeenCalledTimes(3);
    expect(ctx.moveTo).toHaveBeenLastCalledWith(240, 60);
  });

  it('still draws when the browser refuses pointer capture', async () => {
    const user = userEvent.setup();
    renderPage();
    const pad = await findPad();
    pad.setPointerCapture = vi.fn(() => {
      throw new DOMException('Invalid pointer id', 'NotFoundError');
    });
    await user.click(screen.getByLabelText('I agree to the deliverables and compensation above.'));

    fireEvent.pointerDown(pad, { pointerId: 7, clientX: 110, clientY: 70, ...touch });
    fireEvent.pointerMove(pad, { pointerId: 7, clientX: 160, clientY: 45, ...touch });
    fireEvent.pointerUp(pad, { pointerId: 7, clientX: 160, clientY: 45, ...touch });

    expect(ctx.lineTo).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(submitButton()).toBeEnabled());
  });

  it('does not count hovering or a tap without a stroke as a signature', async () => {
    const user = userEvent.setup();
    renderPage();
    const pad = await findPad();
    await user.click(screen.getByLabelText('I agree to the deliverables and compensation above.'));

    // A mouse moving over the pad with no button down.
    fireEvent.pointerMove(pad, { pointerId: 1, clientX: 50, clientY: 50, pointerType: 'mouse' });
    // The pointer leaving the pad without having pressed.
    fireEvent.pointerCancel(pad, { pointerId: 1, pointerType: 'mouse' });
    // A tap: down and up with no movement leaves the canvas blank.
    fireEvent.pointerDown(pad, { pointerId: 2, clientX: 50, clientY: 50, ...touch });
    fireEvent.pointerUp(pad, { pointerId: 2, clientX: 50, clientY: 50, ...touch });

    expect(ctx.lineTo).not.toHaveBeenCalled();
    expect(submitButton()).toBeDisabled();
  });

  it('ignores a second pointer while one is drawing, and moves after release', async () => {
    renderPage();
    const pad = await findPad();

    fireEvent.pointerDown(pad, { pointerId: 1, clientX: 110, clientY: 70, ...touch });
    // A resting palm / second finger must not start another stroke or steal the first.
    fireEvent.pointerDown(pad, { pointerId: 2, clientX: 200, clientY: 90, ...touch });
    fireEvent.pointerMove(pad, { pointerId: 2, clientX: 210, clientY: 95, ...touch });
    expect(ctx.lineTo).not.toHaveBeenCalled();

    fireEvent.pointerMove(pad, { pointerId: 1, clientX: 120, clientY: 75, ...touch });
    expect(ctx.lineTo).toHaveBeenCalledTimes(1);

    // The second finger lifting must not end the first finger's stroke.
    fireEvent.pointerUp(pad, { pointerId: 2, clientX: 210, clientY: 95, ...touch });
    fireEvent.pointerMove(pad, { pointerId: 1, clientX: 125, clientY: 78, ...touch });
    expect(ctx.lineTo).toHaveBeenCalledTimes(2);

    fireEvent.pointerUp(pad, { pointerId: 1, clientX: 125, clientY: 78, ...touch });
    fireEvent.pointerMove(pad, { pointerId: 1, clientX: 130, clientY: 80, ...touch });
    expect(ctx.lineTo).toHaveBeenCalledTimes(2);
  });

  it('ignores a right-click so a context menu cannot leave a stroke stuck open', async () => {
    renderPage();
    const pad = await findPad();

    fireEvent.pointerDown(pad, {
      pointerId: 1,
      clientX: 110,
      clientY: 70,
      pointerType: 'mouse',
      button: 2,
    });
    fireEvent.pointerMove(pad, { pointerId: 1, clientX: 120, clientY: 75, pointerType: 'mouse' });

    expect(pad.setPointerCapture).not.toHaveBeenCalled();
    expect(ctx.lineTo).not.toHaveBeenCalled();
  });

  it('keeps what was drawn when the browser cancels the pointer', async () => {
    const user = userEvent.setup();
    renderPage();
    const pad = await findPad();
    await user.click(screen.getByLabelText('I agree to the deliverables and compensation above.'));

    fireEvent.pointerDown(pad, { pointerId: 7, clientX: 110, clientY: 70, ...touch });
    fireEvent.pointerMove(pad, { pointerId: 7, clientX: 160, clientY: 45, ...touch });
    fireEvent.pointerCancel(pad, { pointerId: 7, ...touch });

    await waitFor(() => expect(submitButton()).toBeEnabled());
  });

  it('lets the creator clear the pad and sign again', async () => {
    const user = userEvent.setup();
    renderPage();
    const pad = await findPad();
    await user.click(screen.getByLabelText('I agree to the deliverables and compensation above.'));

    fireEvent.pointerDown(pad, { pointerId: 7, clientX: 110, clientY: 70, ...touch });
    fireEvent.pointerMove(pad, { pointerId: 7, clientX: 160, clientY: 45, ...touch });
    fireEvent.pointerUp(pad, { pointerId: 7, clientX: 160, clientY: 45, ...touch });
    await waitFor(() => expect(submitButton()).toBeEnabled());

    await user.click(screen.getByRole('button', { name: 'Clear' }));
    expect(ctx.clearRect).toHaveBeenCalledWith(0, 0, 600, 200);
    expect(submitButton()).toBeDisabled();

    // A tap after clearing is still not a signature.
    fireEvent.pointerDown(pad, { pointerId: 8, clientX: 50, clientY: 50, ...touch });
    fireEvent.pointerUp(pad, { pointerId: 8, clientX: 50, clientY: 50, ...touch });
    expect(submitButton()).toBeDisabled();

    fireEvent.pointerDown(pad, { pointerId: 9, clientX: 110, clientY: 70, ...touch });
    fireEvent.pointerMove(pad, { pointerId: 9, clientX: 160, clientY: 45, ...touch });
    fireEvent.pointerUp(pad, { pointerId: 9, clientX: 160, clientY: 45, ...touch });
    await waitFor(() => expect(submitButton()).toBeEnabled());
  });
});

describe('AcceptOffer page', () => {
  it('shows the offer summary and asks for agreement to it, not to unwritten terms', async () => {
    renderPage();

    const summary = await screen.findByRole('region', { name: 'Offer summary' });
    expect(summary).toHaveTextContent('$600.00');
    expect(summary).toHaveTextContent('KEISHA12');
    expect(summary).toHaveTextContent('Instagram · Reel · Due Nov 12, 2026');

    expect(
      screen.getByLabelText('I agree to the deliverables and compensation above.'),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Terms & Conditions/i)).not.toBeInTheDocument();
  });

  it('keeps the decline form working and shows the terms being declined', async () => {
    const user = userEvent.setup();
    renderPage('?reject=true');

    await screen.findByRole('heading', { name: 'Provide Feedback' });
    expect(screen.getByRole('region', { name: 'Offer summary' })).toHaveTextContent('$600.00');
    expect(screen.queryByLabelText('Signature pad')).not.toBeInTheDocument();

    await user.type(screen.getByPlaceholderText(/feedback or counter-offer/i), 'Can we do $800?');
    await user.click(screen.getByRole('button', { name: 'Submit Feedback' }));

    await screen.findByText('Feedback Submitted');
    const [url, init] = fetchMock.mock.calls.find(([, i]) => i?.method === 'POST')!;
    expect(String(url)).toMatch(/\/partnerships\/public\/abc-123\/reject$/);
    expect(JSON.parse(init.body)).toEqual({ feedback: 'Can we do $800?' });
  });

  it('keeps the address-only form for an already accepted offer', async () => {
    renderPage('', payload({ status: 'offer_accepted' }));

    await screen.findByRole('heading', { name: 'Provide Shipping Address' });
    expect(screen.queryByLabelText('Signature pad')).not.toBeInTheDocument();
    expect(
      screen.queryByLabelText('I agree to the deliverables and compensation above.'),
    ).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Submit Address' })).toBeEnabled();
  });
});
