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
import { Navigate } from 'react-router-dom';

const LayoutContent: React.FC = () => {
  const location = useLocation();
  const { title, actions } = usePageHeader();
  const { user } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(200);

  useEffect(() => {
    const handleSidebarToggle = (event: CustomEvent) => {
      setSidebarCollapsed(event.detail.collapsed);
      setSidebarWidth(event.detail.width || 200);
    };

    window.addEventListener('sidebar-toggle', handleSidebarToggle as EventListener);
    
    // Get initial state from localStorage
    const saved = localStorage.getItem('sidebar-collapsed');
    if (saved) {
      const collapsed = JSON.parse(saved);
      setSidebarCollapsed(collapsed);
      setSidebarWidth(collapsed ? 64 : 200);
    } else {
      // Dispatch initial event to sync
      window.dispatchEvent(new CustomEvent('sidebar-toggle', { 
        detail: { collapsed: false, width: 200 } 
      }));
    }

    return () => {
      window.removeEventListener('sidebar-toggle', handleSidebarToggle as EventListener);
    };
  }, []);

  const renderContent = () => {
    const pathname = location.pathname;
    
    // Handle routes with parameters
    if (pathname.startsWith('/support')) {
      return <Support />;
    }
    
    switch (pathname) {
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
        <TopBar title={title} actions={actions} />
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