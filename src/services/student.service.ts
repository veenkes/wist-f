import { z } from 'zod';
import { apiClient, ApiClientError } from '@/lib/api-client';
import { API_ENDPOINTS } from '@/config/api.config';
import { t } from '@/lib/i18n';
import type {
  Student,
  CreateStudentRequest,
  UpdateStudentRequest,
  ListStudentsParams,
  StudentStats,
  PaginatedResponse,
  Parent
} from '@/types/api.types';

// --- CONSTANTS ---

// Список допустимых грейдов (строгие строковые значения)
const GRADES = [
  "PN", "N", "R",
  "Y1", "Y2", "Y3", "Y4", "Y5", "Y6",
  "Y7", "Y8", "Y9", "Y10", "Y11", "Y12", "Y13"
] as const;

// --- SCHEMAS ---

const StudentStatsSchema = z.object({
  totalStudents: z.number().int().nonnegative(),
  activeStudents: z.number().int().nonnegative(),
  totalRevenue: z.number().nonnegative(),
  totalOwed: z.number().nonnegative(),
  avgAttendance: z.number().min(0).max(100),
  debtCases: z.number().int().nonnegative(),
});

const ParentSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, t('errors.fieldRequired')),
  email: z.string().email(t('errors.invalidEmailFormat')).or(z.literal('')),
  phone: z.string().min(1, t('errors.fieldRequired')),
  relationship: z.string().min(1, t('errors.fieldRequired')),
});

const UpdateParentSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, t('errors.fieldRequired')),
  email: z.string().email(t('errors.invalidEmailFormat')).or(z.literal('')),
  phone: z.string().min(1, t('errors.fieldRequired')),
  relationship: z.string().optional(),
});

const CreateStudentRequestSchema = z.object({
  name: z.string().min(1, t('errors.fieldRequired')),
  surname: z.string().min(1, t('errors.fieldRequired')),
  // Валидация грейда как строки из списка
  grade: z.enum(GRADES, {
    errorMap: () => ({ message: t('errors.invalidGrade') })
  }),
  className: z.string().min(1, t('errors.fieldRequired')),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, t('errors.invalidDateFormat')),
  phone: z.string().min(1, t('errors.fieldRequired')),
  email: z.string().email(t('errors.invalidEmailFormat')).or(z.literal('')),
  address: z.string().min(1, t('errors.fieldRequired')),
  idPassport: z.string().min(1, t('errors.fieldRequired')),
  enrollmentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, t('errors.invalidDateFormat')),
  
  contractAmount: z.number().nonnegative().optional(),
  contractPeriod: z.number().int().positive().optional(),
  initialPay: z.number().nonnegative().optional(),
  startDate: z.string().optional(),

  balance: z.number().optional(),
  totalOwed: z.number().optional(),
  
  avatar: z.string().optional(),
  parents: z.array(ParentSchema).min(1, t('errors.atLeastOneParentRequired')),
});

const UpdateStudentRequestSchema = z.object({
  name: z.string().optional(),
  surname: z.string().optional(),
  grade: z.enum(GRADES).optional(),
  className: z.string().optional(),
  dateOfBirth: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  address: z.string().optional(),
  idPassport: z.string().optional(),
  enrollmentDate: z.string().optional(),
  balance: z.number().optional(),
  totalOwed: z.number().optional(),
  avatar: z.string().optional(),
  status: z.enum(['active', 'inactive', 'graduated', 'suspended', 'debt']).optional(),
  academicStatus: z.enum(['excellent', 'good', 'satisfactory', 'needs_improvement', 'needs-improvement']).optional(),
  parents: z.array(UpdateParentSchema).optional(),
});

