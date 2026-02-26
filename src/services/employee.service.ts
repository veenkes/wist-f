import { z } from 'zod';
import { apiClient, ApiClientError } from '@/lib/api-client';
import { API_ENDPOINTS } from '@/config/api.config';
import { t } from '@/lib/i18n';
import type {
  Employee,
  CreateEmployeeRequest,
  ListEmployeesParams,
  PaginatedResponse,
  EmployeeRole,
  EmployeeStatus,
  PaymentSchedule,
} from '@/types/api.types';

/**
 * Validation schema for CreateEmployeeRequest (camelCase - frontend format)
 */
const CreateEmployeeRequestSchema = z.object({
  fullName: z.string().min(1, t('errors.fieldRequired')),
  email: z.string().email(t('errors.invalidEmailFormat')),
  password: z.string().min(6, t('errors.passwordTooShort')),
  role: z.enum(['CEO', 'Accountant', 'Teacher', 'Support', 'Admin', 'Manager']),
  phone: z.string().min(1, t('errors.fieldRequired')),
  salary: z.number().nonnegative(t('errors.invalidSalary')),
  paymentSchedule: z.enum(['Monthly', 'Weekly', 'Bi-weekly']),
  status: z.enum(['Active', 'Inactive', 'On Leave']),
  telegramChatId: z.string().optional(),
});

/**
 * Validation schema for Employee from API (snake_case fields)
 */
const EmployeeFromApiSchema = z.object({
  id: z.string(),
  full_name: z.string().nullable().optional(), // API may return null
  email: z.string(), // Use string instead of email() to handle non-standard emails (e.g., with Cyrillic)
  role: z.string(),
  phone: z.string().optional(),
  salary: z.number().optional(),
  payment_schedule: z.string().optional(),
  status: z.string(),
  telegram_chat_id: z.string().optional(),
  is_online: z.boolean().optional(),
  last_active: z.string().optional(),
  last_active_at: z.string().optional(), // API may return either last_active or last_active_at
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});

/**
 * Validation schema for CreateEmployeeResponse (API returns partial employee data)
 */
const CreateEmployeeResponseSchema = EmployeeFromApiSchema.partial().extend({
  id: z.string(),
  full_name: z.string(),
  email: z.string(),
  role: z.string(),
  status: z.string(),
});

/**
 * Validation schema for ListEmployeesParams (query parameters)
 */
const ListEmployeesParamsSchema = z.object({
  page: z.number().int().positive().optional(),
  limit: z.number().int().positive().optional(),
  status: z.enum(['Active', 'Inactive', 'On Leave']).optional(),
  role: z.string().optional(),
});

/**
 * Validation schema for ListEmployeesApiResponse (API response structure)
 */
const ListEmployeesApiResponseSchema = z.object({
  employees: z.array(EmployeeFromApiSchema),
  total: z.number().int().nonnegative(),
  active_count: z.number().int().nonnegative().optional(),
});

/**
 * Validation schema for UpdateEmployeeRequest (all fields optional, but at least one required)
 */
const UpdateEmployeeRequestSchema = CreateEmployeeRequestSchema.partial().refine(
  (data) => Object.keys(data).length > 0,
  {
    message: t('errors.atLeastOneFieldRequired'),
  }
);

/**
 * Validation schema for DeleteEmployeeResponse (API returns success flag)
 */
const DeleteEmployeeResponseSchema = z.object({
  success: z.boolean(),
});

/**
 * Employee Service
 * Handles employee management operations
 */
class EmployeeService {
  /**
   * Normalize Employee from API format (snake_case) to frontend format (camelCase)
   */
  private normalizeEmployeeFromApi(apiEmployee: z.infer<typeof EmployeeFromApiSchema>): Employee {
    return {
      id: apiEmployee.id,
      fullName: apiEmployee.full_name || '', // Handle null/undefined from API
      email: apiEmployee.email,
      role: apiEmployee.role as EmployeeRole,
      phone: apiEmployee.phone || '',
      salary: apiEmployee.salary || 0,
      paymentSchedule: (apiEmployee.payment_schedule as PaymentSchedule) || 'Monthly',
      status: apiEmployee.status as EmployeeStatus,
      telegramChatId: apiEmployee.telegram_chat_id,
      isOnline: apiEmployee.is_online || false,
      lastActive: apiEmployee.last_active || apiEmployee.last_active_at, // Support both field names
      createdAt: apiEmployee.created_at || new Date().toISOString(),
      updatedAt: apiEmployee.updated_at || new Date().toISOString(),
    };
  }

