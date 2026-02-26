import React, { useState, useMemo, useEffect } from 'react';
import { Calendar, Plus, Search, Filter, Download, Bell, CalendarDays, MapPin, Users, Clock, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Event } from '@/types/api.types';
import { AddEventModal } from '@/components/modals/AddEventModal';
import { EventDetailModal } from '@/components/modals/EventDetailModal';
import { SendNotificationModal } from '@/components/modals/SendNotificationModal';
import { format, parseISO, isAfter, isBefore, startOfDay, endOfDay } from 'date-fns';
import { eventService } from '@/services';
import { toast } from '@/hooks/use-toast';
import { usePageHeader } from '@/contexts/PageContext';
import { useTheme } from '@/contexts/ThemeContext';
import { StatsCard } from '@/components/StatsCard';

export const Events: React.FC = () => {
  const { t } = useTheme();
  const { setPageHeader } = usePageHeader();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');

  useEffect(() => {
    loadEvents();
  }, []);

  useEffect(() => {
    setPageHeader(
      'Events Management',
      <>
        <Button variant="outline" size="sm" onClick={exportToCSV} className="gap-1">
          <Download className="w-4 h-4" />
          Export
        </Button>
        <Button size="sm" onClick={() => setIsAddModalOpen(true)} className="gap-1">
          <Plus className="w-4 h-4" />
          {t('events.addEvent')}
        </Button>
      </>
    );
  }, [setPageHeader]);

  const loadEvents = async () => {
    try {
      setLoading(true);
      const response = await eventService.listEvents({ page: 1, limit: 100 });
      // listEvents now returns PaginatedResponse<Event> with normalized data
      setEvents(response.data);
    } catch (error) {
      toast({
        title: t('common.error'),
        description: t('errors.eventsLoadFailed'),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Filter and search events
  const filteredEvents = useMemo(() => {
    if (!events || events.length === 0) return [];
    
    return events.filter(event => {
      const matchesSearch = event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          event.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          event.organizer.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = categoryFilter === 'all' || event.category === categoryFilter;
      const matchesStatus = statusFilter === 'all' || event.status === statusFilter;
      const matchesType = typeFilter === 'all' || event.type === typeFilter;
      
      return matchesSearch && matchesCategory && matchesStatus && matchesType;
    });
  }, [events, searchQuery, categoryFilter, statusFilter, typeFilter]);

  // Sort events by date
  const sortedEvents = useMemo(() => {
    return [...filteredEvents].sort((a, b) => {
      const dateA = new Date((a.date || '2099-12-31') + 'T' + (a.time || '00:00'));
      const dateB = new Date((b.date || '2099-12-31') + 'T' + (b.time || '00:00'));
      return dateB.getTime() - dateA.getTime();
    });
  }, [filteredEvents]);

  // Calculate statistics
  const stats = useMemo(() => {
    if (!events || events.length === 0) {
      return { upcoming: 0, thisMonth: 0, totalAttendees: 0, total: 0 };
    }
    
    const upcoming = events.filter(e => e.status === 'Upcoming').length;
    const today = new Date();
    const thisMonth = events.filter(e => {
      if (!e.date) return false;
      try {
        const eventDate = parseISO(e.date);
        return eventDate.getMonth() === today.getMonth() && eventDate.getFullYear() === today.getFullYear();
      } catch {
        return false;
      }
    }).length;
    const totalAttendees = events.reduce((sum, e) => sum + (e.attendees || 0), 0);
    
    return { upcoming, thisMonth, totalAttendees, total: events.length };
  }, [events]);

  // Get unique categories and types
  const categories = useMemo(() => {
    if (!events || events.length === 0) return [];
    const cats = new Set(events.map(e => e.category));
    return Array.from(cats);
  }, [events]);

  const types = useMemo(() => {
    if (!events || events.length === 0) return [];
    const t = new Set(events.map(e => e.type));
    return Array.from(t);
  }, [events]);

  const getStatusColor = (status: Event['status']) => {
    switch (status) {
      case 'Upcoming': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'Ongoing': return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'Completed': return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
      case 'Canceled': return 'bg-red-500/10 text-red-500 border-red-500/20';
      default: return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
    }
  };

  const getTypeColor = (type: Event['type']) => {
    switch (type) {
      case 'Meeting': return 'bg-purple-500/10 text-purple-500';
      case 'Sports': return 'bg-green-500/10 text-green-500';
      case 'Academic': return 'bg-blue-500/10 text-blue-500';
      case 'Social': return 'bg-pink-500/10 text-pink-500';
      case 'Administrative': return 'bg-orange-500/10 text-orange-500';
      case 'Training': return 'bg-indigo-500/10 text-indigo-500';
      case 'Celebration': return 'bg-yellow-500/10 text-yellow-500';
      case 'Announcement': return 'bg-red-500/10 text-red-500';
      default: return 'bg-gray-500/10 text-gray-500';
    }
  };

  const handleViewDetails = (event: Event) => {
    setSelectedEvent(event);
    setIsDetailModalOpen(true);
  };

  const handleSendNotification = (event: Event) => {
    setSelectedEvent(event);
    setIsNotificationModalOpen(true);
  };

  const exportToCSV = () => {
    const headers = ['ID', 'Title', 'Type', 'Date', 'Time', 'Location', 'Status', 'Organizer', 'Attendees'];
    const rows = filteredEvents.map(event => [
      event.id,
      event.title,
      event.type,
      event.date || 'N/A',
      event.time || 'N/A',
      event.location,
      event.status,
      event.organizer,
      event.attendees || 0
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `events-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {loading ? (
          Array.from({ length: 4 }).map((_, index) => (
            <StatsCard
              key={index}
              title=""
              value=""
              icon={Calendar}
              loading={true}
            />
          ))
        ) : (
          <>
            <StatsCard
              title="Total Events"
              value={stats.total}
              icon={Calendar}
              subtitle="All time"
              iconColor="text-primary"
              iconBgColor="bg-primary/10"
            />
            
            <StatsCard
              title="Upcoming"
              value={stats.upcoming}
              icon={Clock}
              subtitle="Scheduled events"
              iconColor="text-blue-500"
              iconBgColor="bg-blue-500/10"
            />

            <StatsCard
              title="This Month"
              value={stats.thisMonth}
              icon={CalendarDays}
              subtitle="Current month"
              iconColor="text-success"
              iconBgColor="bg-success/10"
            />

            <StatsCard
              title="Total Participants"
              value={stats.totalAttendees}
              icon={Users}
              subtitle="Expected attendance"
              iconColor="text-purple-500"
              iconBgColor="bg-purple-500/10"
            />
          </>
        )}
      </div>

      {/* Filters and Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search events by title, description, or organizer..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="Upcoming">Upcoming</SelectItem>
                <SelectItem value="Ongoing">Ongoing</SelectItem>
                <SelectItem value="Completed">Completed</SelectItem>
                <SelectItem value="Canceled">Canceled</SelectItem>
              </SelectContent>
            </Select>

            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {types.map(type => (
                  <SelectItem key={type} value={type}>{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map(cat => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Events List */}
      <div className="space-y-4">
        {sortedEvents.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <CalendarDays className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No events found</h3>
              <p className="text-muted-foreground mb-4">
                Try adjusting your filters or create a new event
              </p>
              <Button onClick={() => setIsAddModalOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create Event
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {sortedEvents.map(event => (
              <Card key={event.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-start gap-4">
                        <div 
                          className="w-16 h-16 rounded-lg flex flex-col items-center justify-center text-white font-bold"
                          style={{ backgroundColor: event.color || 'hsl(var(--primary))' }}
                        >
                          {event.date ? (
                            <>
                              <div className="text-xs">{format(parseISO(event.date), 'MMM')}</div>
                              <div className="text-2xl">{format(parseISO(event.date), 'd')}</div>
                            </>
                          ) : (
                            <div className="text-xs">N/A</div>
                          )}
                        </div>

                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="text-lg font-semibold text-foreground">{event.title}</h3>
                            <Badge className={getStatusColor(event.status)} variant="outline">
                              {event.status}
                            </Badge>
                            <Badge className={getTypeColor(event.type)} variant="secondary">
                              {event.type}
                            </Badge>
                          </div>

                          <p className="text-muted-foreground text-sm mb-3 line-clamp-2">
                            {event.description}
                          </p>

                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Clock className="h-4 w-4" />
                              <span>{event.time || 'TBD'} {event.endTime && `- ${event.endTime}`}</span>
                            </div>
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <MapPin className="h-4 w-4" />
                              <span className="truncate">{event.location}</span>
                            </div>
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Users className="h-4 w-4" />
                              <span>{event.attendees || 0} attendees</span>
                            </div>
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Badge variant="outline" className="text-xs">
                                {event.locationType}
                              </Badge>
                            </div>
                          </div>

                          <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
                            <span className="font-medium">Organizer:</span>
                            <span>{event.organizer}</span>
                            {event.reminderSet && (
                              <Badge variant="secondary" className="ml-2">
                                <Bell className="h-3 w-3 mr-1" />
                                Reminder Set
                              </Badge>
                            )}
                          </div>

                          {event.notifications && event.notifications.length > 0 && (
                            <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                              <AlertCircle className="h-4 w-4" />
                              <span>{event.notifications.length} notification(s) sent</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 ml-4">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleViewDetails(event)}
                      >
                        Details
                      </Button>
                      {/* <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleSendNotification(event)}
                      >
                        <Bell className="h-4 w-4" />
                      </Button> */}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      <AddEventModal 
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={loadEvents}
      />

      {selectedEvent && (
        <>
          {selectedEvent && (
            <EventDetailModal
              eventId={selectedEvent.id}
              isOpen={isDetailModalOpen}
              onClose={() => {
                setIsDetailModalOpen(false);
                setSelectedEvent(null);
              }}
              onUpdate={loadEvents}
            />
          )}

          {/* <SendNotificationModal
            event={selectedEvent}
            isOpen={isNotificationModalOpen}
            onClose={() => {
              setIsNotificationModalOpen(false);
              setSelectedEvent(null);
            }}
          /> */}
        </>
      )}
    </div>
  );
};
