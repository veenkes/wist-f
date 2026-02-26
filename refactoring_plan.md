# 🚀 Backend Refactoring Master Plan

**Current Status:** [ ] In Progress
**Instructions for Cursor:**
1. Find the first unchecked item (`[ ]`).
2. Read the specific endpoint details from `Insomnia_2025-11-28.yaml` (match by name/URL).
3. Follow the **Refactoring Protocol** in `.cursorrules`.
4. After verifying functionality, mark as `[x]`.

---

## 0. Global Utilities
- [x] **POST /api/upload** (Global File Upload)
  *Note: Ensure this is a reusable service/helper for other modules.*

## 1. Auth Service
- [x] **POST /api/auth/login** (Login as CEO)
- [x] **POST /api/auth/refresh** (Refresh Token)

## 2. Student Service
- [x] **GET /api/students/stats** (Student Dashboard Stats)
- [x] **POST /api/students** (Create Student - Full)
- [x] **GET /api/students** (List Students)
- [x] **GET /api/students/{id}** (Get Student Detail)
- [x] **PUT /api/students/{id}** (Update Student)
- [x] **DELETE /api/students/{id}** (Delete Student)

## 3. Finance Service
- [x] **GET /api/finance/payments/stats** (Payment Stats)
- [x] **GET /api/finance/expenses/stats** (Expense Stats)
- [x] **POST /api/finance/transactions** (Create Transaction)
- [x] **GET /api/finance/transactions** (List Transactions)
- [x] **GET /api/finance/transactions/{id}** (Get Transaction Detail)
- [x] **PUT /api/finance/transactions/{id}/status** (Update TX Status)
- [x] **POST /api/finance/expenses** (Create Expense)
- [x] **GET /api/finance/expenses** (List Expenses)
- [x] **GET /api/finance/expenses/{id}** (Get Expense Detail)

## 4. Events Service
- [x] **POST /api/events** (Create Event)
- [x] **GET /api/events** (List Events)
- [x] **GET /api/events/{id}** (Get Event Detail)
- [x] **PUT /api/events/{id}** (Update Event)
- [x] **DELETE /api/events/{id}** (Delete Event)

## 5. Activity Logs
- [x] **GET /api/activity** (List Logs)
- [x] **GET /api/activity/stats** (Activity Stats)

## 6. Employees (From Auth Service Group in YAML)
- [x] **POST /api/employees** (Create Employee)
- [x] **GET /api/employees** (List Employees)
- [x] **PUT /api/employees/{id}** (Update Employee)
- [x] **DELETE /api/employees/{id}** (Delete Employee)

## 7. Notification Service (Complex/Socket)
- [x] **POST /api/notifications** (Create Notification Trigger)
- [x] **GET /api/notifications** (List My Notifications)
- [x] **GET /api/notifications/unread** (Check Count)
- [x] **PUT /api/notifications/read** (Mark as Read)
- [x] **GET /api/notifications/admin/list** (Admin History)
- [ ] **WebSocket /api/notifications/ws** (Check connection/auth only)

## 8. Chat Service (Complex/Socket)
- [x] **GET /api/chat/conversations** (List Conversations)
- [x] **POST /api/chat/messages** (Send Message)
- [x] **GET /api/chat/conversations/{id}/messages** (Get History)
- [ ] **WebSocket /api/chat/ws** (Check connection/auth only)