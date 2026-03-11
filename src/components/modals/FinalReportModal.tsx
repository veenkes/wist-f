import React, { useState, useMemo, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';
import { studentService } from '@/services/student.service';
import { localDB } from '@/lib/localDb';
import { useTheme } from '@/contexts/ThemeContext';
import {
  FileText, Plus, Star, TrendingUp, TrendingDown, Minus, User, BookOpen, Heart,
  Award, Target, MessageSquare, Trophy, Users, Lightbulb, Shield, Smile, Brain,
  CheckCircle, Trash2, GraduationCap, Sparkles
} from 'lucide-react';
import { toast } from 'sonner';

const FALLBACK_SUBJECTS = ['Mathematics', 'English', 'Physics', 'Chemistry', 'History', 'Biology', 'Geography', 'Literature'];

type OverallTrend = 'improving' | 'stable' | 'declining';

interface SubjectEntry {
  subject: string;
  grade: string;
  effort: string;
  comment: string;
}

interface FinalReportData {
  studentId: string;
  period: string;
  academicYear: string;
  overallComment: string;
  behaviourComment: string;
  strengthsComment: string;
  areasToImprove: string;
  goalsForNext: string;
  attendanceSummary: string;
  overallTrend: OverallTrend;
  subjects: SubjectEntry[];
  extracurriculars: string;
  socialEmotional: string;
  teacherRecommendations: string;
  parentGuidance: string;
  leadershipComment: string;
  homeworkConsistency: string;
  readingLevel: string;
  examReadiness: string;
  specialAchievements: string;
}

const emptyReport: FinalReportData = {
  studentId: '', period: '', academicYear: '2024-2025',
  overallComment: '', behaviourComment: '', strengthsComment: '',
  areasToImprove: '', goalsForNext: '', attendanceSummary: '',
  overallTrend: 'stable', subjects: [],
  extracurriculars: '', socialEmotional: '', teacherRecommendations: '',
  parentGuidance: '', leadershipComment: '', homeworkConsistency: '',
  readingLevel: '', examReadiness: '', specialAchievements: '',
};

interface FinalReportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const FinalReportModal: React.FC<FinalReportModalProps> = ({ open, onOpenChange }) => {
  const { t } = useTheme();
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [report, setReport] = useState<FinalReportData>({ ...emptyReport });
  const [currentSubject, setCurrentSubject] = useState({ subject: '', grade: '', effort: 'good', comment: '' });

  const trendConfig: Record<OverallTrend, { label: string; icon: React.ReactNode; color: string }> = {
    improving: { label: t('reports.praise'), icon: <TrendingUp className="w-4 h-4" />, color: 'text-success' },
    stable: { label: 'Stable', icon: <Minus className="w-4 h-4" />, color: 'text-primary' },
    declining: { label: t('reports.behavior'), icon: <TrendingDown className="w-4 h-4" />, color: 'text-destructive' },
  };

  const effortOptions = [
    { value: 'outstanding', label: 'Outstanding', color: 'text-success' },
    { value: 'good', label: 'Good', color: 'text-primary' },
    { value: 'satisfactory', label: 'Satisfactory', color: 'text-warning' },
    { value: 'needs_improvement', label: 'Needs Improvement', color: 'text-destructive' },
  ];

  const { data: realStudentsData } = useQuery({
    queryKey: ['students-list'],
    queryFn: () => studentService.listStudents({ limit: 1000 }),
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

  const selectedStudent = students.find(s => s.id === report.studentId);
  const totalSteps = 5;

  useEffect(() => {
    if (step === 2 && report.studentId && report.period && report.subjects.length === 0) {
      try {
        const autoSubjects: SubjectEntry[] = [];
        if (report.period === 'Annual') {
          const yearG = JSON.parse(localStorage.getItem('grades:year:v1') || '{}')[report.studentId] || {};
          Object.keys(yearG).forEach(subj => autoSubjects.push({ subject: subj, grade: yearG[subj], effort: 'good', comment: '' }));
        } else {
          const termG = JSON.parse(localStorage.getItem('grades:term:v1') || '{}')[report.studentId] || {};
          Object.keys(termG).forEach(key => {
            if (key.endsWith(`-${report.period}`)) {
              const subj = key.split('-')[0];
              autoSubjects.push({ subject: subj, grade: termG[key], effort: 'good', comment: '' });
            }
          });
        }
        if (autoSubjects.length > 0) {
          setReport(prev => ({ ...prev, subjects: autoSubjects }));
          toast.success(t('final.autoLoaded'));
        }
      } catch (e) { console.error(e); }
    }
  }, [step, report.studentId, report.period, t]);

  const addSubject = () => {
    if (!currentSubject.subject || !currentSubject.grade) { toast.error(t('reports.fillRequired')); return; }
    setReport(prev => {
      const existingIdx = prev.subjects.findIndex(s => s.subject === currentSubject.subject);
      const updatedSubjects = [...prev.subjects];
      if (existingIdx > -1) {
        updatedSubjects[existingIdx] = { ...currentSubject };
      } else {
        updatedSubjects.push({ ...currentSubject });
      }
      return { ...prev, subjects: updatedSubjects };
    });
    setCurrentSubject({ subject: '', grade: '', effort: 'good', comment: '' });
  };

  const removeSubject = (subject: string) => {
    setReport(prev => ({ ...prev, subjects: prev.subjects.filter(s => s.subject !== subject) }));
  };

  const handleSubmit = () => {
    if (!report.studentId || !report.period || !report.overallComment) { toast.error(t('reports.fillRequired')); return; }
    if (localDB.saveFinalReport) { localDB.saveFinalReport(report); }
    toast.success(t('reports.saveSuccess'));
    setReport({ ...emptyReport });
    setStep(1);
    onOpenChange(false);
  };

  const reset = () => { setReport({ ...emptyReport }); setStep(1); };

  const StudentBanner = () => selectedStudent ? (
    <div className="flex items-center gap-2 p-3 bg-muted/30 border border-border/50 rounded-xl text-sm mb-4 shrink-0">
      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
        <User className="w-4 h-4" />
      </div>
      <div className="flex flex-col min-w-0">
        <span className="font-semibold text-foreground truncate">{selectedStudent.name}</span>
        <div className="flex gap-2 text-xs text-muted-foreground mt-0.5">
          <span>{selectedStudent.group}</span>
          {report.period && <span>• {report.period}</span>}
        </div>
      </div>
    </div>
  ) : null;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent className="max-w-2xl w-full h-[90vh] max-h-[90vh] flex flex-col p-0 overflow-hidden bg-background">
        <DialogHeader className="p-6 border-b bg-card/50 flex-shrink-0">
          <DialogTitle className="flex items-center gap-3 text-xl">
            <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center text-primary">
              <FileText className="w-5 h-5" />
            </div>
            {t('final.newReport')}
          </DialogTitle>
        </DialogHeader>

        <div className="px-6 pt-4 pb-2 space-y-1.5 flex-shrink-0">
          <div className="flex items-center gap-2">
            {Array.from({ length: totalSteps }, (_, i) => (
              <button key={i} onClick={() => setStep((i + 1) as any)} className={`flex-1 h-1.5 rounded-full transition-all duration-300 ${step >= i + 1 ? 'bg-primary' : 'bg-muted'}`} />
            ))}
          </div>
          <p className="text-xs font-medium text-muted-foreground">{t('final.step', { current: step, total: totalSteps })}</p>
        </div>

        <div className="flex-1 overflow-y-auto px-6 pb-6 pt-2 custom-scrollbar">
          {step === 1 && (
            <div className="space-y-5 outline-none pb-2">
              <div className="space-y-2">
                <Label className="text-sm font-medium">{t('final.student')} *</Label>
                <Select value={report.studentId} onValueChange={v => setReport(prev => ({ ...prev, studentId: v }))}>
                  <SelectTrigger className="h-10"><SelectValue placeholder={t('common.searchPlaceholder')} /></SelectTrigger>
                  <SelectContent>{students.map(s => <SelectItem key={s.id} value={s.id}>{s.name} — {s.group}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">{t('final.period')} *</Label>
                  <Select value={report.period} onValueChange={v => setReport(prev => ({ ...prev, period: v }))}>
                    <SelectTrigger className="h-10"><SelectValue placeholder={t('common.filter')} /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Term 1">Term 1</SelectItem><SelectItem value="Term 2">Term 2</SelectItem>
                      <SelectItem value="Term 3">Term 3</SelectItem><SelectItem value="Annual">Annual Report</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">{t('final.year')}</Label>
                  <Select value={report.academicYear} onValueChange={v => setReport(prev => ({ ...prev, academicYear: v }))}>
                    <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="2024-2025">2024-2025</SelectItem><SelectItem value="2025-2026">2025-2026</SelectItem></SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-3">
                <Label className="text-sm font-medium">{t('final.trend')}</Label>
                <div className="grid grid-cols-3 gap-3">
                  {(Object.keys(trendConfig) as OverallTrend[]).map(trend => {
                    const cfg = trendConfig[trend];
                    return (
                      <button key={trend} onClick={() => setReport(prev => ({ ...prev, overallTrend: trend }))} 
                        className={`flex flex-col items-center justify-center gap-2 p-3 rounded-xl border text-sm transition-all ${report.overallTrend === trend ? `bg-primary/5 border-primary ${cfg.color} font-medium` : 'border-border text-muted-foreground'}`}>
                        {cfg.icon}<span>{cfg.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5 text-sm font-medium"><Target className="w-4 h-4 text-muted-foreground" />{t('final.attendance')}</Label>
                <Input value={report.attendanceSummary} onChange={e => setReport(prev => ({ ...prev, attendanceSummary: e.target.value }))} className="h-10" />
              </div>
              <Button onClick={() => setStep(2)} className="w-full h-11" disabled={!report.studentId || !report.period}>{t('common.next')} →</Button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5 outline-none pb-2">
              <StudentBanner />
              <div className="p-5 border border-dashed border-border rounded-xl space-y-4 bg-muted/10">
                <Label className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5"><Plus className="w-4 h-4" />{t('final.addUpdate')}</Label>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <Select value={currentSubject.subject} onValueChange={v => setCurrentSubject(prev => ({ ...prev, subject: v }))}>
                    <SelectTrigger className="h-10"><SelectValue placeholder={t('final.subject')} /></SelectTrigger>
                    <SelectContent>{subjects.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                  <Select value={currentSubject.grade} onValueChange={v => setCurrentSubject(prev => ({ ...prev, grade: v }))}>
                    <SelectTrigger className="h-10"><SelectValue placeholder={t('final.grade')} /></SelectTrigger>
                    <SelectContent>{['A*', 'A', 'B', 'C', 'D', 'E', 'F'].map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
                  </Select>
                  <Select value={currentSubject.effort} onValueChange={v => setCurrentSubject(prev => ({ ...prev, effort: v }))}>
                    <SelectTrigger className="h-10"><SelectValue placeholder={t('final.effort')} /></SelectTrigger>
                    <SelectContent>{effortOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                  </Select>
                  <Button size="sm" onClick={addSubject} className="h-10 w-full gap-2"><Plus className="w-4 h-4" />{t('common.add')}</Button>
                </div>
                <Input value={currentSubject.comment} onChange={e => setCurrentSubject(prev => ({ ...prev, comment: e.target.value }))} placeholder={t('final.comment')} className="h-10" />
              </div>
              <div className="space-y-2">
                {report.subjects.map(s => (
                  <div key={s.subject} className="flex items-start gap-3 p-4 bg-card border border-border/50 rounded-xl shadow-sm group">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary flex-shrink-0"><BookOpen className="w-5 h-5" /></div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-foreground text-sm">{s.subject}</span>
                        <Badge className="bg-primary/10 text-primary border-primary/20 text-xs">{s.grade}</Badge>
                      </div>
                      {s.comment && <p className="text-sm text-muted-foreground mt-1 line-clamp-2 leading-relaxed">{s.comment}</p>}
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => removeSubject(s.subject)} className="text-muted-foreground hover:text-destructive"><Trash2 className="w-4 h-4" /></Button>
                  </div>
                ))}
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep(1)} className="flex-1 h-11">← {t('common.back')}</Button>
                <Button onClick={() => setStep(3)} className="flex-1 h-11">{t('common.next')} →</Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-5 outline-none pb-2">
              <StudentBanner />
              <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center gap-1.5"><MessageSquare className="w-4 h-4 text-primary" />{t('final.academicAssessment')} *</Label>
                <Textarea value={report.overallComment} onChange={e => setReport(prev => ({ ...prev, overallComment: e.target.value }))} rows={4} className="resize-none" />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center gap-1.5"><Heart className="w-4 h-4 text-pink-500" />{t('final.behaviour')}</Label>
                <Textarea value={report.behaviourComment} onChange={e => setReport(prev => ({ ...prev, behaviourComment: e.target.value }))} rows={3} className="resize-none" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium flex items-center gap-1.5"><Star className="w-4 h-4 text-warning" />{t('final.strengths')}</Label>
                  <Textarea value={report.strengthsComment} onChange={e => setReport(prev => ({ ...prev, strengthsComment: e.target.value }))} rows={3} className="resize-none" />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium flex items-center gap-1.5"><Target className="w-4 h-4 text-destructive" />{t('final.areasToImprove')}</Label>
                  <Textarea value={report.areasToImprove} onChange={e => setReport(prev => ({ ...prev, areasToImprove: e.target.value }))} rows={3} className="resize-none" />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center gap-1.5"><Award className="w-4 h-4 text-success" />{t('final.goals')}</Label>
                <Textarea value={report.goalsForNext} onChange={e => setReport(prev => ({ ...prev, goalsForNext: e.target.value }))} rows={3} className="resize-none" />
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep(2)} className="flex-1 h-11">← {t('common.back')}</Button>
                <Button onClick={() => setStep(4)} className="flex-1 h-11">{t('common.next')} →</Button>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-5 outline-none pb-2">
              <StudentBanner />
              <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center gap-1.5"><Trophy className="w-4 h-4 text-warning" />{t('final.achievements')}</Label>
                <Textarea value={report.specialAchievements} onChange={e => setReport(prev => ({ ...prev, specialAchievements: e.target.value }))} rows={2} className="resize-none" />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center gap-1.5"><Users className="w-4 h-4 text-primary" />{t('final.extracurricular')}</Label>
                <Textarea value={report.extracurriculars} onChange={e => setReport(prev => ({ ...prev, extracurriculars: e.target.value }))} rows={2} className="resize-none" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium flex items-center gap-1.5"><Smile className="w-4 h-4 text-success" />{t('final.socialEmotional')}</Label>
                  <Textarea value={report.socialEmotional} onChange={e => setReport(prev => ({ ...prev, socialEmotional: e.target.value }))} rows={3} className="resize-none" />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium flex items-center gap-1.5"><Shield className="w-4 h-4 text-primary" />{t('final.leadership')}</Label>
                  <Textarea value={report.leadershipComment} onChange={e => setReport(prev => ({ ...prev, leadershipComment: e.target.value }))} rows={3} className="resize-none" />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium flex items-center gap-1.5"><Brain className="w-4 h-4 text-primary" />{t('final.homework')}</Label>
                  <Select value={report.homeworkConsistency} onValueChange={v => setReport(prev => ({ ...prev, homeworkConsistency: v }))}>
                    <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="excellent">Excellent</SelectItem><SelectItem value="good">Good</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium flex items-center gap-1.5"><GraduationCap className="w-4 h-4 text-primary" />{t('final.examReadiness')}</Label>
                  <Select value={report.examReadiness} onValueChange={v => setReport(prev => ({ ...prev, examReadiness: v }))}>
                    <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="well_prepared">Well Prepared</SelectItem><SelectItem value="on_track">On Track</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Separator />
              <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center gap-1.5"><Lightbulb className="w-4 h-4 text-warning" />{t('final.recommendations')}</Label>
                <Textarea value={report.teacherRecommendations} onChange={e => setReport(prev => ({ ...prev, teacherRecommendations: e.target.value }))} rows={3} className="resize-none" />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center gap-1.5"><Users className="w-4 h-4 text-primary" />{t('final.parentGuidance')}</Label>
                <Textarea value={report.parentGuidance} onChange={e => setReport(prev => ({ ...prev, parentGuidance: e.target.value }))} rows={3} className="resize-none" />
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep(3)} className="flex-1 h-11">← {t('common.back')}</Button>
                <Button onClick={() => setStep(5)} className="flex-1 h-11">{t('common.next')} →</Button>
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="space-y-5 outline-none pb-2">
              <StudentBanner />
              <Card className="border-primary/20 bg-primary/5 shadow-sm">
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-center gap-2 text-base font-bold text-foreground"><Sparkles className="w-5 h-5 text-primary" /> Summary</div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-background rounded-xl p-3 text-center border border-border/50">
                      <p className="text-2xl font-bold text-primary">{report.subjects.length}</p>
                      <p className="text-[10px] text-muted-foreground uppercase">{t('final.subject')}</p>
                    </div>
                    <div className="bg-background rounded-xl p-3 text-center border border-border/50">
                      <div className={`flex items-center justify-center gap-1.5 text-lg font-bold ${trendConfig[report.overallTrend].color}`}>{trendConfig[report.overallTrend].icon}{trendConfig[report.overallTrend].label}</div>
                      <p className="text-[10px] text-muted-foreground uppercase">{t('final.trend')}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep(4)} className="flex-1 h-11">← {t('common.back')}</Button>
                <Button onClick={handleSubmit} className="flex-[2] bg-success hover:bg-success/90 text-white font-bold h-11 gap-2"><CheckCircle className="w-5 h-5" /> {t('final.submit')}</Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};