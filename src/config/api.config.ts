/**
 * API Configuration
 * 
 * Edit .env file in the root directory:
 * VITE_API_BASE_URL=your-new-backend-url/api
 * 
 * In development, requests go through Vite proxy (/api)
 * In production, requests go directly to VITE_API_BASE_URL
 */

// Use /api proxy in development (configured in vite.config.ts)
// In production, use VITE_API_BASE_URL from .env
export const API_BASE_URL = import.meta.env.PROD 
  ? import.meta.env.VITE_API_BASE_URL 
  : '/api';

export const API_ENDPOINTS = {
  // Auth Service
  AUTH: {
    LOGIN: '/auth/login',
    REFRESH: '/auth/refresh',
  },
  
  // Employee Service
  EMPLOYEES: {
    BASE: '/employees',
    BY_ID: (id: string) => `/employees/${id}`,
  },
  
  // Student Service
  STUDENTS: {
    BASE: '/students',
    STATS: '/students/stats',
    BY_ID: (id: string) => `/students/${id}`,
  },
  
  // Finance Service
  FINANCE: {
    PAYMENT_STATS: '/finance/payments/stats',
    EXPENSE_STATS: '/finance/expenses/stats',
    TRANSACTIONS: '/finance/transactions',
    TRANSACTION_BY_ID: (id: string) => `/finance/transactions/${id}`,
    TRANSACTION_STATUS: (id: string) => `/finance/transactions/${id}/status`,
    EXPENSES: '/finance/expenses',
    EXPENSE_BY_ID: (id: string) => `/finance/expenses/${id}`,
  },
  
  // Events Service
  EVENTS: {
    BASE: '/events',
    BY_ID: (id: string) => `/events/${id}`,
  },
  
  // Upload Service
  UPLOAD: '/upload',
  
  // Activity Logs
  ACTIVITY: {
    BASE: '/activity',
    STATS: '/activity/stats',
  },
  
  // Chat Service
  CHAT: {
    CONVERSATIONS: '/chat/conversations',
    MESSAGES: '/chat/messages',
    CONVERSATION_MESSAGES: (id: string) => `/chat/conversations/${id}/messages`,
    WEBSOCKET: '/chat/ws',
  },
  
  // Notification Service
  NOTIFICATIONS: {
    BASE: '/notifications',
    UNREAD: '/notifications/unread',
    READ: '/notifications/read',
    ADMIN: {
      LIST: '/notifications/admin/list',
      STATS: '/notifications/admin/stats',
      BY_ID: (id: string) => `/notifications/admin/${id}`,
      LOGS: (id: string) => `/notifications/admin/${id}/logs`,
    },
    WEBSOCKET: '/notifications/ws',
  },
  

} as const;
