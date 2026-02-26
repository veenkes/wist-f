import { z } from 'zod';
import { apiClient, ApiClientError } from '@/lib/api-client';
import { API_ENDPOINTS } from '@/config/api.config';
import { t } from '@/lib/i18n';
import type {
  Event,
  CreateEventRequest,
  UpdateEventRequest,
  ListEventsParams,
  PaginatedResponse,
  EventType,
  EventStatus,
  LocationType,
  EventCategory,
} from '@/types/api.types';

/**
 * Validation schema for UpdateEventRequest (all fields optional)
 */
const UpdateEventRequestSchema = z.object({
  title: z.string().min(1, t('errors.fieldRequired')).optional(),
  type: z.enum(['Meeting', 'Sports', 'Academic', 'Social', 'Administrative', 'Training', 'Celebration', 'Announcement', 'Conference', 'Workshop', 'Seminar', 'Other']).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, t('errors.invalidDateFormat')).optional(),
  time: z.string().regex(/^\d{2}:\d{2}$/, t('errors.invalidTimeFormat')).optional(),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, t('errors.invalidTimeFormat')).optional(),
  location: z.string().min(1, t('errors.fieldRequired')).optional(),
  locationType: z.enum(['Online', 'Offline', 'Hybrid']).optional(),
  description: z.string().optional(),
  audience: z.string().optional(),
  attendees: z.number().int().nonnegative().optional(),
  organizer: z.string().optional(),
  status: z.enum(['Upcoming', 'Ongoing', 'Completed', 'Cancelled']).optional(),
  category: z.enum(['Academic', 'Administrative', 'Social', 'Other']).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, t('errors.invalidColorFormat')).optional(),
  reminderSet: z.boolean().optional(),
  attachments: z.array(z.string().url(t('errors.invalidUrl'))).optional(),
  assignedTo: z.array(z.string()).optional(),
  notifications: z.array(z.any()).optional(),
}).refine((data) => Object.keys(data).length > 0, {
  message: t('errors.atLeastOneFieldRequired'),
});

/**
 * Validation schema for CreateEventRequest
 */
const CreateEventRequestSchema = z.object({
  title: z.string().min(1, t('errors.fieldRequired')),
  type: z.enum(['Meeting', 'Sports', 'Academic', 'Social', 'Administrative', 'Training', 'Celebration', 'Announcement', 'Conference', 'Workshop', 'Seminar', 'Other']),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, t('errors.invalidDateFormat')),
  time: z.string().regex(/^\d{2}:\d{2}$/, t('errors.invalidTimeFormat')),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, t('errors.invalidTimeFormat')),
  location: z.string().min(1, t('errors.fieldRequired')),
  locationType: z.enum(['Online', 'Offline', 'Hybrid']),
  description: z.string().optional(),
  audience: z.string().optional(),
  attendees: z.number().int().nonnegative().optional(),
  organizer: z.string().optional(),
  status: z.enum(['Upcoming', 'Ongoing', 'Completed', 'Cancelled']).optional(),
  category: z.enum(['Academic', 'Administrative', 'Social', 'Other']).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, t('errors.invalidColorFormat')).optional(),
  reminderSet: z.boolean().optional(),
  attachments: z.array(z.string().url(t('errors.invalidUrl'))).optional(),
  assignedTo: z.array(z.string()).optional(),
  notifications: z.array(z.any()).optional(),
});

/**
 * Validation schema for CreateEventResponse (API returns only event_id)
 */
const CreateEventResponseSchema = z.object({
  event_id: z.string().uuid(),
});

/**
 * Validation schema for DeleteEventResponse
 */
const DeleteEventResponseSchema = z.object({
  success: z.boolean(),
});

/**
 * Validation schema for Event from API (snake_case fields)
 */
const EventFromApiSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  type: z.string(),
  date: z.string(),
  time: z.string(),
  end_time: z.string(),
  location: z.string(),
  location_type: z.string(),
  description: z.string().optional(),
  audience: z.string().optional(),
  attendees: z.number().int().optional(),
  organizer: z.string().optional(),
  status: z.string(),
  category: z.string(),
  color: z.string().optional(),
  reminder_set: z.boolean().optional(),
  attachments: z.array(z.string()).optional(),
  assigned_to: z.array(z.string()).optional(),
  notifications: z.array(z.any()).optional(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});

