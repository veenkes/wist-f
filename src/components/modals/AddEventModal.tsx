import React, { useState } from 'react';
import { X, Upload, Users, CalendarIcon } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { eventService, uploadService } from '@/services';

interface AddEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const AddEventModal: React.FC<AddEventModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [eventData, setEventData] = useState({
    title: '',
    description: '',
    type: 'Meeting',
    category: 'Academic',
    date: new Date(),
    time: '',
    endTime: '',
    location: '',
    locationType: 'Offline',
    organizer: 'Admin User',
    audience: 'All',
    reminderSet: false,
    color: '#8B5CF6',
    status: 'Upcoming',
    attendees: 0
  });

  const [attachments, setAttachments] = useState<File[]>([]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!eventData.title || !eventData.description || !eventData.time || !eventData.location) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive"
      });
      return;
    }

    try {
      setLoading(true);
      
      // Upload attachments first if any
      const attachmentUrls: string[] = [];
      if (attachments.length > 0) {
        for (const file of attachments) {
          try {
            const uploadResult = await uploadService.uploadFile(file);
            attachmentUrls.push(uploadResult.url);
          } catch (uploadError) {
            toast({
              title: "Upload Error",
              description: `Failed to upload ${file.name}`,
              variant: "destructive"
            });
            return;
          }
        }
      }
      
      await eventService.createEvent({
        title: eventData.title,
        type: eventData.type,
        date: format(eventData.date, 'yyyy-MM-dd'),
        time: eventData.time,
        endTime: eventData.endTime,
        location: eventData.location,
        locationType: eventData.locationType,
        description: eventData.description,
        audience: eventData.audience,
        attendees: eventData.attendees,
        organizer: eventData.organizer,
        status: eventData.status,
        category: eventData.category,
        color: eventData.color,
        reminderSet: eventData.reminderSet,
        attachments: attachmentUrls,
        assignedTo: [],
        notifications: []
      });

      toast({
        title: "Event Created",
        description: `${eventData.title} has been scheduled successfully.`,
      });

      // Reset form
      setEventData({
        title: '',
        description: '',
        type: 'Meeting',
        category: 'Academic',
        date: new Date(),
        time: '',
        endTime: '',
        location: '',
        locationType: 'Offline',
        organizer: 'Admin User',
        audience: 'All',
        reminderSet: false,
        color: '#8B5CF6',
        status: 'Upcoming',
        attendees: 0
      });
      setAttachments([]);
      onClose();
      onSuccess?.();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create event",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setAttachments(Array.from(e.target.files));
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Create New Event</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Tabs defaultValue="details" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="details">Event Details</TabsTrigger>
              <TabsTrigger value="schedule">Schedule & Location</TabsTrigger>
              <TabsTrigger value="participants">Participants</TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="title">Event Title *</Label>
                <Input
                  id="title"
                  value={eventData.title}
                  onChange={(e) => setEventData({ ...eventData, title: e.target.value })}
                  placeholder="Enter event title"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  value={eventData.description}
                  onChange={(e) => setEventData({ ...eventData, description: e.target.value })}
                  placeholder="Describe the event..."
                  rows={4}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="type">Event Type *</Label>
                  <Select 
                    value={eventData.type} 
                    onValueChange={(value) => setEventData({ ...eventData, type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Meeting">Meeting</SelectItem>
                      <SelectItem value="Sports">Sports</SelectItem>
                      <SelectItem value="Academic">Academic</SelectItem>
                      <SelectItem value="Social">Social</SelectItem>
                      <SelectItem value="Administrative">Administrative</SelectItem>
                      <SelectItem value="Training">Training</SelectItem>
                      <SelectItem value="Celebration">Celebration</SelectItem>
                      <SelectItem value="Announcement">Announcement</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">Category *</Label>
                  <Input
                    id="category"
                    value={eventData.category}
                    onChange={(e) => setEventData({ ...eventData, category: e.target.value })}
                    placeholder="e.g., Academic, Community"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="color">Event Color</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    id="color"
                    value={eventData.color}
                    onChange={(e) => setEventData({ ...eventData, color: e.target.value })}
                    className="h-10 w-20 rounded border border-input cursor-pointer"
                  />
                  <span className="text-sm text-muted-foreground">Choose a color for calendar display</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="attachments">Attachments</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="attachments"
                    type="file"
                    multiple
                    onChange={handleFileChange}
                    className="flex-1"
                  />
                  <Upload className="h-4 w-4 text-muted-foreground" />
                </div>
                {attachments.length > 0 && (
                  <p className="text-sm text-muted-foreground">
                    {attachments.length} file(s) selected
                  </p>
                )}
              </div>
            </TabsContent>

            <TabsContent value="schedule" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Event Date *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {format(eventData.date, 'PPP')}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 border" align="start" side="bottom" sideOffset={4}>
                    <Calendar
                      mode="single"
                      selected={eventData.date}
                      onSelect={(date) => date && setEventData({ ...eventData, date })}
                      initialFocus
                      defaultMonth={eventData.date}
                      captionLayout="dropdown"
                      fromYear={2020}
                      toYear={new Date().getFullYear() + 1}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="time">Start Time *</Label>
                  <Input
                    id="time"
                    type="time"
                    value={eventData.time}
                    onChange={(e) => setEventData({ ...eventData, time: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="endTime">End Time</Label>
                  <Input
                    id="endTime"
                    type="time"
                    value={eventData.endTime}
                    onChange={(e) => setEventData({ ...eventData, endTime: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">Location *</Label>
                <Input
                  id="location"
                  value={eventData.location}
                  onChange={(e) => setEventData({ ...eventData, location: e.target.value })}
                  placeholder="Enter location"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="locationType">Location Type *</Label>
                <Select 
                  value={eventData.locationType} 
                  onValueChange={(value) => setEventData({ ...eventData, locationType: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Online">Online</SelectItem>
                    <SelectItem value="Offline">Offline</SelectItem>
                    <SelectItem value="Hybrid">Hybrid</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="reminder">Set Reminder</Label>
                  <p className="text-sm text-muted-foreground">
                    Send notifications before the event
                  </p>
                </div>
                <Switch
                  id="reminder"
                  checked={eventData.reminderSet}
                  onCheckedChange={(checked) => setEventData({ ...eventData, reminderSet: checked })}
                />
              </div>
            </TabsContent>

            <TabsContent value="participants" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="organizer">Organizer *</Label>
                <Input
                  id="organizer"
                  value={eventData.organizer}
                  onChange={(e) => setEventData({ ...eventData, organizer: e.target.value })}
                  placeholder="Event organizer name"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="audience">Target Audience *</Label>
                <Input
                  id="audience"
                  value={eventData.audience}
                  onChange={(e) => setEventData({ ...eventData, audience: e.target.value })}
                  placeholder="e.g., All Students, Parents & Teachers"
                  required
                />
              </div>

              <div className="p-4 bg-muted/50 rounded-lg">
                <div className="flex items-start gap-2">
                  <Users className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="font-medium text-sm">Assign Participants</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      After creating the event, you can assign specific students, groups, or staff members from the event details page.
                    </p>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create Event'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
