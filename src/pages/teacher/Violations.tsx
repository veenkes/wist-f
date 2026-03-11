import React, { useState, useMemo, useEffect } from 'react';
import { Search, AlertCircle, Plus, Clock, MapPin, User, Calendar, ChevronRight, CheckCircle2, MessageCircleWarning } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format } from 'date-fns';
import { ru, uz, enUS } from 'date-fns/locale';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';

import { studentService } from '@/services/student.service';
import { localDB } from '@/lib/localDb';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

type ViolationCategory = 'C1' | 'C2' | 'C3' | 'C4' | 'C5';

interface Violation {
  id: string;
  studentName: string;
  studentId: string;
  studentGroup: string;
  date: string;
  time: string;
  type: string;
  category: ViolationCategory;
  description: string;
  location: string;
  status: 'pending' | 'resolved';
  reportedBy: string;
  involvedParties?: string;
  actionTaken?: string;
  preventiveMeasures?: string;
  studentResponse?: string;
  teacherComment?: string;
  hasEvidence: boolean;
}

interface Remark {
  id: string;
  studentName: string;
  studentGroup: string;
  studentId: string;
  date: string;
  remark: string;
  reportedBy: string;
}

export const Violations: React.FC = () => {
  const { t, language } = useTheme();
  const { user } = useAuth(); // ДОСТАЕМ ТЕКУЩЕГО УЧИТЕЛЯ
  const dateLocale = language === 'ru' ? ru : language === 'uz' ? uz : enUS;

  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [activeTab, setActiveTab] = useState('violations');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isRemarkDialogOpen, setIsRemarkDialogOpen] = useState(false);
  const [selectedViolation, setSelectedViolation] = useState<Violation | null>(null);

  const [violations, setViolations] = useState<Violation[]>([]);
  const [remarks, setRemarks] = useState<Remark[]>([]);

  // Категории теперь используют переводы из ThemeContext
  const categoryDescriptions: Record<ViolationCategory, { label: string; description: string; color: string }> = useMemo(() => ({
    C1: { label: t('violations.c1'), description: t('violations.c1Desc'), color: 'bg-blue-500/10 text-blue-600 border-blue-500/20' },
    C2: { label: t('violations.c2'), description: t('violations.c2Desc'), color: 'bg-green-500/10 text-green-600 border-green-500/20' },
    C3: { label: t('violations.c3'), description: t('violations.c3Desc'), color: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
    C4: { label: t('violations.c4'), description: t('violations.c4Desc'), color: 'bg-orange-500/10 text-orange-600 border-orange-500/20' },
    C5: { label: t('violations.c5'), description: t('violations.c5Desc'), color: 'bg-destructive/10 text-destructive border-destructive/20' },
  }), [t]);

  useEffect(() => {
    setViolations(localDB.getViolations() || []);
    setRemarks(localDB.getRemarks() || []);
  }, []);

  const { data: realStudentsData } = useQuery({
    queryKey: ['students-list'],
    queryFn: () => studentService.listStudents({ limit: 1000 }),
    staleTime: 5 * 60 * 1000,
  });

  const students = useMemo(() => {
    const list = realStudentsData?.data || [];
    return list.map((s: any) => ({
      id: String(s.id),
      name: `${s.name ?? ''} ${s.surname ?? ''}`.trim() || s.full_name || t('common.student'),
      group: `${String(s.grade || '').toUpperCase()} ${s.className || s.class_name || ''}`.trim() || t('common.notSpecified'),
    }));
  }, [realStudentsData, t]);

  const [newViol, setNewViol] = useState<Partial<Violation>>({
    studentId: '', category: 'C1', type: '', location: '', date: format(new Date(), 'yyyy-MM-dd'), time: format(new Date(), 'HH:mm'),
    description: '', involvedParties: '', actionTaken: '', preventiveMeasures: '', hasEvidence: false
  });

  const [newRem, setNewRem] = useState<Partial<Remark>>({ studentId: '', remark: '' });

  const filteredViolations = violations.filter(violation => {
    const matchesSearch = violation.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          violation.type.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || violation.category === categoryFilter;
    const matchesStatus = statusFilter === 'all' || violation.status === statusFilter;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const getCategoryConfig = (category: ViolationCategory) => categoryDescriptions[category] || categoryDescriptions.C1;
  
  const getStatusConfig = (status: string) => {
    return status === 'resolved' 
      ? { color: 'bg-success/10 text-success border-success/20', label: t('violations.resolved'), icon: CheckCircle2 }
      : { color: 'bg-warning/10 text-warning border-warning/20', label: t('violations.pending'), icon: Clock };
  };

  const formatDate = (dateStr: string) => {
    try { return format(new Date(dateStr), 'd MMMM yyyy', { locale: dateLocale }); } catch { return dateStr; }
  };

  const stats = useMemo(() => ({
    total: violations.length,
    pending: violations.filter(v => v.status === 'pending').length,
    resolved: violations.filter(v => v.status === 'resolved').length,
    byCategory: {
      C1: violations.filter(v => v.category === 'C1').length,
      C2: violations.filter(v => v.category === 'C2').length,
      C3: violations.filter(v => v.category === 'C3').length,
      C4: violations.filter(v => v.category === 'C4').length,
      C5: violations.filter(v => v.category === 'C5').length,
    }
  }), [violations]);

  const handleAddRemark = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRem.studentId || !newRem.remark) return toast.error(t('errors.allFieldsRequired'));
    
    const student = students.find(s => s.id === newRem.studentId);
    if (!student) return;

    const payload = {
      studentId: student.id,
      studentName: student.name,
      studentGroup: student.group,
      date: new Date().toISOString(),
      remark: newRem.remark,
      reportedBy: user?.name || t('employees.roles.teacher') // ПОДСТАНОВКА ИМЕНИ
    };

    const saved = localDB.saveRemark(payload);
    setRemarks(prev => [saved, ...prev]);
    setIsRemarkDialogOpen(false);
    setNewRem({ studentId: '', remark: '' });
    toast.success(t('toast.success.created'));
  };

  const handleAddViolation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newViol.studentId || !newViol.type || !newViol.description) return toast.error(t('errors.allFieldsRequired'));

    const student = students.find(s => s.id === newViol.studentId);
    if (!student) return;

    const payload: Omit<Violation, 'id'> = {
      studentId: student.id,
      studentName: student.name,
      studentGroup: student.group,
      date: newViol.date || format(new Date(), 'yyyy-MM-dd'),
      time: newViol.time || format(new Date(), 'HH:mm'),
      type: newViol.type,
      category: newViol.category as ViolationCategory || 'C1',
      description: newViol.description,
      location: newViol.location || '',
      status: 'pending',
      reportedBy: user?.name || t('employees.roles.teacher'), // ПОДСТАНОВКА ИМЕНИ
      involvedParties: newViol.involvedParties,
      actionTaken: newViol.actionTaken,
      preventiveMeasures: newViol.preventiveMeasures,
      hasEvidence: newViol.hasEvidence || false
    };

    const saved = localDB.saveViolation(payload);
    setViolations(prev => [saved, ...prev]);
    setIsAddDialogOpen(false);
    setNewViol({ studentId: '', category: 'C1', type: '', location: '', date: format(new Date(), 'yyyy-MM-dd'), time: format(new Date(), 'HH:mm'), description: '', involvedParties: '', actionTaken: '', preventiveMeasures: '', hasEvidence: false });
    toast.success(t('toast.success.created'));
  };

  const handleResolveViolation = () => {
    if (!selectedViolation) return;
    localDB.updateViolation(selectedViolation.id, { status: 'resolved' });
    setViolations(prev => prev.map(v => v.id === selectedViolation.id ? { ...v, status: 'resolved' } : v));
    setSelectedViolation(null);
    toast.success(t('toast.success.updated'));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            {t('violations.title')}
          </h1>
          <p className="text-muted-foreground mt-1">{t('violations.subtitle')}</p>
        </div>
        <div className="flex gap-2">
          
          {/* Remark Modal */}
          <Dialog open={isRemarkDialogOpen} onOpenChange={setIsRemarkDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2 focus-visible:ring-primary/30">
                <MessageCircleWarning className="w-4 h-4" />
                {t('violations.newRemark')}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t('violations.newRemark')}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAddRemark} className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>{t('common.student')} *</Label>
                  <Select value={newRem.studentId} onValueChange={v => setNewRem(prev => ({ ...prev, studentId: v }))}>
                    <SelectTrigger className="focus:ring-primary/30">
                      <SelectValue placeholder={t('common.searchPlaceholder')} />
                    </SelectTrigger>
                    <SelectContent>
                      {students.map(s => <SelectItem key={s.id} value={s.id}>{s.name} ({s.group})</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t('violations.remarkText')} *</Label>
                  <Textarea 
                    value={newRem.remark} onChange={e => setNewRem(prev => ({ ...prev, remark: e.target.value }))}
                    placeholder="..." rows={3} className="resize-none focus-visible:ring-primary/30" 
                  />
                </div>
                <Button type="submit" className="w-full focus-visible:ring-primary/30">{t('common.add')}</Button>
              </form>
            </DialogContent>
          </Dialog>

          {/* Violation Modal */}
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 focus-visible:ring-primary/30">
                <Plus className="w-4 h-4" />
                {t('violations.newViolation')}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col p-0 bg-background">
              <DialogHeader className="p-6 border-b shrink-0">
                <DialogTitle>{t('violations.newViolation')}</DialogTitle>
              </DialogHeader>
              
              <div className="overflow-y-auto flex-1 p-6 custom-scrollbar">
                <form onSubmit={handleAddViolation} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>{t('common.student')} *</Label>
                      <Select value={newViol.studentId} onValueChange={v => setNewViol(prev => ({ ...prev, studentId: v }))}>
                        <SelectTrigger className="focus:ring-primary/30">
                          <SelectValue placeholder={t('common.searchPlaceholder')} />
                        </SelectTrigger>
                        <SelectContent>
                          {students.map(s => <SelectItem key={s.id} value={s.id}>{s.name} ({s.group})</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>{t('common.category')} (C1-C5) *</Label>
                      <Select value={newViol.category} onValueChange={v => setNewViol(prev => ({ ...prev, category: v as ViolationCategory }))}>
                        <SelectTrigger className="focus:ring-primary/30">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(categoryDescriptions).map(([key, value]) => (
                            <SelectItem key={key} value={key}>
                              <div>
                                <span className="font-medium">{value.label}</span>
                                <span className="text-xs text-muted-foreground ml-2">{value.description}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>{t('events.type')} *</Label>
                      <Select value={newViol.type} onValueChange={v => setNewViol(prev => ({ ...prev, type: v }))}>
                        <SelectTrigger className="focus:ring-primary/30">
                          <SelectValue placeholder="..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={t('violations.types.lateness')}>{t('violations.types.lateness')}</SelectItem>
                          <SelectItem value={t('violations.types.discipline')}>{t('violations.types.discipline')}</SelectItem>
                          <SelectItem value={t('violations.types.truancy')}>{t('violations.types.truancy')}</SelectItem>
                          <SelectItem value={t('violations.types.phone')}>{t('violations.types.phone')}</SelectItem>
                          <SelectItem value={t('violations.types.conflict')}>{t('violations.types.conflict')}</SelectItem>
                          <SelectItem value={t('violations.types.vandalism')}>{t('violations.types.vandalism')}</SelectItem>
                          <SelectItem value={t('violations.types.other')}>{t('violations.types.other')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>{t('violations.location')}</Label>
                      <Input value={newViol.location} onChange={e => setNewViol(prev => ({ ...prev, location: e.target.value }))} placeholder="..." className="focus-visible:ring-primary/30" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>{t('common.date')}</Label>
                      <Input type="date" value={newViol.date} onChange={e => setNewViol(prev => ({ ...prev, date: e.target.value }))} className="focus-visible:ring-primary/30" />
                    </div>
                    <div className="space-y-2">
                      <Label>{t('common.time')}</Label>
                      <Input type="time" value={newViol.time} onChange={e => setNewViol(prev => ({ ...prev, time: e.target.value }))} className="focus-visible:ring-primary/30" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>{t('violations.incidentDesc')} *</Label>
                    <Textarea value={newViol.description} onChange={e => setNewViol(prev => ({ ...prev, description: e.target.value }))} placeholder="..." rows={3} className="resize-none focus-visible:ring-primary/30" />
                  </div>

                  <div className="space-y-2">
                    <Label>{t('violations.actionTaken')}</Label>
                    <Textarea value={newViol.actionTaken} onChange={e => setNewViol(prev => ({ ...prev, actionTaken: e.target.value }))} placeholder="..." rows={2} className="resize-none focus-visible:ring-primary/30" />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>{t('violations.involved')}</Label>
                    <Input value={newViol.involvedParties} onChange={e => setNewViol(prev => ({ ...prev, involvedParties: e.target.value }))} placeholder="..." className="focus-visible:ring-primary/30" />
                  </div>
                </form>
              </div>

              <div className="p-6 border-t bg-muted/10 flex gap-2 shrink-0">
                <Button variant="outline" className="flex-1 focus-visible:ring-primary/30" onClick={() => setIsAddDialogOpen(false)}>{t('common.cancel')}</Button>
                <Button className="flex-[2] focus-visible:ring-primary/30" onClick={handleAddViolation}>{t('common.save')}</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {(Object.keys(categoryDescriptions) as ViolationCategory[]).map((key) => {
          const value = categoryDescriptions[key];
          return (
            <Card 
              key={key} 
              className={`p-3 cursor-pointer transition-all hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 ${categoryFilter === key ? 'ring-2 ring-primary' : ''}`}
              onClick={() => setCategoryFilter(categoryFilter === key ? 'all' : key)}
              tabIndex={0}
            >
              <div className="text-xl font-bold">{stats.byCategory[key]}</div>
              <div className="text-xs text-muted-foreground">{key}</div>
              <Badge className={`text-xs mt-1 shadow-none border-0 ${value.color}`}>{value.label.split(' - ')[1] || value.label}</Badge>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card className="p-4 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
          <div className="text-2xl font-bold text-primary">{stats.total}</div>
          <div className="text-sm text-muted-foreground">{t('violations.totalViolations')}</div>
        </Card>
        <Card className="p-4 bg-gradient-to-br from-warning/5 to-warning/10 border-warning/20">
          <div className="text-2xl font-bold text-warning">{stats.pending}</div>
          <div className="text-sm text-muted-foreground">{t('violations.pending')}</div>
        </Card>
        <Card className="p-4 bg-gradient-to-br from-success/5 to-success/10 border-success/20">
          <div className="text-2xl font-bold text-success">{stats.resolved}</div>
          <div className="text-sm text-muted-foreground">{t('violations.resolved')}</div>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-muted/50 p-1 rounded-xl">
          <TabsTrigger value="violations" className="px-6 focus-visible:ring-primary/30">{t('nav.incidents')} ({violations.length})</TabsTrigger>
          <TabsTrigger value="remarks" className="px-6 focus-visible:ring-primary/30">{t('nav.reports')} ({remarks.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="violations" className="space-y-4 outline-none pt-4">
          <Card className="p-4 border-dashed shadow-none">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder={t('common.searchPlaceholder')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 focus-visible:ring-primary/30"
                />
              </div>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-[160px] focus:ring-primary/30">
                  <SelectValue placeholder={t('common.category')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('common.allCategories')}</SelectItem>
                  {Object.entries(categoryDescriptions).map(([key, value]) => (
                    <SelectItem key={key} value={key}>{value.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[160px] focus:ring-primary/30">
                  <SelectValue placeholder={t('common.status')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('common.allStatus')}</SelectItem>
                  <SelectItem value="pending">{t('violations.pending')}</SelectItem>
                  <SelectItem value="resolved">{t('violations.resolved')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </Card>

          <div className="space-y-3">
            {filteredViolations.map((violation) => {
              const categoryConfig = getCategoryConfig(violation.category);
              const statusConfig = getStatusConfig(violation.status);
              const StatusIcon = statusConfig.icon;

              return (
                <Card 
                  key={violation.id} 
                  className="p-4 hover:shadow-md transition-all cursor-pointer border-l-4 group"
                  style={{ borderLeftColor: violation.category === 'C5' ? 'hsl(var(--destructive))' : 'inherit' }}
                  onClick={() => setSelectedViolation(violation)}
                  tabIndex={0}
                >
                  <div className="flex items-start gap-4">
                    <div className={cn("p-2 rounded-lg shrink-0", categoryConfig.color)}>
                      <AlertCircle className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="font-bold text-sm group-hover:text-primary transition-colors">{violation.studentName}</h3>
                          <p className="text-xs text-muted-foreground">{violation.studentGroup}</p>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <Badge className={cn("shadow-none border-0 text-[10px]", categoryConfig.color)}>{violation.category}</Badge>
                          <Badge className={cn("shadow-none border-0 text-[10px]", statusConfig.color)}>
                            <StatusIcon className="w-3 h-3 mr-1" />
                            {statusConfig.label}
                          </Badge>
                        </div>
                      </div>
                      <p className="text-sm font-medium mt-2">{violation.type}</p>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{violation.description}</p>
                      <div className="flex flex-wrap items-center gap-4 mt-2 text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatDate(violation.date)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {violation.time}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {violation.location}
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground mt-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </Card>
              );
            })}

            {filteredViolations.length === 0 && (
              <Card className="p-12 text-center border-dashed shadow-none">
                <AlertCircle className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-lg font-semibold mb-2">{t('violations.noViolations')}</h3>
                <p className="text-muted-foreground">{t('employees.tryAdjustingFilters')}</p>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="remarks" className="space-y-4 outline-none pt-4">
          <div className="space-y-3">
            {remarks.length === 0 && (
              <Card className="p-12 text-center border-dashed shadow-none">
                <MessageCircleWarning className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground">{t('violations.noRemarks')}</p>
              </Card>
            )}
            {remarks.map((remark) => (
              <Card key={remark.id} className="p-4 border-l-4 border-l-muted">
                <div className="flex items-start gap-4">
                  <div className="p-2 rounded-lg bg-muted shrink-0">
                    <MessageCircleWarning className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-bold text-sm">{remark.studentName}</h3>
                        <p className="text-xs text-muted-foreground">{remark.studentGroup}</p>
                      </div>
                      <span className="text-[10px] text-muted-foreground">{formatDate(remark.date)}</span>
                    </div>
                    <p className="text-sm mt-2 italic text-muted-foreground">"{remark.remark}"</p>
                    <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground mt-2">{t('reports.by')}: {remark.reportedBy}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Violation Detail Modal */}
      <Dialog open={!!selectedViolation} onOpenChange={(open) => !open && setSelectedViolation(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0 overflow-hidden bg-background">
          {selectedViolation && (() => {
            const sCfg = getStatusConfig(selectedViolation.status);
            return (
            <>
              <DialogHeader className="p-6 border-b shrink-0 bg-muted/30">
                <DialogTitle className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-primary" />
                  {t('violations.details')}
                </DialogTitle>
              </DialogHeader>
              <div className="overflow-y-auto flex-1 p-6 space-y-5 custom-scrollbar">
                
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-xl">{selectedViolation.studentName}</h3>
                    <p className="text-sm text-muted-foreground">{selectedViolation.studentGroup}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    <Badge className={cn("shadow-none border-0", getCategoryConfig(selectedViolation.category).color)}>
                      {getCategoryConfig(selectedViolation.category).label}
                    </Badge>
                    <Badge className={cn("shadow-none border-0", sCfg.color)}>
                      {sCfg.label}
                    </Badge>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 p-4 rounded-xl border bg-muted/30">
                  <div>
                    <Label className="text-[10px] uppercase font-bold text-muted-foreground">{t('events.type')}</Label>
                    <p className="font-medium text-sm mt-0.5">{selectedViolation.type}</p>
                  </div>
                  <div>
                    <Label className="text-[10px] uppercase font-bold text-muted-foreground">{t('violations.location')}</Label>
                    <p className="font-medium text-sm mt-0.5">{selectedViolation.location || '—'}</p>
                  </div>
                  <div>
                    <Label className="text-[10px] uppercase font-bold text-muted-foreground">{t('common.date')} & {t('common.time')}</Label>
                    <p className="font-medium text-sm mt-0.5">{formatDate(selectedViolation.date)} {selectedViolation.time}</p>
                  </div>
                  <div>
                    <Label className="text-[10px] uppercase font-bold text-muted-foreground">{t('violations.reportedBy')}</Label>
                    <p className="font-medium text-sm mt-0.5">{selectedViolation.reportedBy}</p>
                  </div>
                </div>

                <div>
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 block">{t('common.description')}</Label>
                  <div className="p-4 rounded-xl border bg-card/50 text-sm leading-relaxed whitespace-pre-wrap">{selectedViolation.description}</div>
                </div>

                {selectedViolation.involvedParties && (
                  <div>
                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1 block">{t('violations.involved')}</Label>
                    <p className="text-sm text-muted-foreground">{selectedViolation.involvedParties}</p>
                  </div>
                )}

                {selectedViolation.actionTaken && (
                  <div>
                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 block">{t('violations.actionTaken')}</Label>
                    <p className="text-sm bg-primary/5 p-3 rounded-lg border border-primary/10">{selectedViolation.actionTaken}</p>
                  </div>
                )}

                {selectedViolation.preventiveMeasures && (
                  <div>
                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1 block">{t('violations.preventiveMeasures')}</Label>
                    <p className="text-sm">{selectedViolation.preventiveMeasures}</p>
                  </div>
                )}

                {selectedViolation.studentResponse && (
                  <div className="p-4 bg-warning/5 rounded-xl border border-warning/20">
                    <Label className="text-xs font-bold uppercase text-warning-foreground mb-1 block">{t('violations.studentResponse')}</Label>
                    <p className="text-sm italic leading-relaxed">"{selectedViolation.studentResponse}"</p>
                  </div>
                )}

              </div>

              <div className="p-6 border-t bg-muted/10 flex gap-2 shrink-0">
                {selectedViolation.status === 'pending' && (
                  <Button 
                    className="flex-1 bg-success hover:bg-success/90 text-white focus-visible:ring-success/30 font-bold h-11"
                    onClick={handleResolveViolation}
                  >
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    {t('violations.markResolved')}
                  </Button>
                )}
                <Button variant="outline" className="flex-1 focus-visible:ring-primary/30 h-11" onClick={() => setSelectedViolation(null)}>
                  {t('common.close')}
                </Button>
              </div>
            </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Violations;