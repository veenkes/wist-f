import React, { useState, useMemo, useEffect } from 'react';
import { Plus, Search, User, BookOpen, MessageSquare, ThumbsUp, Award, Heart, Sparkles, ChevronRight, FileText } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { format } from 'date-fns';
import { ru, uz, enUS } from 'date-fns/locale';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';

import { useTheme } from '@/contexts/ThemeContext';
import { FinalReportModal } from '@/components/modals/FinalReportModal';
import { studentService } from '@/services/student.service';
import { localDB } from '@/lib/localDb';

const FALLBACK_SUBJECTS = ['Mathematics', 'English', 'Physics', 'Chemistry', 'History', 'Biology', 'Geography', 'Literature'];

type ReportType = 'praise' | 'recommendation' | 'behavior' | 'achievement';

interface Report {
  id: string;
  studentId: string;
  studentName: string;
  studentGroup: string;
  type: ReportType;
  subject: string;
  title: string;
  content: string;
  date: string;
  author: string;
  term: string;
}

export const Reports: React.FC = () => {
  const { t, language } = useTheme();
  const dateLocale = language === 'ru' ? ru : language === 'uz' ? uz : enUS;

  const [reports, setReports] = useState<Report[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [groupFilter, setGroupFilter] = useState('all');
  const [subjectFilter, setSubjectFilter] = useState('all');
  const [activeTab, setActiveTab] = useState('all');
  
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [newReport, setNewReport] = useState({ studentId: '', type: 'praise' as ReportType, subject: '', title: '', content: '' });
  const [isFinalReportOpen, setIsFinalReportOpen] = useState(false);

  const reportTypeConfig: Record<ReportType, { label: string; icon: React.ReactNode; color: string; bgColor: string }> = {
    praise: { label: t('reports.praise'), icon: <ThumbsUp className="w-4 h-4" />, color: 'text-success', bgColor: 'bg-success/10 border-success/20' },
    recommendation: { label: t('reports.recommendation'), icon: <BookOpen className="w-4 h-4" />, color: 'text-primary', bgColor: 'bg-primary/10 border-primary/20' },
    behavior: { label: t('reports.behavior'), icon: <Heart className="w-4 h-4" />, color: 'text-pink-500', bgColor: 'bg-pink-500/10 border-pink-500/20' },
    achievement: { label: t('reports.achievement'), icon: <Award className="w-4 h-4" />, color: 'text-warning', bgColor: 'bg-warning/10 border-warning/20' },
  };

  useEffect(() => {
    setReports(localDB.getReports() || []);
  }, []);

  const { data: realStudentsData } = useQuery({
    queryKey: ['students-list'],
    queryFn: () => studentService.listStudents({ limit: 2000 }),
    staleTime: 5 * 60 * 1000,
  });

  const students = useMemo(() => {
    const list = realStudentsData?.data || [];
    return list.map((s: any) => ({
      id: String(s.id),
      name: `${s.name ?? ''} ${s.surname ?? ''}`.trim() || s.full_name || 'Student',
      group: `${String(s.grade || '').toUpperCase()} ${s.className || s.class_name || ''}`.trim() || 'Unassigned',
    }));
  }, [realStudentsData]);

  const groups = useMemo(() => {
    const unique = new Set<string>();
    students.forEach(s => unique.add(s.group));
    return Array.from(unique).sort();
  }, [students]);

  const subjects = useMemo(() => {
    const lessons = (localDB.getLessons?.() || []) as any[];
    const set = new Set<string>();
    lessons.forEach((l) => {
      const subj = String(l.subject || '').trim();
      if (subj) set.add(subj);
    });
    const arr = Array.from(set);
    return arr.length ? arr.sort() : FALLBACK_SUBJECTS;
  }, []);

  const filteredReports = useMemo(() => {
    return reports.filter(r => {
      const matchesSearch = r.studentName.toLowerCase().includes(searchQuery.toLowerCase()) || r.title.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesGroup = groupFilter === 'all' || r.studentGroup === groupFilter;
      const matchesSubject = subjectFilter === 'all' || r.subject === subjectFilter;
      const matchesTab = activeTab === 'all' || r.type === activeTab;
      return matchesSearch && matchesGroup && matchesSubject && matchesTab;
    });
  }, [reports, searchQuery, groupFilter, subjectFilter, activeTab]);

  const stats = useMemo(() => ({
    total: reports.length,
    praise: reports.filter(r => r.type === 'praise').length,
    recommendation: reports.filter(r => r.type === 'recommendation').length,
    behavior: reports.filter(r => r.type === 'behavior').length,
    achievement: reports.filter(r => r.type === 'achievement').length,
  }), [reports]);

  const handleAddReport = () => {
    if (!newReport.studentId || !newReport.title || !newReport.content || !newReport.subject) {
      toast.error(t('reports.fillRequired')); 
      return; 
    }
    
    const student = students.find(s => s.id === newReport.studentId);
    if (!student) return;
    
    const reportPayload = {
      studentId: newReport.studentId,
      studentName: student.name,
      studentGroup: student.group,
      type: newReport.type,
      subject: newReport.subject,
      title: newReport.title,
      content: newReport.content,
      date: new Date().toISOString().split('T')[0],
      author: 'Teacher',
      term: 'Term 1',
    };

    const savedReport = localDB.saveReport(reportPayload);
    setReports(prev => [savedReport, ...prev]);
    setNewReport({ studentId: '', type: 'praise', subject: '', title: '', content: '' });
    setIsAddDialogOpen(false);
    toast.success(t('reports.saveSuccess'));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-success to-emerald-400 bg-clip-text text-transparent flex items-center gap-2">
            <Sparkles className="w-7 h-7 text-success" />
            {t('reports.title')}
          </h1>
          <p className="text-muted-foreground mt-1">{t('reports.subtitle')}</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setIsFinalReportOpen(true)} variant="outline" className="gap-2 border-primary text-primary hover:bg-primary/10 shadow-sm focus-visible:ring-primary/30">
            <FileText className="w-4 h-4" />{t('reports.finalReports')}
          </Button>
          <Button onClick={() => setIsAddDialogOpen(true)} className="bg-success hover:bg-success/90 text-success-foreground gap-2 shadow-md focus-visible:ring-success/30">
            <Plus className="w-4 h-4" />{t('reports.newReport')}
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <Card className="border-l-4 border-l-foreground">
          <CardContent className="p-3">
            <p className="text-xs text-muted-foreground">{t('common.total')}</p>
            <p className="text-2xl font-bold mt-0.5">{stats.total}</p>
          </CardContent>
        </Card>
        {(Object.keys(reportTypeConfig) as ReportType[]).map(type => {
          const config = reportTypeConfig[type];
          const borderColor = type === 'praise' ? 'border-l-success' : type === 'recommendation' ? 'border-l-primary' : type === 'behavior' ? 'border-l-pink-500' : 'border-l-warning';
          return (
            <Card key={type} className={`border-l-4 ${borderColor}`}>
              <CardContent className="p-3">
                <p className="text-xs text-muted-foreground">{config.label}</p>
                <p className={`text-2xl font-bold mt-0.5 ${config.color}`}>{stats[type]}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="all" className="text-xs focus-visible:ring-primary/30">{t('common.all')}</TabsTrigger>
          <TabsTrigger value="praise" className="text-xs gap-1 focus-visible:ring-primary/30"><ThumbsUp className="w-3 h-3" />{t('reports.praise')}</TabsTrigger>
          <TabsTrigger value="recommendation" className="text-xs gap-1 focus-visible:ring-primary/30"><BookOpen className="w-3 h-3" />{t('reports.recommendation')}</TabsTrigger>
          <TabsTrigger value="behavior" className="text-xs gap-1 focus-visible:ring-primary/30"><Heart className="w-3 h-3" />{t('reports.behavior')}</TabsTrigger>
          <TabsTrigger value="achievement" className="text-xs gap-1 focus-visible:ring-primary/30"><Award className="w-3 h-3" />{t('reports.achievement')}</TabsTrigger>
        </TabsList>

        <div className="flex flex-wrap gap-2 mt-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder={t('reports.searchPlaceholder')} 
              value={searchQuery} 
              onChange={e => setSearchQuery(e.target.value)} 
              className="pl-9 h-9 focus-visible:ring-primary/30" 
            />
          </div>
          <Select value={groupFilter} onValueChange={setGroupFilter}>
            <SelectTrigger className="w-[150px] h-9 focus:ring-primary/30"><SelectValue placeholder={t('students.gradeLabel')} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('common.allGrades')}</SelectItem>
              {groups.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={subjectFilter} onValueChange={setSubjectFilter}>
            <SelectTrigger className="w-[160px] h-9 focus:ring-primary/30"><SelectValue placeholder={t('common.category')} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('common.all')}</SelectItem>
              {subjects.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <TabsContent value={activeTab} className="mt-4 outline-none">
          <div className="space-y-3">
            {filteredReports.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <Sparkles className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
                  <p className="text-muted-foreground">{t('reports.noReports')}</p>
                </CardContent>
              </Card>
            ) : filteredReports.map(report => {
              const config = reportTypeConfig[report.type];
              return (
                <Card key={report.id} className={`border cursor-pointer hover:shadow-md transition-all duration-200 ${config.bgColor}`} onClick={() => setSelectedReport(report)}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${config.bgColor} ${config.color}`}>{config.icon}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <Badge variant="outline" className={`text-[10px] ${config.color} border-current/20`}>{config.label}</Badge>
                          <Badge variant="outline" className="text-[10px] bg-background/50">{report.subject}</Badge>
                          <span className="text-[10px] text-muted-foreground ml-auto">{format(new Date(report.date), 'dd MMM yyyy', { locale: dateLocale })}</span>
                        </div>
                        <h3 className="font-semibold text-sm mb-1">{report.title}</h3>
                        <p className="text-xs text-muted-foreground line-clamp-2">{report.content}</p>
                        <div className="flex items-center gap-3 mt-2 text-[11px] text-muted-foreground">
                          <span className="flex items-center gap-1"><User className="w-3 h-3" />{report.studentName}</span>
                          <span>{report.studentGroup}</span>
                          <span className="ml-auto">{t('reports.by')}: {report.author}</span>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground/50 shrink-0 mt-3" />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>

      {/* Detail Modal */}
      <Dialog open={!!selectedReport} onOpenChange={(open) => { if (!open) setSelectedReport(null); }}>
        <DialogContent className="max-w-lg p-0 overflow-hidden bg-background">
          {selectedReport && (() => {
            const config = reportTypeConfig[selectedReport.type];
            return (<>
              <DialogHeader className="p-6 border-b bg-card/50">
                <DialogTitle className="flex items-center gap-3 text-xl">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${config.bgColor} ${config.color}`}>
                    {config.icon}
                  </div>
                  <span className="leading-tight">{selectedReport.title}</span>
                </DialogTitle>
              </DialogHeader>
              <div className="p-6 space-y-5">
                <div className="flex flex-wrap gap-2">
                  <Badge className={`${config.bgColor} ${config.color} border-current/20 hover:bg-transparent`}>{config.label}</Badge>
                  <Badge variant="outline" className="bg-muted/50">{selectedReport.subject}</Badge>
                  <Badge variant="outline" className="bg-muted/50">{selectedReport.term}</Badge>
                </div>
                <div className="bg-muted/30 rounded-xl p-4 space-y-3 border border-border/50">
                  <div className="flex items-center justify-between text-sm"><span className="text-muted-foreground">{t('students.name')}</span><span className="font-semibold">{selectedReport.studentName}</span></div>
                  <div className="flex items-center justify-between text-sm"><span className="text-muted-foreground">{t('students.class')}</span><span>{selectedReport.studentGroup}</span></div>
                  <div className="flex items-center justify-between text-sm"><span className="text-muted-foreground">{t('common.date')}</span><span>{format(new Date(selectedReport.date), 'dd MMM yyyy', { locale: dateLocale })}</span></div>
                  <div className="flex items-center justify-between text-sm"><span className="text-muted-foreground">{t('reports.by')}</span><span>{selectedReport.author}</span></div>
                </div>
                <Separator />
                <div>
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5" />
                    {t('common.description')}
                  </Label>
                  <p className="text-sm leading-relaxed text-foreground whitespace-pre-wrap">{selectedReport.content}</p>
                </div>
              </div>
            </>);
          })()}
        </DialogContent>
      </Dialog>

      {/* Add Report Modal */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-lg p-0 overflow-hidden bg-background">
          <DialogHeader className="p-6 border-b bg-card/50">
            <DialogTitle className="flex items-center gap-3 text-xl">
              <div className="w-10 h-10 rounded-xl bg-success/15 flex items-center justify-center text-success">
                <Plus className="w-5 h-5" />
              </div>
              {t('reports.newReport')}
            </DialogTitle>
          </DialogHeader>
          <div className="p-6 space-y-5">
            <div className="space-y-3">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{t('reports.type')}</Label>
              <div className="grid grid-cols-2 gap-2">
                {(Object.keys(reportTypeConfig) as ReportType[]).map(type => {
                  const config = reportTypeConfig[type];
                  return (
                    <button 
                      key={type} 
                      onClick={() => setNewReport(prev => ({ ...prev, type }))}
                      className={`flex items-center gap-2 p-3 rounded-xl border text-sm transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 ${
                        newReport.type === type ? `${config.bgColor} ${config.color} font-medium border-current/30 shadow-sm` : 'border-border hover:border-muted-foreground/30 text-muted-foreground hover:bg-muted/30'
                      }`}
                    >
                      {config.icon}
                      <span>{config.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">{t('students.name')} *</Label>
                <Select value={newReport.studentId} onValueChange={v => setNewReport(prev => ({ ...prev, studentId: v }))}>
                  <SelectTrigger className="h-10 focus:ring-primary/30">
                    <SelectValue placeholder={t('common.searchPlaceholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    {students.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name} — {s.group}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">{t('common.category')} *</Label>
                <Select value={newReport.subject} onValueChange={v => setNewReport(prev => ({ ...prev, subject: v }))}>
                  <SelectTrigger className="h-10 focus:ring-primary/30">
                    <SelectValue placeholder={t('common.filter')} />
                  </SelectTrigger>
                  <SelectContent>
                    {subjects.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">{t('common.information')} *</Label>
              <Input 
                value={newReport.title} 
                onChange={e => setNewReport(prev => ({ ...prev, title: e.target.value }))} 
                placeholder="..." 
                className="h-10 focus-visible:ring-primary/30"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">{t('common.description')} *</Label>
              <Textarea 
                value={newReport.content} 
                onChange={e => setNewReport(prev => ({ ...prev, content: e.target.value }))} 
                placeholder="..."
                rows={5} 
                className="resize-none focus-visible:ring-primary/30" 
              />
            </div>

            <Button 
              onClick={handleAddReport} 
              className="w-full bg-success hover:bg-success/90 text-white font-semibold h-11 focus-visible:ring-success/30 shadow-sm"
            >
              <Plus className="w-4 h-4 mr-2" />
              {t('common.save')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <FinalReportModal open={isFinalReportOpen} onOpenChange={setIsFinalReportOpen} />
    </div>
  );
};

export default Reports;