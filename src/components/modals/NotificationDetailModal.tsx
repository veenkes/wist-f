import React, { useState, useEffect } from 'react';
import { X, Send, Users, Calendar, FileText, Loader2, Edit, Trash2, CheckCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { notificationService } from '@/services';
import { useToast } from '@/hooks/use-toast';
import { useTheme } from '@/contexts/ThemeContext';
import type { Notification } from '@/types/api.types';

interface NotificationDetailModalProps {
  notification: Notification;
  isOpen: boolean;
  onClose: () => void;
  isCEO?: boolean;
  onMarkAsRead?: () => void;
  onUpdate?: () => void;
}

export const NotificationDetailModal: React.FC<NotificationDetailModalProps> = ({
  notification,
  isOpen,
  onClose,
  isCEO = false,
  onMarkAsRead,
  onUpdate,
}) => {
  const { toast } = useToast();
  const { t } = useTheme();
  const [detailedNotification, setDetailedNotification] = useState<Notification | null>(notification);
  const [loading, setLoading] = useState(false);
  const [markingAsRead, setMarkingAsRead] = useState(false);

  useEffect(() => {
    if (isOpen && notification.id) {
      if (isCEO) {
        // CEO: Load full details from admin endpoint
        loadNotificationDetails();
      } else {
        // Regular employee: Use notification data from list (no API call needed)
        setDetailedNotification(notification);
      }
    } else {
      setDetailedNotification(notification);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, notification.id, isCEO]);

  const loadNotificationDetails = async () => {
    try {
      setLoading(true);
      const details = await notificationService.getAdminNotification(notification.id);
      setDetailedNotification(details);
    } catch (error: any) {
      console.error('[NotificationDetailModal] Failed to load details:', error);
      toast({
        title: t('common.error'),
        description: t('errors.notificationLoadFailed'),
        variant: 'destructive',
      });
      // Fallback to passed notification if API fails
      setDetailedNotification(notification);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async () => {
    if (!notification.id) return;

    try {
      setMarkingAsRead(true);
      await notificationService.markAsRead({ notification_id: notification.id });
      
      toast({
        title: t('common.success'),
        description: t('notifications.markedAsRead'),
      });

      onMarkAsRead?.();
      onClose();
    } catch (error: any) {
      console.error('[NotificationDetailModal] Failed to mark as read:', error);
      toast({
        title: t('common.error'),
        description: t('errors.notificationMarkAsReadFailed'),
        variant: 'destructive',
      });
    } finally {
      setMarkingAsRead(false);
    }
  };
  const getTypeColor = (type: string) => {
    switch (type) {
      case 'Alert': return 'bg-red-500/10 text-red-500 border-red-500/20';
      case 'Info': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'Warning': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      case 'Success': return 'bg-green-500/10 text-green-500 border-green-500/20';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  if (!detailedNotification) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            {isCEO ? t('notifications.details') : t('notifications.notification')}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Header Info */}
            <div className="space-y-3">
              <div className="flex items-center gap-3 flex-wrap">
                <Badge variant="outline" className={getTypeColor(detailedNotification.type)}>
                  {detailedNotification.type}
                </Badge>
                <Badge variant={detailedNotification.status === 'Processed' ? 'default' : 'secondary'}>
                  {detailedNotification.status}
                </Badge>
                {detailedNotification.methods?.map((method) => (
                  <Badge key={method} variant="outline" className="text-xs">
                    {method}
                  </Badge>
                ))}
              </div>
              <h2 className="text-2xl font-bold text-foreground">{detailedNotification.title}</h2>
            </div>

            {/* Message Content */}
            <Card>
              <CardContent className="p-6">
                <h3 className="font-semibold mb-3">{t('notifications.message')}</h3>
                <p className="text-muted-foreground whitespace-pre-wrap">{detailedNotification.message || t('common.notSpecified')}</p>
              </CardContent>
            </Card>

            {/* Recipients Info - Only for CEO */}
            {isCEO && detailedNotification.target_audience && (
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-start gap-3">
                    <Users className="w-5 h-5 text-primary mt-0.5" />
                    <div className="flex-1">
                      <h3 className="font-semibold mb-2">{t('notifications.recipients')}</h3>
                      <p className="text-sm text-muted-foreground mb-2">
                        {t('notifications.targetAudience')}: <span className="font-medium text-foreground">{detailedNotification.target_audience}</span>
                      </p>
                      <Badge variant="secondary">
                        {detailedNotification.target_audience}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Metadata */}
            <Card>
              <CardContent className="p-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-start gap-3">
                    <Calendar className="w-5 h-5 text-primary mt-0.5" />
                    <div>
                      <h3 className="font-semibold mb-1">{t('notifications.sentDate')}</h3>
                      <p className="text-sm text-muted-foreground">
                        {detailedNotification.createdAt 
                          ? new Date(detailedNotification.createdAt).toLocaleString()
                          : t('common.notSpecified')}
                      </p>
                    </div>
                  </div>
                  {isCEO && (
                    <div className="flex items-start gap-3">
                      <Users className="w-5 h-5 text-primary mt-0.5" />
                      <div>
                        <h3 className="font-semibold mb-1">{t('notifications.sentBy')}</h3>
                        <p className="text-sm text-muted-foreground">
                          {detailedNotification.sentBy || t('common.system')}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Attachments */}
            {detailedNotification.attachments && detailedNotification.attachments.length > 0 && (
              <Card>
                <CardContent className="p-6">
                  <h3 className="font-semibold mb-3">{t('notifications.attachments')}</h3>
                  <div className="space-y-2">
                    {detailedNotification.attachments.map((attachment, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 bg-muted rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <FileText className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm">{attachment}</span>
                        </div>
                        <Button variant="ghost" size="sm">
                          {t('common.download')}
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Actions */}
            <div className="flex gap-3 justify-end pt-4 border-t">
              {!isCEO ? (
                // Regular employee: Only "Mark as Read" button
                <>
                  <Button variant="outline" onClick={onClose}>
                    {t('common.close')}
                  </Button>
                  <Button 
                    onClick={handleMarkAsRead} 
                    disabled={markingAsRead || detailedNotification.isRead}
                    className="gap-2"
                  >
                    {markingAsRead ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        {t('common.processing')}
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4" />
                        {detailedNotification.isRead ? t('notifications.alreadyRead') : t('notifications.markAsRead')}
                      </>
                    )}
                  </Button>
                </>
              ) : (
                // CEO: Full actions (Edit, Delete, Close)
                <>
                  <Button variant="outline" onClick={onClose}>
                    {t('common.close')}
                  </Button>
                  {/* <Button variant="outline" className="gap-2">
                    <Edit className="w-4 h-4" />
                    {t('common.edit')}
                  </Button> */}
                  {/* <Button variant="destructive" className="gap-2">
                    <Trash2 className="w-4 h-4" />
                    {t('common.delete')}
                  </Button> */}
                </>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
