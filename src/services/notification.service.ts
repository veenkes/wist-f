import { z } from 'zod';
import { apiClient, ApiClientError } from '@/lib/api-client';
import { API_ENDPOINTS, API_BASE_URL } from '@/config/api.config';
import { t } from '@/lib/i18n';
import type {
  Notification,
  CreateNotificationRequest,
  ListNotificationsParams,
  PaginatedResponse,
  NotificationStats,
  NotificationLog,
  MarkAsReadRequest,
  UnreadCountResponse,
  NotificationType,
  NotificationMethod,
  TargetAudience,
  NotificationStatus,
} from '@/types/api.types';

/**
 * Validation schema for CreateNotificationRequest (camelCase - frontend format)
 */
const CreateNotificationRequestSchema = z.object({
  title: z.string().min(1, t('errors.fieldRequired')),
  message: z.string().min(1, t('errors.fieldRequired')),
  type: z.enum(['Alert', 'Info', 'Warning', 'Success']),
  target_audience: z.string().min(1, t('errors.fieldRequired')), // Can be 'All', 'Parents', 'Students', 'Staff', 'Teachers', or custom
  methods: z.array(z.enum(['telegram', 'in-app', 'email', 'sms'])).min(1, t('errors.atLeastOneMethodRequired')),
  attachments: z.array(z.string()).optional(),
  send_at: z.string().optional(),
});

/**
 * Validation schema for Notification from API (snake_case fields)
 */
