import { APIClient } from '../../passenger-app/src/services/api/client';

// Admin Dashboard Types
export interface AdminStats {
  totalTrips: number;
  totalRevenue: number;
  activeDrivers: number;
  activePassengers: number;
  averageRating: number;
  safetyIncidents: number;
}

export interface DashboardMetrics {
  tripsPerHour: number[];
  revenuePerHour: number[];
  driversOnline: number;
  averageWaitTime: number;
  customerSatisfaction: number;
  timestamp: Date;
}

export interface UserReport {
  id: string;
  userId: string;
  type: 'driver' | 'passenger';
  status: 'verified' | 'pending' | 'rejected';
  documents: UserDocument[];
  backgroundCheck: BackgroundCheck;
  reviews: number;
  rating: number;
}

export interface UserDocument {
  id: string;
  type: 'license' | 'insurance' | 'registration' | 'inspection';
  url: string;
  expiryDate: Date;
  verified: boolean;
}

export interface BackgroundCheck {
  status: 'pending' | 'passed' | 'failed';
  timestamp: Date;
  details?: string;
}

export interface IncidentReport {
  id: string;
  tripId: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  reportedBy: string;
  timestamp: Date;
  status: 'open' | 'investigating' | 'resolved';
  resolution?: string;
}

export interface PaymentSettlement {
  id: string;
  driverId: string;
  amount: number;
  period: { start: Date; end: Date };
  status: 'pending' | 'completed' | 'failed';
  transactions: number;
  commission: number;
  timestamp: Date;
}

export interface PromoCode {
  id: string;
  code: string;
  type: 'percentage' | 'fixed';
  value: number;
  maxUses: number;
  usedCount: number;
  expiryDate: Date;
  active: boolean;
  createdAt: Date;
}

export class AdminAPI {
  // Dashboard & Analytics
  static async getStats(): Promise<AdminStats> {
    return APIClient.get<AdminStats>('/admin/stats');
  }

  static async getDashboardMetrics(): Promise<DashboardMetrics> {
    return APIClient.get<DashboardMetrics>('/admin/metrics');
  }

  static async getMetricsHistory(days: number = 30): Promise<DashboardMetrics[]> {
    return APIClient.get<DashboardMetrics[]>(`/admin/metrics/history?days=${days}`);
  }

  // User Management
  static async getUsers(
    type: 'driver' | 'passenger',
    limit: number = 50,
    offset: number = 0
  ): Promise<UserReport[]> {
    return APIClient.get<UserReport[]>(
      `/admin/users?type=${type}&limit=${limit}&offset=${offset}`
    );
  }

  static async getUserDetails(userId: string): Promise<UserReport> {
    return APIClient.get<UserReport>(`/admin/users/${userId}`);
  }

  static async verifyUser(userId: string, documents: UserDocument[]): Promise<void> {
    return APIClient.post<void>(`/admin/users/${userId}/verify`, { documents });
  }

  static async suspendUser(userId: string, reason: string): Promise<void> {
    return APIClient.post<void>(`/admin/users/${userId}/suspend`, { reason });
  }

  static async reactivateUser(userId: string): Promise<void> {
    return APIClient.post<void>(`/admin/users/${userId}/reactivate`, {});
  }

  static async performBackgroundCheck(userId: string): Promise<BackgroundCheck> {
    return APIClient.post<BackgroundCheck>(`/admin/users/${userId}/background-check`, {});
  }

  // Incident Management
  static async getIncidents(
    status?: string,
    limit: number = 50
  ): Promise<IncidentReport[]> {
    const query = status ? `?status=${status}&limit=${limit}` : `?limit=${limit}`;
    return APIClient.get<IncidentReport[]>(`/admin/incidents${query}`);
  }

  static async getIncidentDetails(incidentId: string): Promise<IncidentReport> {
    return APIClient.get<IncidentReport>(`/admin/incidents/${incidentId}`);
  }

