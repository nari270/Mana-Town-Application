import type {
  BusinessStatus,
  BusinessCategory,
  BusinessListItem,
  IssueStatus,
  Page,
} from '@mana-town/shared-types';

const apiBaseUrl =
  process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1';

export const developmentIdentities = [
  {
    id: '00000000-0000-4000-8000-000000000001',
    key: 'resident',
    label: 'Resident',
  },
  {
    id: '00000000-0000-4000-8000-000000000002',
    key: 'businessOwner',
    label: 'Business owner',
  },
  {
    id: '00000000-0000-4000-8000-000000000003',
    key: 'womenEntrepreneur',
    label: 'Women entrepreneur',
  },
  {
    id: '00000000-0000-4000-8000-000000000004',
    key: 'administrator',
    label: 'Administrator',
  },
] as const;

let activeDevelopmentIdentity =
  __DEV__ && process.env.EXPO_PUBLIC_MOCK_AUTH_ENABLED === 'true'
    ? (process.env.EXPO_PUBLIC_MOCK_USER_ID ?? developmentIdentities[1].id)
    : undefined;

export function getDevelopmentIdentity() {
  return activeDevelopmentIdentity;
}

export function setDevelopmentIdentity(userId: string) {
  if (!__DEV__ || process.env.EXPO_PUBLIC_MOCK_AUTH_ENABLED !== 'true') {
    return false;
  }
  if (!developmentIdentities.some((identity) => identity.id === userId)) {
    return false;
  }
  activeDevelopmentIdentity = userId;
  return true;
}

export class ApiClientError extends Error {
  constructor(
    readonly kind: 'network' | 'server',
    readonly status?: number,
    readonly apiMessage?: string,
  ) {
    super(apiMessage ?? kind);
    this.name = 'ApiClientError';
  }
}

export function getApiErrorMessage(
  error: unknown,
  translate: (key: string) => string,
) {
  if (!(error instanceof ApiClientError)) return translate('common.error');
  if (error.kind === 'network') return translate('common.networkError');
  return error.apiMessage ?? translate('common.serverError');
}

export type OwnedBusiness = BusinessListItem & {
  status: BusinessStatus;
  rejectionReason: string | null;
  updatedAt: string;
  entrepreneur: {
    id: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
    rejectionReason: string | null;
  } | null;
};