// Схема ответа API (обработка данных от бэкенда)
const StudentFromApiSchema = z.object({
  id: z.string(),
  name: z.string(),
  surname: z.string(),
  grade: z.string(), // Важно: принимаем как строку без преобразований
  class_name: z.string().optional(),
  date_of_birth: z.string().optional(),
  phone: z.string(),
  email: z.string().email().or(z.literal('')).optional(),
  address: z.string().optional(),
  id_passport: z.string().optional(),
  enrollment_date: z.string().optional(),
  balance: z.number().default(0),
  total_paid: z.number().optional(),
  total_owed: z.number().optional(),
  status: z.string().default('active'),
  academic_status: z.string().optional(),
  attendance: z.number().min(0).max(100).optional(),
  gpa: z.number().min(0).max(5).optional(),
  avatar: z.string().optional(),
  documents: z.array(z.string()).optional(),
  notes: z.string().optional(),
  parents: z.array(z.object({
    id: z.string().optional(),
    name: z.string(),
    email: z.string().email().or(z.literal('')).optional(),
    phone: z.string(),
    relationship: z.string().optional(),
  })).optional(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});

const ListStudentsApiResponseSchema = z.object({
  students: z.array(StudentFromApiSchema),
  total: z.union([z.string(), z.number()]).transform((val) => 
    typeof val === 'string' ? parseInt(val, 10) : val
  ),
});

const ListStudentsParamsSchema = z.object({
  page: z.number().int().positive().optional(),
  limit: z.number().int().positive().max(1000).optional(),
  search: z.string().optional(),
  hasDebt: z.boolean().optional(),
  grade: z.string().optional(), 
  status: z.enum(['active', 'inactive', 'graduated', 'suspended', 'debt']).optional(),
  academicStatus: z.enum(['excellent', 'good', 'satisfactory', 'needs_improvement', 'needs-improvement']).optional(),
});

// --- UTILS ---

function normalizeUpdateRequestToApi(data: UpdateStudentRequest): Record<string, unknown> {
  const apiData: Record<string, unknown> = {};
  Object.entries(data).forEach(([key, value]) => {
    if (key === 'academicStatus') return;
    // Убираем любое принудительное приведение типов для строк
    if (value !== undefined && value !== null && value !== '') {
      apiData[key] = value;
    }
  });
  if (data.academicStatus) {
    apiData.academic_status = data.academicStatus === 'needs_improvement' ? 'needs-improvement' : data.academicStatus;
  }
  return apiData;
}

function normalizeStudentFromApi(apiStudent: z.infer<typeof StudentFromApiSchema>): Student {
  return {
    id: apiStudent.id,
    name: apiStudent.name,
    surname: apiStudent.surname,
    grade: apiStudent.grade, // Передаем строку напрямую, исключая появление NaN
    className: apiStudent.class_name || '',
    dateOfBirth: apiStudent.date_of_birth || '',
    phone: apiStudent.phone,
    email: apiStudent.email || '',
    address: apiStudent.address || '',
    idPassport: apiStudent.id_passport || '',
    enrollmentDate: apiStudent.enrollment_date || '',
    balance: apiStudent.balance || 0,
    totalOwed: apiStudent.total_owed || 0,
    avatar: apiStudent.avatar || '',
    status: apiStudent.status as any,
    academicStatus: apiStudent.academic_status as any,
    documents: apiStudent.documents || [],
    notes: apiStudent.notes || '',
    parents: (apiStudent.parents || []).map(p => ({
      id: p.id,
      name: p.name,
      email: p.email || '',
      phone: p.phone,
      relationship: p.relationship || 'Guardian',
    })),
    createdAt: apiStudent.created_at || new Date().toISOString(),
    updatedAt: apiStudent.updated_at || new Date().toISOString(),
  };
}

// --- SERVICE CLASS ---

class StudentService {
  async getStudentStats(): Promise<StudentStats> {
    try {
      const response = await apiClient.get<StudentStats>(API_ENDPOINTS.STUDENTS.STATS);
      return StudentStatsSchema.parse(response);
    } catch (error) {
      throw this.handleApiError(error, 'STATS_LOAD_FAILED');
    }
  }

  async searchParent(phone: string): Promise<Parent> {
    try {
      const response = await apiClient.get<Parent>(`${API_ENDPOINTS.STUDENTS.BASE}/parents/search?phone=${encodeURIComponent(phone)}`);
      return response;
    } catch (error) {
      throw this.handleApiError(error, 'PARENT_SEARCH_FAILED');
    }
  }

  async updateContract(studentId: string, data: { amount: number; period: number; startDate: string }): Promise<void> {
    try {
      await apiClient.put(`${API_ENDPOINTS.STUDENTS.BY_ID(studentId)}/contract`, data);
    } catch (error) {
      throw this.handleApiError(error, 'CONTRACT_UPDATE_FAILED');
    }
  }

  async createStudent(data: CreateStudentRequest): Promise<Student> {
    try {
      // Валидация перед отправкой
      CreateStudentRequestSchema.parse(data);
      const response = await apiClient.post<{ student_id: string }>(
        API_ENDPOINTS.STUDENTS.BASE,
        data
      );
      if (!response.student_id) {
        throw new ApiClientError(t('errors.invalidResponse'), 500, 'INVALID_RESPONSE');
      }
      return this.getStudent(response.student_id);
    } catch (error) {
      throw this.handleApiError(error, 'STUDENT_CREATE_FAILED');
    }
  }

  async listStudents(params?: ListStudentsParams): Promise<PaginatedResponse<Student>> {
    try {
      const queryParams = new URLSearchParams();
      if (params) {
        if (params.page) queryParams.append('page', params.page.toString());
        if (params.limit) queryParams.append('limit', params.limit.toString());
        if (params.search) queryParams.append('search', params.search);
        // Обработка грейда как строки в фильтрах
        if (params.grade && params.grade !== 'All Grades') {
            queryParams.append('grade', params.grade);
        }
        if (params.status && params.status !== 'All Status') queryParams.append('status', params.status);
        if (params.academicStatus && params.academicStatus !== 'All Performance') queryParams.append('academicStatus', params.academicStatus);
      }
      const endpoint = `${API_ENDPOINTS.STUDENTS.BASE}${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      const rawResponse = await apiClient.get<any>(endpoint);
      const validatedResponse = ListStudentsApiResponseSchema.parse(rawResponse);
      const normalizedStudents = validatedResponse.students.map(normalizeStudentFromApi);
      
      return {
        data: normalizedStudents,
        pagination: {
          page: params?.page || 1,
          limit: params?.limit || 10,
          total: validatedResponse.total,
          totalPages: Math.ceil(validatedResponse.total / (params?.limit || 10)),
        },
      };
    } catch (error) {
      throw this.handleApiError(error, 'STUDENTS_LOAD_FAILED');
    }
  }

  async getStudent(id: string): Promise<Student> {
    if (!id) throw new ApiClientError(t('errors.fieldRequired'), 400, 'VALIDATION_ERROR');
    try {
      const rawResponse = await apiClient.get<any>(API_ENDPOINTS.STUDENTS.BY_ID(id));
      const validatedResponse = StudentFromApiSchema.parse(rawResponse);
      return normalizeStudentFromApi(validatedResponse);
    } catch (error) {
      throw this.handleApiError(error, 'STUDENT_LOAD_FAILED');
    }
  }

  async updateStudent(id: string, data: UpdateStudentRequest): Promise<Student> {
    if (!id) throw new ApiClientError(t('errors.fieldRequired'), 400, 'VALIDATION_ERROR');
    try {
      const apiData = normalizeUpdateRequestToApi(data);
      const rawResponse = await apiClient.put<any>(API_ENDPOINTS.STUDENTS.BY_ID(id), apiData);
      
      const responseToValidate = rawResponse?.data || rawResponse;
      
      if (responseToValidate?.id) {
          const parsed = StudentFromApiSchema.parse(responseToValidate);
          return normalizeStudentFromApi(parsed);
      } else {
          return this.getStudent(id);
      }
    } catch (error) {
      throw this.handleApiError(error, 'STUDENT_UPDATE_FAILED');
    }
  }

  async deleteStudent(id: string): Promise<void> {
    try {
      if (!id) throw new ApiClientError(t('errors.invalidStudentId'), 400, 'INVALID_ID');
      await apiClient.delete(API_ENDPOINTS.STUDENTS.BY_ID(id));
    } catch (error) {
      throw this.handleApiError(error, 'STUDENT_DELETE_FAILED');
    }
  }

  private handleApiError(error: unknown, defaultCode: string): ApiClientError {
    if (error instanceof ApiClientError) {
        return error;
    }
    if (error instanceof z.ZodError) {
        console.error('Validation Error Details:', error.errors);
        return new ApiClientError(t('errors.invalidResponseFormat'), 500, 'INVALID_RESPONSE_FORMAT');
    }
    return new ApiClientError(t('errors.unknownError'), 500, defaultCode);
  }
}

export const studentService = new StudentService();