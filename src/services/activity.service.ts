import { z } from 'zod';
import { apiClient, ApiClientError } from '@/lib/api-client';
import { API_ENDPOINTS } from '@/config/api.config';
import { t } from '@/lib/i18n';
import type {
  ActivityLog,
  ListActivityLogsParams,
  ActivityStats,
  PaginatedResponse,
} from '@/types/api.types';

/**
 * Validation schema for ActivityLog from API (snake_case fields)
 */
const ActivityLogFromApiSchema = z.object({
  id: z.string().uuid(),
  user_name: z.string().optional(),
  role: z.string().optional(),
  action: z.string(),
  entity_name: z.string().optional(),
  entity_id: z.string().optional(),
  entity_type: z.string().optional(),
  created_at: z.string(),
  user_id: z.string().optional(),
});

/**
 * Validation schema for ListActivityLogsParams
 */
const ListActivityLogsParamsSchema = z.object({
  page: z.number().int().positive().optional(),
  limit: z.number().int().positive().max(100).optional(),
  search: z.string().optional(),
}).optional();

/**
 * Validation schema for ListActivityLogsApiResponse (snake_case fields)
 */
const ListActivityLogsApiResponseSchema = z.object({
  activities: z.array(ActivityLogFromApiSchema),
  total: z.union([z.string(), z.number()]).transform(val => typeof val === 'string' ? parseInt(val, 10) : val),
});

/**
 * Validation schema for ActivityStats from API (snake_case fields)
 */
const ActivityStatsFromApiSchema = z.object({
  actions_today: z.number().int().nonnegative(),
});

/**
 * Activity Service
 * Handles activity log operations
 */
class ActivityService {
  /**
   * Normalize ActivityLog from API format (snake_case) to frontend format (camelCase)
   */
  private normalizeActivityLogFromApi(apiLog: z.infer<typeof ActivityLogFromApiSchema>): ActivityLog {
    return {
      id: apiLog.id,
      userId: apiLog.user_id || '',
      userName: apiLog.user_name || 'Unknown',
      userRole: apiLog.role || '',
      action: apiLog.action,
      entity: apiLog.entity_name || '',
      entityId: apiLog.entity_id || apiLog.id, // Use id as fallback if entity_id is missing
      details: apiLog.entity_type,
      timestamp: apiLog.created_at,
    };
  }

  /**
   * Normalize ActivityStats from API format (snake_case) to frontend format (camelCase)
   */
  private normalizeActivityStatsFromApi(apiStats: z.infer<typeof ActivityStatsFromApiSchema>): ActivityStats {
    return {
      actionsToday: apiStats.actions_today,
    };
  }

  /**
   * Get activity statistics
   * @returns Activity statistics
   * @throws {ApiClientError} If request fails or response is invalid
   */
  async getActivityStats(): Promise<ActivityStats> {
    try {
      // Get raw response from API
      const rawResponse = await apiClient.get<z.infer<typeof ActivityStatsFromApiSchema>>(API_ENDPOINTS.ACTIVITY.STATS);

      // Validate response structure with Zod
      let validatedResponse;
      try {
        validatedResponse = ActivityStatsFromApiSchema.parse(rawResponse);
      } catch (responseError) {
        console.error('[getActivityStats] Response validation failed:', responseError);
        console.error('[getActivityStats] Raw response was:', rawResponse);
        throw new ApiClientError(
          t('errors.invalidResponseFormat'),
          500,
          'INVALID_RESPONSE_FORMAT'
        );
      }

      // Normalize stats from API format to frontend format
      const normalizedStats = this.normalizeActivityStatsFromApi(validatedResponse);

      return normalizedStats;
    } catch (error) {
      console.error('[getActivityStats] Error:', error);
      
      // Improve error messages for better UX
      if (error instanceof ApiClientError) {
        // Re-throw ApiClientError as-is (already has proper message)
        throw error;
      } else if (error instanceof z.ZodError) {
        const fieldErrors = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
        console.error('[getActivityStats] ZodError:', fieldErrors);
        throw new ApiClientError(
          t('errors.invalidRequest') + ': ' + fieldErrors,
          400,
          'VALIDATION_ERROR'
        );
      } else {
        // Unknown error
        console.error('[getActivityStats] Unknown error:', error);
        throw new ApiClientError(
          t('errors.activityStatsLoadFailed'),
          500,
          'UNKNOWN_ERROR'
        );
      }
    }
  }

