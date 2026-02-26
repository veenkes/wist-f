import { z } from 'zod';
import { apiClient, ApiClientError } from '@/lib/api-client';
import { API_ENDPOINTS } from '@/config/api.config';
import { t } from '@/lib/i18n';
import type {
  Transaction,
  CreateTransactionRequest,
  UpdateTransactionStatusRequest,
  ListTransactionsParams,
  PaymentStats,
  Expense,
  CreateExpenseRequest,
  ListExpensesParams,
  ExpenseStats,
  ExpenseCategory,
  PaginatedResponse,
  PaymentMethod,
  PaymentSource,
  TransactionStatus,
} from '@/types/api.types';

/**
 * Validation schema for PaymentStats from API (snake_case fields)
 */
const PaymentStatsFromApiSchema = z.object({
  // Используем z.coerce.number(), чтобы "100" (строка) превращалась в 100 (число)
  // Используем .optional().default(0), чтобы если поля нет или null, ставился 0
  total_income: z.coerce.number().optional().default(0),
  total_transactions: z.coerce.number().int().optional().default(0),
  payme_count: z.coerce.number().int().optional().default(0),
  uzum_count: z.coerce.number().int().optional().default(0),
  click_count: z.coerce.number().int().optional().default(0),
  pending_count: z.coerce.number().int().optional().default(0),
  pending_amount: z.coerce.number().optional().default(0),
  completed_count: z.coerce.number().int().optional().default(0),
  completed_amount: z.coerce.number().optional().default(0),
});

/**
 * Validation schema for ExpenseStats from API (snake_case fields)
 */
const ExpenseStatsFromApiSchema = z.object({
  total_month: z.number().nonnegative(),
  count_month: z.number().int().nonnegative(),
  top_category: z.string().optional(),
  top_category_sum: z.number().nonnegative().optional(),
  total_expenses: z.number().nonnegative().optional(),
  expenses_by_category: z.record(z.string(), z.number()).optional(),
});

/**
 * Validation schema for CreateExpenseRequest
 */
const CreateExpenseRequestSchema = z.object({
  category: z.string(),
  payee: z.string().min(1, t('errors.fieldRequired')),
  amount: z.number().positive(t('errors.amountMustBePositive')),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, t('errors.invalidDateFormat')),
  paymentMethod: z.enum(['Cash', 'Card', 'Bank Transfer'], {
    errorMap: () => ({ message: t('errors.invalidPaymentMethod') }),
  }),
  description: z.string().min(1, t('errors.fieldRequired')),
  attachments: z.array(z.string().url(t('errors.invalidUrl'))).optional(),
});

/**
 * Validation schema for CreateExpenseResponse (API returns only expense_id)
 */
const CreateExpenseResponseSchema = z.object({
  expense_id: z.string(),
});

/**
 * Validation schema for Expense from API (snake_case fields)
 */
const ExpenseFromApiSchema = z.object({
  id: z.string(),
  category: z.string(),
  payee: z.string(),
  amount: z.number().nonnegative(),
  date: z.string(),
  payment_method: z.string(),
  description: z.string(),
  attachments: z.array(z.string()).optional(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});

/**
 * Validation schema for ListExpensesParams
 */
const ListExpensesParamsSchema = z.object({
  page: z.number().int().positive().optional(),
  limit: z.number().int().positive().optional(),
  category: z.enum(['Office', 'Utilities', 'Salaries', 'Marketing', 'Equipment', 'Other']).optional(),
});

/**
 * Validation schema for ListExpensesApiResponse (API returns expenses array and total)
 */
const ListExpensesApiResponseSchema = z.object({
  expenses: z.array(ExpenseFromApiSchema),
  total: z.union([z.string(), z.number()]).transform((val) => typeof val === 'string' ? parseInt(val, 10) : val),
});

/**
 * Validation schema for CreateTransactionRequest
 */
const CreateTransactionRequestSchema = z.object({
  student_id: z.string().min(1, t('errors.fieldRequired')),
  amount: z.number().positive(t('errors.amountMustBePositive')),
  payment_method: z.enum(['Cash', 'Card', 'Bank Transfer'], {
    errorMap: () => ({ message: t('errors.invalidPaymentMethod') }),
  }),
  payment_source: z.enum(['Payme', 'Click', 'Uzum', 'Uzum Bank', 'Cash', 'Bank', 'Company Transfer', 'Manual'], {
    errorMap: () => ({ message: t('errors.invalidPaymentSource') }),
  }),
  purpose: z.string().min(1, t('errors.fieldRequired')),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, t('errors.invalidDateFormat')),
  status: z.enum(['Pending', 'Paid', 'Failed', 'Cancelled'], {
    errorMap: () => ({ message: t('errors.invalidTransactionStatus') }),
  }).optional().default('Pending'),
  notes: z.string().optional(),
});

