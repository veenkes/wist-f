/**
 * Central export for all API services
 */

export { authService } from './auth.service';
export { employeeService } from './employee.service';
export { studentService } from './student.service';
export { financeService } from './finance.service';
export { eventService } from './event.service';
export { activityService } from './activity.service';
export { chatService } from './chat.service';
export { notificationService } from './notification.service';
export { uploadService } from './upload.service';

// Re-export API client for direct use if needed
export { apiClient, ApiClientError } from '@/lib/api-client';

