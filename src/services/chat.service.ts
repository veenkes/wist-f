import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { apiClient } from '@/lib/api-client';
import { API_ENDPOINTS } from '@/config/api.config';
import type {
  Conversation,
  ChatMessage,
  ListMessagesParams,
  WSChatMessage,
  PaginatedResponse,
} from '@/types/api.types';

// --- Zod Schemas ---

const ConversationFromApiSchema = z.object({
  id: z.string(),
  partner_id: z.union([z.string(), z.number()]).optional().transform(v => v?.toString()),
  partnerId: z.union([z.string(), z.number()]).optional().transform(v => v?.toString()),
  last_message: z.string().optional().nullable(),
  last_message_at: z.string().optional().nullable(),
  unread_count: z.union([z.string(), z.number()]).transform(val => Number(val)).optional(),
  type: z.string().optional(),
  name: z.string().optional().nullable(),
  participants: z.array(z.union([z.string(), z.number()]).transform(v => v.toString())).optional(),
  // NEW: Добавляем allowed_roles в схему
  allowed_roles: z.array(z.string()).optional(),
  allowedRoles: z.array(z.string()).optional(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});

const ListConversationsApiResponseSchema = z.object({
  conversations: z.array(ConversationFromApiSchema),
});

// --- Service Class ---

class ChatService {
  private ws: WebSocket | null = null;
  private messageHandlers: Set<(message: WSChatMessage) => void> = new Set();
  private reconnectTimer: NodeJS.Timeout | null = null;
  private isConnecting = false;
  private token: string | null = null;

  // ================= REST API =================

  async listConversations(params?: { section?: string; type?: string; search?: string }): Promise<Conversation[]> {
    try {
      const queryParams = new URLSearchParams();
      if (params?.section) queryParams.append('section', params.section);
      if (params?.type) queryParams.append('type', params.type);
      if (params?.search) queryParams.append('search', params.search);

      const endpoint = `${API_ENDPOINTS.CHAT.CONVERSATIONS}?${queryParams.toString()}`;
      const response = await apiClient.get<any>(endpoint);

      const parsed = ListConversationsApiResponseSchema.safeParse(response);
      if (!parsed.success) {
        console.warn('[ChatService] Validation warning:', parsed.error);
        return (response.conversations || []).map((c: any) => this.normalizeConversation(c));
      }

      return parsed.data.conversations.map(c => this.normalizeConversation(c));
    } catch (error) {
      console.error('[ChatService] List conversations failed', error);
      return [];
    }
  }

  async getConversationHistory(
    conversationId: string,
    params?: Omit<ListMessagesParams, 'conversationId'>
  ): Promise<PaginatedResponse<ChatMessage>> {
    try {
      const query = new URLSearchParams({
        page: params?.page?.toString() || '1',
        limit: params?.limit?.toString() || '50'
      }).toString();

      const response = await apiClient.get<any>(
        `${API_ENDPOINTS.CHAT.CONVERSATION_MESSAGES(conversationId)}?${query}`
      );

      const rawMessages = response.messages || [];
      const messages = rawMessages
        .map((m: any) => this.normalizeMessage(m))
        .sort((a: ChatMessage, b: ChatMessage) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

      return {
        data: messages,
        pagination: {
          total: response.total || messages.length,
          page: Number(params?.page || 1),
          limit: Number(params?.limit || 50),
          totalPages: 1
        }
      };
    } catch (error) {
      console.error('[ChatService] History failed', error);
      return { data: [], pagination: { total: 0, page: 1, limit: 50, totalPages: 0 } };
    }
  }

  async sendMessage(data: { id?: string; conversation_id: string; content: string; type: string; attachments?: string[] }) {
    const messageId = data.id || uuidv4();
    const payload = { ...data, id: messageId };
    const response = await apiClient.post<{ message_id: string; conversation_id: string }>(
      API_ENDPOINTS.CHAT.MESSAGES,
      payload
    );
    return { ...response, message_id: messageId };
  }

  // === НОВЫЕ МЕТОДЫ ===

  // Создание группы с ролями
  async createGroup(name: string, members: string[], allowedRoles: string[] = []) {
    // Убираем /api, так как apiClient сам добавляет
    return apiClient.post<{ id: string; name: string }>('/chat/groups', { name, members, allowed_roles: allowedRoles });
  }

  // Обновление группы (Редактирование)
  async updateGroup(id: string, name: string, members: string[], allowedRoles: string[] = []) {
    return apiClient.put(`/chat/groups/${id}`, { name, members, allowed_roles: allowedRoles });
  }

  // Получить общее количество непрочитанных (для меню)
  async getTotalUnread() {
    return apiClient.get<{ count: number }>('/chat/unread/total');
  }

  // Пометить чат как прочитанный
  async markRead(conversationId: string) {
    return apiClient.post(`/chat/conversations/${conversationId}/read`, {});
  }

  // ================= WebSocket =================

  connectWebSocket(token: string) {
    if (this.ws?.readyState === WebSocket.OPEN || this.ws?.readyState === WebSocket.CONNECTING) return;
    this.token = token;
    this.isConnecting = true;

    let url = `wss://72.62.52.159.sslip.io/api/chat/ws`; 
    url = url.replace(/([^:]\/)\/+/g, "$1");

    console.log(`[ChatService] Connecting to ${url}`); 

    try {
      this.ws = new WebSocket(`${url}?token=${encodeURIComponent(token)}`);

      this.ws.onopen = () => {
        console.log('[ChatService] Connected');
        this.isConnecting = false;
        if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
        this.reconnectTimer = null;
        this.notifyHandlers({ type: 'connected' } as any);
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          const normalized = this.normalizeWSMessage(data);
          this.notifyHandlers(normalized);
        } catch (e) {
          console.error('❌ [ChatService] Message parse error:', e, event.data);
        }
      };

      this.ws.onclose = () => {
        console.log('[ChatService] Disconnected');
        this.isConnecting = false;
        this.ws = null;
        if (!this.reconnectTimer && this.token) {
          this.reconnectTimer = setTimeout(() => this.connectWebSocket(this.token!), 3000);
        }
      };
    } catch (e) {
      console.error('[ChatService] Connection error', e);
      this.isConnecting = false;
    }
  }

  joinConversation(id: string) {
    if (this.isConnected()) this.ws?.send(JSON.stringify({ type: 'join', conversationId: id }));
  }

  leaveConversation(id: string) {
    if (this.isConnected()) this.ws?.send(JSON.stringify({ type: 'leave', conversationId: id }));
  }

  isConnected() {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  onMessage(handler: (msg: WSChatMessage) => void) {
    this.messageHandlers.add(handler);
    return () => this.messageHandlers.delete(handler);
  }

  private notifyHandlers(msg: WSChatMessage) {
    this.messageHandlers.forEach(h => h(msg));
  }

  // ================= Normalizers =================

  normalizeConversation(api: any): Conversation {
    return {
      id: api.id,
      name: api.name,
      partnerId: api.partner_id || api.partnerId || (Array.isArray(api.participants) ? api.participants[0] : null),
      type: api.type || 'internal',
      lastMessage: api.last_message || api.content || '',
      lastMessageAt: api.last_message_at || api.updated_at || new Date().toISOString(),
      unreadCount: Number(api.unread_count || 0),
      participants: api.participants || [],
      // Маппинг ролей
      allowedRoles: api.allowed_roles || api.allowedRoles || [],
      createdAt: api.created_at || new Date().toISOString(),
      updatedAt: api.updated_at || new Date().toISOString()
    };
  }

  normalizeMessage(api: any): ChatMessage {
    return {
      id: api.id || api.message_id || `temp-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`, 
      conversationId: api.conversation_id || api.conversationId,
      senderId: (api.sender_id || api.userId || api.senderId || '').toString(),
      senderName: api.sender_name || api.senderName,
      message: api.content || api.message || '',
      timestamp: api.created_at || api.timestamp || new Date().toISOString(),
      read: !!(api.read || api.is_read || api.isRead),
      isOptimistic: false
    };
  }

  private normalizeWSMessage(data: any): WSChatMessage {
    return {
      ...data,
      type: data.type || 'message',
      conversationId: data.conversation_id || data.conversationId,
      message: data.content || data.message || data.text || '',
      senderId: (data.sender_id || data.userId || '').toString(),
      timestamp: data.created_at || data.timestamp || new Date().toISOString(),
      id: data.id || data.message_id || `ws-${Date.now()}` 
    };
  }
}

export const chatService = new ChatService();