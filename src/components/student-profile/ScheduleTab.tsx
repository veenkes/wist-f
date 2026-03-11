import React, { useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, BookOpen, ChevronLeft, ChevronRight, CheckCircle2, XCircle, AlertCircle, Calendar as CalendarIcon } from 'lucide-react';
import { localDB } from '@/lib/localDb';
import { useQuery } from '@tanstack/react-query';
import { studentService } from '@/services/student.service';
import {
  format,
  startOfWeek,
  addDays,
  subWeeks,
  addWeeks,
  parseISO,
  isWithinInterval,
  startOfDay,
  endOfDay,
  isToday
} from 'date-fns';
import { ru } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

interface ScheduleTabProps {
  studentId: string;
}

const DAYS = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница'];

const CHART_COLORS: Record<string, string> = {
  present: 'hsl(142, 76%, 36%)',
  absent: 'hsl(0, 84%, 60%)',
  late: 'hsl(45, 93%, 47%)',
};

export const ScheduleTab: React.FC<ScheduleTabProps> = ({ studentId }) => {
  const [currentWeekStart, setCurrentWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const weekEnd = addDays(currentWeekStart, 4);

  const handlePrevWeek = () => setCurrentWeekStart(prev => subWeeks(prev, 1));
  const handleNextWeek = () => setCurrentWeekStart(prev => addWeeks(prev, 1));

  const { data: student } = useQuery({
    queryKey: ['student', studentId],
    queryFn: () => studentService.getStudent(studentId),
  });

  const studentGroup = useMemo(() => {
    if (!student) return null;
    return `${student.grade || ''} ${student.className || ''}`.trim();
  }, [student]);

  // Функция поиска отметки с учетом даты
  const getAttendanceStatus = (lessonId: string, date: Date) => {
    const allAttendance = localDB.getAttendance() || {};
    const dateKey = format(date, 'yyyy-MM-dd');
    
    // Пытаемся найти запись строго для этой даты
    const record = allAttendance[`${lessonId}_${dateKey}`] || allAttendance[lessonId];
    
    if (record && record[studentId]) {
      return record[studentId];
    }
    return null;
  };

  const scheduleData = useMemo(() => {
    const allLessons = localDB.getLessons() || [];
    const myLessons = allLessons.filter((l: any) => 
      l.group_id === studentGroup || (l.individualStudents && l.individualStudents.includes(studentId))
    );
    
    const organized: Record<number, any[]> = { 0: [], 1: [], 2: [], 3: [], 4: [] };
    
    myLessons.forEach((l: any) => {
      const rec = l.recurrence || 'weekly';

      if (rec === 'none') {
        if (!l.date_iso) return;
        const lessonDate = parseISO(l.date_iso);
        if (isWithinInterval(lessonDate, { start: startOfDay(currentWeekStart), end: endOfDay(weekEnd) })) {
          let jsDay = lessonDate.getDay() - 1; 
          if (jsDay === -1) jsDay = 6;
          if (jsDay >= 0 && jsDay <= 4) organized[jsDay].push(l);
        }
      } else {
        const dayIndex = Number(l.day_of_week) - 1;
        if (dayIndex >= 0 && dayIndex <= 4) organized[dayIndex].push(l);
      }
    });

    return organized;
  }, [studentGroup, studentId, currentWeekStart, weekEnd]);

  // СТАТИСТИКА ТОЛЬКО ЗА ТЕКУЩУЮ ВЫБРАННУЮ НЕДЕЛЮ
  const weeklyStats = useMemo(() => {
    let p = 0, a = 0, l = 0;
    let totalScheduled = 0;

    Object.keys(scheduleData).forEach(dayIdx => {
      const date = addDays(currentWeekStart, Number(dayIdx));
      scheduleData[Number(dayIdx)].forEach(lesson => {
        totalScheduled++;
        const stat = getAttendanceStatus(lesson.id, date);
        if (stat === 'present') p++;
        else if (stat === 'absent') a++;
        else if (stat === 'late') l++;
      });
    });

    return {
      present: p, absent: a, late: l, total: totalScheduled,
      marked: p + a + l,
      rate: (p + l + a) > 0 ? Math.round(((p + l) / (p + l + a)) * 100) : 0
    };
  }, [scheduleData, currentWeekStart, studentId]);

  const pieData = [
    { name: 'Присутствовал', value: weeklyStats.present, color: CHART_COLORS.present },
    { name: 'Опоздал', value: weeklyStats.late, color: CHART_COLORS.late },
    { name: 'Отсутствовал', value: weeklyStats.absent, color: CHART_COLORS.absent },
  ].filter(d => d.value > 0);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'present': return <Badge className="bg-success/15 text-success border-0 h-5 text-[10px]"><CheckCircle2 className="w-3 h-3 mr-1"/> Был</Badge>;
      case 'absent': return <Badge className="bg-destructive/15 text-destructive border-0 h-5 text-[10px]"><XCircle className="w-3 h-3 mr-1"/> Н/Б</Badge>;
      case 'late': return <Badge className="bg-warning/15 text-warning border-0 h-5 text-[10px]"><AlertCircle className="w-3 h-3 mr-1"/> Опоздал</Badge>;
      default: return null;
    }
  };

  if (!studentGroup) return <p className="text-muted-foreground text-sm py-4 italic">Загрузка расписания...</p>;

  return (
    <div className="space-y-6">
      {/* KPI Header */}
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 flex-1">
          <Card className="p-3 text-center border-primary/20 bg-primary/5">
            <BookOpen className="w-4 h-4 mx-auto mb-1 text-primary" />
            <p className="text-xl font-bold">{weeklyStats.total}</p>
            <p className="text-[10px] text-muted-foreground uppercase">Всего уроков</p>
          </Card>
          <Card className="p-3 text-center border-success/20 bg-success/5">
            <CheckCircle2 className="w-4 h-4 mx-auto mb-1 text-success" />
            <p className="text-xl font-bold text-success">{weeklyStats.present}</p>
            <p className="text-[10px] text-muted-foreground uppercase">Был</p>
          </Card>
          <Card className="p-3 text-center border-warning/20 bg-warning/5">
            <Clock className="w-4 h-4 mx-auto mb-1 text-warning" />
            <p className="text-xl font-bold text-warning">{weeklyStats.late}</p>
            <p className="text-[10px] text-muted-foreground uppercase">Опоздания</p>
          </Card>
          <Card className="p-3 text-center">
            <p className="text-xl font-bold text-primary">{weeklyStats.rate}%</p>
            <p className="text-[10px] text-muted-foreground uppercase">Посещаемость</p>
          </Card>
        </div>

        <div className="flex items-center gap-2 bg-muted/50 p-1.5 rounded-xl border border-border/50 self-center">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handlePrevWeek}><ChevronLeft className="h-4 w-4" /></Button>
          <div className="text-sm font-bold min-w-[180px] text-center">
            {format(currentWeekStart, 'd MMM', { locale: ru })} — {format(weekEnd, 'd MMM yyyy', { locale: ru })}
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleNextWeek}><ChevronRight className="h-4 w-4" /></Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {DAYS.map((day, index) => {
          const dayLessons = scheduleData[index] || [];
          const dateForDay = addDays(currentWeekStart, index);
          const isTodayDate = isToday(dateForDay);

          return (
            <div key={day} className="space-y-3">
              <div className={cn(
                "text-center p-2 rounded-xl border transition-all",
                isTodayDate ? "bg-primary text-primary-foreground border-primary shadow-md scale-105" : "bg-muted/50 border-transparent"
              )}>
                <p className="text-[10px] font-bold uppercase tracking-widest opacity-80">{day}</p>
                <p className="text-xs font-medium">{format(dateForDay, 'd MMMM', { locale: ru })}</p>
              </div>

              <div className="space-y-2 min-h-[100px]">
                {dayLessons.map((lesson, i) => {
                  const status = getAttendanceStatus(lesson.id, dateForDay);
                  return (
                    <Card key={i} className={cn(
                      "p-3 border-l-4 shadow-sm hover:shadow-md transition-all",
                      status === 'present' ? "border-l-success" : status === 'absent' ? "border-l-destructive" : status === 'late' ? "border-l-warning" : "border-l-muted"
                    )}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[9px] font-bold text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {String(lesson.start_time).slice(0,5)}
                        </span>
                        {getStatusBadge(status)}
                      </div>
                      <p className="font-bold text-sm leading-tight">{lesson.subject}</p>
                      <p className="text-[10px] text-muted-foreground mt-1 truncate">Учитель: {lesson.teacher_id}</p>
                    </Card>
                  );
                })}
                {dayLessons.length === 0 && (
                  <div className="py-8 text-center border-2 border-dashed rounded-xl border-muted/50">
                    <p className="text-[10px] text-muted-foreground font-medium uppercase">Нет уроков</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};