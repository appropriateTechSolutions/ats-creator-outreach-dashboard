import { beforeEach, describe, expect, it } from 'vitest';
import type { InternalAxiosRequestConfig } from 'axios';
import { api, getAttention } from './api';

const empty = { counts: {}, items: [] };

// Answer every request with an API envelope and keep the config each was made with.
let seen: InternalAxiosRequestConfig[];
beforeEach(() => {
  seen = [];
  api.defaults.adapter = async (config) => {
    seen.push(config);
    return {
      data: { success: true, data: empty },
      status: 200,
      statusText: 'OK',
      headers: {},
      config,
    };
  };
});

describe('getAttention', () => {
  // GET /stats/dashboard takes campaignId; /stats/attention takes campaign_id.
  it('sends the campaign as campaign_id', async () => {
    await expect(getAttention('camp-fall')).resolves.toEqual(empty);

    expect(seen).toHaveLength(1);
    expect(seen[0].url).toBe('/stats/attention');
    expect(api.getUri(seen[0])).toMatch(/\/stats\/attention\?campaign_id=camp-fall$/);
  });

  it('leaves the campaign out to ask for every campaign', async () => {
    await getAttention();

    expect(api.getUri(seen[0])).toMatch(/\/stats\/attention$/);
  });
});
