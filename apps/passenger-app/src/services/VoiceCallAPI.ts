import { APIClient } from './api/client';
import { Platform } from 'react-native';
import RtcEngine from 'react-native-agora';

export interface CallSession {
  id: string;
  initiator: string;
  recipient: string;
  type: 'driver-passenger' | 'support';
  status: 'ringing' | 'active' | 'ended' | 'missed';
  startTime: Date;
  endTime?: Date;
  duration: number; // seconds
  recordingUrl?: string;
  rating?: number;
}

export interface CallMetrics {
  duration: number;
  audioQuality: 'excellent' | 'good' | 'fair' | 'poor';
  packetLoss: number; // percentage
  latency: number; // milliseconds
  bandwidth: number; // kbps
  issues: string[];
}

export class VoiceCallAPI {
  private rtcEngine: any;
  private callSession: CallSession | null = null;
  private isInitialized = false;

  async initialize(agoraAppId: string): Promise<void> {
    try {
      this.rtcEngine = await RtcEngine.create(agoraAppId);
      
      // Enable audio
      await this.rtcEngine.enableAudio();
      
      // Set audio profile
      await this.rtcEngine.setAudioProfile(1, 1); // AUDIO_PROFILE_DEFAULT, AUDIO_SCENARIO_DEFAULT
      
      // Set up event listeners
      this.setupEventListeners();
      
      this.isInitialized = true;
      console.log('VoiceCallAPI initialized with Agora');
    } catch (error) {
      console.error('Failed to initialize VoiceCallAPI:', error);
      throw error;
    }
  }

  private setupEventListeners(): void {
    this.rtcEngine.addEventListener('UserJoined', (data: any) => {
      console.log('User joined call:', data);
    });

    this.rtcEngine.addEventListener('UserOffline', (data: any) => {
      console.log('User left call:', data);
    });

    this.rtcEngine.addEventListener('JoinChannelSuccess', (data: any) => {
      console.log('Successfully joined channel:', data);
    });

    this.rtcEngine.addEventListener('LeaveChannel', (data: any) => {
      console.log('Left channel:', data);
    });
  }

  async initiateCall(recipientId: string, tripId: string): Promise<CallSession> {
    try {
      if (!this.isInitialized) {
        throw new Error('VoiceCallAPI not initialized');
      }

      // Request call through backend
      const response = await APIClient.post<{
        sessionId: string;
        token: string;
        channel: string;
      }>('/voice/call/initiate', {
        recipientId,
        tripId,
      });

      // Join Agora channel with token
      await this.rtcEngine.joinChannel(response.token, response.channel, null, 0);

      // Create call session
      this.callSession = {
        id: response.sessionId,
        initiator: 'current-user',
        recipient: recipientId,
        type: 'driver-passenger',
        status: 'ringing',
        startTime: new Date(),
        duration: 0,
      };

      return this.callSession;
    } catch (error) {
      console.error('Failed to initiate call:', error);
      throw error;
    }
  }

  async acceptCall(sessionId: string): Promise<void> {
    try {
      const response = await APIClient.post<{
        token: string;
        channel: string;
      }>(`/voice/call/${sessionId}/accept`, {});

      // Join Agora channel
      await this.rtcEngine.joinChannel(response.token, response.channel, null, 0);

      if (this.callSession) {
        this.callSession.status = 'active';
      }

      console.log('Call accepted');
    } catch (error) {
      console.error('Failed to accept call:', error);
      throw error;
    }
  }

  async rejectCall(sessionId: string, reason?: string): Promise<void> {
    try {
      await APIClient.post(`/voice/call/${sessionId}/reject`, { reason });
      console.log('Call rejected');
    } catch (error) {
      console.error('Failed to reject call:', error);
      throw error;
    }
  }

  async endCall(): Promise<void> {
    try {
      if (!this.callSession) return;

      // Leave Agora channel
      await this.rtcEngine.leaveChannel();

      // Update backend
      const duration = Math.round((Date.now() - this.callSession.startTime.getTime()) / 1000);
      await APIClient.post(`/voice/call/${this.callSession.id}/end`, {
        duration,
      });

      this.callSession.status = 'ended';
      this.callSession.endTime = new Date();
      this.callSession.duration = duration;
    } catch (error) {
      console.error('Failed to end call:', error);
      throw error;
    }
  }

