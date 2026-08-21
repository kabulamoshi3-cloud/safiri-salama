import { APIClient } from './client';
import type { IncidentReport, EmergencyEvent, EmergencyContact } from '@dalasmart/shared-types';

export interface ReportIncidentRequest {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  location: { lat: number; lon: number };
  vehicleId?: string;
  tripId?: string;
  attachments?: string[];
}

export interface EmergencyAlertRequest {
  location: { lat: number; lon: number };
  message?: string;
  tripId?: string;
}

export class SafetyAPI {
  static async reportIncident(request: ReportIncidentRequest): Promise<IncidentReport> {
    return APIClient.post<IncidentReport>('/safety/incidents', request);
  }

  static async getIncidentReports(): Promise<IncidentReport[]> {
    return APIClient.get<IncidentReport[]>('/safety/incidents');
  }

  static async sendEmergencyAlert(request: EmergencyAlertRequest): Promise<EmergencyEvent> {
    return APIClient.post<EmergencyEvent>('/safety/emergency', request);
  }

  static async getEmergencyContacts(): Promise<EmergencyContact[]> {
    return APIClient.get<EmergencyContact[]>('/safety/emergency-contacts');
  }

  static async addEmergencyContact(contact: Omit<EmergencyContact, 'id'>): Promise<EmergencyContact> {
    return APIClient.post<EmergencyContact>('/safety/emergency-contacts', contact);
  }

  static async updateEmergencyContact(
    contactId: string,
    contact: Partial<EmergencyContact>
  ): Promise<EmergencyContact> {
    return APIClient.put<EmergencyContact>(`/safety/emergency-contacts/${contactId}`, contact);
  }

  static async deleteEmergencyContact(contactId: string): Promise<void> {
    return APIClient.delete<void>(`/safety/emergency-contacts/${contactId}`);
  }
}


