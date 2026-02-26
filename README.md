# WIST Financial Automation System

Westminster International School Tashkent - Financial & Administration Portal

## Project Overview

This is a comprehensive financial and administration management system for Westminster International School Tashkent.

## Getting Started

### Prerequisites

- Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

### Installation

```sh
# Clone the repository
git clone <YOUR_GIT_URL>

# Navigate to the project directory
cd wist-pro-portal-main

# Install dependencies
npm install

# Create environment file
cat > .env.local << EOF
VITE_API_BASE_URL=https://dalton-bountyless-untamely.ngrok-free.dev/api
EOF

# Start the development server
npm run dev
```

The development server will start on `http://localhost:8080`

### Quick Setup

For detailed setup instructions, see [SETUP.md](./SETUP.md)

### Backend Integration

The application is fully integrated with the backend API. See [API_INTEGRATION.md](./API_INTEGRATION.md) for:
- Complete API documentation
- Service usage examples
- Authentication flow
- Error handling
- WebSocket chat integration

## Technologies

This project is built with:

- **Vite** - Build tool and dev server
- **TypeScript** - Type-safe JavaScript
- **React** - UI library
- **shadcn-ui** - UI component library
- **Tailwind CSS** - Utility-first CSS framework
- **React Router** - Client-side routing
- **TanStack Query** - Data fetching and caching
- **Recharts** - Charting library
- **WebSocket** - Real-time chat communication

### Backend API

The application connects to a custom backend API with the following services:
- Authentication (JWT-based)
- Employee Management
- Student Management
- Finance & Payments
- Events Management
- Activity Logs
- Real-time Chat (WebSocket)

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run build:dev` - Build for development
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Project Structure

```
src/
├── components/     # React components
├── config/         # Configuration files (API endpoints)
├── contexts/       # React contexts (Auth, Theme)
├── hooks/          # Custom React hooks
├── integrations/   # Third-party integrations
├── lib/            # Utility functions (API client)
├── pages/          # Page components
├── services/       # API service modules
├── types/          # TypeScript type definitions
└── main.tsx        # Application entry point
```

## API Services

All backend API calls are organized into service modules:

- `authService` - Authentication (login, refresh, logout)
- `employeeService` - Employee CRUD operations
- `studentService` - Student management and statistics
- `financeService` - Payments, transactions, and expenses
- `eventService` - Event management
- `activityService` - Activity logs and statistics
- `chatService` - Chat and WebSocket messaging
- `notificationService` - Notification management

Example usage:

```typescript
import { authService, studentService } from '@/services';

// Login
await authService.login('user@wist.uz', 'password');

// Get student stats
const stats = await studentService.getStudentStats();

// List students
const students = await studentService.listStudents({ page: 1 });
```


## Documentation

- [SETUP.md](./SETUP.md) - Quick setup guide
- [API_INTEGRATION.md](./API_INTEGRATION.md) - Complete API documentation
- [Insomnia_2025-11-25.yaml](./Insomnia_2025-11-25.yaml) - API collection for testing
