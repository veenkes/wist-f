import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  CreditCard, 
  Receipt, 
  Users, 
  Calendar, 
  Bell, 
  MessageCircle,
  UserCog,
  Briefcase,
  Activity,
  LogOut,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Sparkles,
  ClipboardCheck
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { AdaptiveLogo } from '@/components/AdaptiveLogo';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { notificationService, chatService } from '@/services';

const SIDEBAR_COLLAPSED_KEY = 'sidebar-collapsed';
const MIN_WIDTH = 64;
const DEFAULT_WIDTH = 200;

const Sidebar: React.FC = () => {
  const { user, logout } = useAuth();
  const { t } = useTheme();
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
    return saved ? JSON.parse(saved) : false;
  });
  const [notificationsBadge, setNotificationsBadge] = useState<number | undefined>(undefined);
  const [supportBadge, setSupportBadge] = useState<number | undefined>(undefined);

  useEffect(() => {
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, JSON.stringify(isCollapsed));
    const width = isCollapsed ? MIN_WIDTH : DEFAULT_WIDTH;
    window.dispatchEvent(new CustomEvent('sidebar-toggle', { 
      detail: { collapsed: isCollapsed, width } 
    }));
  }, [isCollapsed]);

  useEffect(() => {
    const width = isCollapsed ? MIN_WIDTH : DEFAULT_WIDTH;
    window.dispatchEvent(new CustomEvent('sidebar-toggle', { 
      detail: { collapsed: isCollapsed, width } 
    }));
  }, []);

  useEffect(() => {
    if (!user) return;

    const loadUnreadMessages = async () => {
      try {
        const conversations = await chatService.listConversations();
        const totalUnread = conversations.reduce((acc, conv) => acc + (conv.unreadCount || 0), 0);
        setSupportBadge(totalUnread > 0 ? totalUnread : undefined);
      } catch (error) {
        setSupportBadge(undefined);
      }
    };

    loadUnreadMessages();

    const token = localStorage.getItem('access_token');
    if (token) {
      chatService.connectWebSocket(token);
      
      const unsubscribe = chatService.onMessage(() => {
        loadUnreadMessages();
      });

      return () => {
        if (unsubscribe) {
          unsubscribe();
        }
        chatService.disconnectWebSocket();
      };
    }
  }, [user]);

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  const getNavigationItems = () => {
    const commonItems = [
      { icon: Bell, label: t('nav.notifications'), path: '/notifications', badge: notificationsBadge },
      { icon: MessageCircle, label: t('nav.support'), path: '/support', badge: supportBadge },
    ];

    switch (user?.role) {
      case 'Teacher':
        return [
          { icon: LayoutDashboard, label: t('nav.dashboard'), path: '/teacher' },
          { icon: Users, label: t('nav.students'), path: '/teacher/students' },
          { icon: Users, label: t('nav.parents'), path: '/teacher/parents' },
          { icon: ClipboardCheck, label: t('nav.attendance'), path: '/teacher/attendance' },
          { icon: Calendar, label: t('nav.schedule'), path: '/teacher/schedule' },
          { icon: Sparkles, label: t('nav.reports'), path: '/teacher/reports' },
          { icon: AlertCircle, label: t('nav.incidents'), path: '/teacher/incidents' },
          { icon: Activity, label: t('nav.grades'), path: '/teacher/grades' },
          ...commonItems,
        ];
        
      case 'Accountant':
        return [
          { icon: LayoutDashboard, label: t('nav.dashboard'), path: '/dashboard' },
          { icon: CreditCard, label: t('nav.payments'), path: '/payments' },
          { icon: Receipt, label: t('nav.expenses'), path: '/expenses' },
          ...commonItems,
        ];
      default:
        return [
          { icon: LayoutDashboard, label: t('nav.dashboard'), path: '/dashboard' },
          { icon: Users, label: t('nav.students'), path: '/students' },
          { icon: CreditCard, label: t('nav.payments'), path: '/payments' },
          { icon: Receipt, label: t('nav.expenses'), path: '/expenses' },
          { icon: Calendar, label: t('nav.events'), path: '/events' },
          { icon: Briefcase, label: t('nav.employees'), path: '/employees' },
          ...commonItems,
        ];
    }
  };

  const navigationItems = getNavigationItems();
  const currentWidth = isCollapsed ? MIN_WIDTH : DEFAULT_WIDTH;

  return (
    <TooltipProvider delayDuration={300}>
      <div 
        className="fixed left-0 top-0 h-screen bg-card border-r border-border shadow-card flex flex-col z-40 transition-all duration-300"
        style={{ width: `${currentWidth}px` }}
      >
        <div className={`relative py-4 flex items-center border-b border-border transition-all duration-300 ${isCollapsed ? 'px-0 justify-center' : 'px-4'}`} style={{ minHeight: '73px' }}>
          {!isCollapsed && (
            <div className="flex items-center flex-1 min-w-0 mr-2">
              <AdaptiveLogo className="h-8 w-auto max-w-full" />
            </div>
          )}
          
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            className={`h-8 w-8 rounded-md hover:bg-primary/10 hover:text-primary transition-all flex-shrink-0 ${
              isCollapsed ? 'mx-auto' : ''
            }`}
          >
            {isCollapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </Button>
        </div>

        <nav className={`flex-1 overflow-y-auto p-3 space-y-1 transition-all duration-300 ${isCollapsed ? 'px-2' : 'px-2'}`}>
          {navigationItems.map((item) => {
            const IconComponent = item.icon;
            const navLink = (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/teacher' || item.path === '/dashboard'}
                className={({ isActive }) =>
                  `group flex items-center gap-3 rounded-lg text-sm font-medium transition-all duration-200 relative ${
                    isCollapsed ? 'px-2 py-2.5 justify-center' : 'px-3 py-2.5'
                  } ${
                    isActive
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                  }`
                }
              >
                <div className={`flex items-center ${isCollapsed ? 'justify-center w-full' : 'gap-3 flex-1 min-w-0'}`}>
                  <IconComponent className={`flex-shrink-0 ${isCollapsed ? 'w-5 h-5' : 'w-4 h-4'}`} />
                  {!isCollapsed && (
                    <span className="truncate flex-1">{item.label}</span>
                  )}
                </div>
                {!isCollapsed && item.badge && (
                  <Badge className="h-5 min-w-5 px-1.5 flex items-center justify-center text-xs bg-warning text-warning-foreground flex-shrink-0">
                    {item.badge}
                  </Badge>
                )}
                {isCollapsed && item.badge && (
                  <Badge className="absolute -top-1 -right-1 h-5 min-w-5 px-1.5 flex items-center justify-center text-xs bg-warning text-warning-foreground border-2 border-card">
                    {item.badge}
                  </Badge>
                )}
              </NavLink>
            );

            if (isCollapsed) {
              return (
                <Tooltip key={item.path}>
                  <TooltipTrigger asChild>
                    <div className="relative">
                      {navLink}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    <p>{item.label}</p>
                    {item.badge && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {item.badge} notification{item.badge !== 1 ? 's' : ''}
                      </p>
                    )}
                  </TooltipContent>
                </Tooltip>
              );
            }

            return navLink;
          })}
        </nav>

        <div className={`p-3 border-t border-border space-y-2 transition-all duration-300 ${isCollapsed ? 'px-2' : 'px-2'}`}>
          {isCollapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="w-10 h-10 bg-gradient-primary rounded-lg flex items-center justify-center text-primary-foreground font-semibold mx-auto cursor-pointer hover:opacity-90 transition-opacity shadow-sm">
                  {user?.name?.charAt(0) || user?.email?.charAt(0) || 'U'}
                </div>
              </TooltipTrigger>
              <TooltipContent side="right">
                <div>
                  <p className="font-medium">{user?.name || user?.email}</p>
                  <p className="text-xs text-muted-foreground capitalize">
                    {user?.role?.replace('-', ' ') || 'User'}
                  </p>
                </div>
              </TooltipContent>
            </Tooltip>
          ) : (
            <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg bg-muted/50 hover:bg-muted/70 transition-colors">
              <div className="w-9 h-9 bg-gradient-primary rounded-lg flex items-center justify-center text-primary-foreground font-semibold flex-shrink-0 text-sm shadow-sm">
                {user?.name?.charAt(0) || user?.email?.charAt(0) || 'U'}
              </div>
              <div className="flex-1 min-w-0 text-left">
                <p className="text-sm font-medium text-foreground truncate">
                  {user?.name || user?.email}
                </p>
                <p className="text-xs text-muted-foreground truncate capitalize">
                  {user?.role?.replace('-', ' ') || 'User'}
                </p>
              </div>
            </div>
          )}
          
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size={isCollapsed ? "icon" : "sm"}
                onClick={logout}
                className={`text-destructive hover:text-destructive hover:bg-destructive/10 ${
                  isCollapsed ? 'w-full justify-center' : 'w-full justify-start'
                }`}
              >
                <LogOut className={`w-4 h-4 ${isCollapsed ? '' : 'mr-2'}`} />
                {!isCollapsed && 'Logout'}
              </Button>
            </TooltipTrigger>
            {isCollapsed && (
              <TooltipContent side="right">
                <p>Logout</p>
              </TooltipContent>
            )}
          </Tooltip>
        </div>
      </div>
    </TooltipProvider>
  );
};

export default Sidebar;