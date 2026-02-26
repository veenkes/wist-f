import { apiClient } from '@/lib/api-client';
import { API_ENDPOINTS } from '@/config/api.config';
import type { UploadResponse } from '@/types/api.types';
import { ApiClientError } from '@/lib/api-client';
import { t } from '@/lib/i18n';

/**
 * Upload Service
 * 
 * Global, reusable service for file uploads across the application.
 * Used for:
 * - Student avatars
 * - Event attachments
 * - Expense receipts
 * - Notification attachments
 * 
 * Returns a clean, reusable URL that can be stored in the database
 * and used by other services.
 */
class UploadService {
  // Maximum file size: 10MB (in bytes)
  private readonly MAX_FILE_SIZE = 10 * 1024 * 1024;

  /**
   * Validate file before upload
   * @param file - File to validate
   * @throws ApiClientError if validation fails
   */
  private validateFile(file: File): void {
    if (!file) {
      throw new ApiClientError(t('errors.noFile'), 400, 'NO_FILE');
    }

    if (file.size === 0) {
      throw new ApiClientError(t('errors.emptyFile'), 400, 'EMPTY_FILE');
    }

    if (file.size > this.MAX_FILE_SIZE) {
      const maxSizeMB = this.MAX_FILE_SIZE / (1024 * 1024);
      throw new ApiClientError(
        t('errors.fileTooLarge', { maxSize: maxSizeMB.toString() }),
        400,
        'FILE_TOO_LARGE'
      );
    }
  }

  /**
   * Upload a file (avatar, document, attachment)
   * 
   * This is a reusable service method used across the application.
   * The returned URL is clean and can be stored in the database for
   * use by other services (Student avatar, Event attachment, etc.)
   * 
   * @param file - File to upload
   * @returns Upload response with clean URL and fileName
   * @throws ApiClientError if upload fails or validation fails
   */
  async uploadFile(file: File): Promise<UploadResponse> {
    // Validate file before upload
    this.validateFile(file);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await apiClient.request<UploadResponse>(
        API_ENDPOINTS.UPLOAD,
        {
      method: 'POST',
      body: formData,
        }
      );

      // Ensure URL is clean and valid
      if (!response.url || !response.fileName) {
        throw new ApiClientError(
          t('errors.uploadInvalidResponse'),
          500,
          'INVALID_RESPONSE'
        );
      }

      return response;
    } catch (error) {
      // Improve error messages for better UX
      if (error instanceof ApiClientError) {
        // Handle specific backend error messages
        if (error.message.includes('unsupported file type')) {
          throw new ApiClientError(
            t('errors.unsupportedFileType'),
            error.status || 400,
            'UNSUPPORTED_FILE_TYPE'
          );
        }
        throw error;
      }

      // Network or unknown errors
      throw new ApiClientError(
        t('errors.uploadFailed', { fileName: file.name }),
        undefined,
        'UPLOAD_FAILED'
      );
    }
  }
}

export const uploadService = new UploadService();