/**
 * Validation schema for CreateTransactionResponse (API returns only transaction_id)
 */
const CreateTransactionResponseSchema = z.object({
  transaction_id: z.string(),
});

/**
 * Validation schema for UpdateTransactionStatusRequest
 */
const UpdateTransactionStatusRequestSchema = z.object({
  status: z.enum(['Pending', 'Paid', 'Failed', 'Cancelled']),
});

/**
 * Validation schema for UpdateTransactionStatusResponse (API returns only success)
 */
const UpdateTransactionStatusResponseSchema = z.object({
  success: z.boolean(),
});

/**
 * Validation schema for Transaction from API (snake_case fields)
 */
const TransactionFromApiSchema = z.object({
  id: z.string(),
  student_id: z.string(),
  student_name: z.string().optional(),
  parent_name: z.string().optional(),
  amount: z.number().nonnegative(),
  payment_method: z.string(),
  payment_source: z.string(),
  purpose: z.string(),
  date: z.string(),
  status: z.string(),
  receipt_id: z.string().optional(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
  notes: z.string().optional(),
});

/**
 * Validation schema for ListTransactions API response
 */
const ListTransactionsApiResponseSchema = z.object({
  transactions: z.array(TransactionFromApiSchema),
  total: z.union([z.string(), z.number()]).transform((val) => typeof val === 'string' ? parseInt(val, 10) : val),
});

/**
 * Validation schema for ListTransactionsParams
 */
const ListTransactionsParamsSchema = z.object({
  page: z.number().int().positive().optional(),
  limit: z.number().int().positive().optional(),
  status: z.enum(['Pending', 'Paid', 'Failed', 'Cancelled']).optional(),
  search: z.string().optional(),
  student_id: z.string().optional(),
});

/**
 * Finance Service
 * Handles payment transactions and expense management
 */
class FinanceService {
  // ============================================================================
  // Payment & Transaction Operations
  // ============================================================================

  /**
   * Normalize PaymentStats from API format (snake_case) to frontend format (camelCase)
   */
  private normalizePaymentStatsFromApi(apiStats: z.infer<typeof PaymentStatsFromApiSchema>): PaymentStats {
    return {
      totalRevenue: apiStats.total_income || 0,
      pendingPayments: apiStats.pending_count || 0,
      completedPayments: apiStats.completed_count || apiStats.total_transactions || 0,
      totalTransactions: apiStats.total_transactions || 0,
      paymeCount: apiStats.payme_count || 0,
      uzumCount: apiStats.uzum_count || 0,
      clickCount: apiStats.click_count || 0,
      pendingAmount: apiStats.pending_amount || 0,
      completedAmount: apiStats.completed_amount || 0,
    };
  }

  /**
   * Get payment statistics
   * @returns Payment statistics for dashboard
   * @throws {ApiClientError} If request fails or response is invalid
   */
  async getPaymentStats(): Promise<PaymentStats> {
    try {
      // Get raw response from API
      const rawResponse = await apiClient.get<z.infer<typeof PaymentStatsFromApiSchema>>(
        API_ENDPOINTS.FINANCE.PAYMENT_STATS
      );

      // Validate response structure with Zod
      const validatedResponse = PaymentStatsFromApiSchema.parse(rawResponse);

      // Normalize from API format to frontend format
      const normalizedStats = this.normalizePaymentStatsFromApi(validatedResponse);

      return normalizedStats;
    } catch (error) {
      // Improve error messages for better UX
      if (error instanceof ApiClientError) {
        // Re-throw ApiClientError as-is (already has proper message)
        throw error;
      } else if (error instanceof z.ZodError) {
        throw new ApiClientError(
          t('errors.invalidResponseFormat'),
          500,
          'INVALID_RESPONSE_FORMAT'
        );
      } else {
        // Unknown error
        throw new ApiClientError(
          t('errors.paymentStatsLoadFailed'),
          500,
          'UNKNOWN_ERROR'
        );
      }
    }
  }

  /**
   * Create a new transaction (payment)
   * @param data - Transaction data
   * @returns Created transaction (fetched after creation)
   * @throws {ApiClientError} If validation fails or request fails
   */
  async createTransaction(data: CreateTransactionRequest): Promise<Transaction> {
    try {
      console.log('[createTransaction] Input data:', JSON.stringify(data, null, 2));
      
      // Validate request data
      let validatedData;
      try {
        validatedData = CreateTransactionRequestSchema.parse(data);
        console.log('[createTransaction] Validation passed:', JSON.stringify(validatedData, null, 2));
      } catch (validationError) {
        console.error('[createTransaction] Validation error:', validationError);
        if (validationError instanceof z.ZodError) {
          const fieldErrors = validationError.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
          console.error('[createTransaction] Field errors:', fieldErrors);
          throw new ApiClientError(
            t('errors.invalidRequest') + ': ' + fieldErrors,
            400,
            'VALIDATION_ERROR'
          );
        }
        throw validationError;
      }

      // Prepare API data (filter out undefined and null values, but keep notes if provided)
      const apiData: Record<string, unknown> = {
        student_id: validatedData.student_id,
        amount: validatedData.amount,
        payment_method: validatedData.payment_method,
        payment_source: validatedData.payment_source,
        purpose: validatedData.purpose,
        date: validatedData.date,
        status: validatedData.status || 'Pending',
      };
      
      // Add notes if provided
      if (validatedData.notes !== undefined && validatedData.notes !== null && validatedData.notes !== '') {
        apiData.notes = validatedData.notes;
      }

      console.log('[createTransaction] API request data:', JSON.stringify(apiData, null, 2));

      // Make POST request
      let rawResponse;
      try {
        rawResponse = await apiClient.post<z.infer<typeof CreateTransactionResponseSchema>>(
          API_ENDPOINTS.FINANCE.TRANSACTIONS,
          apiData
        );
        console.log('[createTransaction] API response:', JSON.stringify(rawResponse, null, 2));
      } catch (apiError) {
        console.error('[createTransaction] API request failed:', apiError);
        if (apiError instanceof ApiClientError) {
          console.error('[createTransaction] ApiClientError details:', {
            message: apiError.message,
            status: apiError.status,
            code: apiError.code,
          });
          throw apiError;
        }
        throw apiError;
      }

      // Validate response structure
      let validatedResponse;
      try {
        validatedResponse = CreateTransactionResponseSchema.parse(rawResponse);
        console.log('[createTransaction] Response validation passed:', validatedResponse);
      } catch (responseError) {
        console.error('[createTransaction] Response validation failed:', responseError);
        console.error('[createTransaction] Raw response was:', rawResponse);
        throw new ApiClientError(
          t('errors.invalidResponseFormat'),
          500,
          'INVALID_RESPONSE_FORMAT'
        );
      }

      // Fetch the full transaction object using the returned transaction_id
      console.log('[createTransaction] Fetching full transaction with ID:', validatedResponse.transaction_id);
      let fullTransaction;
      try {
        fullTransaction = await this.getTransaction(validatedResponse.transaction_id);
        console.log('[createTransaction] Full transaction received:', JSON.stringify(fullTransaction, null, 2));
      } catch (fetchError) {
        console.error('[createTransaction] Failed to fetch full transaction:', fetchError);
        // If fetching fails, we still created the transaction, so return a partial object
        throw new ApiClientError(
          t('errors.transactionCreatedButFetchFailed'),
          500,
          'FETCH_FAILED'
        );
      }

      return fullTransaction;
    } catch (error) {
      console.error('[createTransaction] Final error catch:', error);
      console.error('[createTransaction] Error type:', error?.constructor?.name);
      console.error('[createTransaction] Error stack:', error instanceof Error ? error.stack : 'No stack');
      
      // Improve error messages for better UX
      if (error instanceof ApiClientError) {
        // Re-throw ApiClientError as-is (already has proper message)
        console.error('[createTransaction] Throwing ApiClientError:', error.message);
        throw error;
      } else if (error instanceof z.ZodError) {
        const fieldErrors = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
        console.error('[createTransaction] ZodError:', fieldErrors);
        throw new ApiClientError(
          t('errors.invalidRequest') + ': ' + fieldErrors,
          400,
          'VALIDATION_ERROR'
        );
      } else {
        // Unknown error - log everything
        console.error('[createTransaction] Unknown error:', {
          error,
          message: error instanceof Error ? error.message : String(error),
          name: error instanceof Error ? error.name : 'Unknown',
        });
        throw new ApiClientError(
          t('errors.transactionCreateFailed') + (error instanceof Error ? ': ' + error.message : ''),
          500,
          'UNKNOWN_ERROR'
        );
      }
    }
  }

  /**
   * Normalize Transaction from API format (snake_case) to frontend format (camelCase)
   */
  private normalizeTransactionFromApi(apiTransaction: z.infer<typeof TransactionFromApiSchema>): Transaction {
    return {
      id: apiTransaction.id,
      student_id: apiTransaction.student_id,
      studentName: apiTransaction.student_name,
      amount: apiTransaction.amount,
      payment_method: apiTransaction.payment_method as PaymentMethod,
      payment_source: apiTransaction.payment_source as PaymentSource,
      purpose: apiTransaction.purpose,
      date: apiTransaction.date,
      status: apiTransaction.status as TransactionStatus,
      createdAt: apiTransaction.created_at || new Date().toISOString(),
      updatedAt: apiTransaction.updated_at || new Date().toISOString(),
    };
  }

  /**
   * List transactions with optional filters
   * @param params - Query parameters (page, limit, status, search, student_id)
   * @returns Paginated list of transactions
   * @throws {ApiClientError} If request fails or response is invalid
   */
  async listTransactions(params?: ListTransactionsParams): Promise<PaginatedResponse<Transaction>> {
    try {
      // Validate params if provided
      let validatedParams: z.infer<typeof ListTransactionsParamsSchema> | undefined;
      if (params) {
        validatedParams = ListTransactionsParamsSchema.parse(params);
      }

      // Build query string
    const queryParams = new URLSearchParams();
      if (validatedParams?.page) queryParams.append('page', validatedParams.page.toString());
      if (validatedParams?.limit) queryParams.append('limit', validatedParams.limit.toString());
      if (validatedParams?.status) queryParams.append('status', validatedParams.status);
      if (validatedParams?.search) queryParams.append('search', validatedParams.search);
      if (validatedParams?.student_id) queryParams.append('student_id', validatedParams.student_id);

    const endpoint = `${API_ENDPOINTS.FINANCE.TRANSACTIONS}${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    
      // Get raw response from API
      const rawResponse = await apiClient.get<z.infer<typeof ListTransactionsApiResponseSchema>>(endpoint);

      // Validate response structure with Zod
      const validatedResponse = ListTransactionsApiResponseSchema.parse(rawResponse);

      // Normalize transactions from API format to frontend format
      const normalizedTransactions = validatedResponse.transactions.map(this.normalizeTransactionFromApi);

      // Calculate pagination info
      const page = validatedParams?.page || 1;
      const limit = validatedParams?.limit || 10;
      const total = validatedResponse.total;
      const totalPages = Math.ceil(total / limit);

      // Return in standard PaginatedResponse format
      return {
        data: normalizedTransactions,
        pagination: {
          page,
          limit,
          total,
          totalPages,
        },
      };
    } catch (error) {
      // Improve error messages for better UX
      if (error instanceof ApiClientError) {
        // Re-throw ApiClientError as-is (already has proper message)
        throw error;
      } else if (error instanceof z.ZodError) {
        throw new ApiClientError(
          t('errors.invalidResponseFormat'),
          500,
          'INVALID_RESPONSE_FORMAT'
        );
      } else {
        // Unknown error
        throw new ApiClientError(
          t('errors.transactionsLoadFailed'),
          500,
          'UNKNOWN_ERROR'
        );
      }
    }
  }

  /**
   * Get transaction by ID
   * @param id - Transaction ID
   * @returns Transaction details
   * @throws {ApiClientError} If transaction not found or request fails
   */
  async getTransaction(id: string): Promise<Transaction> {
    try {
      // Validate ID
      if (!id || typeof id !== 'string' || id.trim().length === 0) {
        throw new ApiClientError(
          t('errors.invalidTransactionId'),
          400,
          'INVALID_ID'
        );
      }

      // Get raw response from API
      const rawResponse = await apiClient.get<z.infer<typeof TransactionFromApiSchema>>(
        API_ENDPOINTS.FINANCE.TRANSACTION_BY_ID(id)
      );

      // Validate response structure with Zod
      const validatedResponse = TransactionFromApiSchema.parse(rawResponse);

      // Normalize from API format to frontend format
      const normalizedTransaction = this.normalizeTransactionFromApi(validatedResponse);

      return normalizedTransaction;
    } catch (error) {
      // Improve error messages for better UX
      if (error instanceof ApiClientError) {
        // Re-throw ApiClientError as-is (already has proper message)
        throw error;
      } else if (error instanceof z.ZodError) {
        throw new ApiClientError(
          t('errors.invalidResponseFormat'),
          500,
          'INVALID_RESPONSE_FORMAT'
        );
      } else {
        // Unknown error
        throw new ApiClientError(
          t('errors.transactionLoadFailed'),
          500,
          'UNKNOWN_ERROR'
        );
      }
    }
  }

  /**
   * Update transaction status (e.g., verify payment)
   * @param id - Transaction ID
   * @param data - Status update
   * @returns Updated transaction
   */
  async updateTransactionStatus(
    id: string,
    data: UpdateTransactionStatusRequest
  ): Promise<Transaction> {
    try {
      // Validate transaction ID
      if (!id || typeof id !== 'string' || id.trim() === '') {
        throw new ApiClientError(
          t('errors.invalidTransactionId'),
          400,
          'INVALID_ID'
        );
      }

      // Validate request data
      let validatedData;
      try {
        validatedData = UpdateTransactionStatusRequestSchema.parse(data);
      } catch (validationError) {
        if (validationError instanceof z.ZodError) {
          const fieldErrors = validationError.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
          console.error('[updateTransactionStatus] Validation failed:', fieldErrors);
          throw new ApiClientError(
            t('errors.invalidRequest') + ': ' + fieldErrors,
            400,
            'VALIDATION_ERROR'
          );
        }
        throw validationError;
      }

      // Prepare API data
      const apiData = {
        status: validatedData.status,
      };

      console.log('[updateTransactionStatus] API request:', {
        id,
        data: apiData,
      });

      // Make PUT request
      let rawResponse;
      try {
        rawResponse = await apiClient.put<z.infer<typeof UpdateTransactionStatusResponseSchema>>(
      API_ENDPOINTS.FINANCE.TRANSACTION_STATUS(id),
          apiData
        );
        console.log('[updateTransactionStatus] API response:', rawResponse);
      } catch (apiError) {
        console.error('[updateTransactionStatus] API request failed:', apiError);
        if (apiError instanceof ApiClientError) {
          throw apiError;
        }
        throw apiError;
      }

      // Validate response structure
      let validatedResponse;
      try {
        validatedResponse = UpdateTransactionStatusResponseSchema.parse(rawResponse);
        console.log('[updateTransactionStatus] Response validation passed:', validatedResponse);
      } catch (responseError) {
        console.error('[updateTransactionStatus] Response validation failed:', responseError);
        console.error('[updateTransactionStatus] Raw response was:', rawResponse);
        throw new ApiClientError(
          t('errors.invalidResponseFormat'),
          500,
          'INVALID_RESPONSE_FORMAT'
        );
      }

      // If response indicates success, fetch the updated transaction
      if (validatedResponse.success) {
        console.log('[updateTransactionStatus] Status updated successfully, fetching updated transaction...');
        try {
          const updatedTransaction = await this.getTransaction(id);
          console.log('[updateTransactionStatus] Updated transaction received:', updatedTransaction);
          return updatedTransaction;
        } catch (fetchError) {
          console.error('[updateTransactionStatus] Failed to fetch updated transaction:', fetchError);
          // If fetching fails, we still updated the status, so throw a specific error
          throw new ApiClientError(
            t('errors.transactionStatusUpdatedButFetchFailed'),
            500,
            'FETCH_FAILED'
          );
        }
      } else {
        throw new ApiClientError(
          t('errors.transactionStatusUpdateFailed'),
          500,
          'UPDATE_FAILED'
        );
      }
    } catch (error) {
      console.error('[updateTransactionStatus] Final error catch:', error);
      console.error('[updateTransactionStatus] Error type:', error?.constructor?.name);
      console.error('[updateTransactionStatus] Error stack:', error instanceof Error ? error.stack : 'No stack');
      
      // Improve error messages for better UX
      if (error instanceof ApiClientError) {
        // Re-throw ApiClientError as-is (already has proper message)
        throw error;
      } else if (error instanceof z.ZodError) {
        const fieldErrors = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
        console.error('[updateTransactionStatus] ZodError:', fieldErrors);
        throw new ApiClientError(
          t('errors.invalidRequest') + ': ' + fieldErrors,
          400,
          'VALIDATION_ERROR'
        );
      } else {
        // Unknown error
        console.error('[updateTransactionStatus] Unknown error:', error);
        throw new ApiClientError(
          t('errors.transactionStatusUpdateFailed'),
          500,
          'UNKNOWN_ERROR'
        );
      }
    }
  }

  // ============================================================================
  // Expense Operations
  // ============================================================================

  /**
   * Normalize ExpenseStats from API format (snake_case) to frontend format (camelCase)
   */
  private normalizeExpenseStatsFromApi(apiStats: z.infer<typeof ExpenseStatsFromApiSchema>): ExpenseStats {
    // Build expensesByCategory from available data
    const expensesByCategory: Record<string, number> = {};
    
    // If API provides expenses_by_category, use it
    if (apiStats.expenses_by_category) {
      Object.assign(expensesByCategory, apiStats.expenses_by_category);
    }
    
    // If top_category is provided, add it to the category map
    if (apiStats.top_category && apiStats.top_category_sum !== undefined) {
      expensesByCategory[apiStats.top_category] = apiStats.top_category_sum;
    }
    
    return {
      totalExpenses: apiStats.total_expenses || apiStats.total_month || 0,
      monthlyExpenses: apiStats.total_month || 0,
      expensesByCategory,
      countMonth: apiStats.count_month || 0,
      topCategory: apiStats.top_category,
      topCategorySum: apiStats.top_category_sum || 0,
    };
  }

  /**
   * Get expense statistics
   * @returns Expense statistics for dashboard
   * @throws {ApiClientError} If request fails or response is invalid
   */
  async getExpenseStats(): Promise<ExpenseStats> {
    try {
      // Get raw response from API
      const rawResponse = await apiClient.get<z.infer<typeof ExpenseStatsFromApiSchema>>(
        API_ENDPOINTS.FINANCE.EXPENSE_STATS
      );

      // Validate response structure with Zod
      const validatedResponse = ExpenseStatsFromApiSchema.parse(rawResponse);

      // Normalize from API format to frontend format
      const normalizedStats = this.normalizeExpenseStatsFromApi(validatedResponse);

      return normalizedStats;
    } catch (error) {
      // Improve error messages for better UX
      if (error instanceof ApiClientError) {
        // Re-throw ApiClientError as-is (already has proper message)
        throw error;
      } else if (error instanceof z.ZodError) {
        throw new ApiClientError(
          t('errors.invalidResponseFormat'),
          500,
          'INVALID_RESPONSE_FORMAT'
        );
      } else {
        // Unknown error
        throw new ApiClientError(
          t('errors.expenseStatsLoadFailed'),
          500,
          'UNKNOWN_ERROR'
        );
      }
    }
  }

  /**
   * Normalize Expense from API format (snake_case) to frontend format (camelCase)
   */
  private normalizeExpenseFromApi(apiExpense: z.infer<typeof ExpenseFromApiSchema>): Expense {
    return {
      id: apiExpense.id,
      category: apiExpense.category as ExpenseCategory,
      payee: apiExpense.payee,
      amount: apiExpense.amount,
      date: apiExpense.date,
      paymentMethod: apiExpense.payment_method as PaymentMethod,
      description: apiExpense.description,
      attachments: apiExpense.attachments || [],
      createdAt: apiExpense.created_at || new Date().toISOString(),
      updatedAt: apiExpense.updated_at || new Date().toISOString(),
    };
  }

  /**
   * Normalize CreateExpenseRequest from frontend format (camelCase) to API format (snake_case)
   */
  private normalizeCreateExpenseRequestToApi(data: CreateExpenseRequest): Record<string, unknown> {
    return {
      category: data.category,
      payee: data.payee,
      amount: data.amount,
      date: data.date,
      payment_method: data.paymentMethod,
      description: data.description,
      attachments: data.attachments || [],
    };
  }

  /**
   * Create a new expense
   * @param data - Expense data
   * @returns Created expense
   * @throws {ApiClientError} If request fails or response is invalid
   */
  async createExpense(data: CreateExpenseRequest): Promise<Expense> {
    try {
      let validatedData;
      try {
        validatedData = CreateExpenseRequestSchema.parse(data);
      } catch (validationError) {
        if (validationError instanceof z.ZodError) {
          const fieldErrors = validationError.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
          console.error('[createExpense] Validation failed:', fieldErrors);
          throw new ApiClientError(
            t('errors.invalidRequest') + ': ' + fieldErrors,
            400,
            'VALIDATION_ERROR'
          );
        }
        throw validationError;
      }

      const apiData = this.normalizeCreateExpenseRequestToApi(validatedData);

      console.log('[createExpense] API request data:', JSON.stringify(apiData, null, 2));

      let rawResponse;
      try {
        rawResponse = await apiClient.post<z.infer<typeof CreateExpenseResponseSchema>>(
          API_ENDPOINTS.FINANCE.EXPENSES,
          apiData
        );
        console.log('[createExpense] API response:', JSON.stringify(rawResponse, null, 2));
      } catch (apiError) {
        console.error('[createExpense] API request failed:', apiError);
        if (apiError instanceof ApiClientError) {
          console.error('[createExpense] ApiClientError details:', {
            message: apiError.message,
            status: apiError.status,
            code: apiError.code,
          });
          throw apiError;
        }
        throw apiError;
      }

      let validatedResponse;
      try {
        validatedResponse = CreateExpenseResponseSchema.parse(rawResponse);
        console.log('[createExpense] Response validation passed:', validatedResponse);
      } catch (responseError) {
        console.error('[createExpense] Response validation failed:', responseError);
        console.error('[createExpense] Raw response was:', rawResponse);
        throw new ApiClientError(
          t('errors.invalidResponseFormat'),
          500,
          'INVALID_RESPONSE_FORMAT'
        );
      }

      console.log('[createExpense] Fetching full expense with ID:', validatedResponse.expense_id);
      let fullExpense;
      try {
        const rawExpense = await apiClient.get<z.infer<typeof ExpenseFromApiSchema>>(
          API_ENDPOINTS.FINANCE.EXPENSE_BY_ID(validatedResponse.expense_id)
        );
        
        const validatedExpense = ExpenseFromApiSchema.parse(rawExpense);
        
        fullExpense = this.normalizeExpenseFromApi(validatedExpense);
        
        console.log('[createExpense] Full expense received:', JSON.stringify(fullExpense, null, 2));
      } catch (fetchError) {
        console.error('[createExpense] Failed to fetch full expense:', fetchError);
        throw new ApiClientError(
          t('errors.expenseCreatedButFetchFailed'),
          500,
          'FETCH_FAILED'
        );
      }

      return fullExpense;
    } catch (error) {
      console.error('[createExpense] Final error catch:', error);
      console.error('[createExpense] Error type:', error?.constructor?.name);
      console.error('[createExpense] Error stack:', error instanceof Error ? error.stack : 'No stack');
      
      if (error instanceof ApiClientError) {
        console.error('[createExpense] Throwing ApiClientError:', error.message);
        throw error;
      } else if (error instanceof z.ZodError) {
        const fieldErrors = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
        console.error('[createExpense] ZodError:', fieldErrors);
        throw new ApiClientError(
          t('errors.invalidRequest') + ': ' + fieldErrors,
          400,
          'VALIDATION_ERROR'
        );
      } else {
        console.error('[createExpense] Unknown error:', error);
        throw new ApiClientError(
          t('errors.expenseCreateFailed'),
          500,
          'UNKNOWN_ERROR'
        );
      }
    }
  }

  /**
   * List expenses with optional filters
   * @param params - Query parameters (page, limit, category)
   * @returns Paginated list of expenses
   * @throws {ApiClientError} If request fails or response is invalid
   */
  async listExpenses(params?: ListExpensesParams): Promise<PaginatedResponse<Expense>> {
    try {
      let validatedParams;
      if (params) {
        try {
          validatedParams = ListExpensesParamsSchema.parse(params);
        } catch (validationError) {
          if (validationError instanceof z.ZodError) {
            const fieldErrors = validationError.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
            console.error('[listExpenses] Params validation failed:', fieldErrors);
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
      if (validatedParams?.category) queryParams.append('category', validatedParams.category);

    const endpoint = `${API_ENDPOINTS.FINANCE.EXPENSES}${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    
      console.log('[listExpenses] API request:', endpoint);

      // Get raw response from API
      const rawResponse = await apiClient.get<z.infer<typeof ListExpensesApiResponseSchema>>(endpoint);

      console.log('[listExpenses] API response:', JSON.stringify(rawResponse, null, 2));

      // Validate response structure with Zod
      let validatedResponse;
      try {
        validatedResponse = ListExpensesApiResponseSchema.parse(rawResponse);
        console.log('[listExpenses] Response validation passed:', validatedResponse);
      } catch (responseError) {
        console.error('[listExpenses] Response validation failed:', responseError);
        console.error('[listExpenses] Raw response was:', rawResponse);
        throw new ApiClientError(
          t('errors.invalidResponseFormat'),
          500,
          'INVALID_RESPONSE_FORMAT'
        );
      }

      // Normalize expenses from API format to frontend format
      const normalizedExpenses = validatedResponse.expenses.map(this.normalizeExpenseFromApi);

      // Calculate pagination info
      const page = validatedParams?.page || 1;
      const limit = validatedParams?.limit || 10;
      const total = validatedResponse.total;
      const totalPages = Math.ceil(total / limit);

      console.log('[listExpenses] Normalized expenses:', normalizedExpenses.length);
      console.log('[listExpenses] Pagination:', { page, limit, total, totalPages });

      return {
        data: normalizedExpenses,
        pagination: {
          page,
          limit,
          total,
          totalPages,
        },
      };
    } catch (error) {
      console.error('[listExpenses] Final error catch:', error);
      console.error('[listExpenses] Error type:', error?.constructor?.name);
      console.error('[listExpenses] Error stack:', error instanceof Error ? error.stack : 'No stack');
      
      // Improve error messages for better UX
      if (error instanceof ApiClientError) {
        // Re-throw ApiClientError as-is (already has proper message)
        throw error;
      } else if (error instanceof z.ZodError) {
        const fieldErrors = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
        console.error('[listExpenses] ZodError:', fieldErrors);
        throw new ApiClientError(
          t('errors.invalidRequest') + ': ' + fieldErrors,
          400,
          'VALIDATION_ERROR'
        );
      } else {
        // Unknown error
        console.error('[listExpenses] Unknown error:', error);
        throw new ApiClientError(
          t('errors.expensesLoadFailed'),
          500,
          'UNKNOWN_ERROR'
        );
      }
    }
  }

  /**
   * Get expense by ID
   * @param id - Expense ID
   * @returns Expense details
   * @throws {ApiClientError} If request fails or response is invalid
   */
  async getExpense(id: string): Promise<Expense> {
    try {
      // Validate ID
      if (!id || typeof id !== 'string' || id.trim().length === 0) {
        throw new ApiClientError(
          t('errors.invalidExpenseId'),
          400,
          'VALIDATION_ERROR'
        );
      }

      console.log('[getExpense] Fetching expense:', id);

      // Get raw response from API
      const rawResponse = await apiClient.get<z.infer<typeof ExpenseFromApiSchema>>(
        API_ENDPOINTS.FINANCE.EXPENSE_BY_ID(id)
      );

      console.log('[getExpense] API response:', JSON.stringify(rawResponse, null, 2));

      // Validate response structure with Zod
      let validatedResponse;
      try {
        validatedResponse = ExpenseFromApiSchema.parse(rawResponse);
        console.log('[getExpense] Response validation passed:', validatedResponse);
      } catch (responseError) {
        console.error('[getExpense] Response validation failed:', responseError);
        console.error('[getExpense] Raw response was:', rawResponse);
        throw new ApiClientError(
          t('errors.invalidResponseFormat'),
          500,
          'INVALID_RESPONSE_FORMAT'
        );
      }

      // Normalize from API format to frontend format
      const normalizedExpense = this.normalizeExpenseFromApi(validatedResponse);

      console.log('[getExpense] Normalized expense:', normalizedExpense);

      return normalizedExpense;
    } catch (error) {
      console.error('[getExpense] Final error catch:', error);
      console.error('[getExpense] Error type:', error?.constructor?.name);
      console.error('[getExpense] Error stack:', error instanceof Error ? error.stack : 'No stack');
      
      // Improve error messages for better UX
      if (error instanceof ApiClientError) {
        // Re-throw ApiClientError as-is (already has proper message)
        throw error;
      } else if (error instanceof z.ZodError) {
        const fieldErrors = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
        console.error('[getExpense] ZodError:', fieldErrors);
        throw new ApiClientError(
          t('errors.invalidRequest') + ': ' + fieldErrors,
          400,
          'VALIDATION_ERROR'
        );
      } else {
        // Unknown error
        console.error('[getExpense] Unknown error:', error);
        throw new ApiClientError(
          t('errors.expenseLoadFailed'),
          500,
          'UNKNOWN_ERROR'
        );
      }
    }
  }

  /**
   * Update expense
   * @param id - Expense ID
   * @param data - Updated expense data
   * @returns Updated expense
   */
  async updateExpense(id: string, data: Partial<CreateExpenseRequest>): Promise<Expense> {
    return apiClient.put<Expense>(API_ENDPOINTS.FINANCE.EXPENSE_BY_ID(id), data);
  }

  /**
   * Delete expense
   * @param id - Expense ID
   */
  async deleteExpense(id: string): Promise<void> {
    return apiClient.delete<void>(API_ENDPOINTS.FINANCE.EXPENSE_BY_ID(id));
  }
}

export const financeService = new FinanceService();

