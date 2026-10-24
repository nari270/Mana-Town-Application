import 'reflect-metadata';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createApp } from '../create-app.js';

const residents = {
  resident: 'resident',
  owner: 'owner',
  admin: 'admin',
};

const residentUserId = '00000000-0000-4000-8000-000000000001';

const tokens = new Map<string, string>();

async function tokenFor(baseUrl: string, username: string) {
  const cached = tokens.get(username);
  if (cached) return cached;
  const envName = `SEED_PASSWORD_${username.toUpperCase()}`;
  const password = process.env[envName];
  assert.ok(password, `Set ${envName}`);
  const email = `${username}@manatown.test`;
  const response = await fetch(`${baseUrl}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  assert.equal(response.status, 200, `login failed for ${username}`);
  const { token } = (await response.json()) as { token: string };
  tokens.set(username, token);
  return token;
}

type ApiOptions = {
  method?: 'GET' | 'POST' | 'PATCH';
  identity?: string;
  body?: unknown;
};

async function apiRequest<T>(
  baseUrl: string,
  path: string,
  options: ApiOptions = {},
): Promise<T> {
  const headers: Record<string, string> = {};
  if (options.identity) {
    headers.Authorization = `Bearer ${await tokenFor(baseUrl, options.identity)}`;
  }
  if (options.body !== undefined) headers['Content-Type'] = 'application/json';
  const response = await fetch(`${baseUrl}/api/v1${path}`, {
    method: options.method ?? 'GET',
    headers,
    ...(options.body !== undefined
      ? { body: JSON.stringify(options.body) }
      : {}),
  });
  const text = await response.text();
  assert.ok(
    response.ok,
    `${options.method ?? 'GET'} ${path} returned ${response.status}: ${text}`,
  );
  return JSON.parse(text) as T;
}

if (process.env.MANA_TOWN_ALLOW_DB_INTEGRATION !== 'true') {
  test('database-backed API journeys (opt-in)', {
    skip: 'Set MANA_TOWN_ALLOW_DB_INTEGRATION=true to use a disposable PostgreSQL database.',
  });
} else {
  test(
    'resident, owner, entrepreneur, advertisement, and admin API journeys persist in PostgreSQL',
    { timeout: 60_000 },
    async () => {
      const databaseUrl = process.env.DATABASE_URL ?? '';
      assert.match(
        databaseUrl,
        /\/mana_town_test(?:\?|$)/,
        'Integration tests are restricted to the mana_town_test database.',
      );
      process.env.NODE_ENV = 'test';
      const app = await createApp();
      try {
        await app.listen(0, '127.0.0.1');
        const address = app.getHttpServer().address();
        assert.ok(address && typeof address !== 'string');
        const baseUrl = `http://127.0.0.1:${address.port}`;
        const health = await apiRequest<{
          status: string;
          database: string;
        }>(baseUrl, '/health/ready');
        assert.deepEqual(health, {
          status: 'ok',
          service: 'mana-town-api',
          database: 'ok',
        });

        const anonymous = await fetch(`${baseUrl}/api/v1/admin/dashboard`);
        assert.equal(anonymous.status, 401, 'Anonymous requests are rejected.');
        const forged = await fetch(`${baseUrl}/api/v1/admin/dashboard`, {
          headers: { 'x-mock-user-id': '00000000-0000-4000-8000-000000000004' },
        });
        assert.equal(forged.status, 401, 'Mock identity header is ignored.');
        const badPassword = await fetch(`${baseUrl}/api/v1/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: 'admin@manatown.test',
            password: 'wrong-password-1',
          }),
        });
        assert.equal(badPassword.status, 401, 'Wrong password is rejected.');
        const residentToken = await tokenFor(baseUrl, residents.resident);
        const forbidden = await fetch(`${baseUrl}/api/v1/admin/dashboard`, {
          headers: { Authorization: `Bearer ${residentToken}` },
        });
        assert.equal(forbidden.status, 403, 'Residents cannot use admin APIs.');
        const me = await apiRequest<{ roles: string[] }>(baseUrl, '/auth/me', {
          identity: residents.admin,
        });
        assert.deepEqual(me.roles, ['ADMIN']);

        const categories = await apiRequest<{ id: string; slug: string }[]>(
          baseUrl,
          '/business-categories',
          { identity: residents.resident },
        );
        const category = categories.find(({ slug }) => slug === 'tailoring');
        assert.ok(category, 'Fictional seed category should be present.');

        const suffix = `${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;
        const createdCategory = await apiRequest<{
          id: string;
          nameEnglish: string;
        }>(baseUrl, '/admin/business-categories', {
          method: 'POST',
          identity: residents.admin,
          body: {
            nameEnglish: `Integration Category ${suffix}`,
            nameTelugu: 'Integration test category',
            slug: `integration-${suffix}`,
          },
        });
        const updatedCategory = await apiRequest<{
          id: string;
          nameEnglish: string;
        }>(baseUrl, `/admin/business-categories/${createdCategory.id}`, {
          method: 'PATCH',
          identity: residents.admin,
          body: { nameEnglish: `Updated Category ${suffix}` },
        });
        assert.equal(updatedCategory.nameEnglish, `Updated Category ${suffix}`);
        const publicCategories = await apiRequest<
          { id: string; nameEnglish: string }[]
        >(baseUrl, '/business-categories', { identity: residents.resident });
        assert.ok(publicCategories.some(({ id }) => id === createdCategory.id));

        const updatedUser = await apiRequest<{
          id: string;
          roles: { role: string }[];
        }>(baseUrl, `/admin/users/${residentUserId}/roles`, {
          method: 'PATCH',
          identity: residents.admin,
          body: { roles: ['CUSTOMER', 'BUSINESS_OWNER'] },
        });
        assert.ok(
          updatedUser.roles.some(({ role }) => role === 'BUSINESS_OWNER'),
        );

        const dashboard = await apiRequest<{
          totalUsers: number;
          businesses: Record<string, number>;
        }>(baseUrl, '/admin/dashboard', { identity: residents.admin });
        assert.ok(dashboard.totalUsers >= 4);

        const businessName = `Integration Listing ${suffix}`;
        const business = await apiRequest<{
          id: string;
          status: string;
        }>(baseUrl, '/businesses', {
          method: 'POST',
          identity: residents.owner,
          body: {
            name: businessName,
            description: 'A listing created by the database integration test.',
            categoryId: category.id,
            locality: 'Kadiri',
            address: 'Integration Test Road',
          },
        });
        assert.equal(business.status, 'DRAFT');

        const ownListings = await apiRequest<{ id: string }[]>(
          baseUrl,
          '/businesses/mine',
          { identity: residents.owner },
        );
        assert.ok(ownListings.some(({ id }) => id === business.id));

        const submitted = await apiRequest<{ status: string }>(
          baseUrl,
          `/businesses/${business.id}/submit`,
          { method: 'POST', identity: residents.owner },
        );
        assert.equal(submitted.status, 'PENDING');

        await apiRequest(baseUrl, `/admin/businesses/${business.id}/approve`, {
          method: 'POST',
          identity: residents.admin,
        });
        const publicListings = await apiRequest<{
          items: { id: string; status?: string }[];
        }>(baseUrl, `/businesses?search=${encodeURIComponent(businessName)}`, {
          identity: residents.resident,
        });
        assert.ok(publicListings.items.some(({ id }) => id === business.id));

        for (const path of [
          '/businesses',
          `/businesses/${business.id}`,
          '/business-categories',
          '/entrepreneurs',
          '/realtime/businesses/live',
        ]) {
          const response = await fetch(`${baseUrl}/api/v1${path}`, {
            method: path.startsWith('/realtime') ? 'POST' : 'GET',
          });
          assert.equal(response.status, 401, `${path} requires sign-in.`);
        }

        await apiRequest(baseUrl, `/businesses/${business.id}`, {
          identity: residents.resident,
        });
        await apiRequest(baseUrl, `/businesses/${business.id}`, {
          identity: residents.resident,
        });
        await apiRequest(baseUrl, `/businesses/${business.id}`, {
          identity: residents.owner,
        });
        const stats = await apiRequest<
          {
            id: string;
            totalViews: number;
            uniqueViewers: number;
            viewsLast7Days: number;
          }[]
        >(baseUrl, '/businesses/mine/stats', { identity: residents.owner });
        const businessStats = stats.find(({ id }) => id === business.id);
        assert.equal(businessStats?.totalViews, 2, 'Owner views are excluded.');
        assert.equal(businessStats?.uniqueViewers, 1);
        assert.equal(businessStats?.viewsLast7Days, 2);
        const anonymousStats = await fetch(
          `${baseUrl}/api/v1/businesses/mine/stats`,
        );
        assert.equal(anonymousStats.status, 401);

        const issue = await apiRequest<{ id: string; status: string }>(
          baseUrl,
          '/issues',
          {
            method: 'POST',
            identity: residents.resident,
            body: {
              title: `Water supply ${suffix}`,
              description:
                'Integration-test report describing a local water supply issue.',
              category: 'water',
              locality: 'Kadiri',
            },
          },
        );
        assert.equal(issue.status, 'SUBMITTED');
        const residentIssues = await apiRequest<{ id: string }[]>(
          baseUrl,
          '/issues/mine',
          { identity: residents.resident },
        );
        assert.ok(residentIssues.some(({ id }) => id === issue.id));
        const ownerIssues = await apiRequest<{ id: string }[]>(
          baseUrl,
          '/issues/mine',
          { identity: residents.owner },
        );
        assert.equal(
          ownerIssues.some(({ id }) => id === issue.id),
          false,
        );

        for (const status of ['UNDER_REVIEW', 'IN_PROGRESS'] as const) {
          await apiRequest(baseUrl, `/admin/issues/${issue.id}/status`, {
            method: 'PATCH',
            identity: residents.admin,
            body: { status },
          });
        }
        const resolvedIssue = await apiRequest<{
          status: string;
          resolution: string;
          notes: { note: string }[];
        }>(baseUrl, `/admin/issues/${issue.id}/status`, {
          method: 'PATCH',
          identity: residents.admin,
          body: {
            status: 'RESOLVED',
            resolution: 'Water supply service has been restored.',
            internalNote: 'Resolution verified by the integration test.',
          },
        });
        assert.equal(resolvedIssue.status, 'RESOLVED');
        assert.equal(
          resolvedIssue.resolution,
          'Water supply service has been restored.',
        );
        assert.ok(
          resolvedIssue.notes.some((note) =>
            note.note.includes('integration test'),
          ),
        );

        const classification = await apiRequest<{ id: string; status: string }>(
          baseUrl,
          `/businesses/${business.id}/entrepreneur-classification`,
          {
            method: 'POST',
            identity: residents.owner,
            body: { confirmWomenOwned: true },
          },
        );
        assert.equal(classification.status, 'PENDING');
        await apiRequest(
          baseUrl,
          `/admin/entrepreneurs/${classification.id}/approve`,
          { method: 'POST', identity: residents.admin },
        );
        const publicEntrepreneurs = await apiRequest<{
          items: { id: string }[];
        }>(
          baseUrl,
          `/entrepreneurs?search=${encodeURIComponent(businessName)}`,
          { identity: residents.resident },
        );
        assert.ok(
          publicEntrepreneurs.items.some(({ id }) => id === business.id),
        );

        const campaignName = `Integration Campaign ${suffix}`;
        const now = Date.now();
        const campaign = await apiRequest<{ id: string; status: string }>(
          baseUrl,
          '/admin/advertisements',
          {
            method: 'POST',
            identity: residents.admin,
            body: {
              name: campaignName,
              businessId: business.id,
              placement: 'integration-banner',
              startsAt: new Date(now - 60_000).toISOString(),
              endsAt: new Date(now + 86_400_000).toISOString(),
              status: 'ACTIVE',
            },
          },
        );
        assert.equal(campaign.status, 'ACTIVE');
        const advertisements = await apiRequest<{ id: string }[]>(
          baseUrl,
          '/advertisements?placement=integration-banner',
        );
        assert.ok(advertisements.some(({ id }) => id === campaign.id));
        await apiRequest(baseUrl, `/advertisements/${campaign.id}/events`, {
          method: 'POST',
          body: { kind: 'IMPRESSION' },
        });
        await apiRequest(baseUrl, `/advertisements/${campaign.id}/events`, {
          method: 'POST',
          body: { kind: 'CLICK' },
        });
        const campaigns = await apiRequest<
          { id: string; impressions: number; clicks: number }[]
        >(baseUrl, '/admin/advertisements', {
          identity: residents.admin,
        });
        const tracked = campaigns.find(({ id }) => id === campaign.id);
        assert.equal(tracked?.impressions, 1);
        assert.equal(tracked?.clicks, 1);

        await apiRequest(baseUrl, `/admin/advertisements/${campaign.id}`, {
          method: 'PATCH',
          identity: residents.admin,
          body: { status: 'PAUSED' },
        });
        const pausedCampaigns = await apiRequest<{ id: string }[]>(
          baseUrl,
          '/advertisements?placement=integration-banner',
        );
        assert.equal(
          pausedCampaigns.some(({ id }) => id === campaign.id),
          false,
        );

        // Access logs are written asynchronously.
        await new Promise((resolve) => setTimeout(resolve, 500));
        const access = await apiRequest<{
          items: {
            event: string;
            username: string | null;
            path: string | null;
          }[];
        }>(baseUrl, '/admin/access/logs?pageSize=100', {
          identity: residents.admin,
        });
        assert.ok(access.items.some(({ event }) => event === 'LOGIN_SUCCESS'));
        assert.ok(
          access.items.some(
            ({ event, username }) =>
              event === 'LOGIN_FAILED' && username === 'admin@manatown.test',
          ),
        );
        assert.ok(
          access.items.some(
            ({ path }) => path === `/api/v1/businesses/${business.id}`,
          ),
        );
        const accessSummary = await apiRequest<{
          users: { username: string | null; loginCount: number }[];
        }>(baseUrl, '/admin/access/summary', { identity: residents.admin });
        assert.ok(
          (accessSummary.users.find(
            ({ username }) => username === 'resident@manatown.test',
          )?.loginCount ?? 0) >= 1,
        );
        const deniedAccess = await fetch(
          `${baseUrl}/api/v1/admin/access/logs`,
          {
            headers: {
              Authorization: `Bearer ${await tokenFor(baseUrl, residents.owner)}`,
            },
          },
        );
        assert.equal(deniedAccess.status, 403);
      } finally {
        await app.close();
      }
    },
  );
}