/**
 * Validation schema for ListEventsParams
 */
const ListEventsParamsSchema = z.object({
  page: z.number().int().positive().optional(),
  limit: z.number().int().positive().max(100).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  type: z.string().optional(),
  status: z.string().optional(),
}).optional();

/**
 * Validation schema for ListEventsApiResponse (snake_case fields)
 */
const ListEventsApiResponseSchema = z.object({
  events: z.array(EventFromApiSchema),
  total: z.union([z.string(), z.number()]).transform(val => typeof val === 'string' ? parseInt(val, 10) : val),
});

/**
 * Event Service
 * Handles event management operations
 */
class EventService {
  /**
   * Normalize Event from API format (snake_case) to frontend format (camelCase)
   */
  private normalizeEventFromApi(apiEvent: z.infer<typeof EventFromApiSchema>): Event {
    return {
      id: apiEvent.id,
      title: apiEvent.title,
      type: apiEvent.type as EventType,
      date: apiEvent.date,
      time: apiEvent.time,
      endTime: apiEvent.end_time,
      location: apiEvent.location,
      locationType: apiEvent.location_type as LocationType,
      description: apiEvent.description || '',
      audience: apiEvent.audience || '',
      attendees: apiEvent.attendees || 0,
      organizer: apiEvent.organizer || '',
      status: apiEvent.status as EventStatus,
      category: apiEvent.category as EventCategory,
      color: apiEvent.color || '#8B5CF6',
      reminderSet: apiEvent.reminder_set || false,
      attachments: apiEvent.attachments || [],
      assignedTo: apiEvent.assigned_to || [],
      notifications: apiEvent.notifications || [],
      createdAt: apiEvent.created_at || new Date().toISOString(),
      updatedAt: apiEvent.updated_at || new Date().toISOString(),
    };
  }

  /**
   * Create a new event
   * @param data - Event data
   * @returns Created event
   * @throws {ApiClientError} If request fails or response is invalid
   */
  async createEvent(data: CreateEventRequest): Promise<Event> {
    try {
      // Validate request data
      let validatedData;
      try {
        validatedData = CreateEventRequestSchema.parse(data);
      } catch (validationError) {
        if (validationError instanceof z.ZodError) {
          const fieldErrors = validationError.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
          console.error('[createEvent] Validation failed:', fieldErrors);
          throw new ApiClientError(
            t('errors.invalidRequest') + ': ' + fieldErrors,
            400,
            'VALIDATION_ERROR'
          );
        }
        throw validationError;
      }

      console.log('[createEvent] Creating event:', JSON.stringify(validatedData, null, 2));

      // Make POST request
      let rawResponse;
      try {
        rawResponse = await apiClient.post<z.infer<typeof CreateEventResponseSchema>>(
          API_ENDPOINTS.EVENTS.BASE,
          validatedData
        );
      } catch (requestError) {
        console.error('[createEvent] Request failed:', requestError);
        throw requestError;
      }

      console.log('[createEvent] API response:', JSON.stringify(rawResponse, null, 2));

      // Validate response structure with Zod
      let validatedResponse;
      try {
        validatedResponse = CreateEventResponseSchema.parse(rawResponse);
        console.log('[createEvent] Response validation passed:', validatedResponse);
      } catch (responseError) {
        console.error('[createEvent] Response validation failed:', responseError);
        console.error('[createEvent] Raw response was:', rawResponse);
        throw new ApiClientError(
          t('errors.invalidResponseFormat'),
          500,
          'INVALID_RESPONSE_FORMAT'
        );
      }

      // Fetch the full event object using the returned event_id
      console.log('[createEvent] Fetching created event:', validatedResponse.event_id);
      const createdEvent = await this.getEvent(validatedResponse.event_id);

      console.log('[createEvent] Created event:', createdEvent);

      return createdEvent;
    } catch (error) {
      console.error('[createEvent] Final error catch:', error);
      console.error('[createEvent] Error type:', error?.constructor?.name);
      console.error('[createEvent] Error stack:', error instanceof Error ? error.stack : 'No stack');
      
      // Improve error messages for better UX
      if (error instanceof ApiClientError) {
        // Re-throw ApiClientError as-is (already has proper message)
        throw error;
      } else if (error instanceof z.ZodError) {
        const fieldErrors = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
        console.error('[createEvent] ZodError:', fieldErrors);
        throw new ApiClientError(
          t('errors.invalidRequest') + ': ' + fieldErrors,
          400,
          'VALIDATION_ERROR'
        );
      } else {
        // Unknown error
        console.error('[createEvent] Unknown error:', error);
        throw new ApiClientError(
          t('errors.eventCreateFailed'),
          500,
          'UNKNOWN_ERROR'
        );
      }
    }
  }