  /**
   * List activity logs with optional filters
   * @param params - Query parameters (page, limit, search)
   * @returns Paginated list of activity logs
   * @throws {ApiClientError} If request fails or response is invalid
   */
  async listActivityLogs(params?: ListActivityLogsParams): Promise<PaginatedResponse<ActivityLog>> {
    try {
      // Validate parameters
      let validatedParams;
      try {
        validatedParams = ListActivityLogsParamsSchema.parse(params);
      } catch (validationError) {
        if (validationError instanceof z.ZodError) {
          const fieldErrors = validationError.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
          console.error('[listActivityLogs] Parameter validation failed:', fieldErrors);
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
      if (validatedParams?.search) queryParams.append('search', validatedParams.search);

      const endpoint = `${API_ENDPOINTS.ACTIVITY.BASE}${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      
      console.log('[listActivityLogs] Fetching activity logs:', endpoint);

      // Get raw response from API
      const rawResponse = await apiClient.get<z.infer<typeof ListActivityLogsApiResponseSchema>>(endpoint);

      console.log('[listActivityLogs] API response:', JSON.stringify(rawResponse, null, 2));

      // Validate response structure with Zod
      let validatedResponse;
      try {
        validatedResponse = ListActivityLogsApiResponseSchema.parse(rawResponse);
        console.log('[listActivityLogs] Response validation passed:', validatedResponse);
      } catch (responseError) {
        console.error('[listActivityLogs] Response validation failed:', responseError);
        console.error('[listActivityLogs] Raw response was:', rawResponse);
        throw new ApiClientError(
          t('errors.invalidResponseFormat'),
          500,
          'INVALID_RESPONSE_FORMAT'
        );
      }

      // Normalize activity logs from API format to frontend format
      const normalizedLogs = validatedResponse.activities.map(log => this.normalizeActivityLogFromApi(log));

      // Calculate pagination metadata
      const total = validatedResponse.total;
      const page = validatedParams?.page || 1;
      const limit = validatedParams?.limit || 10;
      const totalPages = Math.ceil(total / limit);

      const paginatedResponse: PaginatedResponse<ActivityLog> = {
        data: normalizedLogs,
        pagination: {
          page,
          limit,
          total,
          totalPages,
        },
      };

      console.log('[listActivityLogs] Normalized response:', paginatedResponse);

      return paginatedResponse;
    } catch (error) {
      console.error('[listActivityLogs] Final error catch:', error);
      console.error('[listActivityLogs] Error type:', error?.constructor?.name);
      console.error('[listActivityLogs] Error stack:', error instanceof Error ? error.stack : 'No stack');
      
      // Improve error messages for better UX
      if (error instanceof ApiClientError) {
        // Re-throw ApiClientError as-is (already has proper message)
        throw error;
      } else if (error instanceof z.ZodError) {
        const fieldErrors = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
        console.error('[listActivityLogs] ZodError:', fieldErrors);
        throw new ApiClientError(
          t('errors.invalidRequest') + ': ' + fieldErrors,
          400,
          'VALIDATION_ERROR'
        );
      } else {
        // Unknown error
        console.error('[listActivityLogs] Unknown error:', error);
        throw new ApiClientError(
          t('errors.activityLogsLoadFailed'),
          500,
          'UNKNOWN_ERROR'
        );
      }
    }
  }
}

export const activityService = new ActivityService();

