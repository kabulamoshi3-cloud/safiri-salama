import { APIClient } from '../../passenger-app/src/services/api/client';
import { CameraRoll } from '@react-native-camera-roll';

export type VerificationStatus = 'not_started' | 'in_progress' | 'pending_review' | 'verified' | 'rejected' | 'expired';

export interface VerificationStep {
  id: string;
  name: string;
  description: string;
  status: VerificationStatus;
  required: boolean;
  expiryDays?: number;
  documents?: VerificationDocument[];
}

export interface VerificationDocument {
  id: string;
  type: 'license' | 'insurance' | 'registration' | 'inspection' | 'criminal_record';
  url: string;
  uploadedAt: Date;
  expiryDate: Date;
  status: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
}

export interface VerificationProfile {
  userId: string;
  overallStatus: VerificationStatus;
  completionPercentage: number;
  steps: VerificationStep[];
  lastVerifiedAt?: Date;
  nextRenewalDate?: Date;
  message?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface BackgroundCheckResult {
  status: 'passed' | 'failed' | 'review';
  timestamp: Date;
  details: {
    criminalHistory: boolean;
    trafficViolations: number;
    insuranceClaims: number;
  };
}

class VerificationServiceClass {
  private verificationSteps: VerificationStep[] = [
    {
      id: 'step-1',
      name: 'Personal Information',
      description: 'Verify your identity and personal details',
      status: 'not_started',
      required: true,
    },
    {
      id: 'step-2',
      name: 'Driver License',
      description: 'Upload valid driver license',
      status: 'not_started',
      required: true,
      expiryDays: 365,
    },
    {
      id: 'step-3',
      name: 'Vehicle Registration',
      description: 'Upload vehicle registration document',
      status: 'not_started',
      required: true,
      expiryDays: 365,
    },
    {
      id: 'step-4',
      name: 'Insurance Certificate',
      description: 'Upload valid insurance certificate',
      status: 'not_started',
      required: true,
      expiryDays: 365,
    },
    {
      id: 'step-5',
      name: 'Vehicle Inspection',
      description: 'Pass vehicle safety inspection',
      status: 'not_started',
      required: true,
      expiryDays: 180,
    },
    {
      id: 'step-6',
      name: 'Background Check',
      description: 'Complete background verification',
      status: 'not_started',
      required: true,
    },
  ];

  async getVerificationProfile(): Promise<VerificationProfile> {
    try {
      return APIClient.get<VerificationProfile>('/driver/verification/profile');
    } catch (error) {
      console.error('Failed to get verification profile:', error);
      throw error;
    }
  }

  async uploadDocument(
    stepId: string,
    documentType: VerificationDocument['type'],
    imagePath: string,
    expiryDate?: Date
  ): Promise<VerificationDocument> {
    try {
      const formData = new FormData();
      formData.append('type', documentType);
      formData.append('stepId', stepId);
      
      if (expiryDate) {
        formData.append('expiryDate', expiryDate.toISOString());
      }

      // Append image file
      formData.append('document', {
        uri: imagePath,
        type: 'image/jpeg',
        name: `${documentType}-${Date.now()}.jpg`,
      } as any);

      return APIClient.post<VerificationDocument>(
        '/driver/verification/upload-document',
        formData
      );
    } catch (error) {
      console.error('Failed to upload document:', error);
      throw error;
    }
  }

  async submitPersonalInfo(personalInfo: {
    firstName: string;
    lastName: string;
    dateOfBirth: Date;
    nationalId: string;
  }): Promise<VerificationStep> {
    try {
      return APIClient.post<VerificationStep>(
        '/driver/verification/personal-info',
        personalInfo
      );
    } catch (error) {
      console.error('Failed to submit personal info:', error);
      throw error;
    }
  }

  async triggerBackgroundCheck(): Promise<BackgroundCheckResult> {
    try {
      return APIClient.post<BackgroundCheckResult>(
        '/driver/verification/background-check',
        {}
      );
    } catch (error) {
      console.error('Failed to trigger background check:', error);
      throw error;
    }
  }

  async completeVehicleInspection(inspectionData: {
    odometerReading: number;
    condition: 'excellent' | 'good' | 'fair' | 'poor';
    issues: string[];
    photos: string[];
  }): Promise<VerificationStep> {
    try {
      return APIClient.post<VerificationStep>(
        '/driver/verification/vehicle-inspection',
        inspectionData
      );
    } catch (error) {
      console.error('Failed to complete vehicle inspection:', error);
      throw error;
    }
  }

