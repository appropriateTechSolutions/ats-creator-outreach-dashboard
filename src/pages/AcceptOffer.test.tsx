import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { toast } from '../lib/toast';
import AcceptOffer from './AcceptOffer';

// Toasts are how POST failures reach the creator; capture them instead of rendering.
vi.mock('../lib/toast', () => ({
  toast: { error: vi.fn(), success: vi.fn(), warning: vi.fn(), info: vi.fn(), show: vi.fn() },
}));

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

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

// GET returns the proposal; POSTs (accept / reject) answer with `post`.
const serve = (
  data: Record<string, unknown> = payload(),
  post: () => Response = () => json({ success: true }),
) => {
  fetchMock.mockImplementation(async (_url: string, init?: RequestInit) =>
    init?.method === 'POST' ? post() : json({ success: true, data }),
  );
};

const mount = (search = '') =>
  render(
    <MemoryRouter
      initialEntries={[`/accept-offer/abc-123${search}`]}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <Routes>
        <Route path="/accept-offer/:id" element={<AcceptOffer />} />
      </Routes>
    </MemoryRouter>,
  );

const renderPage = (search = '', data: Record<string, unknown> = payload()) => {
  serve(data);
  return mount(search);
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

const AGREE = 'I agree to the deliverables and compensation above.';

// One finger stroke across the (mocked, half-size) pad.
const sign = (pad: HTMLCanvasElement) => {
  fireEvent.pointerDown(pad, { pointerId: 7, clientX: 110, clientY: 70, ...touch });
  fireEvent.pointerMove(pad, { pointerId: 7, clientX: 160, clientY: 45, ...touch });
  fireEvent.pointerUp(pad, { pointerId: 7, clientX: 160, clientY: 45, ...touch });
};

const posts = () => fetchMock.mock.calls.filter(([, init]) => init?.method === 'POST');

beforeEach(() => {
  ctx = makeCtx();
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
    ctx as unknown as CanvasRenderingContext2D,
  );
  vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue(SIGNED);
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
  vi.mocked(toast.error).mockClear();
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

    await user.click(screen.getByRole('button', { name: 'Clear signature' }));
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
});

describe('AcceptOffer link token', () => {
  const link = 'token=abc123&exp=1893456000000';
  const paramsOf = (call: unknown[]) => new URL(String(call[0])).searchParams;

  it('forwards token and exp to the public API', async () => {
    const user = userEvent.setup();
    renderPage(`?${link}`);
    const pad = await findPad();

    // The page load.
    const load = paramsOf(fetchMock.mock.calls[0]);
    expect(load.get('token')).toBe('abc123');
    expect(load.get('exp')).toBe('1893456000000');

    // The accept POST.
    await user.click(screen.getByLabelText(AGREE));
    sign(pad);
    await waitFor(() => expect(submitButton()).toBeEnabled());
    await user.click(submitButton());
    await screen.findByText('Offer Accepted!');
    const accept = paramsOf(posts()[0]);
    expect(accept.get('token')).toBe('abc123');
    expect(accept.get('exp')).toBe('1893456000000');
  });

  it('forwards token and exp on the decline link too, without the reject flag', async () => {
    const user = userEvent.setup();
    renderPage(`?reject=true&${link}`);
    await screen.findByRole('heading', { name: 'Provide Feedback' });

    await user.type(screen.getByPlaceholderText(/feedback or counter-offer/i), 'Too low');
    await user.click(screen.getByRole('button', { name: 'Submit Feedback' }));
    await screen.findByText('Feedback Submitted');

    for (const call of [fetchMock.mock.calls[0], posts()[0]]) {
      const params = paramsOf(call);
      expect(params.get('token')).toBe('abc123');
      expect(params.get('exp')).toBe('1893456000000');
      expect(params.has('reject')).toBe(false);
    }
  });

  it('sends no token or exp when the link has none', async () => {
    renderPage();
    await findPad();

    expect(new URL(String(fetchMock.mock.calls[0][0])).search).toBe('');
  });
});