  static async resolveIncident(
    incidentId: string,
    resolution: string,
    action?: string
  ): Promise<void> {
    return APIClient.post<void>(`/admin/incidents/${incidentId}/resolve`, {
      resolution,
      action,
    });
  }

  static async escalateIncident(incidentId: string, level: string): Promise<void> {
    return APIClient.post<void>(`/admin/incidents/${incidentId}/escalate`, { level });
  }

  // Payment & Settlement
  static async getSettlements(
    status?: string,
    limit: number = 50
  ): Promise<PaymentSettlement[]> {
    const query = status ? `?status=${status}&limit=${limit}` : `?limit=${limit}`;
    return APIClient.get<PaymentSettlement[]>(`/admin/settlements${query}`);
  }

  static async settleDriver(driverId: string): Promise<PaymentSettlement> {
    return APIClient.post<PaymentSettlement>(`/admin/settlements`, { driverId });
  }

  static async getFinancialReport(
    startDate: Date,
    endDate: Date
  ): Promise<any> {
    return APIClient.get<any>(
      `/admin/financial-report?start=${startDate.toISOString()}&end=${endDate.toISOString()}`
    );
  }

  // Promo Codes & Marketing
  static async getPromoCodes(limit: number = 50): Promise<PromoCode[]> {
    return APIClient.get<PromoCode[]>(`/admin/promo-codes?limit=${limit}`);
  }

  static async createPromoCode(promo: Omit<PromoCode, 'id' | 'createdAt' | 'usedCount'>): Promise<PromoCode> {
    return APIClient.post<PromoCode>('/admin/promo-codes', promo);
  }

  static async updatePromoCode(
    promoId: string,
    updates: Partial<PromoCode>
  ): Promise<PromoCode> {
    return APIClient.put<PromoCode>(`/admin/promo-codes/${promoId}`, updates);
  }

  static async deactivatePromoCode(promoId: string): Promise<void> {
    return APIClient.post<void>(`/admin/promo-codes/${promoId}/deactivate`, {});
  }

  // System Management
  static async getSystemHealth(): Promise<any> {
    return APIClient.get<any>('/admin/system/health');
  }

  static async getAPIUsage(hours: number = 24): Promise<any> {
    return APIClient.get<any>(`/admin/system/api-usage?hours=${hours}`);
  }

  static async getErrorLogs(limit: number = 100): Promise<any[]> {
    return APIClient.get<any[]>(`/admin/system/error-logs?limit=${limit}`);
  }

  // Support & Communication
  static async sendBroadcastNotification(
    title: string,
    message: string,
    targetGroup: string // 'all', 'drivers', 'passengers'
  ): Promise<void> {
    return APIClient.post<void>('/admin/notifications/broadcast', {
      title,
      message,
      targetGroup,
    });
  }

  static async getTickets(status?: string, limit: number = 50): Promise<any[]> {
    const query = status ? `?status=${status}&limit=${limit}` : `?limit=${limit}`;
    return APIClient.get<any[]>(`/admin/support/tickets${query}`);
  }

  static async respondToTicket(ticketId: string, response: string): Promise<void> {
    return APIClient.post<void>(`/admin/support/tickets/${ticketId}/respond`, {
      response,
    });
  }

  // Reports & Export
  static async generateReport(
    type: 'trips' | 'revenue' | 'users' | 'incidents',
    startDate: Date,
    endDate: Date
  ): Promise<string> {
    // Returns URL to download report
    return APIClient.post<string>('/admin/reports/generate', {
      type,
      startDate,
      endDate,
    });
  }

  static async exportData(
    dataType: string,
    format: 'csv' | 'json' | 'xlsx'
  ): Promise<string> {
    return APIClient.post<string>('/admin/export', { dataType, format });
  }

  // Feature Flags
  static async getFeatureFlags(): Promise<Record<string, boolean>> {
    return APIClient.get<Record<string, boolean>>('/admin/feature-flags');
  }

  static async updateFeatureFlag(flag: string, enabled: boolean): Promise<void> {
    return APIClient.post<void>(`/admin/feature-flags/${flag}`, { enabled });
  }
}
