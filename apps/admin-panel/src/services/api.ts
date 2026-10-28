/**
 * Admin API client
 * All HTTP calls for the admin panel
 */

const BASE_URL =
  (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_API_URL) ||
  'http://localhost:3000/api/v1';

async function request<T>(
  method: string,
  path: string,
  body?: unknown
): Promise<T> {
  const token = localStorage.getItem('admin_token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: response.statusText }));
    const thrownErr: any = new Error(err.error || `HTTP ${response.status}`);
    thrownErr.status = response.status;
    throw thrownErr;
  }

  return response.json() as Promise<T>;
}

// ── Types ────────────────────────────────────────────────

export interface AdminStats {
  trips_today: string;
  active_trips: string;
  online_drivers: string;
  revenue_today: string;
}

export interface Driver {
  id: string;
  user_id: string;
  name: string;
  phone: string;
  email: string;
  license_number: string;
  license_expiry: string;
  verification_status: string;
  status: string;
  user_status: string;
  plate_number: string;
  make: string;
  model: string;
  vehicle_type: string;
  total_trips: string;
  rating: number;
  created_at: string;
}

export interface Passenger {
  id: string;
  user_id: string;
  name: string;
  phone: string;
  email: string;
  user_status: string;
  rating: number;
  total_trips: string;
  active_trips: string;
  created_at: string;
}

export interface Trip {
  id: string;
  status: string;
  pickup_address: string;
  dropoff_address: string;
  pickup_latitude: number;
  pickup_longitude: number;
  dropoff_latitude: number;
  dropoff_longitude: number;
  vehicle_type: string;
  fare: string;
  estimated_fare: string;
  estimated_distance: number;
  estimated_duration: number;
  payment_method: string;
  created_at: string;
  completed_at: string | null;
  cancelled_at: string | null;
  passenger_name: string;
  passenger_phone: string;
  driver_name: string | null;
  driver_phone: string | null;
}

export interface Setting {
  key: string;
  value: string;
  updated_at: string;
}

export interface LoginResponse {
  token: string;
  user: {
    id: string;
    name: string;
    phone: string;
    userType: string;
    status: string;
  };
}

// ── API functions ─────────────────────────────────────────

export const getStats = () =>
  request<AdminStats>('GET', '/admin/stats');

export const getDrivers = (approval_status?: string) => {
  const qs = approval_status ? `?approval_status=${encodeURIComponent(approval_status)}` : '';
  return request<{ drivers: Driver[] }>('GET', `/admin/drivers${qs}`);
};

export const approveDriver = (id: string) =>
  request<{ message: string }>('PUT', `/admin/drivers/${id}/approve`);

export const rejectDriver = (id: string) =>
  request<{ message: string }>('PUT', `/admin/drivers/${id}/reject`);

export const banDriver = (id: string) =>
  request<{ message: string }>('PUT', `/admin/drivers/${id}/ban`);

export const getPassengers = () =>
  request<{ passengers: Passenger[] }>('GET', '/admin/passengers');

export const banPassenger = (id: string) =>
  request<{ message: string }>('PUT', `/admin/passengers/${id}/ban`);

export const getTrips = (params?: {
  status?: string;
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
}) => {
  const qs = new URLSearchParams();
  if (params?.status) qs.set('status', params.status);
  if (params?.from) qs.set('from', params.from);
  if (params?.to) qs.set('to', params.to);
  if (params?.limit !== undefined) qs.set('limit', String(params.limit));
  if (params?.offset !== undefined) qs.set('offset', String(params.offset));
  const query = qs.toString() ? `?${qs.toString()}` : '';
  return request<{ trips: Trip[]; total: number }>('GET', `/admin/trips${query}`);
};

export const cancelTrip = (id: string) =>
  request<{ message: string }>('PUT', `/admin/trips/${id}/cancel`);

export const getSettings = () =>
  request<{ settings: Setting[] }>('GET', '/admin/settings');

export const saveSetting = (key: string, value: string) =>
  request<{ message: string; setting: Setting }>('POST', '/admin/settings', { key, value });

export const login = (phone: string, password: string) =>
  request<LoginResponse>('POST', '/auth/login', { phone, password });

// ── Types for new features ─────────────────────────────────

export interface DriverDocument {
  id: string;
  documentType: string;
  status: 'pending' | 'approved' | 'rejected' | 'not_uploaded';
  image_url?: string;
  rejection_reason?: string;
  created_at?: string;
  reviewed_at?: string;
}

export interface AuditLog {
  id: string;
  admin_id: string;
  admin_name: string;
  action: string;
  affected_account: string;
  reason?: string;
  created_at: string;
}

export interface FinanceTransaction {
  id: string;
  trip_id?: string;
  passenger_name?: string;
  driver_name?: string;
  amount: string;
  platform_fee?: string;
  driver_payout?: string;
  payment_method: string;
  status: string;
  created_at: string;
}

export interface AnalyticsData {
  trips_over_time: Array<{ day: string; trips: number }>;
  revenue_trends: Array<{ day: string; revenue: number }>;
  driver_performance: Array<{ name: string; trips: number; rating: number }>;
  peak_hours: Array<{ hour: string; demand: number }>;
}

export interface SupportTicket {
  id: string;
  user_id?: string;
  user_name?: string;
  subject: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assigned_to?: string;
  message?: string;
  created_at: string;
  updated_at?: string;
}

// ── New API functions ──────────────────────────────────────

export const getDriverDocuments = (driverId: string) =>
  request<{ documents: DriverDocument[] }>('GET', `/upload/documents?driver_id=${encodeURIComponent(driverId)}`);

export const reviewDocument = (docId: string, status: 'approved' | 'rejected', rejection_reason?: string) =>
  request<{ message: string }>('PATCH', `/upload/documents/${docId}/review`, { status, rejection_reason });

export const getAuditLogs = (params?: { from?: string; to?: string; admin_id?: string; page?: number; limit?: number }) => {
  const qs = new URLSearchParams();
  if (params?.from) qs.set('from', params.from);
  if (params?.to) qs.set('to', params.to);
  if (params?.admin_id) qs.set('admin_id', params.admin_id);
  if (params?.page !== undefined) qs.set('page', String(params.page));
  if (params?.limit !== undefined) qs.set('limit', String(params.limit));
  const query = qs.toString() ? `?${qs.toString()}` : '';
  return request<{ logs: AuditLog[]; total: number }>('GET', `/admin/audit-logs${query}`);
};

export const getFinanceTransactions = (params?: { page?: number; limit?: number }) => {
  const qs = new URLSearchParams();
  if (params?.page !== undefined) qs.set('page', String(params.page));
  if (params?.limit !== undefined) qs.set('limit', String(params.limit));
  const query = qs.toString() ? `?${qs.toString()}` : '';
  return request<{ transactions: FinanceTransaction[]; total: number }>('GET', `/admin/finance${query}`);
};

export const getAnalytics = (period = '30d') =>
  request<AnalyticsData>('GET', `/admin/analytics?period=${encodeURIComponent(period)}`);

export const getSupportTickets = () =>
  request<{ tickets: SupportTicket[] }>('GET', '/support');

export const updateSupportTicket = (id: string, status: SupportTicket['status']) =>
  request<{ message: string }>('PATCH', `/support/${id}`, { status });