describe('AcceptOffer errors', () => {
  const RATE_LIMITED = 'Too many attempts. Please wait a few minutes and try again.';
  const EXPIRED = 'This link has expired. Please ask your contact at Qui for a new one.';
  const rateLimited = () =>
    json(
      {
        success: false,
        error: { code: 'RATE_LIMITED', message: 'Too many requests, please try again later.' },
      },
      429,
    );
  const badLink = () =>
    json(
      {
        success: false,
        error: { code: 'INVALID_OFFER_LINK', message: 'This link is invalid or has expired.' },
      },
      403,
    );

  const expectCouldNotOpen = async (message: string) => {
    expect(await screen.findByText(message)).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: "We couldn't open this proposal" }),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText('Signature pad')).not.toBeInTheDocument();
    expect(document.body).not.toHaveTextContent('[object Object]');
  };

  it('shows a friendly message, not the error object, when the page is rate-limited', async () => {
    fetchMock.mockResolvedValue(rateLimited());
    mount();

    await expectCouldNotOpen(RATE_LIMITED);
  });

  it('tells the creator an invalid or expired link has expired', async () => {
    fetchMock.mockResolvedValue(badLink());
    mount('?token=old&exp=1');

    await expectCouldNotOpen(EXPIRED);
  });

  it('shows the server text for an unknown proposal', async () => {
    fetchMock.mockResolvedValue(json({ success: false, error: 'Proposal not found' }, 404));
    mount();

    await expectCouldNotOpen('Proposal not found');
  });

  it('shows the message inside an error object rather than rendering the object', async () => {
    fetchMock.mockResolvedValue(
      json({ success: false, error: { code: 'SOMETHING', message: 'Boom' } }, 500),
    );
    mount();

    await expectCouldNotOpen('Boom');
  });

  it('says so when the server cannot be reached', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
    mount();

    await expectCouldNotOpen("We couldn't reach the server. Check your connection and try again.");
  });

  it('toasts the friendly message when accepting is rate-limited, and stays on the form', async () => {
    const user = userEvent.setup();
    serve(payload(), rateLimited);
    mount();
    const pad = await findPad();
    await user.click(screen.getByLabelText(AGREE));
    sign(pad);
    await waitFor(() => expect(submitButton()).toBeEnabled());

    await user.click(submitButton());

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(RATE_LIMITED));
    expect(screen.queryByText('Offer Accepted!')).not.toBeInTheDocument();
    await waitFor(() => expect(submitButton()).toBeEnabled());
  });

  it('toasts the server text when accepting is refused for another reason', async () => {
    const user = userEvent.setup();
    serve(payload(), () => json({ success: false, error: 'Proposal declined' }, 400));
    mount();
    const pad = await findPad();
    await user.click(screen.getByLabelText(AGREE));
    sign(pad);
    await waitFor(() => expect(submitButton()).toBeEnabled());

    await user.click(submitButton());

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Proposal declined'));
  });

  it('toasts the expired-link message when sending feedback with a bad link', async () => {
    const user = userEvent.setup();
    serve(payload(), badLink);
    mount('?reject=true');
    await screen.findByRole('heading', { name: 'Provide Feedback' });

    await user.type(screen.getByPlaceholderText(/feedback or counter-offer/i), 'Too low');
    await user.click(screen.getByRole('button', { name: 'Submit Feedback' }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(EXPIRED));
    expect(screen.queryByText('Feedback Submitted')).not.toBeInTheDocument();
  });
});