  async rateCall(sessionId: string, rating: number, feedback?: string): Promise<void> {
    try {
      await APIClient.post(`/voice/call/${sessionId}/rate`, {
        rating,
        feedback,
      });

      if (this.callSession && this.callSession.id === sessionId) {
        this.callSession.rating = rating;
      }
    } catch (error) {
      console.error('Failed to rate call:', error);
      throw error;
    }
  }

  async getCallMetrics(): Promise<CallMetrics> {
    try {
      const stats = await this.rtcEngine.getCallStats();

      return {
        duration: stats.totalDuration || 0,
        audioQuality: this.getAudioQuality(stats.audioRecvBitrate),
        packetLoss: stats.audioRecvPacketLossRate || 0,
        latency: stats.lastmileDelay || 0,
        bandwidth: stats.audioRecvBitrate || 0,
        issues: this.detectIssues(stats),
      };
    } catch (error) {
      console.error('Failed to get call metrics:', error);
      return {
        duration: 0,
        audioQuality: 'poor',
        packetLoss: 0,
        latency: 0,
        bandwidth: 0,
        issues: ['Unable to collect metrics'],
      };
    }
  }

  private getAudioQuality(bitrate: number): 'excellent' | 'good' | 'fair' | 'poor' {
    if (bitrate >= 50000) return 'excellent';
    if (bitrate >= 30000) return 'good';
    if (bitrate >= 10000) return 'fair';
    return 'poor';
  }

  private detectIssues(stats: any): string[] {
    const issues: string[] = [];

    if (stats.audioRecvPacketLossRate > 0.05) {
      issues.push('High packet loss detected');
    }

    if (stats.lastmileDelay > 200) {
      issues.push('High latency detected');
    }

    if (stats.audioRecvBitrate < 10000) {
      issues.push('Low bandwidth');
    }

    return issues;
  }

  async enableRecording(): Promise<void> {
    try {
      await APIClient.post(`/voice/call/${this.callSession?.id}/recording/start`, {});
      console.log('Call recording started');
    } catch (error) {
      console.error('Failed to start recording:', error);
    }
  }

  async disableRecording(): Promise<void> {
    try {
      await APIClient.post(`/voice/call/${this.callSession?.id}/recording/stop`, {});
      console.log('Call recording stopped');
    } catch (error) {
      console.error('Failed to stop recording:', error);
    }
  }

  async getCallHistory(limit: number = 50): Promise<CallSession[]> {
    return APIClient.get<CallSession[]>(`/voice/call/history?limit=${limit}`);
  }

  async getCallDetails(sessionId: string): Promise<CallSession> {
    return APIClient.get<CallSession>(`/voice/call/${sessionId}`);
  }

  async muteAudio(): Promise<void> {
    try {
      await this.rtcEngine.muteLocalAudioStream(true);
    } catch (error) {
      console.error('Failed to mute audio:', error);
    }
  }

  async unmuteAudio(): Promise<void> {
    try {
      await this.rtcEngine.muteLocalAudioStream(false);
    } catch (error) {
      console.error('Failed to unmute audio:', error);
    }
  }

  async switchAudioOutput(device: 'speaker' | 'earpiece'): Promise<void> {
    try {
      if (device === 'speaker') {
        await this.rtcEngine.setDefaultAudioRoutetoSpeakerphone(true);
      } else {
        await this.rtcEngine.setDefaultAudioRoutetoSpeakerphone(false);
      }
    } catch (error) {
      console.error('Failed to switch audio output:', error);
    }
  }

  async destroy(): Promise<void> {
    try {
      if (this.callSession && this.callSession.status === 'active') {
        await this.endCall();
      }
      await RtcEngine.destroy();
      this.isInitialized = false;
    } catch (error) {
      console.error('Failed to destroy VoiceCallAPI:', error);
    }
  }

  getCurrentCallSession(): CallSession | null {
    return this.callSession;
  }
}

export const VoiceCallService = new VoiceCallAPI();