  /**
   * Normalize CreateEmployeeRequest from frontend format (camelCase) to API format (PascalCase)
   */
  private normalizeCreateEmployeeRequestToApi(data: CreateEmployeeRequest): Record<string, unknown> {
    return {
      fullName: data.fullName,
      email: data.email,
      password: data.password,
      role: data.role,
      phone: data.phone,
      salary: data.salary,
      paymentSchedule: data.paymentSchedule,
      status: data.status,
      telegramChatId: data.telegramChatId,
    };
  }

  /**
   * Create a new employee
   * @param data - Employee data
   * @returns Created employee
   * @throws {ApiClientError} If request fails or response is invalid
   */
  async createEmployee(data: CreateEmployeeRequest): Promise<Employee> {
    try {
      // Validate request data
      let validatedData;
      try {
        validatedData = CreateEmployeeRequestSchema.parse(data);
      } catch (validationError) {
        if (validationError instanceof z.ZodError) {
          const fieldErrors = validationError.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
          console.error('[createEmployee] Request validation failed:', fieldErrors);
          throw new ApiClientError(
            t('errors.invalidRequest') + ': ' + fieldErrors,
            400,
            'VALIDATION_ERROR'
          );
        }
        throw validationError;
      }

      // Normalize request data from camelCase to snake_case
      const apiData = this.normalizeCreateEmployeeRequestToApi(validatedData);

      // Get raw response from API
      const rawResponse = await apiClient.post<z.infer<typeof CreateEmployeeResponseSchema>>(
        API_ENDPOINTS.EMPLOYEES.BASE,
        apiData
      );

      // Validate response structure with Zod
      let validatedResponse;
      try {
        validatedResponse = CreateEmployeeResponseSchema.parse(rawResponse);
      } catch (responseError) {
        console.error('[createEmployee] Response validation failed:', responseError);
        console.error('[createEmployee] Raw response was:', rawResponse);
        throw new ApiClientError(
          t('errors.invalidResponseFormat'),
          500,
          'INVALID_RESPONSE_FORMAT'
        );
      }

      // Normalize employee from API format to frontend format
      const normalizedEmployee = this.normalizeEmployeeFromApi(validatedResponse);

      return normalizedEmployee;
    } catch (error) {
      console.error('[createEmployee] Error:', error);
      
      // Improve error messages for better UX
      if (error instanceof ApiClientError) {
        // Re-throw ApiClientError as-is (already has proper message)
        throw error;
      } else if (error instanceof z.ZodError) {
        const fieldErrors = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
        console.error('[createEmployee] ZodError:', fieldErrors);
        throw new ApiClientError(
          t('errors.invalidRequest') + ': ' + fieldErrors,
          400,
          'VALIDATION_ERROR'
        );
      } else {
        // Unknown error
        console.error('[createEmployee] Unknown error:', error);
        throw new ApiClientError(
          t('errors.employeeCreateFailed'),
          500,
          'UNKNOWN_ERROR'
        );
      }
    }
  }

