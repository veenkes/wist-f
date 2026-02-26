import React, { useState, useEffect } from 'react';
import { Bell, Plus, Search, Filter, Send, Clock, CheckCircle, XCircle, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTheme } from '@/contexts/ThemeContext';
import { usePageHeader } from '@/contexts/PageContext';
import { useAuth } from '@/contexts/AuthContext';
import { CreateNotificationModal } from '@/components/modals/CreateNotificationModal';
import { NotificationDetailModal } from '@/components/modals/NotificationDetailModal';
import { notificationService } from '@/services';
import { apiClient, ApiClientError } from '@/lib/api-client';
import { useToast } from '@/hooks/use-toast';
import type { Notification, NotificationStats, PaginatedResponse } from '@/types/api.types';

export const Notifications: React.FC = () => {
  const { t } = useTheme();
  const { setPageHeader } = usePageHeader();
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Check if user is CEO
  const isCEO = user?.role?.toUpperCase() === 'CEO';
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [stats, setStats] = useState<NotificationStats>({ total: 0, sent: 0, failed: 0 });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [unreadCount, setUnreadCount] = useState(0);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      loadNotifications();
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    setPageHeader(
      isCEO ? t('notifications.management') : t('notifications.myNotifications'),
      isCEO ? (
        <Button size="sm" onClick={() => setIsCreateModalOpen(true)} className="gap-1">
          <Plus className="w-4 h-4" />
          {t('notifications.createNotification')}
        </Button>
      ) : null
    );
  }, [setPageHeader, isCEO, t]);

  // Load notifications
  useEffect(() => {
    loadNotifications();
    if (isCEO) {
      loadStats(); // Only load stats from API for CEO
    }
    loadUnreadCount();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, filterType, filterStatus, isCEO]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (page === 1) {
        loadNotifications();
      } else {
        setPage(1);
      }
    }, 500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm]);

  // Connect WebSocket for real-time updates
  // useEffect(() => {
  //   const accessToken = apiClient.getAccessToken();
  //   if (accessToken) {
  //     notificationService.connectWebSocket(accessToken);
      
  //     const unsubscribe = notificationService.onUnreadCountUpdate((count) => {
  //       setUnreadCount(count);
  //     });

  //     return () => {
  //       unsubscribe();
  //       notificationService.disconnectWebSocket();
  //     };
  //   }
  // }, []);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      
      let response: PaginatedResponse<Notification>;
      
      if (isCEO) {
        // CEO sees admin history (all notifications)
        response = await notificationService.listAdminNotifications({
          page,
          limit: 100,
          search: searchTerm || undefined,
          type: filterType !== 'all' ? filterType : undefined,
          status: filterStatus !== 'all' ? filterStatus : undefined,
        });
      } else {
        // Regular employees see only their notifications
        response = await notificationService.listMyNotifications({
          page,
        });
      }
      
      // listAdminNotifications and listMyNotifications now return PaginatedResponse<Notification> with normalized data
      setNotifications(response.data);
      
      // Load stats after notifications are loaded (for regular users, stats are calculated from notifications)
      if (!isCEO) {
        loadStats();
      }
    } catch (error: any) {
      let errorMessage = isCEO ? t('errors.adminNotificationsLoadFailed') : t('errors.notificationsLoadFailed');
      if (error instanceof Error && error.message) {
        errorMessage = error.message;
      }
      toast({
        title: t('common.error'),
        description: errorMessage,
        variant: 'destructive',
      });
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    if (isCEO) {
      // CEO: Load admin stats from API
      try {
        const statsData = await notificationService.getAdminStats();
        // getAdminStats now returns normalized NotificationStats with scheduled
        setStats(statsData);
      } catch (error: any) {
        let errorMessage = t('errors.notificationStatsLoadFailed');
        if (error instanceof ApiClientError) {
          errorMessage = error.message;
        }
        toast({
          title: t('common.error'),
          description: errorMessage,
          variant: 'destructive',
        });
        setStats({ total: 0, sent: 0, failed: 0, scheduled: 0 });
      }
    } else {
      // Regular user: Calculate stats from their notifications
      const total = notifications.length;
      const sent = notifications.filter(n => n.status === 'Processed').length;
      const failed = notifications.filter(n => n.status === 'Failed').length;
      const scheduled = notifications.filter(n => n.status === 'Scheduled' || n.status === 'Pending').length;
      setStats({ total, sent, failed, scheduled });
    }
  };

  const loadUnreadCount = async () => {
    try {
      const response = await notificationService.getUnreadCount();
      setUnreadCount(response.count);
    } catch (error) {
      // Silent error handling
    }
  };

  const handleNotificationCreated = () => {
    loadNotifications();
    loadStats();
  };

  const filteredNotifications = notifications.filter((notification) => {
    const matchesSearch = notification.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         notification.message.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || notification.type === filterType;
    const matchesStatus = filterStatus === 'all' || notification.status === filterStatus;
    return matchesSearch && matchesType && matchesStatus;
  });

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'Alert': return 'bg-red-500/10 text-red-500 border-red-500/20';
      case 'Info': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'Warning': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      case 'Success': return 'bg-green-500/10 text-green-500 border-green-500/20';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Processed': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'Pending': return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'Failed': return <XCircle className="w-4 h-4 text-red-500" />;
      default: return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-primary/10 rounded-lg">
                <Send className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('notifications.totalSent')}</p>
                <p className="text-2xl font-bold">{stats.sent || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-yellow-500/10 rounded-lg">
                <Clock className="w-5 h-5 text-yellow-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('notifications.pending')}</p>
                <p className="text-2xl font-bold">
                  {isCEO ? (stats.scheduled || 0) : (stats.scheduled || 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-red-500/10 rounded-lg">
                <XCircle className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('notifications.failed')}</p>
                <p className="text-2xl font-bold">{stats.failed || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-500/10 rounded-lg">
                <Bell className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('common.total')}</p>
                <p className="text-2xl font-bold">{stats.total || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder={t('common.searchPlaceholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder={t('common.filterByType')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('common.allTypes')}</SelectItem>
                <SelectItem value="Alert">{t('notifications.type.alert')}</SelectItem>
                <SelectItem value="Info">{t('notifications.type.info')}</SelectItem>
                <SelectItem value="Warning">{t('notifications.type.warning')}</SelectItem>
                <SelectItem value="Success">{t('notifications.type.success')}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder={t('common.filterByStatus')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('common.allStatus')}</SelectItem>
                <SelectItem value="Pending">{t('notifications.status.pending')}</SelectItem>
                <SelectItem value="Processed">{t('notifications.status.processed')}</SelectItem>
                <SelectItem value="Failed">{t('notifications.status.failed')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Notifications List */}
      <div className="space-y-3">
        {loading ? (
          <Card>
            <CardContent className="p-12 text-center">
              <p className="text-muted-foreground">{t('common.loadingNotifications')}</p>
            </CardContent>
          </Card>
        ) : (
          filteredNotifications.map((notification) => (
          <Card key={notification.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-3">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className={getTypeColor(notification.type)}>
                      {notification.type}
                    </Badge>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(notification.status)}
                      <span className="text-sm text-muted-foreground capitalize">
                        {notification.status}
                      </span>
                    </div>
                    {notification.methods?.map((method) => (
                      <Badge key={method} variant="secondary" className="text-xs">
                        {method}
                      </Badge>
                    ))}
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">
                      {notification.title}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                      {notification.message}
                    </p>
                  </div>

                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>To: {notification.target_audience || 'All'}</span>
                    {notification.sentBy && (
                      <>
                        <span>•</span>
                        <span>Sent by: {notification.sentBy}</span>
                      </>
                    )}
                    <span>•</span>
                    <span>
                      {(() => {
                        const dateStr = notification.createdAt || (notification as any).created_at;
                        if (!dateStr) return 'N/A';
                        try {
                          const date = new Date(dateStr);
                          return isNaN(date.getTime()) ? dateStr : date.toLocaleString();
                        } catch {
                          return dateStr;
                        }
                      })()}
                    </span>
                  </div>
                </div>

                {isCEO ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedNotification(notification)}
                    className="gap-2"
                  >
                    <Eye className="w-4 h-4" />
                    {t('common.viewDetails')}
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      if (notification.isRead) {
                        // If already read, open modal to view details
                        setSelectedNotification(notification);
                      } else {
                        // If not read, mark as read immediately
                        try {
                          await notificationService.markAsRead({ notification_id: notification.id });
                          toast({
                            title: t('common.success'),
                            description: t('notifications.markedAsRead'),
                          });
                          // Reload notifications and unread count
                          loadNotifications();
                          loadUnreadCount();
                        } catch (error: any) {
                          toast({
                            title: t('common.error'),
                            description: error instanceof ApiClientError ? error.message : t('errors.notificationMarkAsReadFailed'),
                            variant: 'destructive',
                          });
                        }
                      }
                    }}
                    disabled={notification.isRead}
                    className="gap-2"
                  >
                    <CheckCircle className="w-4 h-4" />
                    {notification.isRead ? t('notifications.view') : t('notifications.markAsRead')}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))
        )}

        {!loading && filteredNotifications.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center">
              <Bell className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">{t('notifications.noNotifications')}</p>
            </CardContent>
          </Card>
        )}
      </div>

      <CreateNotificationModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={handleNotificationCreated}
      />

      {selectedNotification && (
        <NotificationDetailModal
          notification={selectedNotification}
          isOpen={!!selectedNotification}
          onClose={() => setSelectedNotification(null)}
          isCEO={isCEO}
          onMarkAsRead={() => {
            // Reload notifications and unread count after marking as read
            loadNotifications();
            loadUnreadCount();
          }}
          onUpdate={() => {
            // Reload notifications after update (for CEO)
            loadNotifications();
            loadStats();
          }}
        />
      )}
    </div>
  );
};
