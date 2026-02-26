import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, MapPin, Users, Bell, Download, Edit, Trash2, Send, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Event } from '@/types/api.types';
import { format, parseISO } from 'date-fns';
import { eventService } from '@/services';
import { toast } from '@/hooks/use-toast';
import { useTheme } from '@/contexts/ThemeContext';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface EventDetailModalProps {
  eventId: string;
  isOpen: boolean;
  onClose: () => void;
  onUpdate?: () => void;
}

export const EventDetailModal: React.FC<EventDetailModalProps> = ({ eventId, isOpen, onClose, onUpdate }) => {
  const { t } = useTheme();
  const [event, setEvent] = useState<Event | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [editedEvent, setEditedEvent] = useState<Event | null>(null);

  // Load event details when modal opens
  useEffect(() => {
    if (isOpen && eventId) {
      loadEvent();
    }
  }, [isOpen, eventId]);

  const loadEvent = async () => {
    try {
      setLoading(true);
      const data = await eventService.getEvent(eventId);
      setEvent(data);
      setEditedEvent(data);
      setIsEditing(false);
    } catch (error) {
      toast({
        title: t('common.error'),
        description: t('errors.eventLoadFailed'),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: Event['status']) => {
    switch (status) {
      case 'Upcoming': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'Ongoing': return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'Completed': return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
      case 'Cancelled': return 'bg-red-500/10 text-red-500 border-red-500/20';
      default: return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      await eventService.updateEvent(event.id, {
        title: editedEvent.title,
        type: editedEvent.type,
        date: editedEvent.date,
        time: editedEvent.time,
        endTime: editedEvent.endTime,
        location: editedEvent.location,
        locationType: editedEvent.locationType,
        description: editedEvent.description,
        audience: editedEvent.audience,
        attendees: editedEvent.attendees,
        organizer: editedEvent.organizer,
        status: editedEvent.status,
        category: editedEvent.category,
        color: editedEvent.color,
        reminderSet: editedEvent.reminderSet,
      });

      toast({
        title: t('events.eventUpdated'),
        description: t('events.eventUpdatedSuccess'),
      });

      setIsEditing(false);
      onUpdate?.();
    } catch (error) {
      toast({
        title: t('common.error'),
        description: t('errors.eventUpdateFailed'),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!event) return;
    
    try {
      setLoading(true);
      await eventService.deleteEvent(event.id);
      
      toast({
        title: t('events.eventDeleted'),
        description: t('events.eventDeletedSuccess'),
      });
      
      setShowDeleteDialog(false);
      onClose();
      onUpdate?.();
    } catch (error) {
      toast({
        title: t('common.error'),
        description: t('errors.eventDeleteFailed'),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = (attachment: string) => {
  };

  if (loading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!event) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl">
          <div className="text-center py-8 text-muted-foreground">
            {t('events.eventNotFound')}
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <DialogTitle className="text-2xl font-bold mb-2">{event.title}</DialogTitle>
              <div className="flex items-center gap-2">
                <Badge className={getStatusColor(event.status)} variant="outline">
                  {event.status}
                </Badge>
                <Badge variant="secondary">{event.type}</Badge>
                <Badge variant="outline">{event.category}</Badge>
              </div>
            </div>
          </div>
        </DialogHeader>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            {/* <TabsTrigger value="notifications">Notifications</TabsTrigger> */}
            <TabsTrigger value="attendees">Attendees</TabsTrigger>
            <TabsTrigger value="attachments">Attachments</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4 mt-4">
            {isEditing ? (
              /* Edit Form */
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Title</Label>
                    <Input 
                      value={editedEvent.title}
                      onChange={(e) => setEditedEvent({...editedEvent, title: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select 
                      value={editedEvent.status}
                      onValueChange={(value) => setEditedEvent({...editedEvent, status: value as any})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Upcoming">Upcoming</SelectItem>
                        <SelectItem value="Ongoing">Ongoing</SelectItem>
                        <SelectItem value="Completed">Completed</SelectItem>
                        <SelectItem value="Cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Date</Label>
                    <Input 
                      type="date"
                      value={editedEvent.date}
                      onChange={(e) => setEditedEvent({...editedEvent, date: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Time</Label>
                    <Input 
                      type="time"
                      value={editedEvent.time}
                      onChange={(e) => setEditedEvent({...editedEvent, time: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>End Time</Label>
                    <Input 
                      type="time"
                      value={editedEvent.endTime}
                      onChange={(e) => setEditedEvent({...editedEvent, endTime: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Location</Label>
                    <Input 
                      value={editedEvent.location}
                      onChange={(e) => setEditedEvent({...editedEvent, location: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Attendees</Label>
                    <Input 
                      type="number"
                      value={editedEvent.attendees}
                      onChange={(e) => setEditedEvent({...editedEvent, attendees: parseInt(e.target.value) || 0})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Organizer</Label>
                    <Input 
                      value={editedEvent.organizer}
                      onChange={(e) => setEditedEvent({...editedEvent, organizer: e.target.value})}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea 
                    value={editedEvent.description}
                    onChange={(e) => setEditedEvent({...editedEvent, description: e.target.value})}
                    rows={4}
                  />
                </div>
              </div>
            ) : (
              <>
                {/* Event Info Grid */}
                <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Calendar className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Date</p>
                      <p className="font-semibold">{format(parseISO(event.date), 'PPP')}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Clock className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Time</p>
                      <p className="font-semibold">
                        {event.time} {event.endTime && `- ${event.endTime}`}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <MapPin className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Location</p>
                      <p className="font-semibold">{event.location}</p>
                      <Badge variant="outline" className="mt-1">{event.locationType}</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Users className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Attendees</p>
                      <p className="font-semibold">{event.attendees || 0} expected</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Description */}
            <Card>
              <CardHeader>
                <CardTitle>Description</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">{event.description}</p>
              </CardContent>
            </Card>

            {/* Additional Details */}
            <Card>
              <CardHeader>
                <CardTitle>Additional Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Organizer</span>
                  <span className="font-medium">{event.organizer}</span>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Target Audience</span>
                  <span className="font-medium">{event.audience}</span>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Event ID</span>
                  <span className="font-mono text-sm">{event.id}</span>
                </div>
                {event.reminderSet && (
                  <>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Reminder</span>
                      <Badge variant="secondary">
                        <Bell className="h-3 w-3 mr-1" />
                        Enabled
                      </Badge>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
              </>
            )}
          </TabsContent>

          <TabsContent value="notifications" className="space-y-4 mt-4">
            {event.notifications && event.notifications.length > 0 ? (
              <div className="space-y-3">
                {event.notifications.map((notification) => (
                  <Card key={notification.id}>
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="secondary">{notification.type}</Badge>
                            <span className="text-sm text-muted-foreground">
                              {format(parseISO(notification.sentAt), 'PPp')}
                            </span>
                          </div>
                          <p className="text-sm font-medium mb-1">{notification.message}</p>
                          <p className="text-xs text-muted-foreground">
                            Sent to: {notification.recipients} by {notification.sentBy}
                          </p>
                        </div>
                        <Button variant="outline" size="sm">
                          <Send className="h-4 w-4 mr-2" />
                          Resend
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <Bell className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No notifications sent yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Send notifications to inform participants about this event
                  </p>
                  <Button>
                    <Send className="mr-2 h-4 w-4" />
                    Send Notification
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="attendees" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Expected Attendees</CardTitle>
                <CardDescription>
                  {event.attendees || 0} people expected to attend
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="p-8 text-center text-muted-foreground">
                  <Users className="mx-auto h-12 w-12 mb-4" />
                  <p>Attendee list will be available after registration opens</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="attachments" className="space-y-4 mt-4">
            {event.attachments && event.attachments.length > 0 ? (
              <div className="space-y-3">
                {event.attachments.map((attachment, index) => (
                  <Card key={index}>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-primary/10 rounded-lg">
                            <Download className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">{attachment}</p>
                            <p className="text-sm text-muted-foreground">Document</p>
                          </div>
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleDownload(attachment)}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <Download className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No attachments</h3>
                  <p className="text-muted-foreground">
                    No files have been attached to this event
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        {/* Action Buttons - Clean and Minimal */}
        <div className="flex items-center justify-between pt-6 border-t mt-8">
          {!isEditing ? (
            <>
              <Button 
                variant="ghost" 
                size="sm"
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => setShowDeleteDialog(true)}
                disabled={loading}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                {t('events.deleteEvent')}
              </Button>
              <Button onClick={handleEdit} size="sm" disabled={loading}>
                <Edit className="h-4 w-4 mr-2" />
                {t('events.editEvent')}
              </Button>
            </>
          ) : (
            <>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setIsEditing(false)} 
                disabled={loading}
              >
                {t('common.cancel')}
              </Button>
              <Button size="sm" onClick={handleSave} disabled={loading}>
                {loading ? t('common.saving') : t('common.saveChanges')}
              </Button>
            </>
          )}
        </div>
      </DialogContent>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('events.deleteEvent')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('events.deleteEventConfirm', { title: event.title })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={loading}>
              {loading ? t('common.deleting') : t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
};
