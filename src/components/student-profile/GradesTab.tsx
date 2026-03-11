import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Award, TrendingUp, BookOpen, FileText, FlaskConical, PenLine, Calendar, Clock, User, MessageSquare } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface GradesTabProps {
  studentId: string;
}

const QUARTERS = ['Term 1', 'Term 2', 'Term 3', 'Term 4'];
type GradeType = 'all' | 'lesson' | 'test' | 'homework' | 'lab';

export const GradesTab: React.FC<GradesTabProps> = ({ studentId }) => {
  const [selectedQuarter, setSelectedQuarter] = useState('Term 1');
  const [selectedSubject, setSelectedSubject] = useState('all');
  const [selectedType, setSelectedType] = useState<GradeType>('all');
  const [viewMode, setViewMode] = useState<'journal' | 'chart'>('journal');
  const [selectedGrade, setSelectedGrade] = useState<any | null>(null);

  // Достаем РЕАЛЬНЫЕ оценки из localDB (журнал grades:v1) именно для этого студента
  const grades = useMemo(() => {
    try {
      const all = JSON.parse(localStorage.getItem('grades:v1') || '[]');
      return all.filter((g: any) => String(g.studentId) === String(studentId));
    } catch {
      return [];
    }
  }, [studentId]);

  // Вычисляем предметы, по которым у ученика есть оценки
  const SUBJECTS = useMemo(() => {
    const set = new Set<string>();
    grades.forEach((g: any) => set.add(g.subject));
    return Array.from(set).sort();
  }, [grades]);

  const filtered = useMemo(() => {
    let g = grades.filter((g: any) => g.term === selectedQuarter);
    if (selectedSubject !== 'all') g = g.filter((g: any) => g.subject === selectedSubject);
    if (selectedType !== 'all') g = g.filter((g: any) => g.type === selectedType);
    return g.sort((a: any, b: any) => (a.date || '').localeCompare(b.date || ''));
  }, [grades, selectedQuarter, selectedSubject, selectedType]);

  const journalData = useMemo(() => {
    const bySubject: Record<string, any[]> = {};
    const source = selectedSubject !== 'all'
      ? filtered
      : grades.filter((g: any) => g.term === selectedQuarter && (selectedType === 'all' || g.type === selectedType));
    
    source.forEach((g: any) => {
      if (!bySubject[g.subject]) bySubject[g.subject] = [];
      bySubject[g.subject].push(g);
    });

    return Object.entries(bySubject).map(([subject, subjectGrades]) => {
      const sorted = [...subjectGrades].sort((a, b) => (a.date || '').localeCompare(b.date || ''));
      const avg = sorted.length > 0 ? sorted.reduce((s, g) => s + Number(g.numericValue || 0), 0) / sorted.length : 0;
      return { subject, grades: sorted, avg: Math.round(avg * 10) / 10 };
    });
  }, [grades, filtered, selectedQuarter, selectedSubject, selectedType]);

  const subjectAverages = useMemo(() => {
    return SUBJECTS.map(subject => {
      const subjectGrades = grades.filter((g: any) => g.term === selectedQuarter && g.subject === subject);
      const avg = subjectGrades.length > 0 ? subjectGrades.reduce((s: number, g: any) => s + Number(g.numericValue || 0), 0) / subjectGrades.length : 0;
      return { subject: subject.length > 10 ? subject.slice(0, 10) + '...' : subject, avg: Math.round(avg * 10) / 10, full: subject };
    });
  }, [grades, selectedQuarter, SUBJECTS]);

  const overallGPA = useMemo(() => {
    const all = grades.filter((g: any) => g.term === selectedQuarter);
    return all.length > 0 ? (all.reduce((s: number, g: any) => s + Number(g.numericValue || 0), 0) / all.length).toFixed(2) : '0.00';
  }, [grades, selectedQuarter]);

  const getGradeBgSoft = (value: number) => {
    if (value >= 5) return 'bg-success/15 text-success border-success/30 hover:bg-success/20';
    if (value >= 4) return 'bg-blue-500/10 text-blue-600 border-blue-500/30 hover:bg-blue-500/20';
    if (value >= 3) return 'bg-warning/15 text-warning border-warning/30 hover:bg-warning/20';
    return 'bg-destructive/15 text-destructive border-destructive/30 hover:bg-destructive/20';
  };

  const getAvgColor = (avg: number) => {
    if (avg >= 4.5) return 'text-success';
    if (avg >= 3.5) return 'text-blue-600';
    if (avg >= 2.5) return 'text-warning';
    return 'text-destructive';
  };

  const typeIconLg = (t: string) => {
    switch (t) {
      case 'lesson': return <BookOpen className="w-5 h-5 text-primary" />;
      case 'test': return <FileText className="w-5 h-5 text-primary" />;
      case 'homework': return <PenLine className="w-5 h-5 text-primary" />;
      case 'lab': return <FlaskConical className="w-5 h-5 text-primary" />;
      default: return <Award className="w-5 h-5 text-primary" />;
    }
  };

  const typeLabel = (t: string) => {
    switch (t) {
      case 'lesson': return 'Работа на уроке';
      case 'test': return 'Тест / Экзамен';
      case 'homework': return 'Домашнее задание';
      case 'lab': return 'Лабораторная';
      default: return t;
    }
  };

  return (
    <div className="space-y-4">
      {/* Filters row */}
      <div className="flex flex-wrap items-center gap-2">
        <Select value={selectedQuarter} onValueChange={setSelectedQuarter}>
          <SelectTrigger className="w-[140px] h-9 focus:ring-primary/30"><SelectValue /></SelectTrigger>
          <SelectContent>
            {QUARTERS.map(q => <SelectItem key={q} value={q}>{q}</SelectItem>)}
          </SelectContent>
        </Select>
        
        {SUBJECTS.length > 0 && (
          <Select value={selectedSubject} onValueChange={setSelectedSubject}>
            <SelectTrigger className="w-[160px] h-9 focus:ring-primary/30"><SelectValue placeholder="Все предметы" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все предметы</SelectItem>
              {SUBJECTS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        )}

        <Select value={selectedType} onValueChange={(v) => setSelectedType(v as GradeType)}>
          <SelectTrigger className="w-[140px] h-9 focus:ring-primary/30"><SelectValue placeholder="Все типы" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все типы</SelectItem>
            <SelectItem value="lesson">Классная работа</SelectItem>
            <SelectItem value="test">Тест</SelectItem>
            <SelectItem value="homework">ДЗ</SelectItem>
            <SelectItem value="lab">Лабораторная</SelectItem>
          </SelectContent>
        </Select>

        <div className="ml-auto">
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'journal' | 'chart')}>
            <TabsList className="h-9">
              <TabsTrigger value="journal" className="text-xs focus-visible:ring-primary/30">Журнал</TabsTrigger>
              <TabsTrigger value="chart" className="text-xs focus-visible:ring-primary/30">Графики</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4 text-center border-l-4 border-l-primary">
          <p className="text-2xl font-bold">{overallGPA}</p>
          <p className="text-xs text-muted-foreground mt-1">Средний балл</p>
        </Card>
        <Card className="p-4 text-center border-l-4 border-l-success">
          <p className="text-2xl font-bold text-success">{filtered.filter((g:any) => Number(g.numericValue) >= 4).length}</p>
          <p className="text-xs text-muted-foreground mt-1">Хорошо (4-5)</p>
        </Card>
        <Card className="p-4 text-center border-l-4 border-l-warning">
          <p className="text-2xl font-bold text-warning">{filtered.filter((g:any) => Number(g.numericValue) === 3).length}</p>
          <p className="text-xs text-muted-foreground mt-1">Удовл. (3)</p>
        </Card>
        <Card className="p-4 text-center border-l-4 border-l-destructive">
          <p className="text-2xl font-bold text-destructive">{filtered.filter((g:any) => Number(g.numericValue) <= 2).length}</p>
          <p className="text-xs text-muted-foreground mt-1">Плохо (≤2)</p>
        </Card>
      </div>

      {viewMode === 'journal' ? (
        <Card className="p-4">
          <h3 className="text-sm font-semibold mb-4">Оценки — {selectedQuarter}</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b-2 border-border">
                  <th className="text-left p-3 font-semibold sticky left-0 bg-card min-w-[140px]">Предмет</th>
                  <th className="text-left p-3 font-semibold min-w-[200px]">Оценки</th>
                  <th className="text-center p-3 font-semibold w-[80px]">Ср.балл</th>
                </tr>
              </thead>
              <tbody>
                {journalData.map(({ subject, grades: subGrades, avg }) => (
                  <tr key={subject} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                    <td className="p-3 font-medium sticky left-0 bg-card text-sm">
                      {subject}
                    </td>
                    <td className="p-3">
                      <div className="flex flex-wrap gap-1.5">
                        {subGrades.map((g, i) => (
                          <button
                            key={i}
                            onClick={() => setSelectedGrade(g)}
                            title={`${typeLabel(g.type)} • ${g.date}`}
                            className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold cursor-pointer transition-all border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 ${getGradeBgSoft(g.numericValue)}`}
                          >
                            {g.value}
                          </button>
                        ))}
                      </div>
                    </td>
                    <td className="p-3 text-center">
                      <span className={`text-base font-bold ${getAvgColor(avg)}`}>{avg || '—'}</span>
                    </td>
                  </tr>
                ))}
                {journalData.length === 0 && (
                  <tr><td colSpan={3} className="text-center p-8 text-muted-foreground">В этом периоде пока нет оценок</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          <Card className="p-5">
            <h3 className="text-sm font-semibold mb-6 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              Средний балл по предметам — {selectedQuarter}
            </h3>
            {subjectAverages.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={subjectAverages}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="subject" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 5]} tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }}
                    labelFormatter={(_, p) => p[0]?.payload?.full || ''}
                  />
                  <Bar dataKey="avg" name="Ср. балл" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-muted-foreground py-8">Нет данных для построения графика</p>
            )}
          </Card>
        </div>
      )}

      {/* Детальная модалка оценки */}
      <Dialog open={!!selectedGrade} onOpenChange={(open) => !open && setSelectedGrade(null)}>
        <DialogContent className="max-w-md p-0 overflow-hidden bg-background">
          {selectedGrade && (
            <>
              <DialogHeader className="p-5 border-b bg-card/50">
                <DialogTitle className="flex items-center gap-3 text-lg">
                  <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                    {typeIconLg(selectedGrade.type)}
                  </div>
                  {selectedGrade.subject}
                </DialogTitle>
              </DialogHeader>

              <div className="p-5 space-y-5">
                <div className="flex items-center gap-4">
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-3xl font-bold border-2 ${getGradeBgSoft(selectedGrade.numericValue)}`}>
                    {selectedGrade.value}
                  </div>
                  <div>
                    <p className="font-semibold text-base">{typeLabel(selectedGrade.type)}</p>
                    <p className="text-sm text-muted-foreground mt-0.5">Получено: {selectedGrade.date}</p>
                  </div>
                </div>

                {selectedGrade.comment && (
                  <div className="p-4 rounded-xl border border-border/50 bg-muted/30">
                    <div className="flex items-center gap-2 mb-2">
                      <MessageSquare className="w-4 h-4 text-primary" />
                      <p className="text-sm font-semibold">Комментарий учителя</p>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                      {selectedGrade.comment}
                    </p>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};