  /**
   * List events with optional filters
   * @param params - Query parameters (page, limit, startDate, endDate, type, status)
   * @returns Paginated list of events
   * @throws {ApiClientError} If request fails or response is invalid
   */
  async listEvents(params?: ListEventsParams): Promise<PaginatedResponse<Event>> {
    try {
      // Validate parameters
      let validatedParams;
      try {
        validatedParams = ListEventsParamsSchema.parse(params);
      } catch (validationError) {
        if (validationError instanceof z.ZodError) {
          const fieldErrors = validationError.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
          console.error('[listEvents] Parameter validation failed:', fieldErrors);
          throw new ApiClientError(
            t('errors.invalidRequest') + ': ' + fieldErrors,
            400,
            'VALIDATION_ERROR'
          );
        }
        throw validationError;
      }

      // Build query parameters
      const queryParams = new URLSearchParams();
      
      if (validatedParams?.page) queryParams.append('page', validatedParams.page.toString());
      if (validatedParams?.limit) queryParams.append('limit', validatedParams.limit.toString());
      if (validatedParams?.startDate) queryParams.append('startDate', validatedParams.startDate);
      if (validatedParams?.endDate) queryParams.append('endDate', validatedParams.endDate);
      if (validatedParams?.type) queryParams.append('type', validatedParams.type);
      if (validatedParams?.status) queryParams.append('status', validatedParams.status);

      const endpoint = `${API_ENDPOINTS.EVENTS.BASE}${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      
      console.log('[listEvents] Fetching events:', endpoint);

      // Get raw response from API
      const rawResponse = await apiClient.get<z.infer<typeof ListEventsApiResponseSchema>>(endpoint);

      console.log('[listEvents] API response:', JSON.stringify(rawResponse, null, 2));

      // Validate response structure with Zod
      let validatedResponse;
      try {
        validatedResponse = ListEventsApiResponseSchema.parse(rawResponse);
        console.log('[listEvents] Response validation passed:', validatedResponse);
      } catch (responseError) {
        console.error('[listEvents] Response validation failed:', responseError);
        console.error('[listEvents] Raw response was:', rawResponse);
        throw new ApiClientError(
          t('errors.invalidResponseFormat'),
          500,
          'INVALID_RESPONSE_FORMAT'
        );
      }

      // Normalize events from API format to frontend format
      const normalizedEvents = validatedResponse.events.map(event => this.normalizeEventFromApi(event));

      // Calculate pagination metadata
      const total = validatedResponse.total;
      const page = validatedParams?.page || 1;
      const limit = validatedParams?.limit || 10;
      const totalPages = Math.ceil(total / limit);

      const paginatedResponse: PaginatedResponse<Event> = {
        data: normalizedEvents,
        pagination: {
          page,
          limit,
          total,
          totalPages,
        },
      };

      console.log('[listEvents] Normalized response:', paginatedResponse);

      return paginatedResponse;
    } catch (error) {
      console.error('[listEvents] Final error catch:', error);
      console.error('[listEvents] Error type:', error?.constructor?.name);
      console.error('[listEvents] Error stack:', error instanceof Error ? error.stack : 'No stack');
      
      // Improve error messages for better UX
      if (error instanceof ApiClientError) {
        // Re-throw ApiClientError as-is (already has proper message)
        throw error;
      } else if (error instanceof z.ZodError) {
        const fieldErrors = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
        console.error('[listEvents] ZodError:', fieldErrors);
        throw new ApiClientError(
          t('errors.invalidRequest') + ': ' + fieldErrors,
          400,
          'VALIDATION_ERROR'
        );
      } else {
        // Unknown error
        console.error('[listEvents] Unknown error:', error);
        throw new ApiClientError(
          t('errors.eventsLoadFailed'),
          500,
          'UNKNOWN_ERROR'
        );
      }
    }
  }

  /**
   * Get event by ID
   * @param id - Event ID
   * @returns Event details
   * @throws {ApiClientError} If request fails or response is invalid
   */
  async getEvent(id: string): Promise<Event> {
    try {
      // Validate ID
      if (!id || typeof id !== 'string' || id.trim().length === 0) {
        throw new ApiClientError(
          t('errors.invalidEventId'),
          400,
          'VALIDATION_ERROR'
        );
      }

      console.log('[getEvent] Fetching event:', id);

      // Get raw response from API
      const rawResponse = await apiClient.get<z.infer<typeof EventFromApiSchema>>(
        API_ENDPOINTS.EVENTS.BY_ID(id)
      );

      console.log('[getEvent] API response:', JSON.stringify(rawResponse, null, 2));

      // Validate response structure with Zod
      let validatedResponse;
      try {
        validatedResponse = EventFromApiSchema.parse(rawResponse);
        console.log('[getEvent] Response validation passed:', validatedResponse);
      } catch (responseError) {
        console.error('[getEvent] Response validation failed:', responseError);
        console.error('[getEvent] Raw response was:', rawResponse);
        throw new ApiClientError(
          t('errors.invalidResponseFormat'),
          500,
          'INVALID_RESPONSE_FORMAT'
        );
      }

      // Normalize from API format to frontend format
      const normalizedEvent = this.normalizeEventFromApi(validatedResponse);

      console.log('[getEvent] Normalized event:', normalizedEvent);

      return normalizedEvent;
    } catch (error) {
      console.error('[getEvent] Final error catch:', error);
      console.error('[getEvent] Error type:', error?.constructor?.name);
      console.error('[getEvent] Error stack:', error instanceof Error ? error.stack : 'No stack');
      
      // Improve error messages for better UX
      if (error instanceof ApiClientError) {
        // Re-throw ApiClientError as-is (already has proper message)
        throw error;
      } else if (error instanceof z.ZodError) {
        const fieldErrors = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
        console.error('[getEvent] ZodError:', fieldErrors);
        throw new ApiClientError(
          t('errors.invalidRequest') + ': ' + fieldErrors,
          400,
          'VALIDATION_ERROR'
        );
      } else {
        // Unknown error
        console.error('[getEvent] Unknown error:', error);
        throw new ApiClientError(
          t('errors.eventLoadFailed'),
          500,
          'UNKNOWN_ERROR'
        );
      }
    }
  }

  /**
   * Update event
   * @param id - Event ID
   * @param data - Updated event data
   * @returns Updated event
   * @throws {ApiClientError} If request fails or response is invalid
   */
  async updateEvent(id: string, data: UpdateEventRequest): Promise<Event> {
    try {
      // Validate ID
      if (!id || typeof id !== 'string' || id.trim().length === 0) {
        throw new ApiClientError(
          t('errors.invalidEventId'),
          400,
          'VALIDATION_ERROR'
        );
      }

      // Validate request data
      let validatedData;
      try {
        validatedData = UpdateEventRequestSchema.parse(data);
      } catch (validationError) {
        if (validationError instanceof z.ZodError) {
          const fieldErrors = validationError.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
          console.error('[updateEvent] Validation failed:', fieldErrors);
          throw new ApiClientError(
            t('errors.invalidRequest') + ': ' + fieldErrors,
            400,
            'VALIDATION_ERROR'
          );
        }
        throw validationError;
      }

      // Filter out undefined values
      const filteredData = Object.fromEntries(
        Object.entries(validatedData).filter(([_, value]) => value !== undefined)
      );

      console.log('[updateEvent] Updating event:', id, JSON.stringify(filteredData, null, 2));

      // Make PUT request
      const rawResponse = await apiClient.put<z.infer<typeof EventFromApiSchema>>(
        API_ENDPOINTS.EVENTS.BY_ID(id),
        filteredData
      );

      console.log('[updateEvent] API response:', JSON.stringify(rawResponse, null, 2));

      // Validate response structure with Zod
      let validatedResponse;
      try {
        validatedResponse = EventFromApiSchema.parse(rawResponse);
        console.log('[updateEvent] Response validation passed:', validatedResponse);
      } catch (responseError) {
        console.error('[updateEvent] Response validation failed:', responseError);
        console.error('[updateEvent] Raw response was:', rawResponse);
        throw new ApiClientError(
          t('errors.invalidResponseFormat'),
          500,
          'INVALID_RESPONSE_FORMAT'
        );
      }

      // Normalize from API format to frontend format
      const normalizedEvent = this.normalizeEventFromApi(validatedResponse);

      console.log('[updateEvent] Updated event:', normalizedEvent);

      return normalizedEvent;
    } catch (error) {
      console.error('[updateEvent] Final error catch:', error);
      console.error('[updateEvent] Error type:', error?.constructor?.name);
      console.error('[updateEvent] Error stack:', error instanceof Error ? error.stack : 'No stack');
      
      // Improve error messages for better UX
      if (error instanceof ApiClientError) {
        // Re-throw ApiClientError as-is (already has proper message)
        throw error;
      } else if (error instanceof z.ZodError) {
        const fieldErrors = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
        console.error('[updateEvent] ZodError:', fieldErrors);
        throw new ApiClientError(
          t('errors.invalidRequest') + ': ' + fieldErrors,
          400,
          'VALIDATION_ERROR'
        );
      } else {
        // Unknown error
        console.error('[updateEvent] Unknown error:', error);
        throw new ApiClientError(
          t('errors.eventUpdateFailed'),
          500,
          'UNKNOWN_ERROR'
        );
      }
    }
  }

  /**
   * Delete event
   * @param id - Event ID
   * @throws {ApiClientError} If request fails or response is invalid
   */
  async deleteEvent(id: string): Promise<void> {
    try {
      // Validate ID
      if (!id || typeof id !== 'string' || id.trim().length === 0) {
        throw new ApiClientError(
          t('errors.invalidEventId'),
          400,
          'VALIDATION_ERROR'
        );
      }

      console.log('[deleteEvent] Deleting event:', id);

      // Make DELETE request
      const rawResponse = await apiClient.delete<z.infer<typeof DeleteEventResponseSchema>>(
        API_ENDPOINTS.EVENTS.BY_ID(id)
      );

      console.log('[deleteEvent] API response:', JSON.stringify(rawResponse, null, 2));

      // Validate response structure with Zod
      let validatedResponse;
      try {
        validatedResponse = DeleteEventResponseSchema.parse(rawResponse);
        console.log('[deleteEvent] Response validation passed:', validatedResponse);
      } catch (responseError) {
        console.error('[deleteEvent] Response validation failed:', responseError);
        console.error('[deleteEvent] Raw response was:', rawResponse);
        throw new ApiClientError(
          t('errors.invalidResponseFormat'),
          500,
          'INVALID_RESPONSE_FORMAT'
        );
      }

      // Check if deletion was successful
      if (!validatedResponse.success) {
        throw new ApiClientError(
          t('errors.eventDeleteFailed'),
          500,
          'DELETE_FAILED'
        );
      }

      console.log('[deleteEvent] Event deleted successfully');
    } catch (error) {
      console.error('[deleteEvent] Final error catch:', error);
      console.error('[deleteEvent] Error type:', error?.constructor?.name);
      console.error('[deleteEvent] Error stack:', error instanceof Error ? error.stack : 'No stack');
      
      // Improve error messages for better UX
      if (error instanceof ApiClientError) {
        // Re-throw ApiClientError as-is (already has proper message)
        throw error;
      } else if (error instanceof z.ZodError) {
        const fieldErrors = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
        console.error('[deleteEvent] ZodError:', fieldErrors);
        throw new ApiClientError(
          t('errors.invalidRequest') + ': ' + fieldErrors,
          400,
          'VALIDATION_ERROR'
        );
      } else {
        // Unknown error
        console.error('[deleteEvent] Unknown error:', error);
        throw new ApiClientError(
          t('errors.eventDeleteFailed'),
          500,
          'UNKNOWN_ERROR'
        );
      }
    }
  }
}

export const eventService = new EventService();

