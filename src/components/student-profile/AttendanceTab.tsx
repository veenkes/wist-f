import React, { useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChevronLeft, ChevronRight, CheckCircle, XCircle, Clock, Calendar, BookOpen, MapPin, User, ExternalLink, MessageSquare } from 'lucide-react';
import { format, addWeeks, subWeeks, addDays, startOfWeek, isSameDay } from 'date-fns';
import { ru } from 'date-fns/locale';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { useNavigate } from 'react-router-dom';
import { localDB } from '@/lib/localDb';

interface AttendanceTabProps {
  studentId?: string;
}

type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';

interface LessonAttendance {
  id: string;
  time: string;
  subject: string;
  status: AttendanceStatus;
  notes: string | null;
  date: string;
  dayName: string;
  teacher: string;
  classroom: string;
  topic: string;
}

const statusConfig: Record<AttendanceStatus, { label: string; color: string; bgColor: string; icon: React.ReactNode }> = {
  present: { label: 'Present', color: 'text-emerald-600 dark:text-emerald-400', bgColor: 'bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800', icon: <CheckCircle className="w-4 h-4" /> },
  absent: { label: 'Absent', color: 'text-red-600 dark:text-red-400', bgColor: 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800', icon: <XCircle className="w-4 h-4" /> },
  late: { label: 'Late', color: 'text-amber-600 dark:text-amber-400', bgColor: 'bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800', icon: <Clock className="w-4 h-4" /> },
  excused: { label: 'Excused', color: 'text-blue-600 dark:text-blue-400', bgColor: 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800', icon: <Calendar className="w-4 h-4" /> },
};

const CHART_COLORS = {
  present: 'hsl(142, 76%, 36%)',
  absent: 'hsl(0, 84%, 60%)',
  late: 'hsl(45, 93%, 47%)',
  excused: 'hsl(221, 83%, 53%)',
};

const dayNamesShort = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт'];

export const AttendanceTab: React.FC<AttendanceTabProps> = ({ studentId }) => {
  const navigate = useNavigate();
  const [currentWeekStart, setCurrentWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [statusFilter, setStatusFilter] = useState<AttendanceStatus | null>(null);

  // Извлекаем посещаемость ученика из локальной базы, скрещивая ее с расписанием (getLessons)
  const allLessonsData = useMemo(() => {
    if (!studentId) return [];
    const dbAtt = localDB.getAttendance() || {};
    const lessons = localDB.getLessons() || [];
    
    const records: LessonAttendance[] = [];
    
    // В localDB ключами служат ID уроков. Мы проходимся по ним.
    Object.keys(dbAtt).forEach(lessonId => {
      const lessonAtt = dbAtt[lessonId];
      if (lessonAtt[studentId]) { // Если для этого ученика есть отметка на этом уроке
        const lesson = lessons.find((l: any) => l.id === lessonId);
        if (lesson) {
          // Так как в localDB расписание статично (по дням недели), мы симулируем даты для истории
          // В реальности тут должна быть связка с конкретной датой проведения
          // Для демо берем текущую неделю и нужный день
          const dayIndex = Number(lesson.day_of_week) - 1; 
          const simDate = addDays(currentWeekStart, dayIndex >= 0 ? dayIndex : 0);

          records.push({
            id: `${lessonId}-${simDate.getTime()}`,
            time: `${lesson.start_time}–${lesson.end_time}`,
            subject: lesson.subject || 'Предмет',
            status: lessonAtt[studentId] as AttendanceStatus,
            notes: null,
            date: format(simDate, 'yyyy-MM-dd'),
            dayName: format(simDate, 'EEEE', { locale: ru }),
            teacher: lesson.teacher_id || 'Неизвестно',
            classroom: lesson.classroom || '-',
            topic: lesson.title || 'Тема урока',
          });
        }
      }
    });
    return records;
  }, [studentId, currentWeekStart]);

  const weekEnd = addDays(currentWeekStart, 4);

  const weeklyLessons = useMemo(() => {
    return allLessonsData.filter(l => {
      const d = new Date(l.date);
      return d >= currentWeekStart && d <= weekEnd;
    });
  }, [allLessonsData, currentWeekStart, weekEnd]);

  const weeklyData = useMemo(() => {
    return Array.from({ length: 5 }, (_, i) => {
      const dayDate = addDays(currentWeekStart, i);
      const dayStr = format(dayDate, 'yyyy-MM-dd');
      return {
        date: dayDate,
        lessons: weeklyLessons.filter(l => l.date === dayStr).sort((a, b) => a.time.localeCompare(b.time)),
      };
    });
  }, [weeklyLessons, currentWeekStart]);

  const totalStats = useMemo(() => {
    const present = allLessonsData.filter(l => l.status === 'present').length;
    const absent = allLessonsData.filter(l => l.status === 'absent').length;
    const late = allLessonsData.filter(l => l.status === 'late').length;
    const excused = allLessonsData.filter(l => l.status === 'excused').length;
    const total = allLessonsData.length;
    return { present, absent, late, excused, total, rate: total > 0 ? Math.round((present / total) * 100) : 0 };
  }, [allLessonsData]);

  const filteredByStatus = useMemo(() => {
    if (!statusFilter) return [];
    return allLessonsData
      .filter(l => l.status === statusFilter)
      .sort((a, b) => b.date.localeCompare(a.date) || b.time.localeCompare(a.time));
  }, [allLessonsData, statusFilter]);

  const chartData = [
    { name: 'Present', value: totalStats.present, color: CHART_COLORS.present },
    { name: 'Absent', value: totalStats.absent, color: CHART_COLORS.absent },
    { name: 'Late', value: totalStats.late, color: CHART_COLORS.late },
    { name: 'Excused', value: totalStats.excused, color: CHART_COLORS.excused },
  ].filter(item => item.value > 0);

  const handlePrevWeek = () => setCurrentWeekStart(prev => subWeeks(prev, 1));
  const handleNextWeek = () => setCurrentWeekStart(prev => addWeeks(prev, 1));

  if (!studentId) return <p className="text-muted-foreground p-4">Студент не выбран.</p>;

  return (
    <div className="space-y-4">
      {/* Week selector */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Посещаемость</h3>
        <div className="flex items-center gap-1.5">
          <Button variant="outline" size="icon" className="h-7 w-7" onClick={handlePrevWeek}>
            <ChevronLeft className="h-3.5 w-3.5" />
          </Button>
          <span className="text-xs font-medium min-w-[160px] text-center">
            {format(currentWeekStart, 'dd.MM.yyyy')} – {format(weekEnd, 'dd.MM.yyyy')}
          </span>
          <Button variant="outline" size="icon" className="h-7 w-7" onClick={handleNextWeek}>
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-5 gap-2">
        {([
          { key: null, label: 'Всего', value: totalStats.total, icon: <BookOpen className="w-4 h-4 text-primary" />, colorClass: 'text-primary' },
          { key: 'present' as AttendanceStatus, label: 'Присутств.', value: totalStats.present, icon: <CheckCircle className="w-4 h-4 text-emerald-500" />, colorClass: 'text-emerald-600 dark:text-emerald-400' },
          { key: 'absent' as AttendanceStatus, label: 'Отсутств.', value: totalStats.absent, icon: <XCircle className="w-4 h-4 text-red-500" />, colorClass: 'text-red-600 dark:text-red-400' },
          { key: 'late' as AttendanceStatus, label: 'Опоздания', value: totalStats.late, icon: <Clock className="w-4 h-4 text-amber-500" />, colorClass: 'text-amber-600 dark:text-amber-400' },
          { key: null, label: 'Процент', value: `${totalStats.rate}%`, icon: null, colorClass: 'text-primary' },
        ] as const).map((item, idx) => (
          <Card
            key={idx}
            className={`p-2.5 text-center cursor-pointer transition-all hover:shadow-md hover:scale-[1.02] ${item.key && statusFilter === item.key ? 'ring-2 ring-primary' : ''}`}
            onClick={() => {
              if (item.key) setStatusFilter(item.key === statusFilter ? null : item.key);
            }}
          >
            <div className="flex items-center justify-center gap-1 mb-0.5">
              {item.icon}
              <p className={`text-lg font-bold ${item.colorClass}`}>{item.value}</p>
            </div>
            <p className="text-[10px] text-muted-foreground">{item.label}</p>
          </Card>
        ))}
      </div>

      {/* Weekly grid + chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 p-3">
          <h4 className="text-xs font-semibold mb-2">Неделя: {format(currentWeekStart, 'dd.MM')} – {format(weekEnd, 'dd.MM')}</h4>
          <div className="grid grid-cols-5 gap-2">
            {weeklyData.map((day, index) => (
              <div key={index} className="space-y-1.5">
                <div className="text-center p-1.5 bg-muted rounded-md">
                  <p className="font-semibold text-xs">{dayNamesShort[index]}</p>
                  <p className="text-[10px] text-muted-foreground">{format(day.date, 'dd.MM')}</p>
                </div>
                <div className="space-y-1 min-h-[80px]">
                  {day.lessons.length > 0 ? day.lessons.map(lesson => {
                    const config = statusConfig[lesson.status];
                    return (
                      <button
                        key={lesson.id}
                        onClick={() => setStatusFilter(lesson.status)}
                        className={`w-full p-1.5 rounded-md border text-left transition-all hover:shadow-sm hover:scale-[1.02] ${config.bgColor}`}
                      >
                        <p className="text-[9px] text-muted-foreground">{lesson.time.split('–')[0]}</p>
                        <p className="text-[10px] font-medium truncate">{lesson.subject}</p>
                        <div className={`flex items-center gap-0.5 text-[9px] mt-0.5 ${config.color}`}>
                          {config.icon}
                        </div>
                      </button>
                    );
                  }) : (
                    <p className="text-[9px] text-muted-foreground text-center pt-4">—</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-3">
          <h4 className="text-xs font-semibold mb-2">Статистика</h4>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie data={chartData} cx="50%" cy="50%" innerRadius={35} outerRadius={60} paddingAngle={2} dataKey="value">
                  {chartData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip
                  formatter={(value: number, name: string) => [`${value} уроков`, name]}
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '6px', fontSize: '11px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-xs text-muted-foreground text-center py-8">Нет данных</p>
          )}
          <div className="space-y-1.5 mt-2">
            {[
              { label: 'Присутствует', count: totalStats.present, color: 'bg-emerald-500', key: 'present' as AttendanceStatus },
              { label: 'Отсутствует', count: totalStats.absent, color: 'bg-red-500', key: 'absent' as AttendanceStatus },
              { label: 'Опоздал', count: totalStats.late, color: 'bg-amber-500', key: 'late' as AttendanceStatus },
              { label: 'Уважительно', count: totalStats.excused, color: 'bg-blue-500', key: 'excused' as AttendanceStatus },
            ].map(item => (
              <button
                key={item.label}
                onClick={() => setStatusFilter(item.key === statusFilter ? null : item.key)}
                className={`flex items-center justify-between text-xs w-full px-2 py-1 rounded-md transition-colors hover:bg-muted ${statusFilter === item.key ? 'bg-muted' : ''}`}
              >
                <div className="flex items-center gap-1.5">
                  <div className={`w-2.5 h-2.5 rounded-full ${item.color}`} />
                  <span>{item.label}</span>
                </div>
                <span className="font-medium">{item.count}</span>
              </button>
            ))}
          </div>
        </Card>
      </div>

      {/* Status detail modal */}
      <Dialog open={!!statusFilter} onOpenChange={(open) => !open && setStatusFilter(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] flex flex-col overflow-hidden">
          {statusFilter && (
            <>
              <DialogHeader className="shrink-0">
                <DialogTitle className="flex items-center gap-2 text-base">
                  <span className={statusConfig[statusFilter].color}>{statusConfig[statusFilter].icon}</span>
                  {statusConfig[statusFilter].label} — {filteredByStatus.length} записей
                </DialogTitle>
              </DialogHeader>

              <ScrollArea className="flex-1 min-h-0 pr-4 -mx-4 px-4 custom-scrollbar">
                <div className="space-y-2 pb-4">
                  {filteredByStatus.map((lesson) => (
                    <div
                      key={lesson.id}
                      className={`p-3 rounded-lg border ${statusConfig[lesson.status].bgColor}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-bold">{lesson.subject}</span>
                            <Badge variant="outline" className="text-[9px] h-4 capitalize">{lesson.dayName}</Badge>
                          </div>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[10px] text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />{format(new Date(lesson.date), 'dd.MM.yyyy')}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />{lesson.time}
                            </span>
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />Каб. {lesson.classroom}
                            </span>
                            <span className="flex items-center gap-1">
                              <User className="w-3 h-3" />{lesson.teacher}
                            </span>
                          </div>
                          <p className="text-[10px] text-muted-foreground mt-1">
                            <BookOpen className="w-3 h-3 inline mr-1" />
                            {lesson.topic}
                          </p>
                        </div>
                      </div>

                      {lesson.notes && (
                        <div className="mt-2 p-2 rounded-md bg-background/60 border border-border/50">
                          <div className="flex items-center gap-1 mb-0.5">
                            <MessageSquare className="w-3 h-3 text-muted-foreground" />
                            <span className="text-[10px] font-medium">
                              Примечание
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground">{lesson.notes}</p>
                        </div>
                      )}
                    </div>
                  ))}

                  {filteredByStatus.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-8">Нет записей</p>
                  )}
                </div>
              </ScrollArea>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};