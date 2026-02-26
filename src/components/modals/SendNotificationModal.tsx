import React, { useState } from 'react';
import { X, Send, Users, Mail, Bell, Smartphone } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Event } from '@/data/mockData';

interface SendNotificationModalProps {
  event: Event;
  isOpen: boolean;
  onClose: () => void;
}

export const SendNotificationModal: React.FC<SendNotificationModalProps> = ({ event, isOpen, onClose }) => {
  const { toast } = useToast();
  const [notificationType, setNotificationType] = useState<'in-app' | 'email' | 'push'>('in-app');
  const [recipientGroup, setRecipientGroup] = useState('all');
  const [message, setMessage] = useState('');
  const [showPreview, setShowPreview] = useState(false);

  const recipientOptions = [
    { id: 'all', label: 'Everyone', description: 'All registered participants', count: event.attendees || 0 },
    { id: 'students', label: 'Students Only', description: 'All enrolled students', count: Math.floor((event.attendees || 0) * 0.7) },
    { id: 'parents', label: 'Parents Only', description: 'All parent accounts', count: Math.floor((event.attendees || 0) * 0.6) },
    { id: 'staff', label: 'Staff Only', description: 'Teachers and administrators', count: Math.floor((event.attendees || 0) * 0.2) },
    { id: 'custom', label: 'Custom Selection', description: 'Manually select recipients', count: 0 },
  ];

  const handleSend = () => {
    if (!message.trim()) {
      toast({
        title: "Message Required",
        description: "Please enter a message to send.",
        variant: "destructive"
      });
      return;
    }

    // Here you would send the notification
    // TODO: Implement notification sending logic

    toast({
      title: "Notification Sent",
      description: `${notificationType} notification sent successfully to ${recipientGroup}.`,
    });

    // Reset form
    setMessage('');
    setShowPreview(false);
    onClose();
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'email': return <Mail className="h-5 w-5" />;
      case 'push': return <Smartphone className="h-5 w-5" />;
      default: return <Bell className="h-5 w-5" />;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Send Notification</DialogTitle>
          <DialogDescription>
            Send a notification about: <span className="font-semibold text-foreground">{event.title}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Notification Type */}
          <div className="space-y-3">
            <Label>Notification Type</Label>
            <div className="grid grid-cols-3 gap-3">
              <Card 
                className={`cursor-pointer transition-all ${notificationType === 'in-app' ? 'ring-2 ring-primary' : ''}`}
                onClick={() => setNotificationType('in-app')}
              >
                <CardContent className="pt-6 text-center">
                  <div className="flex justify-center mb-2">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Bell className="h-5 w-5 text-primary" />
                    </div>
                  </div>
                  <p className="font-medium text-sm">In-App</p>
                  <p className="text-xs text-muted-foreground mt-1">System notification</p>
                </CardContent>
              </Card>

              <Card 
                className={`cursor-pointer transition-all ${notificationType === 'email' ? 'ring-2 ring-primary' : ''}`}
                onClick={() => setNotificationType('email')}
              >
                <CardContent className="pt-6 text-center">
                  <div className="flex justify-center mb-2">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Mail className="h-5 w-5 text-primary" />
                    </div>
                  </div>
                  <p className="font-medium text-sm">Email</p>
                  <p className="text-xs text-muted-foreground mt-1">Send via email</p>
                </CardContent>
              </Card>

              <Card 
                className={`cursor-pointer transition-all ${notificationType === 'push' ? 'ring-2 ring-primary' : ''}`}
                onClick={() => setNotificationType('push')}
              >
                <CardContent className="pt-6 text-center">
                  <div className="flex justify-center mb-2">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Smartphone className="h-5 w-5 text-primary" />
                    </div>
                  </div>
                  <p className="font-medium text-sm">Push</p>
                  <p className="text-xs text-muted-foreground mt-1">Mobile notification</p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Recipients */}
          <div className="space-y-3">
            <Label>Recipients</Label>
            <RadioGroup value={recipientGroup} onValueChange={setRecipientGroup}>
              <div className="space-y-2">
                {recipientOptions.map((option) => (
                  <Card key={option.id} className="cursor-pointer hover:bg-muted/50 transition-colors">
                    <CardContent className="pt-4 pb-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <RadioGroupItem value={option.id} id={option.id} />
                          <div>
                            <Label htmlFor={option.id} className="cursor-pointer font-medium">
                              {option.label}
                            </Label>
                            <p className="text-sm text-muted-foreground">{option.description}</p>
                          </div>
                        </div>
                        {option.count > 0 && (
                          <Badge variant="secondary">
                            <Users className="h-3 w-3 mr-1" />
                            {option.count}
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </RadioGroup>
          </div>

          {/* Message */}
          <div className="space-y-2">
            <Label htmlFor="message">Message</Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Enter your notification message..."
              rows={5}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              {message.length}/500 characters
            </p>
          </div>

          {/* Preview Toggle */}
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="preview" 
              checked={showPreview}
              onCheckedChange={(checked) => setShowPreview(checked as boolean)}
            />
            <Label htmlFor="preview" className="cursor-pointer">
              Show preview before sending
            </Label>
          </div>

          {/* Preview */}
          {showPreview && message && (
            <Card className="bg-muted/50">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-background rounded-lg">
                    {getNotificationIcon(notificationType)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <p className="font-semibold">Preview</p>
                      <Badge variant="outline">{notificationType}</Badge>
                    </div>
                    <p className="text-sm font-medium mb-1">{event.title}</p>
                    <p className="text-sm text-muted-foreground">{message}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSend}>
              <Send className="mr-2 h-4 w-4" />
              Send Notification
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