  /**
   * List employees with optional filters
   * @param params - Query parameters (page, limit, status, role)
   * @returns Paginated list of employees
   * @throws {ApiClientError} If request fails or response is invalid
   */
  async listEmployees(params?: ListEmployeesParams): Promise<PaginatedResponse<Employee>> {
    try {
      // Validate query parameters if provided
      let validatedParams: z.infer<typeof ListEmployeesParamsSchema> | undefined;
      if (params) {
        try {
          validatedParams = ListEmployeesParamsSchema.parse(params);
        } catch (validationError) {
          if (validationError instanceof z.ZodError) {
            const fieldErrors = validationError.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
            console.error('[listEmployees] Request validation failed:', fieldErrors);
            throw new ApiClientError(
              t('errors.invalidRequest') + ': ' + fieldErrors,
              400,
              'VALIDATION_ERROR'
            );
          }
          throw validationError;
        }
      }

      // Build query string
      const queryParams = new URLSearchParams();
      if (validatedParams?.page) queryParams.append('page', validatedParams.page.toString());
      if (validatedParams?.limit) queryParams.append('limit', validatedParams.limit.toString());
      if (validatedParams?.status) queryParams.append('status', validatedParams.status);
      if (validatedParams?.role) queryParams.append('role', validatedParams.role);

      const endpoint = `${API_ENDPOINTS.EMPLOYEES.BASE}${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;

      // Get raw response from API
      const rawResponse = await apiClient.get<z.infer<typeof ListEmployeesApiResponseSchema>>(endpoint);

      // Validate response structure with Zod
      let validatedResponse;
      try {
        validatedResponse = ListEmployeesApiResponseSchema.parse(rawResponse);
      } catch (responseError) {
        console.error('[listEmployees] Response validation failed:', responseError);
        console.error('[listEmployees] Raw response was:', rawResponse);
        throw new ApiClientError(
          t('errors.invalidResponseFormat'),
          500,
          'INVALID_RESPONSE_FORMAT'
        );
      }

      // Normalize employees from API format to frontend format
      const normalizedEmployees = validatedResponse.employees.map(emp => this.normalizeEmployeeFromApi(emp));

      // Return paginated response
      return {
        data: normalizedEmployees,
        pagination: {
          page: validatedParams?.page || 1,
          limit: validatedParams?.limit || validatedResponse.employees.length,
          total: validatedResponse.total,
          totalPages: validatedParams?.limit 
            ? Math.ceil(validatedResponse.total / validatedParams.limit)
            : 1,
        },
      };
    } catch (error) {
      console.error('[listEmployees] Error:', error);
      
      // Improve error messages for better UX
      if (error instanceof ApiClientError) {
        // Re-throw ApiClientError as-is (already has proper message)
        throw error;
      } else if (error instanceof z.ZodError) {
        const fieldErrors = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
        console.error('[listEmployees] ZodError:', fieldErrors);
        throw new ApiClientError(
          t('errors.invalidRequest') + ': ' + fieldErrors,
          400,
          'VALIDATION_ERROR'
        );
      } else {
        // Unknown error
        console.error('[listEmployees] Unknown error:', error);
        throw new ApiClientError(
          t('errors.employeesLoadFailed'),
          500,
          'UNKNOWN_ERROR'
        );
      }
    }
  }

  /**
   * Get employee by ID
   * @param id - Employee ID
   * @returns Employee details
   */
  async getEmployee(id: string): Promise<Employee> {
    return apiClient.get<Employee>(API_ENDPOINTS.EMPLOYEES.BY_ID(id));
  }

  /**
   * Update employee
   * @param id - Employee ID
   * @param data - Updated employee data (all fields optional, but at least one required)
   * @returns Updated employee
   * @throws {ApiClientError} If request fails or response is invalid
   */
  async updateEmployee(id: string, data: Partial<CreateEmployeeRequest>): Promise<Employee> {
    try {
      // Validate employee ID
      if (!id || typeof id !== 'string' || id.trim().length === 0) {
        throw new ApiClientError(
          t('errors.invalidEmployeeId'),
          400,
          'VALIDATION_ERROR'
        );
      }

      // Validate request data
      let validatedData;
      try {
        validatedData = UpdateEmployeeRequestSchema.parse(data);
      } catch (validationError) {
        if (validationError instanceof z.ZodError) {
          const fieldErrors = validationError.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
          console.error('[updateEmployee] Request validation failed:', fieldErrors);
          throw new ApiClientError(
            t('errors.invalidRequest') + ': ' + fieldErrors,
            400,
            'VALIDATION_ERROR'
          );
        }
        throw validationError;
      }

      // Normalize request data from camelCase to PascalCase (API format)
      const apiData: Record<string, unknown> = {};
      if (validatedData.fullName !== undefined) apiData.fullName = validatedData.fullName;
      if (validatedData.email !== undefined) apiData.email = validatedData.email;
      if (validatedData.password !== undefined) apiData.password = validatedData.password;
      if (validatedData.role !== undefined) apiData.role = validatedData.role;
      if (validatedData.phone !== undefined) apiData.phone = validatedData.phone;
      if (validatedData.salary !== undefined) apiData.salary = validatedData.salary;
      if (validatedData.paymentSchedule !== undefined) apiData.paymentSchedule = validatedData.paymentSchedule;
      if (validatedData.status !== undefined) apiData.status = validatedData.status;
      if (validatedData.telegramChatId !== undefined) apiData.telegramChatId = validatedData.telegramChatId;

      // Get raw response from API
      const rawResponse = await apiClient.put<z.infer<typeof CreateEmployeeResponseSchema>>(
        API_ENDPOINTS.EMPLOYEES.BY_ID(id),
        apiData
      );

      // Validate response structure with Zod
      let validatedResponse;
      try {
        validatedResponse = CreateEmployeeResponseSchema.parse(rawResponse);
      } catch (responseError) {
        console.error('[updateEmployee] Response validation failed:', responseError);
        console.error('[updateEmployee] Raw response was:', rawResponse);
        throw new ApiClientError(
          t('errors.invalidResponseFormat'),
          500,
          'INVALID_RESPONSE_FORMAT'
        );
      }

      // Normalize employee from API format to frontend format
      const normalizedEmployee = this.normalizeEmployeeFromApi(validatedResponse);

      return normalizedEmployee;
    } catch (error) {
      console.error('[updateEmployee] Error:', error);
      
      // Improve error messages for better UX
      if (error instanceof ApiClientError) {
        // Re-throw ApiClientError as-is (already has proper message)
        throw error;
      } else if (error instanceof z.ZodError) {
        const fieldErrors = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
        console.error('[updateEmployee] ZodError:', fieldErrors);
        throw new ApiClientError(
          t('errors.invalidRequest') + ': ' + fieldErrors,
          400,
          'VALIDATION_ERROR'
        );
      } else {
        // Unknown error
        console.error('[updateEmployee] Unknown error:', error);
        throw new ApiClientError(
          t('errors.employeeUpdateFailed'),
          500,
          'UNKNOWN_ERROR'
        );
      }
    }
  }

  /**
   * Delete employee
   * @param id - Employee ID
   * @throws {ApiClientError} If request fails or response is invalid
   */
  async deleteEmployee(id: string): Promise<void> {
    try {
      // Validate employee ID
      if (!id || typeof id !== 'string' || id.trim().length === 0) {
        throw new ApiClientError(
          t('errors.invalidEmployeeId'),
          400,
          'VALIDATION_ERROR'
        );
      }

      // Delete employee
      const rawResponse = await apiClient.delete<z.infer<typeof DeleteEmployeeResponseSchema>>(
        API_ENDPOINTS.EMPLOYEES.BY_ID(id)
      );

      // Validate response
      try {
        DeleteEmployeeResponseSchema.parse(rawResponse);
      } catch (responseError) {
        if (responseError instanceof z.ZodError) {
          console.error('[deleteEmployee] Response validation failed:', responseError);
          console.error('[deleteEmployee] Raw response was:', rawResponse);
          throw new ApiClientError(
            t('errors.invalidResponseFormat'),
            500,
            'INVALID_RESPONSE_FORMAT'
          );
        }
        throw responseError;
      }
    } catch (error: any) {
      console.error('[deleteEmployee] Error:', error);
      
      // Improve error messages for better UX
      if (error instanceof ApiClientError) {
        // Re-throw ApiClientError as-is (already has proper message)
        throw error;
      } else if (error instanceof z.ZodError) {
        const fieldErrors = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
        console.error('[deleteEmployee] ZodError:', fieldErrors);
        throw new ApiClientError(
          t('errors.invalidRequest') + ': ' + fieldErrors,
          400,
          'VALIDATION_ERROR'
        );
      } else {
        // Unknown error
        console.error('[deleteEmployee] Unknown error:', error);
        throw new ApiClientError(
          t('errors.employeeDeleteFailed'),
          500,
          'UNKNOWN_ERROR'
        );
      }
    }
  }
}

export const employeeService = new EmployeeService();