export type IssueReport = {
  id: string;
  reference: string;
  title: string;
  description: string;
  category: string;
  locality: string;
  status: IssueStatus;
  resolution: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AdminIssue = IssueReport & {
  reporter: { id: string; displayName: string };
  history: {
    status: IssueStatus;
    details: string | null;
    createdAt: string;
    actor: { displayName: string };
  }[];
  notes: {
    id: string;
    note: string;
    createdAt: string;
    author: { displayName: string };
  }[];
};

export type EntrepreneurProfile = BusinessListItem;

async function request<T>(
  path: string,
  options: { method?: 'GET' | 'POST' | 'PATCH'; body?: unknown } = {},
): Promise<T> {
  let response: Response;
  const headers: Record<string, string> = {};
  if (options.body !== undefined) headers['Content-Type'] = 'application/json';
  const mockUserId = activeDevelopmentIdentity;
  if (mockUserId) headers['x-mock-user-id'] = mockUserId;

  try {
    const requestOptions: RequestInit = {
      method: options.method ?? 'GET',
      headers,
    };
    if (options.body !== undefined) {
      requestOptions.body = JSON.stringify(options.body);
    }
    response = await fetch(`${apiBaseUrl}${path}`, requestOptions);
  } catch {
    throw new ApiClientError('network');
  }

  if (!response.ok) {
    const body = await response.text();
    throw new ApiClientError(
      'server',
      response.status,
      getResponseMessage(body),
    );
  }
  return (await response.json()) as T;
}

function getResponseMessage(body: string) {
  if (!body) return undefined;
  try {
    const response: unknown = JSON.parse(body);
    if (typeof response !== 'object' || response === null) return undefined;
    if (!('message' in response)) return undefined;
    const message = response.message;
    if (typeof message === 'string') return message;
    if (
      Array.isArray(message) &&
      message.every((item) => typeof item === 'string')
    ) {
      return message.join(' ');
    }
  } catch (error) {
    if (!(error instanceof SyntaxError)) throw error;
  }
  return undefined;
}

export function getBusinesses(params: {
  page?: number;
  pageSize?: number;
  search?: string;
  category?: string;
  locality?: string;
}) {
  const query = new URLSearchParams();
  query.set('page', String(params.page ?? 1));
  query.set('pageSize', String(params.pageSize ?? 20));
  if (params.search) query.set('search', params.search);
  if (params.category) query.set('category', params.category);
  if (params.locality) query.set('locality', params.locality);
  return request<Page<BusinessListItem>>(`/businesses?${query.toString()}`);
}

export function getBusiness(id: string) {
  return request<BusinessListItem>(`/businesses/${encodeURIComponent(id)}`);
}

export function getBusinessCategories() {
  return request<BusinessCategory[]>('/business-categories');
}

export function getOwnBusinesses() {
  return request<OwnedBusiness[]>('/businesses/mine');
}

export function createBusiness(input: {
  name: string;
  description: string;
  categoryId: string;
  locality: string;
  address: string;
  phone?: string;
  whatsapp?: string;
}) {
  return request<OwnedBusiness>('/businesses', {
    method: 'POST',
    body: input,
  });
}

export function updateBusiness(
  id: string,
  input: Partial<{
    name: string;
    description: string;
    categoryId: string;
    locality: string;
    address: string;
    phone: string;
    whatsapp: string;
  }>,
) {
  return request<OwnedBusiness>(`/businesses/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: input,
  });
}

export function submitBusiness(id: string) {
  return request<OwnedBusiness>(
    `/businesses/${encodeURIComponent(id)}/submit`,
    { method: 'POST' },
  );
}

export function createIssue(input: {
  title: string;
  description: string;
  category: string;
  locality: string;
}) {
  return request<IssueReport>('/issues', {
    method: 'POST',
    body: input,
  });
}

export function getMyIssues() {
  return request<IssueReport[]>('/issues/mine');
}

export function getEntrepreneurs(params: {
  page?: number;
  pageSize?: number;
  search?: string;
  category?: string;
  locality?: string;
}) {
  const query = new URLSearchParams();
  query.set('page', String(params.page ?? 1));
  query.set('pageSize', String(params.pageSize ?? 20));
  if (params.search) query.set('search', params.search);
  if (params.category) query.set('category', params.category);
  if (params.locality) query.set('locality', params.locality);
  return request<Page<EntrepreneurProfile>>(
    `/entrepreneurs?${query.toString()}`,
  );
}

export function requestEntrepreneurClassification(id: string) {
  return request<{
    id: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
    rejectionReason: string | null;
    createdAt: string;
  }>(`/businesses/${encodeURIComponent(id)}/entrepreneur-classification`, {
    method: 'POST',
    body: { confirmWomenOwned: true },
  });
}

export type AdminDashboardData = {
  businesses: Record<string, number>;
  issues: Record<string, number>;
  pendingEntrepreneurClassifications: number;
  activeAdvertisements: number;
  totalUsers: number;
};

export type AdminUser = {
  id: string;
  email: string | null;
  displayName: string;
  createdAt: string;
  roles: {
    role: 'RESIDENT' | 'BUSINESS_OWNER' | 'WOMEN_ENTREPRENEUR' | 'ADMIN';
  }[];
};

export type AdminCategory = {
  id: string;
  nameEnglish: string;
  nameTelugu: string;
  slug: string;
};

export type AdminCampaign = {
  id: string;
  name: string;
  businessId: string | null;
  placement: string;
  startsAt: string;
  endsAt: string;
  status: 'ACTIVE' | 'PAUSED' | 'EXPIRED';
  assets: { id: string }[];
  impressions: number;
  clicks: number;
};

export function getAdminDashboard() {
  return request<AdminDashboardData>('/admin/dashboard');
}

export function getAdminUsers() {
  return request<Page<AdminUser>>('/admin/users?page=1&pageSize=50');
}

export function updateAdminUserRoles(
  id: string,
  roles: AdminUser['roles'][number]['role'][],
) {
  return request<AdminUser>(`/admin/users/${id}/roles`, {
    method: 'PATCH',
    body: { roles },
  });
}

export function getAdminCategories() {
  return request<AdminCategory[]>('/admin/business-categories');
}

export function createAdminCategory(input: Omit<AdminCategory, 'id'>) {
  return request<AdminCategory>('/admin/business-categories', {
    method: 'POST',
    body: input,
  });
}

export function updateAdminCategory(
  id: string,
  input: Partial<Omit<AdminCategory, 'id'>>,
) {
  return request<AdminCategory>(`/admin/business-categories/${id}`, {
    method: 'PATCH',
    body: input,
  });
}

export function getAdminCampaigns() {
  return request<AdminCampaign[]>('/admin/advertisements');
}

export function createAdminCampaign(input: {
  name: string;
  businessId?: string;
  placement: string;
  startsAt: string;
  endsAt: string;
  status: 'ACTIVE' | 'PAUSED';
}) {
  return request<AdminCampaign>('/admin/advertisements', {
    method: 'POST',
    body: input,
  });
}

export function updateAdminCampaign(
  id: string,
  input: { status: 'ACTIVE' | 'PAUSED' },
) {
  return request<AdminCampaign>(`/admin/advertisements/${id}`, {
    method: 'PATCH',
    body: input,
  });
}

export type PublicCampaign = {
  id: string;
  name: string;
  placement: string;
  business: { id: string; name: string } | null;
  assets: { id: string }[];
};

export function getAdvertisements(placement?: string) {
  const query = placement ? `?placement=${encodeURIComponent(placement)}` : '';
  return request<PublicCampaign[]>(`/advertisements${query}`);
}

export function trackAdvertisement(id: string, kind: 'IMPRESSION' | 'CLICK') {
  return request<{ id: string }>(`/advertisements/${id}/events`, {
    method: 'POST',
    body: { kind },
  });
}

export function getAdminBusinesses(status?: BusinessStatus) {
  const query = new URLSearchParams({ page: '1', pageSize: '50' });
  if (status) query.set('status', status);
  return request<Page<OwnedBusiness>>(`/admin/businesses?${query.toString()}`);
}

export function approveBusiness(id: string) {
  return request<OwnedBusiness>(`/admin/businesses/${id}/approve`, {
    method: 'POST',
  });
}

export function rejectBusiness(id: string, reason: string) {
  return request<OwnedBusiness>(`/admin/businesses/${id}/reject`, {
    method: 'POST',
    body: { reason },
  });
}

export type AdminEntrepreneurRequest = {
  id: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  rejectionReason: string | null;
  business: {
    id: string;
    name: string;
    locality: string;
    status: BusinessStatus;
    ownerships: { user: { id: string; displayName: string } }[];
  };
  requester: { id: string; displayName: string };
};

export function getAdminEntrepreneurRequests(status = 'PENDING') {
  return request<Page<AdminEntrepreneurRequest>>(
    `/admin/entrepreneurs?status=${encodeURIComponent(status)}&page=1&pageSize=50`,
  );
}

export function approveEntrepreneur(id: string) {
  return request<{ id: string; status: string }>(
    `/admin/entrepreneurs/${id}/approve`,
    { method: 'POST' },
  );
}

export function rejectEntrepreneur(id: string, reason: string) {
  return request<{ id: string; status: string }>(
    `/admin/entrepreneurs/${id}/reject`,
    { method: 'POST', body: { reason } },
  );
}

export function getAdminIssues() {
  return request<Page<AdminIssue>>('/admin/issues?page=1&pageSize=50');
}

export function updateIssueStatus(
  id: string,
  input: {
    status: IssueStatus;
    resolution?: string;
    internalNote?: string;
  },
) {
  return request<AdminIssue>(`/admin/issues/${id}/status`, {
    method: 'PATCH',
    body: input,
  });
}
