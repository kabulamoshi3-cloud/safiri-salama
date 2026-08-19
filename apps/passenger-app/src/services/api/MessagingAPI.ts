import { APIClient } from './client';

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  message: string;
  type: 'text' | 'image' | 'location' | 'system';
  timestamp: Date;
  read: boolean;
  attachments?: string[];
}

export interface Conversation {
  id: string;
  tripId: string;
  participantId: string;
  participantName: string;
  participantAvatar?: string;
  participantType: 'driver' | 'passenger';
  lastMessage?: ChatMessage;
  unreadCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export class MessagingAPI {
  static async getConversations(limit: number = 50): Promise<Conversation[]> {
    return APIClient.get<Conversation[]>(`/messaging/conversations?limit=${limit}`);
  }

  static async getConversation(conversationId: string): Promise<Conversation> {
    return APIClient.get<Conversation>(`/messaging/conversations/${conversationId}`);
  }

  static async getMessages(
    conversationId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<ChatMessage[]> {
    return APIClient.get<ChatMessage[]>(
      `/messaging/conversations/${conversationId}/messages?limit=${limit}&offset=${offset}`
    );
  }

  static async sendMessage(
    conversationId: string,
    message: string,
    attachments?: string[]
  ): Promise<ChatMessage> {
    return APIClient.post<ChatMessage>(
      `/messaging/conversations/${conversationId}/messages`,
      {
        message,
        type: 'text',
        attachments,
      }
    );
  }

  static async sendLocation(
    conversationId: string,
    lat: number,
    lon: number
  ): Promise<ChatMessage> {
    return APIClient.post<ChatMessage>(
      `/messaging/conversations/${conversationId}/messages`,
      {
        message: `Shared location: ${lat}, ${lon}`,
        type: 'location',
        data: { lat, lon },
      }
    );
  }

  static async uploadAttachment(
    conversationId: string,
    file: File | Blob,
    type: 'image' | 'document'
  ): Promise<string> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);

    return APIClient.post<string>(
      `/messaging/conversations/${conversationId}/attachments`,
      formData
    );
  }

  static async markAsRead(conversationId: string): Promise<void> {
    return APIClient.post<void>(
      `/messaging/conversations/${conversationId}/mark-read`,
      {}
    );
  }

  static async markMessageAsRead(messageId: string): Promise<void> {
    return APIClient.post<void>(`/messaging/messages/${messageId}/read`, {});
  }

  static async deleteMessage(messageId: string): Promise<void> {
    return APIClient.delete<void>(`/messaging/messages/${messageId}`);
  }

  static async deleteConversation(conversationId: string): Promise<void> {
    return APIClient.delete<void>(`/messaging/conversations/${conversationId}`);
  }

  static async blockUser(userId: string): Promise<void> {
    return APIClient.post<void>(`/messaging/block/${userId}`, {});
  }

  static async unblockUser(userId: string): Promise<void> {
    return APIClient.post<void>(`/messaging/unblock/${userId}`, {});
  }

  static async reportMessage(messageId: string, reason: string): Promise<void> {
    return APIClient.post<void>(`/messaging/messages/${messageId}/report`, {
      reason,
    });
  }

  // WebSocket subscription for real-time messages
  static subscribeToMessages(conversationId: string): WebSocket | null {
    try {
      const ws = new WebSocket(
        `wss://api.dalasmart.app/messaging/conversations/${conversationId}/subscribe`
      );
      return ws;
    } catch (error) {
      console.error('Failed to subscribe to messages:', error);
      return null;
    }
  }
}