describe('AcceptOffer status', () => {
  const heading = () => screen.findByRole('heading', { name: 'Provide Shipping Address' });

  it('accepted partnership shows the accepted state, not the form', async () => {
    renderPage('', payload({ status: 'accepted' }));

    await heading();
    expect(screen.queryByLabelText('Signature pad')).not.toBeInTheDocument();
    expect(screen.queryByLabelText(AGREE)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Accept Offer' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Submit Address' })).toBeEnabled();
    expect(screen.getByRole('region', { name: 'Offer summary' })).toBeInTheDocument();
  });

  it('shows the accepted state for every later status too', async () => {
    for (const status of [
      'activated',
      'product_shipped',
      'product_delivered',
      'content_pending',
      'content_submitted',
      'content_approved',
      'live',
      'completed',
    ]) {
      const { unmount } = renderPage('', payload({ status }));
      await heading();
      expect(screen.queryByLabelText('Signature pad'), status).not.toBeInTheDocument();
      unmount();
    }
  });

  it('does not offer the form for a status the backend never sends', async () => {
    // offer_accepted / contract_signed / active used to count as accepted but do not exist.
    renderPage('', payload({ status: 'offer_accepted' }));

    expect(await screen.findByLabelText('Signature pad')).toBeInTheDocument();
  });

  it('shows a rejected proposal as declined, with no form', async () => {
    renderPage('', payload({ status: 'rejected' }));

    expect(await screen.findByRole('heading', { name: 'Proposal declined' })).toBeInTheDocument();
    expect(screen.getByText(/no longer be accepted/)).toBeInTheDocument();
    expect(screen.queryByLabelText('Signature pad')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Accept Offer' })).not.toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Offer summary' })).not.toBeInTheDocument();
  });

  it('inactive offer shows unavailable card, no form', async () => {
    for (const search of ['', '?reject=true']) {
      const { unmount } = renderPage(search, payload({ status: 'inactive' }));

      expect(
        await screen.findByRole('heading', { name: 'Offer unavailable' }),
        search,
      ).toBeInTheDocument();
      expect(screen.getByText('This offer is no longer available.')).toBeInTheDocument();
      expect(screen.queryByLabelText('Signature pad')).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Accept Offer' })).not.toBeInTheDocument();
      expect(screen.queryByRole('heading', { name: 'Provide Feedback' })).not.toBeInTheDocument();
      expect(screen.queryByRole('region', { name: 'Offer summary' })).not.toBeInTheDocument();
      expect(screen.queryByRole('heading', { name: 'Proposal declined' })).not.toBeInTheDocument();
      unmount();
    }
  });

  it('treats negotiating as feedback sent, not declined', async () => {
    renderPage('', payload({ status: 'negotiating' }));

    expect(
      await screen.findByText(
        "Thanks, we've received your feedback. Our campaign manager will be in touch.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Proposal declined' })).not.toBeInTheDocument();
    // The offer is still there to read and act on.
    expect(screen.getByRole('region', { name: 'Offer summary' })).toBeInTheDocument();
    expect(screen.getByLabelText('Signature pad')).toBeInTheDocument();
  });

  it('does not show the feedback-sent notice on an open offer', async () => {
    renderPage();

    await findPad();
    expect(screen.queryByText(/received your feedback/)).not.toBeInTheDocument();
  });

  it('does not repeat the feedback-sent notice above the decline form', async () => {
    renderPage('?reject=true', payload({ status: 'negotiating' }));

    await screen.findByRole('heading', { name: 'Provide Feedback' });
    expect(screen.queryByText(/received your feedback/)).not.toBeInTheDocument();
  });
});

