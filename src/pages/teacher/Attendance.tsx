import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { CheckCircle, XCircle, Clock, TrendingUp, BarChart3, Users, User, Search, Bell, CalendarIcon, ExternalLink, Send, UserCheck, ChevronLeft, ChevronRight, BookOpen } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format, subDays, eachDayOfInterval, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { ru } from 'date-fns/locale';
import { toast } from 'sonner';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, Legend } from 'recharts';
import { useNavigate } from 'react-router-dom';
import { DateRange } from 'react-day-picker';
import { useQuery } from '@tanstack/react-query';

import { studentService } from '@/services/student.service';
import { localDB } from '@/lib/localDb';

interface AttendanceRecord {
  studentId: string;
  studentName: string;
  group: string;
  status: 'present' | 'absent' | 'late' | 'not_marked';
  time?: string;
  date: Date;
  parentPhone?: string;
  parentName?: string;
}

// Group Detail Modal Content
interface GroupDetailModalContentProps {
  group: string;
  studentsInGroup: any[];
  gStat?: { group: string; total: number; present: number; absent: number; late: number; rate: number };
  attendanceData: AttendanceRecord[];
  studentStats: { id: string; name: string; group: string; present: number; absent: number; late: number; total: number; rate: number }[];
  selectedDate: Date;
  getStatusColor: (status: string) => string;
  onClose: () => void;
  onMarkAttendance: () => void;
  navigate: ReturnType<typeof useNavigate>;
}

