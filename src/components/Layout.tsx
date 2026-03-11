import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import CEODashboard from './CEODashboard';
import Payments from '@/pages/Payments';
import { Expenses } from '@/pages/Expenses';
import { Students } from '@/pages/Students';
import { Events } from '@/pages/Events';
import { Notifications } from '@/pages/Notifications';
import { Support } from '@/pages/Support';
import { Employees } from '@/pages/Employees';
import { PageProvider, usePageHeader } from '@/contexts/PageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { Navigate } from 'react-router-dom';
import TeacherDashboard from '@/pages/teacher/TeacherDashboard';
import { TeacherStudents } from '@/pages/teacher/Students';
import ParentsList from '@/pages/teacher/ParentsList';
import Attendance from '@/pages/teacher/Attendance';
import Schedule from '@/pages/teacher/Schedule';
import Grades from '@/pages/teacher/Grades';
import Violations from '@/pages/teacher/Violations';
import Reports from '@/pages/teacher/Reports';

// ДОБАВЛЕН ИМПОРТ НОВОЙ СТРАНИЦЫ
import StudentProfile from '@/pages/teacher/StudentProfile';

const LayoutContent: React.FC = () => {
  const location = useLocation();
  const { title, actions } = usePageHeader();
  const { user } = useAuth();
  const { t } = useTheme();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(200);

  useEffect(() => {
    const handleSidebarToggle = (event: CustomEvent) => {
      setSidebarCollapsed(event.detail.collapsed);
      setSidebarWidth(event.detail.width || 200);
    };

    window.addEventListener('sidebar-toggle', handleSidebarToggle as EventListener);
    
    const saved = localStorage.getItem('sidebar-collapsed');
    if (saved) {
      const collapsed = JSON.parse(saved);
      setSidebarCollapsed(collapsed);
      setSidebarWidth(collapsed ? 64 : 200);
    } else {
      window.dispatchEvent(new CustomEvent('sidebar-toggle', { 
        detail: { collapsed: false, width: 200 } 
      }));
    }

    return () => {
      window.removeEventListener('sidebar-toggle', handleSidebarToggle as EventListener);
    };
  }, []);

  const getPageTitle = (pathname: string) => {
    if (pathname.startsWith('/support')) return t('nav.support');
    
    // ДОБАВЛЕНО УСЛОВИЕ ДЛЯ ПРОФИЛЯ
    if (pathname.startsWith('/student/')) return 'Профиль ученика'; 
    
    switch (pathname) {
      case '/teacher': return t('nav.dashboard');
      case '/teacher/students': return t('nav.students');
      case '/teacher/parents': return t('nav.parents');
      case '/teacher/attendance': return t('nav.attendance');
      case '/teacher/schedule': return t('nav.schedule');
      case '/teacher/grades': return t('nav.grades');
      case '/teacher/incidents': return t('nav.incidents');
      case '/teacher/reports': return t('nav.reports');
      case '/dashboard': return t('nav.dashboard');
      case '/payments': return t('nav.payments');
      case '/expenses': return t('nav.expenses');
      case '/students': return t('nav.students');
      case '/events': return t('nav.events');
      case '/notifications': return t('nav.notifications');
      case '/employees': return t('nav.employees');
      default: return title;
    }
  };

  const renderContent = () => {
    const pathname = location.pathname;
    
    if (pathname.startsWith('/support')) {
      return <Support />;
    }

    if (pathname.startsWith('/student/')) {
      return <StudentProfile />;
    }
    
    switch (pathname) {
      case '/teacher':
        return <TeacherDashboard />;
      case '/teacher/students':
        return <TeacherStudents />;
      case '/teacher/parents':
        return <ParentsList />;
      case '/teacher/attendance':
        return <Attendance />;
      case '/teacher/schedule':
        return <Schedule />;
      case '/teacher/grades':
        return <Grades />;
      case '/teacher/incidents':
        return <Violations />;
      case '/teacher/reports':
        return <Reports />;
      case '/dashboard':
        return <CEODashboard />;
      case '/payments':
        return <Payments />;
      case '/expenses':
        return <Expenses />;
      case '/students':
        return <Students />;
      case '/events':
        return <Events />;
      case '/notifications':
        return <Notifications />;
      case '/employees':
        if (user?.role === 'Accountant') {
          return <Navigate to="/dashboard" replace />;
        }
        return <Employees />;
      default:
        return <CEODashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <Sidebar />
      <div 
        className="flex flex-col min-h-screen transition-all duration-300"
        style={{ marginLeft: `${sidebarCollapsed ? 64 : sidebarWidth}px`, width: `calc(100% - ${sidebarCollapsed ? 64 : sidebarWidth}px)` }}
      >
        <TopBar title={getPageTitle(location.pathname) || title} actions={actions} />
        <main className="flex-1 p-6 overflow-auto w-full">
          {renderContent()}
        </main>
      </div>
    </div>
  );
};

const Layout: React.FC = () => {
  return (
    <PageProvider>
      <LayoutContent />
    </PageProvider>
  );
};

export default Layout;