describe('AcceptOffer shipping address', () => {
  const ships = () => payload({ shipment_included: true });
  const messages = [
    'Address line 1 is required',
    'City is required',
    'State or province is required',
    'ZIP or postal code is required',
  ];
  const line1 = () => screen.getByLabelText(/^Address Line 1/);

  const signAndAgree = async (user: ReturnType<typeof userEvent.setup>) => {
    const pad = await findPad();
    await user.click(screen.getByLabelText(AGREE));
    sign(pad);
    await waitFor(() => expect(submitButton()).toBeEnabled());
  };

  it('labels the address as required when the offer ships product', async () => {
    renderPage('', ships());

    expect(await screen.findByRole('heading', { name: 'Shipping address' })).toBeInTheDocument();
    expect(screen.queryByText(/optional/i)).not.toBeInTheDocument();
    for (const label of [/^Address Line 1/, /^City/, /^State \/ Province/, /^ZIP \/ Postal Code/]) {
      expect(screen.getByLabelText(label)).toHaveAttribute('aria-required', 'true');
    }
    // Line 2 and the pre-filled country are not required by the API.
    expect(screen.getByLabelText(/^Address Line 2/)).not.toHaveAttribute('aria-required');
    expect(screen.getByLabelText(/^Country/)).not.toHaveAttribute('aria-required');
  });

  it('keeps the address optional when no product ships', async () => {
    renderPage();

    expect(
      await screen.findByRole('heading', { name: 'Shipping address (optional)' }),
    ).toBeInTheDocument();
    expect(line1()).not.toHaveAttribute('aria-required');
    expect(screen.queryByText(/is required/)).not.toBeInTheDocument();
  });

  it('stacks the address fields on a phone and pairs them from the sm breakpoint', async () => {
    renderPage('', ships());
    await screen.findByRole('heading', { name: 'Shipping address' });

    // A bare col-span-2 in this one-column grid adds a second track, squeezing City and ZIP
    // to a sliver on a phone; spanning from sm: leaves one column below that breakpoint.
    for (const label of [/^Address Line 1/, /^Address Line 2/]) {
      const field = screen.getByLabelText(label).parentElement!;
      expect(field).toHaveClass('sm:col-span-2');
      expect(field).not.toHaveClass('col-span-2');
    }
  });

  it('blocks accepting with an inline message under each empty required field', async () => {
    const user = userEvent.setup();
    renderPage('', ships());
    await signAndAgree(user);
    // Nothing is shown until the creator tries to submit.
    expect(screen.queryByText(messages[0])).not.toBeInTheDocument();

    await user.click(submitButton());

    for (const message of messages) expect(screen.getByText(message)).toBeInTheDocument();
    expect(line1()).toHaveAttribute('aria-invalid', 'true');
    expect(line1()).toHaveAccessibleDescription('Address line 1 is required');
    expect(line1()).toHaveFocus();
    expect(screen.getByLabelText(/^Address Line 2/)).not.toHaveAttribute('aria-invalid');
    expect(posts()).toHaveLength(0);
  });

  it('clears each message as its field is filled, then sends the address', async () => {
    const user = userEvent.setup();
    renderPage('', ships());
    await signAndAgree(user);
    await user.click(submitButton());

    await user.type(line1(), '1 Main St');
    expect(screen.queryByText(messages[0])).not.toBeInTheDocument();
    expect(screen.getByText(messages[1])).toBeInTheDocument();

    await user.type(screen.getByLabelText(/^City/), 'Austin');
    await user.type(screen.getByLabelText(/^State \/ Province/), 'TX');
    await user.type(screen.getByLabelText(/^ZIP \/ Postal Code/), '78701');
    for (const message of messages) expect(screen.queryByText(message)).not.toBeInTheDocument();

    await user.click(submitButton());

    await screen.findByText('Offer Accepted!');
    expect(JSON.parse(posts()[0][1].body)).toMatchObject({
      shipping_address_line1: '1 Main St',
      shipping_city: 'Austin',
      shipping_state: 'TX',
      shipping_zip: '78701',
      terms_accepted: true,
    });
  });

  it('treats a field with only spaces as empty', async () => {
    const user = userEvent.setup();
    renderPage('', ships());
    await signAndAgree(user);
    await user.type(line1(), '   ');
    await user.type(screen.getByLabelText(/^City/), 'Austin');
    await user.type(screen.getByLabelText(/^State \/ Province/), 'TX');
    await user.type(screen.getByLabelText(/^ZIP \/ Postal Code/), '78701');

    await user.click(submitButton());

    expect(screen.getByText('Address line 1 is required')).toBeInTheDocument();
    expect(posts()).toHaveLength(0);
  });

  it('requires the address on the accepted state too when product ships', async () => {
    const user = userEvent.setup();
    renderPage('', payload({ status: 'accepted', shipment_included: true }));
    await screen.findByRole('heading', { name: 'Provide Shipping Address' });

    await user.click(screen.getByRole('button', { name: 'Submit Address' }));

    for (const message of messages) expect(screen.getByText(message)).toBeInTheDocument();
    expect(posts()).toHaveLength(0);
  });

  it('still lets the accepted state submit when no product ships', async () => {
    const user = userEvent.setup();
    renderPage('', payload({ status: 'accepted', shipment_included: false }));
    await screen.findByRole('heading', { name: 'Provide Shipping Address' });

    await user.click(screen.getByRole('button', { name: 'Submit Address' }));

    await screen.findByText('Address Received!');
    expect(posts()).toHaveLength(1);
  });
});

describe('AcceptOffer signature controls', () => {
  it('puts Clear below the signature pad instead of over it', async () => {
    renderPage();
    const pad = await findPad();

    const clear = screen.getByRole('button', { name: 'Clear signature' });
    // Not inside the pad's frame, not absolutely positioned over it, and after it in the page.
    expect(pad.parentElement).not.toContainElement(clear);
    expect(clear.closest('.absolute')).toBeNull();
    expect(pad.compareDocumentPosition(clear) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});