const GroupDetailModalContent: React.FC<GroupDetailModalContentProps> = ({
  group, studentsInGroup, gStat, attendanceData, studentStats, selectedDate, getStatusColor, onClose, onMarkAttendance, navigate
}) => {
  const [statusFilter, setStatusFilter] = useState<'all' | 'present' | 'absent' | 'late'>('all');
  const [selectedStudentHistory, setSelectedStudentHistory] = useState<string | null>(null);

  const filteredStudents = useMemo(() => {
    if (statusFilter === 'all') return studentsInGroup;
    return studentsInGroup.filter(s => {
      const record = attendanceData.find(r => r.studentId === s.id && format(r.date, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd'));
      return record?.status === statusFilter;
    });
  }, [studentsInGroup, statusFilter, attendanceData, selectedDate]);

  const studentHistory = useMemo(() => {
    if (!selectedStudentHistory) return [];
    return attendanceData
      .filter(r => r.studentId === selectedStudentHistory && r.status !== 'not_marked')
      .sort((a, b) => b.date.getTime() - a.date.getTime())
      .slice(0, 30);
  }, [selectedStudentHistory, attendanceData]);

  const selectedStudentInfo = studentsInGroup.find(s => s.id === selectedStudentHistory);

  const todayCounts = useMemo(() => {
    const counts = { present: 0, absent: 0, late: 0, not_marked: 0 };
    studentsInGroup.forEach(s => {
      const record = attendanceData.find(r => r.studentId === s.id && format(r.date, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd'));
      if (record) counts[record.status]++;
      else counts.not_marked++;
    });
    return counts;
  }, [studentsInGroup, attendanceData, selectedDate]);

  const handleNavigateToProfile = (studentId: string) => {
    onClose(); 
    setTimeout(() => {
      navigate(`/student/${studentId}`); 
    }, 200);
  };

  if (selectedStudentHistory && selectedStudentInfo) {
    return (
      <>
        <DialogHeader className="p-5 pb-3 border-b">
          <DialogTitle className="text-lg flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-7 w-7 -ml-1 focus-visible:ring-primary/30" onClick={() => setSelectedStudentHistory(null)}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            История посещаемости
          </DialogTitle>
          <DialogDescription className="text-xs ml-8">
            {selectedStudentInfo.name} • {group}
          </DialogDescription>
        </DialogHeader>
        <div className="overflow-y-auto flex-1 p-5 space-y-3 custom-scrollbar">
          {(() => {
            const stat = studentStats.find(st => st.id === selectedStudentHistory);
            return stat ? (
              <div className="grid grid-cols-4 gap-2 text-center">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <p className="text-lg font-bold">{stat.total}</p>
                  <p className="text-[10px] text-muted-foreground">Всего</p>
                </div>
                <div className="p-2 bg-success/10 rounded-lg">
                  <p className="text-lg font-bold text-success">{stat.present}</p>
                  <p className="text-[10px] text-muted-foreground">Был(а)</p>
                </div>
                <div className="p-2 bg-warning/10 rounded-lg">
                  <p className="text-lg font-bold text-warning">{stat.late}</p>
                  <p className="text-[10px] text-muted-foreground">Опозд.</p>
                </div>
                <div className="p-2 bg-destructive/10 rounded-lg">
                  <p className="text-lg font-bold text-destructive">{stat.absent}</p>
                  <p className="text-[10px] text-muted-foreground">Отсутств.</p>
                </div>
              </div>
            ) : null;
          })()}

          <div className="space-y-1.5">
            {studentHistory.length === 0 && (
              <p className="text-center text-muted-foreground py-8 text-sm">Нет данных за выбранный период</p>
            )}
            {studentHistory.map((record, idx) => (
              <div key={idx} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                <div className="w-10 text-center shrink-0">
                  <p className="text-sm font-bold">{format(record.date, 'dd')}</p>
                  <p className="text-[10px] text-muted-foreground">{format(record.date, 'MMM', { locale: ru })}</p>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium capitalize">
                    {format(record.date, 'EEEE', { locale: ru })}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {record.time ? `Время: ${record.time}` : 'Время не зафиксировано'}
                  </p>
                </div>
                <Badge className={`${getStatusColor(record.status)} text-xs px-2`}>
                  {record.status === 'present' ? 'Присутствовал' : record.status === 'late' ? 'Опоздал' : 'Отсутствовал'}
                </Badge>
              </div>
            ))}
          </div>

          <Button variant="outline" size="sm" className="w-full focus-visible:ring-primary/30" onClick={() => handleNavigateToProfile(selectedStudentHistory)}>
            <ExternalLink className="w-3.5 h-3.5 mr-2" />
            Открыть полную анкету ученика
          </Button>
        </div>
      </>
    );
  }

  return (
    <>
      <DialogHeader className="p-5 pb-3 border-b">
        <DialogTitle className="text-lg flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" />
          {group}
        </DialogTitle>
        <DialogDescription className="text-xs">
          Сводка по посещаемости группы
        </DialogDescription>
      </DialogHeader>
      <div className="overflow-y-auto flex-1 p-5 space-y-4 custom-scrollbar">
        <div className="grid grid-cols-4 gap-2">
          <button
            onClick={() => setStatusFilter(statusFilter === 'all' ? 'all' : 'all')}
            className={`p-2.5 rounded-lg text-center transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 ${statusFilter === 'all' ? 'ring-2 ring-primary bg-primary/10' : 'bg-muted/50 hover:bg-muted'}`}
          >
            <p className="text-lg font-bold">{studentsInGroup.length}</p>
            <p className="text-[10px] text-muted-foreground">Все</p>
          </button>
          <button
            onClick={() => setStatusFilter(statusFilter === 'present' ? 'all' : 'present')}
            className={`p-2.5 rounded-lg text-center transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 ${statusFilter === 'present' ? 'ring-2 ring-success bg-success/15' : 'bg-success/10 hover:bg-success/20'}`}
          >
            <CheckCircle className="w-4 h-4 mx-auto mb-0.5 text-success" />
            <p className="text-lg font-bold text-success">{todayCounts.present}</p>
            <p className="text-[10px] text-muted-foreground">Пришли</p>
          </button>
          <button
            onClick={() => setStatusFilter(statusFilter === 'late' ? 'all' : 'late')}
            className={`p-2.5 rounded-lg text-center transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 ${statusFilter === 'late' ? 'ring-2 ring-warning bg-warning/15' : 'bg-warning/10 hover:bg-warning/20'}`}
          >
            <Clock className="w-4 h-4 mx-auto mb-0.5 text-warning" />
            <p className="text-lg font-bold text-warning">{todayCounts.late}</p>
            <p className="text-[10px] text-muted-foreground">Опозд.</p>
          </button>
          <button
            onClick={() => setStatusFilter(statusFilter === 'absent' ? 'all' : 'absent')}
            className={`p-2.5 rounded-lg text-center transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 ${statusFilter === 'absent' ? 'ring-2 ring-destructive bg-destructive/15' : 'bg-destructive/10 hover:bg-destructive/20'}`}
          >
            <XCircle className="w-4 h-4 mx-auto mb-0.5 text-destructive" />
            <p className="text-lg font-bold text-destructive">{todayCounts.absent}</p>
            <p className="text-[10px] text-muted-foreground">Отсутств.</p>
          </button>
        </div>

        {statusFilter !== 'all' && (
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">
              Фильтр: {statusFilter === 'present' ? 'Присутствующие' : statusFilter === 'late' ? 'Опоздавшие' : 'Отсутствующие'}
            </Badge>
            <Button variant="ghost" size="sm" className="h-6 text-xs px-2 focus-visible:ring-primary/30" onClick={() => setStatusFilter('all')}>
              Сбросить
            </Button>
          </div>
        )}

        <div>
          <p className="text-sm font-semibold mb-2">
            {statusFilter === 'all' ? `Ученики группы (${filteredStudents.length})` :
              `${statusFilter === 'present' ? 'Присутствующие' : statusFilter === 'late' ? 'Опоздавшие' : 'Отсутствующие'} (${filteredStudents.length})`}
          </p>
          <div className="space-y-1">
            {filteredStudents.length === 0 && (
              <p className="text-center text-muted-foreground py-6 text-sm">Нет учеников с данным статусом</p>
            )}
            {filteredStudents.map((s, idx) => {
              const todayStatus = attendanceData.find(r => r.studentId === s.id && format(r.date, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd'));
              const studentStat = studentStats.find(st => st.id === s.id);
              return (
                <div
                  key={s.id}
                  className="flex items-center justify-between p-2.5 rounded-lg hover:bg-muted/60 transition-colors cursor-pointer group"
                  onClick={() => setSelectedStudentHistory(s.id)}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                      {idx + 1}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{s.name}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {s.parentName || 'Родитель'} • {s.parentPhone || 'Телефон не указан'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {studentStat && (
                      <span className="text-[10px] text-muted-foreground hidden sm:inline">{studentStat.rate}%</span>
                    )}
                    {todayStatus && todayStatus.status !== 'not_marked' && (
                      <Badge className={`${getStatusColor(todayStatus.status)} text-[10px] px-1.5 py-0 border-0`}>
                        {todayStatus.status === 'present' ? 'П' : todayStatus.status === 'late' ? 'О' : 'Н'}
                      </Badge>
                    )}
                    <CalendarIcon className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 shrink-0" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <Button variant="outline" size="sm" className="w-full focus-visible:ring-primary/30" onClick={onMarkAttendance}>
          Отметить посещаемость для этой группы
        </Button>
      </div>
    </>
  );
};

export const Attendance: React.FC = () => {
  const navigate = useNavigate();
  const [dateRange, setDateRange] = useState<DateRange | undefined>({ from: subDays(new Date(), 29), to: new Date() });
  const [selectedGroup, setSelectedGroup] = useState('all');
  const [selectedStudent, setSelectedStudent] = useState('all');
  const [selectedTeacher, setSelectedTeacher] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [calendarOpen, setCalendarOpen] = useState(false);

  const [listModal, setListModal] = useState<{ open: boolean; title: string; status: string }>({ open: false, title: '', status: '' });
  const [groupModal, setGroupModal] = useState<{ open: boolean; group: string | null }>({ open: false, group: null });
  
  const [notifyModal, setNotifyModal] = useState(false);
  const [notifyFilter, setNotifyFilter] = useState<'all' | 'absent' | 'late' | 'custom'>('all');
  const [notifyCustomSelected, setNotifyCustomSelected] = useState<Set<string>>(new Set());
  const [notifyMessage, setNotifyMessage] = useState('');
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);

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
      parentName: s.parents?.[0]?.name || 'Не указан',
      parentPhone: s.parents?.[0]?.phone || 'Нет номера'
    }));
  }, [realStudentsData]);

  const GROUPS = useMemo(() => {
    const unique = new Set<string>();
    students.forEach(s => unique.add(s.group));
    return Array.from(unique).sort();
  }, [students]);

  const lessons = useMemo(() => localDB.getLessons() || [], []);
  
  const TEACHERS = useMemo(() => {
    const unique = new Set<string>();
    lessons.forEach((l: any) => {
      if (l.teacher_id) unique.add(l.teacher_id);
    });
    return Array.from(unique);
  }, [lessons]);

  const [localAttendance, setLocalAttendance] = useState<AttendanceRecord[]>([]);

  // БЕЗОПАСНАЯ загрузка и инициализация посещаемости (без бесконечных рендеров)
  useEffect(() => {
    if (!students.length || !lessons.length) return;

    const data = localDB.getAttendance() || {};
    const records: AttendanceRecord[] = [];
    
    Object.keys(data).forEach(lessonId => {
      const lesson = lessons.find((l: any) => l.id === lessonId);
      if (!lesson) return;
      
      const lessonAtt = data[lessonId];
      Object.keys(lessonAtt).forEach(studentId => {
        const student = students.find(s => s.id === studentId);
        if (!student) return;

        const status = lessonAtt[studentId];
        records.push({
          studentId,
          studentName: student.name,
          group: student.group,
          status,
          date: new Date(), 
          parentName: student.parentName,
          parentPhone: student.parentPhone
        });
      });
    });

    setLocalAttendance(records);
  }, [students, lessons]);

  const effectiveGroups = useMemo(() => {
    if (selectedTeacher !== 'all') {
      const tLessons = lessons.filter((l: any) => l.teacher_id === selectedTeacher);
      const tGroups = new Set(tLessons.map((l: any) => l.group_id));
      return Array.from(tGroups) as string[];
    }
    return GROUPS;
  }, [selectedTeacher, lessons, GROUPS]);

  const filteredByPeriod = useMemo(() => {
    let filtered = localAttendance;
    if (dateRange?.from) {
      const from = startOfDay(dateRange.from);
      const to = dateRange.to ? endOfDay(dateRange.to) : endOfDay(dateRange.from);
      filtered = filtered.filter(r => isWithinInterval(r.date, { start: from, end: to }));
    }
    if (selectedGroup !== 'all') filtered = filtered.filter(r => r.group === selectedGroup);
    if (selectedStudent !== 'all') filtered = filtered.filter(r => r.studentId === selectedStudent);
    if (selectedTeacher !== 'all') {
      filtered = filtered.filter(r => effectiveGroups.includes(r.group));
    }
    return filtered;
  }, [localAttendance, dateRange, selectedGroup, selectedStudent, selectedTeacher, effectiveGroups]);

  const stats = useMemo(() => {
    const total = filteredByPeriod.length;
    const present = filteredByPeriod.filter(r => r.status === 'present').length;
    const absent = filteredByPeriod.filter(r => r.status === 'absent').length;
    const late = filteredByPeriod.filter(r => r.status === 'late').length;
    const notMarked = filteredByPeriod.filter(r => r.status === 'not_marked').length;
    return {
      total, present, absent, late, notMarked,
      presentRate: total > 0 ? Math.round((present / total) * 100) : 0,
      absentRate: total > 0 ? Math.round((absent / total) * 100) : 0,
      lateRate: total > 0 ? Math.round((late / total) * 100) : 0,
    };
  }, [filteredByPeriod]);

  const getStudentsByStatus = useCallback((status: string) => {
    const records = filteredByPeriod.filter(r => {
      if (status === 'all') return true;
      return r.status === status;
    });
    const unique = new Map<string, any>();
    records.forEach(r => {
      if (!unique.has(r.studentId)) unique.set(r.studentId, { id: r.studentId, name: r.studentName, group: r.group, time: r.time });
    });
    return Array.from(unique.values());
  }, [filteredByPeriod]);

  const dailyTrend = useMemo(() => {
    const from = dateRange?.from || subDays(new Date(), 7);
    const to = dateRange?.to || new Date();
    const days = eachDayOfInterval({ start: from, end: to }).filter(d => d.getDay() !== 0 && d.getDay() !== 6);

    return days.map(day => {
      const dayStr = format(day, 'yyyy-MM-dd');
      let dayRecords = localAttendance.filter(r => format(r.date, 'yyyy-MM-dd') === dayStr);
      if (selectedGroup !== 'all') dayRecords = dayRecords.filter(r => r.group === selectedGroup);
      if (selectedStudent !== 'all') dayRecords = dayRecords.filter(r => r.studentId === selectedStudent);
      if (selectedTeacher !== 'all') {
        dayRecords = dayRecords.filter(r => effectiveGroups.includes(r.group));
      }
      const marked = dayRecords.filter(r => r.status !== 'not_marked');
      return {
        date: format(day, 'dd.MM', { locale: ru }),
        fullDate: format(day, 'dd MMM', { locale: ru }),
        present: marked.filter(r => r.status === 'present').length,
        late: marked.filter(r => r.status === 'late').length,
        absent: marked.filter(r => r.status === 'absent').length,
        rate: marked.length > 0 ? Math.round((marked.filter(r => r.status === 'present').length / marked.length) * 100) : 0,
      };
    });
  }, [localAttendance, dateRange, selectedGroup, selectedStudent, selectedTeacher, effectiveGroups]);

  const pieData = useMemo(() => {
    return [
      { name: 'Присутствовали', value: stats.present, color: 'hsl(var(--success))' },
      { name: 'Опоздали', value: stats.late, color: 'hsl(var(--warning))' },
      { name: 'Отсутствовали', value: stats.absent, color: 'hsl(var(--destructive))' },
    ].filter(d => d.value > 0);
  }, [stats]);

  const studentStats = useMemo(() => {
    const map = new Map<string, any>();
    filteredByPeriod.filter(r => r.status !== 'not_marked').forEach(r => {
      if (!map.has(r.studentId)) {
        map.set(r.studentId, { id: r.studentId, name: r.studentName, group: r.group, present: 0, absent: 0, late: 0, total: 0, rate: 0 });
      }
      const s = map.get(r.studentId)!;
      s.total++;
      if (r.status === 'present') s.present++;
      if (r.status === 'absent') s.absent++;
      if (r.status === 'late') s.late++;
    });
    map.forEach(s => { s.rate = s.total > 0 ? Math.round((s.present / s.total) * 100) : 0; });
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [filteredByPeriod]);

  const groupStats = useMemo(() => {
    return effectiveGroups.map(group => {
      const groupRecords = filteredByPeriod.filter(r => r.group === group && r.status !== 'not_marked');
      const present = groupRecords.filter(r => r.status === 'present').length;
      const total = groupRecords.length;
      return {
        group, total, present,
        absent: groupRecords.filter(r => r.status === 'absent').length,
        late: groupRecords.filter(r => r.status === 'late').length,
        rate: total > 0 ? Math.round((present / total) * 100) : 0,
      };
    });
  }, [filteredByPeriod, effectiveGroups]);

  const dayLessons = useMemo(() => {
    const dow = selectedDate.getDay(); 
    if (dow === 0 || dow === 6) return [];
    
    const dLessons = lessons.filter((l: any) => Number(l.day_of_week) === dow);
    if (selectedGroup !== 'all') return dLessons.filter((l: any) => l.group_id === selectedGroup);
    return dLessons;
  }, [selectedDate, selectedGroup, lessons]);

  const activeLessonId = useMemo(() => {
    if (selectedLessonId && dayLessons.find((l: any) => l.id === selectedLessonId)) return selectedLessonId;
    return dayLessons[0]?.id || null;
  }, [selectedLessonId, dayLessons]);

  const activeLesson = dayLessons.find((l: any) => l.id === activeLessonId) || null;

  const todayRecords = useMemo(() => {
    let targetStudents = students;
    if (activeLesson) {
      targetStudents = students.filter(s => s.group === activeLesson.group_id);
    } else if (selectedGroup !== 'all') {
      targetStudents = students.filter(s => s.group === selectedGroup);
    }
    
    if (searchQuery) targetStudents = targetStudents.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()));

    const dbAtt = localDB.getAttendance() || {};
    const lessonAtt = activeLesson ? (dbAtt[activeLesson.id] || {}) : {};

    return targetStudents.map(s => {
      return {
        studentId: s.id,
        studentName: s.name,
        group: s.group,
        status: lessonAtt[s.id] || 'not_marked',
        date: selectedDate,
        parentName: s.parentName,
        parentPhone: s.parentPhone
      } as AttendanceRecord;
    });
  }, [students, activeLesson, selectedGroup, searchQuery, localAttendance, selectedDate]);

  const handleMarkAttendance = (studentId: string, newStatus: 'present' | 'absent' | 'late') => {
    if (!activeLesson) {
      toast.error('Сначала выберите урок');
      return;
    }

    const dbAtt = localDB.getAttendance() || {};
    if (!dbAtt[activeLesson.id]) dbAtt[activeLesson.id] = {};
    dbAtt[activeLesson.id][studentId] = newStatus;
    localDB.saveAttendance(dbAtt);

    setLocalAttendance(prev => {
      const next = [...prev];
      const idx = next.findIndex(r => r.studentId === studentId && format(r.date, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd'));
      if (idx > -1) {
        next[idx] = { ...next[idx], status: newStatus };
      } else {
        const student = students.find(s => s.id === studentId);
        if (student) {
          next.push({
            studentId,
            studentName: student.name,
            group: student.group,
            status: newStatus,
            date: selectedDate,
            parentName: student.parentName,
            parentPhone: student.parentPhone
          });
        }
      }
      return next;
    });

    const labels = { present: 'Присутствует', absent: 'Отсутствует', late: 'Опоздал' };
    const student = students.find(s => s.id === studentId);
    toast.success(`${student?.name}: ${labels[newStatus]}`);
  };

  const handleNotifyParent = (studentId: string, status: 'absent' | 'late') => {
    const student = students.find(s => s.id === studentId);
    if (!student) return;
    const message = status === 'absent'
      ? `Уважаемый(ая) ${student.parentName}, ваш ребёнок ${student.name} отсутствует на занятиях ${format(selectedDate, 'dd.MM.yyyy')}.`
      : `Уважаемый(ая) ${student.parentName}, ваш ребёнок ${student.name} опоздал на занятие ${format(selectedDate, 'dd.MM.yyyy')}.`;
    toast.success(`Уведомление отправлено: ${student.parentName}`, { description: message });
  };

  const openNotifyModal = () => {
    const absentRecords = todayRecords.filter(r => r.status === 'absent' || r.status === 'late');
    if (absentRecords.length === 0) {
      toast.info('Все ученики присутствуют — уведомлять некого');
      return;
    }
    setNotifyFilter('all');
    setNotifyCustomSelected(new Set());
    setNotifyMessage(`Уважаемые родители! Сообщаем вам о статусе посещаемости вашего ребёнка за ${format(selectedDate, 'dd.MM.yyyy')}.`);
    setNotifyModal(true);
  };

  const getNotifyRecipients = useMemo(() => {
    if (notifyFilter === 'absent') return todayRecords.filter(r => r.status === 'absent');
    if (notifyFilter === 'late') return todayRecords.filter(r => r.status === 'late');
    if (notifyFilter === 'custom') return todayRecords.filter(r => notifyCustomSelected.has(r.studentId));
    return todayRecords.filter(r => r.status === 'absent' || r.status === 'late');
  }, [todayRecords, notifyFilter, notifyCustomSelected]);

  const handleSendNotifications = () => {
    const recipients = getNotifyRecipients;
    if (recipients.length === 0) {
      toast.info('Нет получателей для уведомления');
      return;
    }
    toast.success(`Уведомления отправлены ${recipients.length} родителям`, {
      description: recipients.map(r => r.parentName).filter(Boolean).join(', '),
    });
    setNotifyModal(false);
  };

  const toggleCustomStudent = (studentId: string) => {
    setNotifyCustomSelected(prev => {
      const next = new Set(prev);
      next.has(studentId) ? next.delete(studentId) : next.add(studentId);
      return next;
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'present': return 'bg-success/10 text-success border-success/20';
      case 'absent': return 'bg-destructive/10 text-destructive border-destructive/20';
      case 'late': return 'bg-warning/10 text-warning border-warning/20';
      default: return 'bg-muted text-muted-foreground border-border';
    }
  };

  const filteredStudentsList = useMemo(() => {
    if (selectedGroup === 'all') return students;
    return students.filter(s => s.group === selectedGroup);
  }, [selectedGroup, students]);

  const dateLabel = useMemo(() => {
    if (!dateRange?.from) return 'Выберите дату';
    if (!dateRange.to || format(dateRange.from, 'yyyy-MM-dd') === format(dateRange.to, 'yyyy-MM-dd')) {
      return format(dateRange.from, 'd MMM yyyy', { locale: ru });
    }
    return `${format(dateRange.from, 'd MMM', { locale: ru })} — ${format(dateRange.to, 'd MMM yyyy', { locale: ru })}`;
  }, [dateRange]);

  const handleNavigateFromListModal = (studentId: string) => {
    setListModal(prev => ({ ...prev, open: false })); 
    setTimeout(() => {
      navigate(`/student/${studentId}`);
    }, 200); 
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-primary" />
            Посещаемость
          </h1>
          <p className="text-sm text-muted-foreground">Аналитика и управление посещаемостью учеников</p>
        </div>
        <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="min-w-[220px] justify-start text-left font-normal focus-visible:ring-primary/30">
              <CalendarIcon className="w-4 h-4 mr-2 text-muted-foreground" />
              {dateLabel}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <Calendar
              mode="range"
              selected={dateRange}
              onSelect={(range) => { setDateRange(range); if (range?.from) setSelectedDate(range.from); }}
              numberOfMonths={2}
              locale={ru}
            />
            <div className="p-2 border-t flex gap-2 justify-end">
              <Button size="sm" variant="ghost" onClick={() => { setDateRange({ from: new Date(), to: new Date() }); setSelectedDate(new Date()); setCalendarOpen(false); }}>Сегодня</Button>
              <Button size="sm" variant="ghost" onClick={() => { setDateRange({ from: subDays(new Date(), 6), to: new Date() }); setCalendarOpen(false); }}>Неделя</Button>
              <Button size="sm" variant="ghost" onClick={() => { setDateRange({ from: subDays(new Date(), 29), to: new Date() }); setCalendarOpen(false); }}>Месяц</Button>
              <Button size="sm" onClick={() => setCalendarOpen(false)}>Применить</Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      <div className="flex flex-wrap gap-2">
        <Select value={selectedGroup} onValueChange={setSelectedGroup}>
          <SelectTrigger className="w-[160px] h-9 focus:ring-primary/30"><SelectValue placeholder="Все группы" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все группы</SelectItem>
            {effectiveGroups.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={selectedStudent} onValueChange={setSelectedStudent}>
          <SelectTrigger className="w-[200px] h-9 focus:ring-primary/30"><SelectValue placeholder="Все ученики" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все ученики</SelectItem>
            {filteredStudentsList.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={selectedTeacher} onValueChange={setSelectedTeacher}>
          <SelectTrigger className="w-[200px] h-9 focus:ring-primary/30"><SelectValue placeholder="Все учителя" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все учителя</SelectItem>
            {TEACHERS.map(t => <SelectItem key={t as string} value={t as string}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {selectedGroup !== 'all' && (
        <Card className="p-3">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" />
              {selectedGroup} — {filteredStudentsList.length} учеников
            </h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1.5">
            {filteredStudentsList.map(s => {
              const todayStatus = localAttendance.find(r => r.studentId === s.id && format(r.date, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd'));
              return (
                <div
                  key={s.id}
                  className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-muted/60 transition-colors cursor-pointer group"
                  onClick={() => navigate(`/student/${s.id}`)}
                >
                  <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary shrink-0">
                    {s.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{s.name}</p>
                  </div>
                  {todayStatus && todayStatus.status !== 'not_marked' && (
                    <Badge className={`${getStatusColor(todayStatus.status)} text-[10px] px-1.5 py-0 border-0`}>
                      {todayStatus.status === 'present' ? 'П' : todayStatus.status === 'late' ? 'О' : 'Н'}
                    </Badge>
                  )}
                  <ExternalLink className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 shrink-0" />
                </div>
              );
            })}
          </div>
        </Card>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <Card className="p-3 border-l-4 border-l-primary cursor-pointer hover:shadow-md transition-shadow" onClick={() => setListModal({ open: true, title: 'Все отметки', status: 'all' })}>
          <div className="text-center">
            <p className="text-xs text-muted-foreground mb-1">Всего отметок</p>
            <p className="text-2xl font-bold">{stats.total}</p>
          </div>
        </Card>
        <Card className="p-3 border-l-4 border-l-success cursor-pointer hover:shadow-md transition-shadow" onClick={() => setListModal({ open: true, title: 'Присутствующие ученики', status: 'present' })}>
          <div className="text-center">
            <CheckCircle className="w-5 h-5 mx-auto mb-1 text-success" />
            <p className="text-xs text-muted-foreground mb-1">Присутствуют</p>
            <p className="text-2xl font-bold text-success">{stats.present}</p>
            <p className="text-xs text-muted-foreground">{stats.presentRate}%</p>
          </div>
        </Card>
        <Card className="p-3 border-l-4 border-l-warning cursor-pointer hover:shadow-md transition-shadow" onClick={() => setListModal({ open: true, title: 'Опоздавшие ученики', status: 'late' })}>
          <div className="text-center">
            <Clock className="w-5 h-5 mx-auto mb-1 text-warning" />
            <p className="text-xs text-muted-foreground mb-1">Опоздали</p>
            <p className="text-2xl font-bold text-warning">{stats.late}</p>
            <p className="text-xs text-muted-foreground">{stats.lateRate}%</p>
          </div>
        </Card>
        <Card className="p-3 border-l-4 border-l-destructive cursor-pointer hover:shadow-md transition-shadow" onClick={() => setListModal({ open: true, title: 'Отсутствующие ученики', status: 'absent' })}>
          <div className="text-center">
            <XCircle className="w-5 h-5 mx-auto mb-1 text-destructive" />
            <p className="text-xs text-muted-foreground mb-1">Отсутствуют</p>
            <p className="text-2xl font-bold text-destructive">{stats.absent}</p>
            <p className="text-xs text-muted-foreground">{stats.absentRate}%</p>
          </div>
        </Card>
        <Card className="p-3 cursor-pointer hover:shadow-md transition-shadow" onClick={() => setListModal({ open: true, title: 'Не отмеченные ученики', status: 'not_marked' })}>
          <div className="text-center">
            <p className="text-xs text-muted-foreground mb-1">Не отмечено</p>
            <p className="text-2xl font-bold text-muted-foreground">{stats.notMarked}</p>
          </div>
        </Card>
      </div>

      <Dialog open={listModal.open} onOpenChange={(o) => setListModal(prev => ({ ...prev, open: o }))}>
        <DialogContent className="max-w-md max-h-[80vh] flex flex-col p-0 gap-0 overflow-hidden bg-background">
          <DialogHeader className="p-4 pb-3 border-b">
            <DialogTitle className="text-base">{listModal.title}</DialogTitle>
            <DialogDescription className="text-xs">{getStudentsByStatus(listModal.status).length} учеников</DialogDescription>
          </DialogHeader>
          <div className="overflow-y-auto flex-1 p-2 custom-scrollbar">
            {getStudentsByStatus(listModal.status).length === 0 && <p className="text-center text-muted-foreground py-8 text-sm">Нет учеников</p>}
            {getStudentsByStatus(listModal.status).map((s: any) => (
              <div 
                key={s.id} 
                className="flex items-center justify-between p-2.5 rounded-lg hover:bg-muted/60 transition-colors cursor-pointer group"
                onClick={() => handleNavigateFromListModal(s.id)}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary">
                    {s.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                  </div>
                  <div>
                    <p className="font-medium text-sm leading-tight">{s.name}</p>
                    <p className="text-xs text-muted-foreground">{s.group}</p>
                  </div>
                </div>
                <ExternalLink className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview" className="text-xs focus-visible:ring-primary/30">Обзор</TabsTrigger>
          <TabsTrigger value="students" className="text-xs focus-visible:ring-primary/30">По ученикам</TabsTrigger>
          <TabsTrigger value="groups" className="text-xs focus-visible:ring-primary/30">По группам</TabsTrigger>
          <TabsTrigger value="marking" className="text-xs focus-visible:ring-primary/30">Отметить</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="outline-none">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-primary" />
                  Динамика посещаемости
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={dailyTrend}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: '6px', fontSize: '12px' }} labelFormatter={(_, payload) => payload[0]?.payload?.fullDate || ''} />
                    <Bar dataKey="present" name="Присутствовали" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="late" name="Опоздали" fill="hsl(var(--warning))" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="absent" name="Отсутствовали" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">Распределение</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, value }) => `${value}`}>
                      {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card className="lg:col-span-3">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-primary" />
                  Процент посещаемости по дням
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={dailyTrend}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                    <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: '6px', fontSize: '12px' }} />
                    <Line type="monotone" dataKey="rate" name="Посещаемость %" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="students" className="outline-none">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <User className="w-4 h-4 text-primary" />
                Статистика по ученикам
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left p-3 font-semibold">Ученик</th>
                      <th className="text-left p-3 font-semibold">Группа</th>
                      <th className="text-center p-3 font-semibold">Присутствовал</th>
                      <th className="text-center p-3 font-semibold">Опоздал</th>
                      <th className="text-center p-3 font-semibold">Отсутствовал</th>
                      <th className="text-center p-3 font-semibold">Всего</th>
                      <th className="text-center p-3 font-semibold">Посещаемость</th>
                    </tr>
                  </thead>
                  <tbody>
                    {studentStats.map(s => (
                      <tr key={s.id} className="border-b hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => navigate(`/student/${s.id}`)}>
                        <td className="p-3 font-medium">{s.name}</td>
                        <td className="p-3 text-muted-foreground">{s.group}</td>
                        <td className="p-3 text-center text-success font-medium">{s.present}</td>
                        <td className="p-3 text-center text-warning font-medium">{s.late}</td>
                        <td className="p-3 text-center text-destructive font-medium">{s.absent}</td>
                        <td className="p-3 text-center">{s.total}</td>
                        <td className="p-3 text-center">
                          <Badge variant={s.rate >= 90 ? 'default' : s.rate >= 70 ? 'secondary' : 'destructive'} className="text-xs">{s.rate}%</Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="groups" className="outline-none">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {groupStats.map(g => {
              const studentsInGroup = students.filter(s => s.group === g.group);
              return (
                <Card key={g.group} className="cursor-pointer hover:shadow-lg transition-shadow border-l-4 border-l-primary/40" onClick={() => setGroupModal({ open: true, group: g.group })}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Users className="w-4 h-4 text-primary" />
                      {g.group}
                    </CardTitle>
                    <p className="text-xs text-muted-foreground">{studentsInGroup.length} учеников</p>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Посещаемость</span>
                        <Badge variant={g.rate >= 90 ? 'default' : g.rate >= 70 ? 'secondary' : 'destructive'}>{g.rate}%</Badge>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div className="bg-success rounded-full h-2 transition-all" style={{ width: `${g.rate}%` }} />
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="p-2 bg-success/10 rounded-lg">
                          <div className="text-lg font-bold text-success">{g.present}</div>
                          <div className="text-xs text-muted-foreground">Были</div>
                        </div>
                        <div className="p-2 bg-warning/10 rounded-lg">
                          <div className="text-lg font-bold text-warning">{g.late}</div>
                          <div className="text-xs text-muted-foreground">Опозд.</div>
                        </div>
                        <div className="p-2 bg-destructive/10 rounded-lg">
                          <div className="text-lg font-bold text-destructive">{g.absent}</div>
                          <div className="text-xs text-muted-foreground">Отсутств.</div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <Dialog open={groupModal.open} onOpenChange={(o) => setGroupModal({ open: o, group: o ? groupModal.group : null })}>
            <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-0 gap-0 overflow-hidden bg-background">
              {groupModal.group && (() => {
                const studentsInGroup = students.filter(s => s.group === groupModal.group);
                const gStat = groupStats.find(g => g.group === groupModal.group);
                return (
                  <GroupDetailModalContent
                    group={groupModal.group}
                    studentsInGroup={studentsInGroup}
                    gStat={gStat}
                    attendanceData={localAttendance}
                    studentStats={studentStats}
                    selectedDate={selectedDate}
                    getStatusColor={getStatusColor}
                    onClose={() => setGroupModal({ open: false, group: null })}
                    onMarkAttendance={() => { setGroupModal({ open: false, group: null }); setSelectedGroup(groupModal.group!); setActiveTab('marking'); }}
                    navigate={navigate}
                  />
                );
              })()}
            </DialogContent>
          </Dialog>
        </TabsContent>

        <TabsContent value="marking" className="outline-none">
          <Card className="p-3 mb-3">
            <div className="flex items-center justify-between">
              <Button variant="ghost" size="sm" onClick={() => { setSelectedDate(subDays(selectedDate, 1)); setSelectedLessonId(null); }} className="focus-visible:ring-primary/30">
                <ChevronLeft className="w-4 h-4 mr-1" /> Пред. день
              </Button>
              <div className="text-center">
                <p className="font-semibold text-sm">{format(selectedDate, 'EEEE', { locale: ru })}</p>
                <p className="text-xs text-muted-foreground">{format(selectedDate, 'd MMMM yyyy', { locale: ru })}</p>
              </div>
              <div className="flex gap-1.5">
                <Button variant="outline" size="sm" onClick={() => { setSelectedDate(new Date()); setSelectedLessonId(null); }} className="focus-visible:ring-primary/30">Сегодня</Button>
                <Button variant="ghost" size="sm" onClick={() => { setSelectedDate(subDays(selectedDate, -1)); setSelectedLessonId(null); }} className="focus-visible:ring-primary/30">
                  След. день <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          </Card>

          <Card className="p-4 mb-3">
            <p className="text-sm font-semibold mb-3 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-primary" />
              Уроки (из расписания) на {format(selectedDate, 'EEEE, d MMM', { locale: ru })}
            </p>
            {dayLessons.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Нет уроков в этот день</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                {dayLessons.map((lesson: any) => {
                  const isActive = lesson.id === activeLessonId;
                  const lessonAtt = (localDB.getAttendance() || {})[lesson.id] || {};
                  
                  const presentCount = Object.values(lessonAtt).filter(v => v === 'present').length;
                  const absentCount = Object.values(lessonAtt).filter(v => v === 'absent').length;
                  const lateCount = Object.values(lessonAtt).filter(v => v === 'late').length;

                  return (
                    <button
                      key={lesson.id}
                      onClick={() => setSelectedLessonId(lesson.id)}
                      className={`p-3 rounded-lg border text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 ${
                        isActive
                          ? 'border-primary bg-primary/5 ring-2 ring-primary/20 shadow-sm'
                          : 'border-border hover:bg-muted/50 hover:border-muted-foreground/20'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] text-muted-foreground">{lesson.start_time}-{lesson.end_time}</span>
                      </div>
                      <p className={`font-semibold text-sm ${isActive ? 'text-primary' : ''}`}>{lesson.subject}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">Учитель: {lesson.teacher_id}</p>
                      <div className="flex items-center gap-1 mt-1.5 text-[10px]">
                        <span className="px-1.5 py-0.5 bg-background border rounded">{lesson.group_id}</span>
                        {lesson.classroom && <span className="px-1.5 py-0.5 bg-background border rounded">{lesson.classroom}</span>}
                      </div>
                      {(presentCount > 0 || absentCount > 0 || lateCount > 0) && (
                        <div className="flex items-center gap-2 mt-2 text-[10px]">
                          <span className="text-success font-medium">✓{presentCount}</span>
                          <span className="text-warning font-medium">⏱{lateCount}</span>
                          <span className="text-destructive font-medium">✗{absentCount}</span>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </Card>

          {activeLesson && (
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-primary" />
                      {activeLesson.subject} — {activeLesson.group_id}
                    </CardTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {activeLesson.start_time}-{activeLesson.end_time} • {activeLesson.classroom}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <div className="relative w-48">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input placeholder="Поиск..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-8 h-9 focus-visible:ring-primary/30" />
                    </div>
                    <Button size="sm" variant="outline" onClick={openNotifyModal} className="focus-visible:ring-primary/30">
                      <Bell className="w-4 h-4 mr-1" />
                      Уведомить
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="text-left p-3 font-semibold text-sm w-8">#</th>
                        <th className="text-left p-3 font-semibold text-sm">Ученик</th>
                        <th className="text-left p-3 font-semibold text-sm">Статус</th>
                        <th className="text-left p-3 font-semibold text-sm">Действия</th>
                        <th className="text-left p-3 font-semibold text-sm">Родитель</th>
                      </tr>
                    </thead>
                    <tbody>
                      {todayRecords.map((record, idx) => (
                        <tr key={record.studentId} className="border-b hover:bg-muted/30 transition-colors">
                          <td className="p-3 text-xs text-muted-foreground">{idx + 1}</td>
                          <td className="p-3">
                            <div className="flex items-center gap-2.5 cursor-pointer group" onClick={() => navigate(`/student/${record.studentId}`)}>
                              <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                                {record.studentName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                              </div>
                              <span className="font-medium text-sm group-hover:underline">{record.studentName}</span>
                            </div>
                          </td>
                          <td className="p-3">
                            <Badge className={`${getStatusColor(record.status)} border-0`}>
                              {record.status === 'present' ? 'Присутствует' : record.status === 'absent' ? 'Отсутствует' : record.status === 'late' ? 'Опоздал' : 'Не отмечено'}
                            </Badge>
                          </td>
                          <td className="p-3">
                            <div className="flex gap-1.5">
                              <Button size="sm" variant={record.status === 'present' ? 'default' : 'outline'} className="h-7 text-xs focus-visible:ring-primary/30" onClick={() => handleMarkAttendance(record.studentId, 'present')}>
                                <CheckCircle className="w-3 h-3 mr-1" />П
                              </Button>
                              <Button size="sm" variant={record.status === 'late' ? 'default' : 'outline'} className="h-7 text-xs focus-visible:ring-primary/30" onClick={() => handleMarkAttendance(record.studentId, 'late')}>
                                <Clock className="w-3 h-3 mr-1" />О
                              </Button>
                              <Button size="sm" variant={record.status === 'absent' ? 'destructive' : 'outline'} className="h-7 text-xs focus-visible:ring-destructive/30" onClick={() => handleMarkAttendance(record.studentId, 'absent')}>
                                <XCircle className="w-3 h-3 mr-1" />Н
                              </Button>
                            </div>
                          </td>
                          <td className="p-3">
                            {(record.status === 'absent' || record.status === 'late') ? (
                              <Button size="sm" variant="ghost" className="h-7 text-xs focus-visible:ring-primary/30" onClick={() => handleNotifyParent(record.studentId, record.status as 'absent' | 'late')}>
                                <Bell className="w-3 h-3 mr-1" /> {record.parentName}
                              </Button>
                            ) : (
                              <span className="text-xs text-muted-foreground">{record.parentName}</span>
                            )}
                          </td>
                        </tr>
                      ))}
                      {todayRecords.length === 0 && (
                        <tr><td colSpan={5} className="p-8 text-center text-muted-foreground text-sm">Нет учеников для отметки</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {!activeLesson && dayLessons.length > 0 && (
            <Card className="p-8 text-center">
              <BookOpen className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Выберите урок из расписания выше для отметки учеников</p>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Notify Parents Modal */}
      <Dialog open={notifyModal} onOpenChange={setNotifyModal}>
        <DialogContent className="max-w-lg max-h-[85vh] flex flex-col p-0 gap-0 overflow-hidden bg-background">
          <DialogHeader className="p-5 pb-3 border-b">
            <DialogTitle className="text-base flex items-center gap-2">
              <Bell className="w-5 h-5 text-primary" />
              Уведомить родителей
            </DialogTitle>
            <DialogDescription className="text-xs">
              {format(selectedDate, 'd MMMM yyyy, EEEE', { locale: ru })}
            </DialogDescription>
          </DialogHeader>
          <div className="overflow-y-auto flex-1 p-5 space-y-4 custom-scrollbar">
            <div>
              <p className="text-sm font-semibold mb-2">Кого уведомить?</p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { key: 'all' as const, label: 'Всех (отсутств. + опозд.)', icon: <Users className="w-4 h-4" />, count: todayRecords.filter(r => r.status === 'absent' || r.status === 'late').length },
                  { key: 'absent' as const, label: 'Только отсутствующих', icon: <XCircle className="w-4 h-4" />, count: todayRecords.filter(r => r.status === 'absent').length },
                  { key: 'late' as const, label: 'Только опоздавших', icon: <Clock className="w-4 h-4" />, count: todayRecords.filter(r => r.status === 'late').length },
                  { key: 'custom' as const, label: 'Выбрать вручную', icon: <UserCheck className="w-4 h-4" />, count: notifyCustomSelected.size },
                ].map(opt => (
                  <button
                    key={opt.key}
                    onClick={() => setNotifyFilter(opt.key)}
                    className={`flex items-center gap-2.5 p-3 rounded-lg border text-left transition-all text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 ${
                      notifyFilter === opt.key
                        ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
                        : 'border-border hover:bg-muted/50'
                    }`}
                  >
                    <span className={notifyFilter === opt.key ? 'text-primary' : 'text-muted-foreground'}>{opt.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium leading-tight">{opt.label}</p>
                      <p className="text-[10px] text-muted-foreground">{opt.count} чел.</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {notifyFilter === 'custom' && (
              <div className="border rounded-lg p-3 bg-muted/10">
                <p className="text-xs font-semibold mb-2">Выберите учеников:</p>
                <div className="space-y-1 max-h-48 overflow-y-auto custom-scrollbar">
                  {todayRecords.filter(r => r.status !== 'present' && r.status !== 'not_marked').map(r => (
                    <label key={r.studentId} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer">
                      <Checkbox
                        checked={notifyCustomSelected.has(r.studentId)}
                        onCheckedChange={() => toggleCustomStudent(r.studentId)}
                        className="focus-visible:ring-primary/30"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{r.studentName}</p>
                        <p className="text-[10px] text-muted-foreground">{r.group} • {r.parentName}</p>
                      </div>
                      <Badge className={`${getStatusColor(r.status)} text-[10px] border-0`}>
                        {r.status === 'absent' ? 'Отсутств.' : 'Опозд.'}
                      </Badge>
                    </label>
                  ))}
                  {todayRecords.filter(r => r.status !== 'present' && r.status !== 'not_marked').length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-4">Нет учеников с пропусками</p>
                  )}
                </div>
              </div>
            )}

            <div>
              <p className="text-sm font-semibold mb-2">Получатели ({getNotifyRecipients.length})</p>
              {getNotifyRecipients.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {getNotifyRecipients.map(r => (
                    <Badge key={r.studentId} variant="outline" className="text-[10px] flex items-center gap-1">
                      {r.status === 'absent' ? <XCircle className="w-2.5 h-2.5 text-destructive" /> : <Clock className="w-2.5 h-2.5 text-warning" />}
                      {r.studentName} → {r.parentName}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">Нет получателей</p>
              )}
            </div>

            <div>
              <p className="text-sm font-semibold mb-2">Текст уведомления</p>
              <Textarea
                value={notifyMessage}
                onChange={e => setNotifyMessage(e.target.value)}
                rows={3}
                className="text-sm resize-none focus-visible:ring-primary/30"
                placeholder="Введите текст уведомления..."
              />
            </div>

            <Button className="w-full h-11 focus-visible:ring-primary/30" onClick={handleSendNotifications} disabled={getNotifyRecipients.length === 0}>
              <Send className="w-4 h-4 mr-2" />
              Отправить {getNotifyRecipients.length} уведомлений
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Attendance;