import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { acceptPublicOffer, fetchPublicOffer, rejectPublicOffer } from './publicOfferApi';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const firstCall = () => {
  const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit | undefined];
  return { url: new URL(url), init };
};

describe('public offer API: forwarding the signed link', () => {
  // requireOfferToken reads token/exp from the query string (or the body) on all three routes.
  const link = { token: 'abc123', exp: '1893456000000' };

  it('sends token and exp as query parameters on the GET', async () => {
    fetchMock.mockImplementation(async () =>
      json({ success: true, data: { status: 'offer_sent' } }),
    );

    const offer = await fetchPublicOffer('p-1', link);

    const { url, init } = firstCall();
    expect(url.pathname).toMatch(/\/partnerships\/public\/p-1$/);
    expect(url.searchParams.get('token')).toBe('abc123');
    expect(url.searchParams.get('exp')).toBe('1893456000000');
    expect(init?.method ?? 'GET').toBe('GET');
    expect(offer).toEqual({ status: 'offer_sent' });
  });

  it('sends them on the accept POST, with the form as the JSON body', async () => {
    fetchMock.mockImplementation(async () => json({ success: true, message: 'ok' }));

    await acceptPublicOffer('p-1', link, { terms_accepted: true, signature: 'data:image/png;x' });

    const { url, init } = firstCall();
    expect(url.pathname).toMatch(/\/partnerships\/public\/p-1\/accept$/);
    expect(url.searchParams.get('token')).toBe('abc123');
    expect(url.searchParams.get('exp')).toBe('1893456000000');
    expect(init?.method).toBe('POST');
    expect(init?.headers).toMatchObject({ 'Content-Type': 'application/json' });
    expect(JSON.parse(String(init?.body))).toEqual({
      terms_accepted: true,
      signature: 'data:image/png;x',
    });
  });

  it('sends them on the reject POST, with the feedback as the JSON body', async () => {
    fetchMock.mockImplementation(async () => json({ success: true }));

    await rejectPublicOffer('p-1', link, 'Can we do $800?');

    const { url, init } = firstCall();
    expect(url.pathname).toMatch(/\/partnerships\/public\/p-1\/reject$/);
    expect(url.searchParams.get('token')).toBe('abc123');
    expect(url.searchParams.get('exp')).toBe('1893456000000');
    expect(init?.method).toBe('POST');
    expect(JSON.parse(String(init?.body))).toEqual({ feedback: 'Can we do $800?' });
  });

  it('adds nothing to the URL when the link has no token or exp', async () => {
    fetchMock.mockImplementation(async () =>
      json({ success: true, data: { status: 'offer_sent' } }),
    );

    await fetchPublicOffer('p-1', {});
    await fetchPublicOffer('p-1', { token: null, exp: null });
    await fetchPublicOffer('p-1', { token: '', exp: '' });

    for (const [url] of fetchMock.mock.calls) {
      expect(new URL(String(url)).search).toBe('');
    }
  });

  it('forwards whichever half of the link it has', async () => {
    fetchMock.mockImplementation(async () =>
      json({ success: true, data: { status: 'offer_sent' } }),
    );

    await fetchPublicOffer('p-1', { token: 'abc123' });

    const { url } = firstCall();
    expect(url.searchParams.get('token')).toBe('abc123');
    expect(url.searchParams.has('exp')).toBe(false);
  });

  it('encodes the values instead of splicing them into the URL', async () => {
    fetchMock.mockImplementation(async () =>
      json({ success: true, data: { status: 'offer_sent' } }),
    );

    await fetchPublicOffer('p-1', { token: 'a b&c=d', exp: '1' });

    const { url } = firstCall();
    expect(url.searchParams.get('token')).toBe('a b&c=d');
    expect(url.searchParams.has('c')).toBe(false);
  });

  it('keeps the token out of the request body', async () => {
    fetchMock.mockImplementation(async () => json({ success: true }));

    await acceptPublicOffer('p-1', link, { terms_accepted: true });

    expect(String(firstCall().init?.body)).not.toContain('abc123');
  });
});

