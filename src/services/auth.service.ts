import { z } from 'zod';
import { apiClient, ApiClientError } from '@/lib/api-client';
import { API_ENDPOINTS } from '@/config/api.config';
import { t } from '@/lib/i18n';
import type {
  LoginRequest,
  LoginResponse,
  RefreshTokenRequest,
  RefreshTokenResponse,
} from '@/types/api.types';

/**
 * Validation schemas for auth requests
 */
const LoginRequestSchema = z.object({
  email: z
    .string()
    .min(1, t('errors.emailRequired'))
    .email(t('errors.invalidEmailFormat')),
  password: z
    .string()
    .min(1, t('errors.passwordRequired'))
    .min(6, t('errors.passwordMinLength')),
});

const RefreshTokenRequestSchema = z.object({
  refresh_token: z
    .string()
    .min(1, t('errors.refreshTokenRequired')),
});

/**
 * Auth Service
 * Handles authentication operations: login and token refresh
 */
class AuthService {
  /**
   * Validate login request data
   * @param email - User email
   * @param password - User password
   * @throws ApiClientError if validation fails
   */
  private validateLoginInput(email: string, password: string): void {
    try {
      LoginRequestSchema.parse({ email, password });
    } catch (error) {
      if (error instanceof z.ZodError) {
        const firstError = error.errors[0];
        throw new ApiClientError(
          firstError.message,
          400,
          'VALIDATION_ERROR'
        );
      }
      throw error;
    }
  }

  /**
   * Validate refresh token request data
   * @param refreshToken - Refresh token
   * @throws ApiClientError if validation fails
   */
  private validateRefreshTokenInput(refreshToken: string): void {
    try {
      RefreshTokenRequestSchema.parse({ refresh_token: refreshToken });
    } catch (error) {
      if (error instanceof z.ZodError) {
        const firstError = error.errors[0];
        throw new ApiClientError(
          firstError.message,
          400,
          'VALIDATION_ERROR'
        );
      }
      throw error;
    }
  }

  /**
   * Login with email and password
   * 
   * Validates input, sends request, and stores tokens automatically.
   * 
   * @param email - User email (must be valid email format)
   * @param password - User password (minimum 6 characters)
   * @returns Login response with tokens and user data
   * @throws ApiClientError if validation fails or login fails
   */
  async login(email: string, password: string): Promise<LoginResponse> {
    // Validate input before sending request
    this.validateLoginInput(email, password);

    const payload: LoginRequest = { email, password };
    
    try {
    const response = await apiClient.post<LoginResponse>(
      API_ENDPOINTS.AUTH.LOGIN,
      payload,
      { requiresAuth: false }
    );

      // Validate response structure
      if (!response.access_token || !response.refresh_token) {
        throw new ApiClientError(
          t('errors.missingTokens'),
          500,
          'INVALID_RESPONSE'
        );
      }

    // Store tokens in the API client
      apiClient.setTokens(response.access_token, response.refresh_token);

      return response;
    } catch (error) {
      // Improve error messages for better UX
      if (error instanceof ApiClientError) {
        // Handle specific backend error messages
        if (error.status === 401) {
          throw new ApiClientError(
            t('errors.invalidCredentials'),
            error.status,
            'INVALID_CREDENTIALS'
          );
        }
        if (error.status === 400) {
          throw new ApiClientError(
            error.message || t('errors.invalidRequest'),
            error.status,
            error.code
          );
        }
        throw error;
      }

      // Network or unknown errors
      throw new ApiClientError(
        t('errors.loginFailed'),
        undefined,
        'LOGIN_FAILED'
      );
    }
  }

  /**
   * Refresh access token using refresh token
   * 
   * Validates refresh token, sends request, and updates stored tokens.
   * 
   * @param refreshToken - Refresh token (must be non-empty string)
   * @returns New access token (and optionally new refresh token)
   * @throws ApiClientError if validation fails or refresh fails
   */
  async refreshToken(refreshToken: string): Promise<RefreshTokenResponse> {
    // Validate input before sending request
    this.validateRefreshTokenInput(refreshToken);

    const payload: RefreshTokenRequest = { refresh_token: refreshToken };
    
    try {
    const response = await apiClient.post<RefreshTokenResponse>(
      API_ENDPOINTS.AUTH.REFRESH,
      payload,
      { requiresAuth: false }
    );

      // Validate response structure
      if (!response.access_token) {
        throw new ApiClientError(
          t('errors.missingAccessToken'),
          500,
          'INVALID_RESPONSE'
        );
      }

    // Update tokens in the API client
      const currentRefreshToken = response.refresh_token || refreshToken;
      apiClient.setTokens(response.access_token, currentRefreshToken);

    return response;
    } catch (error) {
      // Improve error messages for better UX
      if (error instanceof ApiClientError) {
        // Handle specific backend error messages
        if (error.status === 401) {
          throw new ApiClientError(
            t('errors.tokenExpired'),
            error.status,
            'TOKEN_EXPIRED'
          );
        }
        throw error;
      }

      // Network or unknown errors
      throw new ApiClientError(
        t('errors.refreshFailed'),
        undefined,
        'REFRESH_FAILED'
      );
    }
  }

  /**
   * Logout user and clear tokens
   */
  logout(): void {
    apiClient.clearTokens();
  }

  /**
   * Check if user is authenticated (has valid tokens)
   */
  isAuthenticated(): boolean {
    return !!apiClient.getAccessToken();
  }

  /**
   * Get current access token
   */
  getAccessToken(): string | null {
    return apiClient.getAccessToken();
  }

  /**
   * Get current refresh token
   */
  getRefreshToken(): string | null {
    return apiClient.getRefreshToken();
  }
}

export const authService = new AuthService();

