import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ReverseGeocodingService } from './reverse-geocoding.service.js';

test('reverse geocoding returns and caches the provider locality', async () => {
  const originalFetch = globalThis.fetch;
  const originalBaseUrl = process.env.GEOCODING_BASE_URL;
  const originalUserAgent = process.env.GEOCODING_USER_AGENT;
  process.env.GEOCODING_BASE_URL = 'https://nominatim.example.test/reverse';
  process.env.GEOCODING_USER_AGENT = 'ManaTown Digital test';
  let requests = 0;
  let requestedUrl: URL | undefined;
  let requestedUserAgent: string | undefined;
  globalThis.fetch = (async (input, init) => {
    requests += 1;
    requestedUrl = new URL(String(input));
    requestedUserAgent = new Headers(init?.headers).get('User-Agent') ?? '';
    return new Response(JSON.stringify({ address: { town: 'Uravakonda' } }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }) as typeof fetch;

  try {
    const service = new ReverseGeocodingService();
    const first = await service.getLocality(14.94, 77.25, 'en');
    const second = await service.getLocality(14.94, 77.25, 'en');

    assert.deepEqual(first, {
      locality: 'Uravakonda',
      attribution: '© OpenStreetMap contributors',
    });
    assert.deepEqual(second, first);
    assert.equal(requests, 1);
    assert.equal(requestedUrl?.searchParams.get('lat'), '14.94');
    assert.equal(requestedUrl?.searchParams.get('lon'), '77.25');
    assert.equal(requestedUserAgent, 'ManaTown Digital test');
  } finally {
    globalThis.fetch = originalFetch;
    if (originalBaseUrl === undefined) delete process.env.GEOCODING_BASE_URL;
    else process.env.GEOCODING_BASE_URL = originalBaseUrl;
    if (originalUserAgent === undefined)
      delete process.env.GEOCODING_USER_AGENT;
    else process.env.GEOCODING_USER_AGENT = originalUserAgent;
  }
});
