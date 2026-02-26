import { API_BASE_URL } from '@/config/api.config';

export interface ApiError {
  message: string;
  status?: number;
  code?: string;
}

export class ApiClientError extends Error {
  status?: number;
  code?: string;

  constructor(message: string, status?: number, code?: string) {
    super(message);
    this.name = 'ApiClientError';
    this.status = status;
    this.code = code;
  }
}

interface RequestOptions extends RequestInit {
  requiresAuth?: boolean;
}

class ApiClient {
  private baseURL: string;
  private accessToken: string | null = null;
  private refreshToken: string | null = null;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
    this.loadTokensFromStorage();
  }

  private loadTokensFromStorage() {
    this.accessToken = localStorage.getItem('access_token');
    this.refreshToken = localStorage.getItem('refresh_token');
  }

  public setTokens(accessToken: string, refreshToken: string) {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
    localStorage.setItem('access_token', accessToken);
    localStorage.setItem('refresh_token', refreshToken);
  }

  public clearTokens() {
    this.accessToken = null;
    this.refreshToken = null;
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
  }

  public getAccessToken(): string | null {
    return this.accessToken;
  }

  public getRefreshToken(): string | null {
    return this.refreshToken;
  }

  private async refreshAccessToken(): Promise<boolean> {
    if (!this.refreshToken) {
      return false;
    }

    try {
      const response = await fetch(`${this.baseURL}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refresh_token: this.refreshToken }),
      });

      if (!response.ok) {
        this.clearTokens();
        return false;
      }

      const data = await response.json();
      if (data.access_token) {
        this.accessToken = data.access_token;
        localStorage.setItem('access_token', data.access_token);
        
        // Update refresh token if provided
        if (data.refresh_token) {
          this.refreshToken = data.refresh_token;
          localStorage.setItem('refresh_token', data.refresh_token);
        }
        
        return true;
      }

      return false;
    } catch (error) {
      return false;
    }
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    // response.ok is true for status 200-299 (includes 201 Created)
    if (!response.ok) {
      let errorMessage = `HTTP Error: ${response.status}`;
      let errorCode = `HTTP_${response.status}`;

      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorData.error || errorMessage;
        errorCode = errorData.code || errorCode;
      } catch {
        // If response is not JSON, use status text
        errorMessage = response.statusText || errorMessage;
      }

      throw new ApiClientError(errorMessage, response.status, errorCode);
    }

    // Handle empty responses (204 No Content, etc.)
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      // For 201 Created with no body, return empty object
      if (response.status === 201) {
        return {} as T;
      }
      return {} as T;
    }

    return response.json();
  }

  public async request<T>(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<T> {
    const { requiresAuth = true, headers = {}, body, ...fetchOptions } = options;

    const requestHeaders: HeadersInit = {
      ...headers,
    };

    // Only set Content-Type if not FormData (browser will set it automatically with boundary)
    if (!(body instanceof FormData)) {
      requestHeaders['Content-Type'] = 'application/json';
    }

    // Add authorization header if required
    if (requiresAuth && this.accessToken) {
      requestHeaders['Authorization'] = `Bearer ${this.accessToken}`;
    }

    const url = `${this.baseURL}${endpoint}`;

    try {
      let response = await fetch(url, {
        ...fetchOptions,
        body,
        headers: requestHeaders,
      });

      // If unauthorized and we have a refresh token, try to refresh
      if (response.status === 401 && requiresAuth && this.refreshToken) {
        const refreshed = await this.refreshAccessToken();
        
        if (refreshed) {
          // Retry the original request with new token
          requestHeaders['Authorization'] = `Bearer ${this.accessToken}`;
          response = await fetch(url, {
            ...fetchOptions,
            body,
            headers: requestHeaders,
          });
        } else {
          // Refresh failed, clear tokens and throw error
          this.clearTokens();
          throw new ApiClientError('Session expired. Please login again.', 401, 'SESSION_EXPIRED');
        }
      }

      return this.handleResponse<T>(response);
    } catch (error) {
      if (error instanceof ApiClientError) {
        throw error;
      }

      // Network or other errors
      throw new ApiClientError(
        error instanceof Error ? error.message : 'Network error occurred',
        undefined,
        'NETWORK_ERROR'
      );
    }
  }

  // Convenience methods
  public get<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  public post<T>(
    endpoint: string,
    data?: unknown,
    options?: RequestOptions
  ): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  public put<T>(
    endpoint: string,
    data?: unknown,
    options?: RequestOptions
  ): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  public delete<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }

  public patch<T>(
    endpoint: string,
    data?: unknown,
    options?: RequestOptions
  ): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  }
}

// Export singleton instance
export const apiClient = new ApiClient(API_BASE_URL);