const NotificationFromApiSchema = z.object({
  id: z.string(),
  title: z.string(),
  message: z.string(),
  type: z.string(),
  target_audience: z.string(),
  methods: z.array(z.string()),
  attachments: z.array(z.string()).optional(),
  send_at: z.string().optional(),
  status: z.string().optional(),
  sentBy: z.string().optional(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});

/**
 * Validation schema for CreateNotificationResponse (API returns success flag)
 */
const CreateNotificationResponseSchema = z.object({
  success: z.boolean(),
});

/**
 * Validation schema for MyNotification from API (snake_case fields, simplified for user view)
 */
const MyNotificationFromApiSchema = z.object({
  id: z.string(),
  title: z.string(),
  message: z.string(),
  type: z.string(),
  created_at: z.string(),
  is_read: z.boolean(),
  attachments: z.array(z.string()).optional(),
  sender_name: z.string().optional(),
});

/**
 * Validation schema for ListMyNotificationsApiResponse (API response structure)
 */
const ListMyNotificationsApiResponseSchema = z.object({
  notifications: z.array(MyNotificationFromApiSchema),
  total: z.union([z.string(), z.number()]), // API returns string, but we'll normalize to number
});

/**
 * Validation schema for UnreadCountResponse (API response structure)
 */
const UnreadCountApiResponseSchema = z.object({
  count: z.number().int().nonnegative(),
});

/**
 * Validation schema for MarkAsReadRequest (notification_id is optional, empty string marks all)
 */
const MarkAsReadRequestSchema = z.object({
  notification_id: z.string().optional(), // Empty string or undefined marks all as read
});

/**
 * Validation schema for MarkAsReadResponse (API returns success flag)
 */
const MarkAsReadResponseSchema = z.object({
  success: z.boolean(),
});

/**
 * Validation schema for AdminNotificationTemplate from API (snake_case fields, simplified for admin list)
 */
const AdminNotificationTemplateFromApiSchema = z.object({
  id: z.string(),
  title: z.string(),
  status: z.string(),
  recipient_count: z.union([z.string(), z.number()]), // API returns string, but we'll normalize to number
  created_at: z.string(),
});

/**
 * Validation schema for ListAdminNotificationsApiResponse (API response structure)
 */
const ListAdminNotificationsApiResponseSchema = z.object({
  templates: z.array(AdminNotificationTemplateFromApiSchema),
  total: z.union([z.string(), z.number()]), // API returns string, but we'll normalize to number
});

/**
 * Validation schema for AdminStatsApiResponse (API response structure)
 * API returns: { total_sent: '6', scheduled: '0', failed: '0', total_templates: '0' }
 */
const AdminStatsApiResponseSchema = z.object({
  total_sent: z.union([z.string(), z.number()]).transform(val => parseInt(String(val), 10)),
  scheduled: z.union([z.string(), z.number()]).transform(val => parseInt(String(val), 10)).optional(),
  failed: z.union([z.string(), z.number()]).transform(val => parseInt(String(val), 10)),
  total_templates: z.union([z.string(), z.number()]).transform(val => parseInt(String(val), 10)),
});

/**
 * Notification Service
 * Handles notification management and WebSocket real-time updates
 */
class NotificationService {
  private ws: WebSocket | null = null;
  private messageHandlers: Set<(count: number) => void> = new Set();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  // ============================================================================
  // REST API Operations - User Notifications
  // ============================================================================

  /**
   * Normalize Notification from API format (snake_case) to frontend format (camelCase)
   */
  private normalizeNotificationFromApi(apiNotification: z.infer<typeof NotificationFromApiSchema>): Notification {
    return {
      id: apiNotification.id,
      title: apiNotification.title,
      message: apiNotification.message,
      type: apiNotification.type as NotificationType,
      target_audience: apiNotification.target_audience as TargetAudience,
      methods: apiNotification.methods as NotificationMethod[],
      attachments: apiNotification.attachments || [],
      send_at: apiNotification.send_at,
      status: (apiNotification.status as NotificationStatus) || 'Pending',
      sentBy: apiNotification.sentBy,
      createdAt: apiNotification.created_at || new Date().toISOString(),
      updatedAt: apiNotification.updated_at || new Date().toISOString(),
    };
  }

  /**
   * Normalize CreateNotificationRequest from frontend format (camelCase) to API format (snake_case)
   */
  private normalizeCreateNotificationRequestToApi(data: CreateNotificationRequest) {
    return {
      title: data.title,
      message: data.message,
      type: data.type,
      target_audience: data.target_audience,
      methods: data.methods,
      attachments: data.attachments || [],
      send_at: data.send_at || '',
    };
  }

  /**
   * Create a new notification (trigger) - CEO only
   * @param data - Notification data
   * @throws {ApiClientError} If request fails or response is invalid
   */
  async createNotification(data: CreateNotificationRequest): Promise<void> {
    try {
      // Validate request data
      let validatedData;
      try {
        validatedData = CreateNotificationRequestSchema.parse(data);
      } catch (validationError) {
        if (validationError instanceof z.ZodError) {
          const fieldErrors = validationError.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
          console.error('[createNotification] Request validation failed:', fieldErrors);
          throw new ApiClientError(
            t('errors.invalidRequest') + ': ' + fieldErrors,
            400,
            'VALIDATION_ERROR'
          );
        }
        throw validationError;
      }

      // Normalize request data from camelCase to snake_case (API format)
      const apiData = this.normalizeCreateNotificationRequestToApi(validatedData);

      // Create notification
      const rawResponse = await apiClient.post<z.infer<typeof CreateNotificationResponseSchema>>(
        API_ENDPOINTS.NOTIFICATIONS.BASE,
        apiData
      );

      // Validate response
      try {
        CreateNotificationResponseSchema.parse(rawResponse);
      } catch (responseError) {
        if (responseError instanceof z.ZodError) {
          console.error('[createNotification] Response validation failed:', responseError);
          console.error('[createNotification] Raw response was:', rawResponse);
          throw new ApiClientError(
            t('errors.invalidResponseFormat'),
            500,
            'INVALID_RESPONSE_FORMAT'
          );
        }
        throw responseError;
      }
    } catch (error: any) {
      console.error('[createNotification] Error:', error);
      
      // Improve error messages for better UX
      if (error instanceof ApiClientError) {
        // Re-throw ApiClientError as-is (already has proper message)
        throw error;
      } else if (error instanceof z.ZodError) {
        const fieldErrors = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
        console.error('[createNotification] ZodError:', fieldErrors);
        throw new ApiClientError(
          t('errors.invalidRequest') + ': ' + fieldErrors,
          400,
          'VALIDATION_ERROR'
        );
      } else {
        // Unknown error
        console.error('[createNotification] Unknown error:', error);
        throw new ApiClientError(
          t('errors.notificationCreateFailed'),
          500,
          'UNKNOWN_ERROR'
        );
      }
    }
  }

  /**
   * Normalize MyNotification from API format (snake_case) to frontend format (camelCase)
   */
  private normalizeMyNotificationFromApi(apiNotification: z.infer<typeof MyNotificationFromApiSchema>): Notification {
    return {
      id: apiNotification.id,
      title: apiNotification.title,
      message: apiNotification.message,
      type: apiNotification.type as NotificationType,
      target_audience: 'All', // Not provided in user view
      methods: ['in-app'], // Default, not provided in user view
      attachments: apiNotification.attachments || [],
      send_at: undefined,
      status: 'Processed', // Default, not provided in user view
      sentBy: apiNotification.sender_name,
      createdAt: apiNotification.created_at,
      updatedAt: apiNotification.created_at, // Use created_at as fallback
      // Additional field for user view
      isRead: apiNotification.is_read,
    } as Notification & { isRead: boolean };
  }

  /**
   * List my notifications (for regular users, not CEO)
   * @param params - Query parameters (page)
   * @returns Paginated list of notifications
   * @throws {ApiClientError} If request fails or response is invalid
   */
  async listMyNotifications(params?: { page?: number }): Promise<PaginatedResponse<Notification>> {
    try {
      // Validate query parameters if provided
      const queryParams = new URLSearchParams();
      if (params?.page) {
        const page = params.page;
        if (page < 1) {
          throw new ApiClientError(
            t('errors.invalidPageNumber'),
            400,
            'VALIDATION_ERROR'
          );
        }
        queryParams.append('page', page.toString());
      }

      const endpoint = `${API_ENDPOINTS.NOTIFICATIONS.BASE}${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;

      // Get raw response from API
      const rawResponse = await apiClient.get<z.infer<typeof ListMyNotificationsApiResponseSchema>>(endpoint);

      // Validate response
      let validatedResponse;
      try {
        validatedResponse = ListMyNotificationsApiResponseSchema.parse(rawResponse);
      } catch (responseError) {
        if (responseError instanceof z.ZodError) {
          console.error('[listMyNotifications] Response validation failed:', responseError);
          console.error('[listMyNotifications] Raw response was:', rawResponse);
          throw new ApiClientError(
            t('errors.invalidResponseFormat'),
            500,
            'INVALID_RESPONSE_FORMAT'
          );
        }
        throw responseError;
      }

      // Normalize notifications from API format to frontend format
      const normalizedNotifications = validatedResponse.notifications.map(notif => 
        this.normalizeMyNotificationFromApi(notif)
      );

      // Normalize total (API returns string, convert to number)
      const total = typeof validatedResponse.total === 'string' 
        ? parseInt(validatedResponse.total, 10) 
        : validatedResponse.total;

      return {
        data: normalizedNotifications,
        pagination: {
          total,
          page: params?.page || 1,
          limit: normalizedNotifications.length, // API doesn't return limit, use array length
          totalPages: Math.ceil(total / (normalizedNotifications.length || 1)),
        },
      };
    } catch (error: any) {
      console.error('[listMyNotifications] Error:', error);
      
      // Improve error messages for better UX
      if (error instanceof ApiClientError) {
        // Re-throw ApiClientError as-is (already has proper message)
        throw error;
      } else if (error instanceof z.ZodError) {
        const fieldErrors = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
        console.error('[listMyNotifications] ZodError:', fieldErrors);
        throw new ApiClientError(
          t('errors.invalidRequest') + ': ' + fieldErrors,
          400,
          'VALIDATION_ERROR'
        );
      } else {
        // Unknown error
        console.error('[listMyNotifications] Unknown error:', error);
        throw new ApiClientError(
          t('errors.notificationsLoadFailed'),
          500,
          'UNKNOWN_ERROR'
        );
      }
    }
  }

  /**
   * Get unread notification count
   * @returns Unread count
   * @throws {ApiClientError} If request fails or response is invalid
   */
  async getUnreadCount(): Promise<UnreadCountResponse> {
    try {
      // Get raw response from API
      const rawResponse = await apiClient.get<z.infer<typeof UnreadCountApiResponseSchema>>(
        API_ENDPOINTS.NOTIFICATIONS.UNREAD
      );

      // Handle empty response (API may return {})
      const responseToValidate = Object.keys(rawResponse || {}).length === 0 ? { count: 0 } : rawResponse;

      // Validate response
      let validatedResponse;
      try {
        validatedResponse = UnreadCountApiResponseSchema.parse(responseToValidate);
      } catch (responseError) {
        if (responseError instanceof z.ZodError) {
          console.error('[getUnreadCount] Response validation failed:', responseError);
          console.error('[getUnreadCount] Raw response was:', rawResponse);
          throw new ApiClientError(
            t('errors.invalidResponseFormat'),
            500,
            'INVALID_RESPONSE_FORMAT'
          );
        }
        throw responseError;
      }
      
      return { count: validatedResponse.count || 0 };
    } catch (error: any) {
      console.error('[getUnreadCount] Error:', error);
      
      // Improve error messages for better UX
      if (error instanceof ApiClientError) {
        // Re-throw ApiClientError as-is (already has proper message)
        throw error;
      } else if (error instanceof z.ZodError) {
        const fieldErrors = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
        console.error('[getUnreadCount] ZodError:', fieldErrors);
        throw new ApiClientError(
          t('errors.invalidRequest') + ': ' + fieldErrors,
          400,
          'VALIDATION_ERROR'
        );
      } else {
        // Unknown error
        console.error('[getUnreadCount] Unknown error:', error);
        throw new ApiClientError(
          t('errors.unreadCountLoadFailed'),
          500,
          'UNKNOWN_ERROR'
        );
      }
    }
  }

  /**
   * Mark notification(s) as read
   * @param data - Notification ID (empty string or undefined to mark all as read)
   * @throws {ApiClientError} If request fails or response is invalid
   */
  async markAsRead(data: MarkAsReadRequest): Promise<void> {
    try {
      // Validate request data
      let validatedData;
      try {
        validatedData = MarkAsReadRequestSchema.parse(data);
      } catch (validationError) {
        if (validationError instanceof z.ZodError) {
          const fieldErrors = validationError.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
          console.error('[markAsRead] Request validation failed:', fieldErrors);
          throw new ApiClientError(
            t('errors.invalidRequest') + ': ' + fieldErrors,
            400,
            'VALIDATION_ERROR'
          );
        }
        throw validationError;
      }

      // Normalize request data: convert undefined to empty string for API
      const apiData = {
        notification_id: validatedData.notification_id || '',
      };

      // Mark as read
      const rawResponse = await apiClient.put<z.infer<typeof MarkAsReadResponseSchema>>(
        API_ENDPOINTS.NOTIFICATIONS.READ,
        apiData
      );

      // Validate response
      try {
        MarkAsReadResponseSchema.parse(rawResponse);
      } catch (responseError) {
        if (responseError instanceof z.ZodError) {
          console.error('[markAsRead] Response validation failed:', responseError);
          console.error('[markAsRead] Raw response was:', rawResponse);
          throw new ApiClientError(
            t('errors.invalidResponseFormat'),
            500,
            'INVALID_RESPONSE_FORMAT'
          );
        }
        throw responseError;
      }
    } catch (error: any) {
      console.error('[markAsRead] Error:', error);
      
      // Improve error messages for better UX
      if (error instanceof ApiClientError) {
        // Re-throw ApiClientError as-is (already has proper message)
        throw error;
      } else if (error instanceof z.ZodError) {
        const fieldErrors = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
        console.error('[markAsRead] ZodError:', fieldErrors);
        throw new ApiClientError(
          t('errors.invalidRequest') + ': ' + fieldErrors,
          400,
          'VALIDATION_ERROR'
        );
      } else {
        // Unknown error
        console.error('[markAsRead] Unknown error:', error);
        throw new ApiClientError(
          t('errors.notificationMarkAsReadFailed'),
          500,
          'UNKNOWN_ERROR'
        );
      }
    }
  }

  // ============================================================================
  // REST API Operations - Admin Notifications
  // ============================================================================

  /**
   * Normalize AdminNotificationTemplate from API format (snake_case) to frontend format (camelCase)
   */
  private normalizeAdminNotificationTemplateFromApi(
    apiTemplate: z.infer<typeof AdminNotificationTemplateFromApiSchema>
  ): Notification {
    // Normalize recipient_count (string to number)
    const recipientCount = typeof apiTemplate.recipient_count === 'string'
      ? parseInt(apiTemplate.recipient_count, 10)
      : apiTemplate.recipient_count;

    return {
      id: apiTemplate.id,
      title: apiTemplate.title,
      message: '', // Not provided in admin list view
      type: 'Info' as NotificationType, // Default, not provided in admin list
      target_audience: 'All', // Default, not provided in admin list
      methods: ['in-app'], // Default, not provided in admin list
      attachments: [],
      send_at: undefined,
      status: apiTemplate.status as NotificationStatus,
      sentBy: undefined,
      createdAt: apiTemplate.created_at,
      updatedAt: apiTemplate.created_at, // Use created_at as fallback
      // Additional field for admin view
      recipientCount,
    } as Notification & { recipientCount: number };
  }

  /**
   * List notification history (admin) - CEO only
   * @param params - Query parameters (page, limit, search, status, type)
   * @returns Paginated list of notifications
   * @throws {ApiClientError} If request fails or response is invalid
   */
  async listAdminNotifications(params?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    type?: string;
  }): Promise<PaginatedResponse<Notification>> {
    try {
      // Validate query parameters if provided
      const queryParams = new URLSearchParams();
      
      if (params?.page) {
        const page = params.page;
        if (page < 1) {
          throw new ApiClientError(
            t('errors.invalidPageNumber'),
            400,
            'VALIDATION_ERROR'
          );
        }
        queryParams.append('page', page.toString());
      }
      
      if (params?.limit) {
        const limit = params.limit;
        if (limit < 1) {
          throw new ApiClientError(
            t('errors.invalidLimit'),
            400,
            'VALIDATION_ERROR'
          );
        }
        queryParams.append('limit', limit.toString());
      }
      
      if (params?.search) {
        queryParams.append('search', params.search);
      }
      
      if (params?.status) {
        queryParams.append('status', params.status);
      }
      
      if (params?.type) {
        queryParams.append('type', params.type);
      }

      const endpoint = `${API_ENDPOINTS.NOTIFICATIONS.ADMIN.LIST}${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;

      // Get raw response from API
      const rawResponse = await apiClient.get<z.infer<typeof ListAdminNotificationsApiResponseSchema>>(endpoint);

      // Validate response
      let validatedResponse;
      try {
        validatedResponse = ListAdminNotificationsApiResponseSchema.parse(rawResponse);
      } catch (responseError) {
        if (responseError instanceof z.ZodError) {
          console.error('[listAdminNotifications] Response validation failed:', responseError);
          console.error('[listAdminNotifications] Raw response was:', rawResponse);
          throw new ApiClientError(
            t('errors.invalidResponseFormat'),
            500,
            'INVALID_RESPONSE_FORMAT'
          );
        }
        throw responseError;
      }

      // Normalize templates from API format to frontend format
      const normalizedNotifications = validatedResponse.templates.map(template => 
        this.normalizeAdminNotificationTemplateFromApi(template)
      );

      // Normalize total (API returns string, convert to number)
      const total = typeof validatedResponse.total === 'string' 
        ? parseInt(validatedResponse.total, 10) 
        : validatedResponse.total;

      return {
        data: normalizedNotifications,
        pagination: {
          total,
          page: params?.page || 1,
          limit: params?.limit || normalizedNotifications.length,
          totalPages: Math.ceil(total / (params?.limit || normalizedNotifications.length || 1)),
        },
      };
    } catch (error: any) {
      console.error('[listAdminNotifications] Error:', error);
      
      // Improve error messages for better UX
      if (error instanceof ApiClientError) {
        // Re-throw ApiClientError as-is (already has proper message)
        throw error;
      } else if (error instanceof z.ZodError) {
        const fieldErrors = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
        console.error('[listAdminNotifications] ZodError:', fieldErrors);
        throw new ApiClientError(
          t('errors.invalidRequest') + ': ' + fieldErrors,
          400,
          'VALIDATION_ERROR'
        );
      } else {
        // Unknown error
        console.error('[listAdminNotifications] Unknown error:', error);
        throw new ApiClientError(
          t('errors.adminNotificationsLoadFailed'),
          500,
          'UNKNOWN_ERROR'
        );
      }
    }
  }

  /**
   * Get notification dashboard stats (admin)
   * @returns Notification statistics
   * @throws {ApiClientError} If request fails or response is invalid
   */
  async getAdminStats(): Promise<NotificationStats> {
    try {
      const rawResponse = await apiClient.get<z.infer<typeof AdminStatsApiResponseSchema>>(
        API_ENDPOINTS.NOTIFICATIONS.ADMIN.STATS
      );

      let validatedResponse;
      try {
        validatedResponse = AdminStatsApiResponseSchema.parse(rawResponse);
      } catch (responseError) {
        console.error('[getAdminStats] Response validation failed:', responseError);
        console.error('[getAdminStats] Raw response was:', rawResponse);
        throw new ApiClientError(
          t('errors.invalidResponseFormat'),
          500,
          'INVALID_RESPONSE_FORMAT'
        );
      }

      // Normalize to NotificationStats format (camelCase)
      return {
        total: validatedResponse.total_templates,
        sent: validatedResponse.total_sent,
        failed: validatedResponse.failed,
        scheduled: validatedResponse.scheduled || 0,
      };
    } catch (error: any) {
      console.error('[getAdminStats] Error:', error);
      if (error instanceof ApiClientError) {
        throw error;
      } else if (error instanceof z.ZodError) {
        const fieldErrors = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
        console.error('[getAdminStats] ZodError:', fieldErrors);
        throw new ApiClientError(
          t('errors.invalidResponseFormat') + ': ' + fieldErrors,
          500,
          'INVALID_RESPONSE_FORMAT'
        );
      } else {
        throw new ApiClientError(
          t('errors.notificationStatsLoadFailed'),
          500,
          'UNKNOWN_ERROR'
        );
      }
    }
  }

  /**
   * Get notification detail (admin)
   * @param id - Notification ID
   * @returns Notification details
   */
  async getAdminNotification(id: string): Promise<Notification> {
    const response = await apiClient.get<any>(API_ENDPOINTS.NOTIFICATIONS.ADMIN.BY_ID(id));
    
    // Handle different response formats
    if (response && typeof response === 'object') {
      // If response is wrapped in an object, extract it
      if ('template' in response) {
        return response.template;
      } else if ('notification' in response) {
        return response.notification;
      } else if ('data' in response) {
        return response.data;
      }
      // Otherwise return as is (assuming it's already a Notification)
      return response;
    }
    
    return response;
  }

  /**
   * Get notification sending logs (admin)
   * @param id - Notification ID
   * @returns List of sending logs
   */
  async getNotificationLogs(id: string): Promise<NotificationLog[]> {
    return apiClient.get<NotificationLog[]>(API_ENDPOINTS.NOTIFICATIONS.ADMIN.LOGS(id));
  }

  // ============================================================================
  // WebSocket Operations
  // ============================================================================

  /**
   * Connect to WebSocket notification server
   * @param accessToken - JWT access token for authentication
   */
  connectWebSocket(accessToken: string): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      return;
    }

    // Convert HTTP(S) URL to WS(S) URL
    const wsUrl = API_BASE_URL.replace(/^http/, 'ws') + API_ENDPOINTS.NOTIFICATIONS.WEBSOCKET;
    
    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.reconnectAttempts = 0;
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          // Assuming the WebSocket sends { count: number } for unread count
          if (typeof data.count === 'number') {
            this.notifyCountHandlers(data.count);
          }
        } catch (error) {
          // Silent error handling
        }
      };

      this.ws.onerror = () => {
        // Silent error handling
      };

      this.ws.onclose = () => {
        this.attemptReconnect(accessToken);
      };
    } catch (error) {
      // Silent error handling
    }
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnectWebSocket(): void {
    if (this.ws) {
      // Only close if connection is open or connecting
      if (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING) {
        try {
          this.ws.close();
        } catch (error) {
          // Ignore errors when closing
        }
      }
      this.ws = null;
      this.reconnectAttempts = 0;
    }
  }

  /**
   * Register a count handler for unread notifications
   * @param handler - Function to handle unread count updates
   * @returns Unsubscribe function
   */
  onUnreadCountUpdate(handler: (count: number) => void): () => void {
    this.messageHandlers.add(handler);
    
    // Return unsubscribe function
    return () => {
      this.messageHandlers.delete(handler);
    };
  }

  /**
   * Check if WebSocket is connected
   */
  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private notifyCountHandlers(count: number): void {
    this.messageHandlers.forEach((handler) => {
      try {
        handler(count);
      } catch (error) {
        // Silent error handling
      }
    });
  }

  private attemptReconnect(accessToken: string): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    setTimeout(() => {
      this.connectWebSocket(accessToken);
    }, delay);
  }
}

export const notificationService = new NotificationService();