describe('public offer API: failures become messages a creator can read', () => {
  const fails = async (call: () => Promise<unknown>, message: string) => {
    const error = await call().then(
      () => null,
      (e: unknown) => e,
    );
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toBe(message);
  };

  const RATE_LIMITED = 'Too many attempts. Please wait a few minutes and try again.';
  const EXPIRED = 'This link has expired. Please ask your contact at Qui for a new one.';

  it('explains a 429 from the rate limiter', async () => {
    // The backend's real body: error is an object, which used to be rendered as a React child.
    fetchMock.mockImplementation(async () =>
      json(
        {
          success: false,
          error: { code: 'RATE_LIMITED', message: 'Too many requests, please try again later.' },
        },
        429,
      ),
    );

    await fails(() => fetchPublicOffer('p-1', {}), RATE_LIMITED);
    await fails(() => acceptPublicOffer('p-1', {}, {}), RATE_LIMITED);
    await fails(() => rejectPublicOffer('p-1', {}, 'x'), RATE_LIMITED);
  });

  it('recognises the rate limiter by its code as well as its status', async () => {
    fetchMock.mockImplementation(async () =>
      json({ success: false, error: { code: 'RATE_LIMITED', message: 'slow down' } }, 400),
    );

    await fails(() => fetchPublicOffer('p-1', {}), RATE_LIMITED);
  });

  it('treats any 429 as rate-limited, even from a proxy with no JSON body', async () => {
    fetchMock.mockImplementation(async () => new Response('Too Many Requests', { status: 429 }));

    await fails(() => fetchPublicOffer('p-1', {}), RATE_LIMITED);
  });

  it('recognises an invalid link by its code as well as its status', async () => {
    fetchMock.mockImplementation(async () =>
      json({ success: false, error: { code: 'INVALID_OFFER_LINK', message: 'nope' } }, 410),
    );

    await fails(() => fetchPublicOffer('p-1', {}), EXPIRED);
  });

  it('tells the creator an invalid or expired link has expired (403)', async () => {
    fetchMock.mockImplementation(async () =>
      json(
        {
          success: false,
          error: { code: 'INVALID_OFFER_LINK', message: 'This link is invalid or has expired.' },
        },
        403,
      ),
    );

    await fails(() => fetchPublicOffer('p-1', {}), EXPIRED);
    await fails(() => acceptPublicOffer('p-1', {}, {}), EXPIRED);
    await fails(() => rejectPublicOffer('p-1', {}, 'x'), EXPIRED);
  });

  it('treats any 403 as an expired link, even without a body', async () => {
    fetchMock.mockImplementation(async () => new Response('', { status: 403 }));

    await fails(() => fetchPublicOffer('p-1', {}), EXPIRED);
  });

  it('shows a plain string error as it is', async () => {
    fetchMock.mockImplementation(async () =>
      json({ success: false, error: 'Shipping address is required for product campaigns' }, 400),
    );

    await fails(
      () => acceptPublicOffer('p-1', {}, {}),
      'Shipping address is required for product campaigns',
    );
  });

  it('unwraps an error object to its message instead of passing the object on', async () => {
    fetchMock.mockImplementation(async () =>
      json({ success: false, error: { code: 'SOMETHING', message: 'Boom' } }, 500),
    );

    await fails(() => fetchPublicOffer('p-1', {}), 'Boom');
  });

  it('falls back to the generic message when the body is not JSON', async () => {
    fetchMock.mockImplementation(
      async () => new Response('<html>Bad gateway</html>', { status: 502 }),
    );

    await fails(() => fetchPublicOffer('p-1', {}), 'Something went wrong. Please try again.');
  });

  it('falls back to the generic message when the error has nothing displayable', async () => {
    fetchMock.mockImplementation(async () => json({ success: false, error: { code: 'X' } }, 500));

    await fails(() => acceptPublicOffer('p-1', {}, {}), 'Something went wrong. Please try again.');
  });

  it('treats success: false on a 200 as a failure', async () => {
    fetchMock.mockImplementation(async () =>
      json({ success: false, error: 'Proposal not found' }, 200),
    );

    await fails(() => fetchPublicOffer('p-1', {}), 'Proposal not found');
  });

  it('says so when the server cannot be reached', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));

    const message = "We couldn't reach the server. Check your connection and try again.";
    await fails(() => fetchPublicOffer('p-1', {}), message);
    await fails(() => acceptPublicOffer('p-1', {}, {}), message);
  });

  it('reports a proposal that came back empty as not found', async () => {
    fetchMock.mockImplementation(async () => json({ success: true, data: null }));

    await fails(() => fetchPublicOffer('p-1', {}), 'Proposal not found');
  });
});