  async getDocumentStatus(documentType: string): Promise<VerificationDocument | null> {
    try {
      return APIClient.get<VerificationDocument | null>(
        `/driver/verification/document/${documentType}`
      );
    } catch (error) {
      console.error('Failed to get document status:', error);
      return null;
    }
  }

  async renewDocument(documentType: string, expiryDate: Date): Promise<VerificationDocument> {
    try {
      return APIClient.post<VerificationDocument>(
        `/driver/verification/renew/${documentType}`,
        { expiryDate }
      );
    } catch (error) {
      console.error('Failed to renew document:', error);
      throw error;
    }
  }

  async getVerificationRequirements(): Promise<{
    country: string;
    requirements: string[];
    processingTime: string;
  }> {
    try {
      return APIClient.get<{
        country: string;
        requirements: string[];
        processingTime: string;
      }>('/driver/verification/requirements');
    } catch (error) {
      console.error('Failed to get verification requirements:', error);
      throw error;
    }
  }

  async requestSupport(stepId: string, message: string): Promise<void> {
    try {
      await APIClient.post(
        '/driver/verification/support',
        { stepId, message }
      );
    } catch (error) {
      console.error('Failed to request support:', error);
      throw error;
    }
  }

  async resubmitRejectedDocument(
    documentType: string,
    imagePath: string,
    explanation?: string
  ): Promise<VerificationDocument> {
    try {
      const formData = new FormData();
      formData.append('type', documentType);
      formData.append('explanation', explanation || '');

      formData.append('document', {
        uri: imagePath,
        type: 'image/jpeg',
        name: `${documentType}-resubmit-${Date.now()}.jpg`,
      } as any);

      return APIClient.post<VerificationDocument>(
        `/driver/verification/resubmit/${documentType}`,
        formData
      );
    } catch (error) {
      console.error('Failed to resubmit document:', error);
      throw error;
    }
  }

  async scheduleSelfie(): Promise<{ sessionId: string; expiresAt: Date }> {
    try {
      return APIClient.post<{ sessionId: string; expiresAt: Date }>(
        '/driver/verification/selfie/schedule',
        {}
      );
    } catch (error) {
      console.error('Failed to schedule selfie:', error);
      throw error;
    }
  }

  async submitSelfie(selfieImagePath: string, sessionId: string): Promise<void> {
    try {
      const formData = new FormData();
      formData.append('sessionId', sessionId);

      formData.append('selfie', {
        uri: selfieImagePath,
        type: 'image/jpeg',
        name: `selfie-${Date.now()}.jpg`,
      } as any);

      await APIClient.post('/driver/verification/selfie/submit', formData);
    } catch (error) {
      console.error('Failed to submit selfie:', error);
      throw error;
    }
  }

  getVerificationSteps(): VerificationStep[] {
    return [...this.verificationSteps];
  }

  calculateCompletionPercentage(profile: VerificationProfile): number {
    const requiredSteps = profile.steps.filter(s => s.required);
    const completedSteps = requiredSteps.filter(s => s.status === 'verified');
    return Math.round((completedSteps.length / requiredSteps.length) * 100);
  }

  isVerified(profile: VerificationProfile): boolean {
    return profile.overallStatus === 'verified';
  }

  isPendingReview(profile: VerificationProfile): boolean {
    return profile.overallStatus === 'pending_review';
  }

  isExpired(profile: VerificationProfile): boolean {
    if (!profile.nextRenewalDate) return false;
    return new Date() > profile.nextRenewalDate;
  }

  getNextExpiringSoon(profile: VerificationProfile, daysThreshold: number = 30): VerificationDocument[] {
    const expiringDocuments: VerificationDocument[] = [];

    profile.steps.forEach(step => {
      if (step.documents) {
        step.documents.forEach(doc => {
          const daysUntilExpiry = Math.ceil(
            (new Date(doc.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
          );

          if (daysUntilExpiry > 0 && daysUntilExpiry <= daysThreshold) {
            expiringDocuments.push(doc);
          }
        });
      }
    });

    return expiringDocuments;
  }
}

export const VerificationService = new VerificationServiceClass();
