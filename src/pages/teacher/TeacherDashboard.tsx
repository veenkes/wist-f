// src/pages/CEODashboard.tsx
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ru, uz, enUS } from 'date-fns/locale';

import { toast } from 'sonner';

import {
  Users,
  BookOpen,
  Calendar as CalendarIcon,
  AlertCircle,
  Search,
  Eye,
  Clock,
  GraduationCap,
  Baby,
  School,
  Building2,
  TrendingUp,
  BarChart3,
  Mail,
  Phone,
  FileText,
  Upload,
  Paperclip,
  Plus,
  X,
  MapPin,
  RefreshCcw,
} from 'lucide-react';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
  Legend,
  AreaChart,
  Area,
  Line,
} from 'recharts';

import { localDB } from '@/lib/localDb';
import { studentService } from '@/services/student.service';
import { apiClient } from '@/lib/api-client';
import { cn } from '@/lib/utils';

type LevelFilter = 'all' | 'kindergarten' | 'primary' | 'secondary';
type WistGrade = 'PN' | 'N' | 'R' | `Y${number}` | string;
type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused' | 'not_marked';
type AttendanceStore = Record<string, Record<string, AttendanceStatus>>;
type HomeworkStore = Record<string, any>;
type LessonAny = Record<string, any>;
type EmployeeAny = Record<string, any>;
type StudentAny = Record<string, any>;

const GROUP_COLORS = [
  'hsl(142, 76%, 36%)',
  'hsl(221, 83%, 53%)',
  'hsl(262, 83%, 58%)',
  'hsl(25, 95%, 53%)',
  'hsl(346, 77%, 49%)',
  'hsl(174, 72%, 40%)',
  'hsl(45, 93%, 47%)',
  'hsl(280, 67%, 51%)',
  'hsl(199, 89%, 48%)',
  'hsl(12, 76%, 61%)',
];

function normalizeWistGrade(raw: any): WistGrade {
  const v = String(raw ?? '').trim().toUpperCase();
  if (!v) return '';
  if (v === 'PN' || v === 'N' || v === 'R') return v;
  if (/^Y\d{1,2}$/.test(v)) return v as WistGrade;
  return v;
}

function gradeToYearNumber(grade: WistGrade): number | null {
  const g = normalizeWistGrade(grade);
  if (g === 'PN' || g === 'N' || g === 'R') return 0;
  const m = /^Y(\d{1,2})$/.exec(g);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) ? n : null;
}

function gradeToLevel(grade: WistGrade): 'Kindergarten' | 'Primary' | 'Secondary' {
  const y = gradeToYearNumber(grade);
  if (y === 0) return 'Kindergarten';
  if (y !== null && y <= 9) return 'Primary';
  return 'Secondary';
}

function levelFilterMatch(level: 'Kindergarten' | 'Primary' | 'Secondary', filter: LevelFilter) {
  if (filter === 'all') return true;
  if (filter === 'kindergarten') return level === 'Kindergarten';
  if (filter === 'primary') return level === 'Primary';
  return level === 'Secondary';
}

function safeName(student: any) {
  if (student?.full_name) return student.full_name;
  const n = `${student?.name ?? ''} ${student?.surname ?? ''}`.trim();
  return n || 'Student';
}

function toISODate(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function isSameISODate(a: string, b: string) {
  return String(a).slice(0, 10) === String(b).slice(0, 10);
}

function lessonOccursOnDate(lesson: LessonAny, date: Date): boolean {
  if (lesson.is_draft) return false;
  const recurrence = String(lesson.recurrence ?? 'weekly');
  const dateISO = lesson.date_iso ? String(lesson.date_iso).slice(0, 10) : null;
  const targetISO = toISODate(date);
  const jsWeekday = date.getDay();
  const dayOfWeek = jsWeekday === 0 ? 7 : jsWeekday; 
  const lessonDay = Number(lesson.day_of_week ?? lesson.dayOfWeek ?? 0);

  if (recurrence === 'none') {
    if (!dateISO) return false;
    return isSameISODate(dateISO, targetISO);
  }
  if (recurrence === 'daily') {
    if (!dateISO) return true;
    return targetISO >= dateISO;
  }
  if (lessonDay !== dayOfWeek) return false;
  if (!dateISO) return true;
  return targetISO >= dateISO;
}

const CEODashboard: React.FC = () => {
  const { user } = useAuth();
  const { t, language } = useTheme();
  const navigate = useNavigate();

  const [students, setStudents] = useState<StudentAny[]>([]);
  const [teachers, setTeachers] = useState<EmployeeAny[]>([]);
  const [loading, setLoading] = useState(true);
  const [lessons, setLessons] = useState<LessonAny[]>([]);
  const [attendanceStore, setAttendanceStore] = useState<AttendanceStore>({});
  const [homeworksStore, setHomeworksStore] = useState<HomeworkStore>({});
  const [violations, setViolations] = useState<any[]>([]);

  const refreshLocal = useCallback(() => {
    setLessons(localDB.getLessons() || []);
    setAttendanceStore((localDB.getAttendance() || {}) as AttendanceStore);
    setHomeworksStore((localDB.getHomeworks() || {}) as HomeworkStore);
    setViolations(localDB.getViolations() || []);
  }, []);

  const refreshRemote = useCallback(async () => {
    setLoading(true);
    try {
      const [st, emp] = await Promise.all([
        studentService.listStudents({ limit: 1000 }).catch(() => ({ data: [] })),
        apiClient.get<any>('/employees').catch(() => null),
      ]);

      const studentList = Array.isArray(st?.data) ? st.data : (Array.isArray(st) ? st : []);
      setStudents(studentList);

      const employees = emp?.employees || emp?.data?.employees || emp?.data || [];
      const teacherList = Array.isArray(employees)
        ? employees
            .filter((e: any) => !e.role || String(e.role).toLowerCase().includes('teacher') || String(e.position || '').toLowerCase().includes('teacher'))
            .map((e: any) => ({
              id: e.id,
              full_name: e.full_name || e.name || 'Teacher',
              email: e.email,
              phone: e.phone,
              role: e.role,
            }))
        : [];
      setTeachers(teacherList);
    } catch (e: any) {
      console.error(e);
      toast.error(t('common.error'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    refreshLocal();
    refreshRemote();

    const onStorage = (ev: StorageEvent) => {
      if (!ev.key) return;
      if (['wist_lessons', 'wist_attendance', 'wist_homeworks', 'wist_violations'].includes(ev.key)) {
        refreshLocal();
      }
    };
    const onFocus = () => refreshLocal();

    window.addEventListener('storage', onStorage);
    window.addEventListener('focus', onFocus);

    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('focus', onFocus);
    };
  }, [refreshLocal, refreshRemote]);

  const [levelFilter, setLevelFilter] = useState<LevelFilter>('all');
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // ФИЛЬТРЫ АНАЛИТИКИ
  const [attendancePeriod, setAttendancePeriod] = useState<'week' | 'month' | 'quarter'>('month');
  const [attendanceGroupFilter, setAttendanceGroupFilter] = useState('all');
  const [attendanceStudentFilter, setAttendanceStudentFilter] = useState('all');
  const [violationGroupFilter, setViolationGroupFilter] = useState('all');

  const [homeworkModal, setHomeworkModal] = useState<{ open: boolean; lessonId: string | null }>({ open: false, lessonId: null });
  const [homeworkText, setHomeworkText] = useState('');
  const [homeworkFiles, setHomeworkFiles] = useState<{ name: string; url?: string }[]>([]);

  const today = useMemo(() => new Date(), []);
  const todayISO = useMemo(() => toISODate(today), [today]);
  const dateLocale = language === 'ru' ? ru : language === 'uz' ? uz : enUS;

  // 1. Формируем группы и их статистику
  const groupsWithData = useMemo(() => {
    const byGrade = new Map<string, StudentAny[]>();

    for (const s of students) {
      const grade = normalizeWistGrade(s.grade ?? s.academic_level ?? s.className ?? s.class_name ?? s.group?.name ?? s.group_name);
      if (!grade) continue;
      if (!byGrade.has(grade)) byGrade.set(grade, []);
      byGrade.get(grade)!.push(s);
    }

    const grades = Array.from(byGrade.keys()).sort((a, b) => {
      const ra = a === 'PN' ? -3 : a === 'N' ? -2 : a === 'R' ? -1 : 0;
      const rb = b === 'PN' ? -3 : b === 'N' ? -2 : b === 'R' ? -1 : 0;
      if (ra !== rb) return ra - rb;
      const ya = gradeToYearNumber(a);
      const yb = gradeToYearNumber(b);
      if (ya === null || yb === null) return a.localeCompare(b);
      return ya - yb;
    });

    const result = grades.map((grade, idx) => {
      const st = byGrade.get(grade) || [];
      const list = st.map((s) => ({
        id: String(s.id),
        full_name: safeName(s),
        status: s.status || 'active',
        academic_level: grade,
      }));

      const level = gradeToLevel(grade);
      const activeCount = list.filter((x) => x.status === 'active').length;

      // Расчет посещаемости именно для этой группы
      let p = 0, tCount = 0;
      const studentIds = new Set(list.map(s => String(s.id)));
      
      for (const map of Object.values(attendanceStore)) {
        for (const [sId, status] of Object.entries(map)) {
          if (studentIds.has(sId)) {
            if (status === 'present' || status === 'late' || status === 'excused') p++;
            if (status === 'present' || status === 'late' || status === 'excused' || status === 'absent') tCount++;
          }
        }
      }

      return {
        id: grade,
        name: grade,
        level,
        color: GROUP_COLORS[idx % GROUP_COLORS.length],
        teacher: { name: t('common.notAssigned'), email: '', phone: '' },
        students: list,
        activeCount,
        attendance: tCount > 0 ? Math.round((p / tCount) * 100) : 0,
      };
    });

    return result.filter((g) => levelFilterMatch(g.level, levelFilter));
  }, [students, attendanceStore, levelFilter, t]);

  const groupChartData = useMemo(() => {
    return groupsWithData.map((g) => ({
      name: g.name,
      students: g.students.length,
      level: t(`level.${g.level.toLowerCase()}`),
      attendance: g.attendance,
      active: g.activeCount,
      color: g.color,
    }));
  }, [groupsWithData, t]);

  const totalStudents = useMemo(() => groupsWithData.reduce((sum, g) => sum + g.students.length, 0), [groupsWithData]);
  const totalGroups = useMemo(() => groupsWithData.length, [groupsWithData]);

  const selectedGroupData = useMemo(() => {
    if (!selectedGroup) return null;
    return groupsWithData.find((g) => g.name === selectedGroup) || null;
  }, [groupsWithData, selectedGroup]);

  const filteredGroupStudents = useMemo(() => {
    if (!selectedGroupData) return [];
    const list = selectedGroupData.students || [];
    if (!searchQuery.trim()) return list;
    const q = searchQuery.trim().toLowerCase();
    return list.filter((s: any) => String(s.full_name || '').toLowerCase().includes(q));
  }, [selectedGroupData, searchQuery]);

  const todaySchedule = useMemo(() => {
    const validGroupNames = new Set(groupsWithData.map(g => normalizeWistGrade(g.name)));

    const list = lessons
      .filter((l: any) => {
        if (!lessonOccursOnDate(l, today)) return false;
        if (levelFilter === 'all') return true;
        const lGrade = normalizeWistGrade(l.group_id ?? l.groupId);
        return validGroupNames.has(lGrade);
      })
      .sort((a: any, b: any) => String(a.start_time || '').localeCompare(String(b.start_time || '')));

    return list.map((l: any) => ({
      id: String(l.id),
      time: String(l.start_time || '').slice(0, 5),
      subject: String(l.subject || l.title || 'Lesson'),
      group: String(l.group_id || l.groupId || ''),
      classroom: l.classroom || null,
      roomLabel: l.classroom ? `${t('common.roomShort')} ${l.classroom}` : '',
    }));
  }, [lessons, today, groupsWithData, levelFilter, t]);

  const todayLessons = useMemo(() => todaySchedule.length, [todaySchedule]);

  // 2. Расширенная логика посещаемости для аналитики
  const allStudentsFlat = useMemo(() => {
    return groupsWithData.flatMap((g) =>
      g.students.map((s: any) => ({ ...s, group: g.name, groupId: g.id, color: g.color }))
    );
  }, [groupsWithData]);

  const attendanceFilteredStudents = useMemo(() => {
    if (attendanceGroupFilter === 'all') return allStudentsFlat;
    return allStudentsFlat.filter((s: any) => s.group === attendanceGroupFilter);
  }, [allStudentsFlat, attendanceGroupFilter]);

  const attendanceDistribution = useMemo(() => {
    let present = 0, absent = 0, late = 0, total = 0;
    const allowedStudents = new Set(attendanceFilteredStudents.map(s => String(s.id)));

    for (const map of Object.values(attendanceStore)) {
      for (const [studentId, status] of Object.entries(map)) {
        if (!allowedStudents.has(String(studentId))) continue;
        if (attendanceStudentFilter !== 'all' && String(studentId) !== String(attendanceStudentFilter)) continue;

        if (status === 'present' || status === 'excused') { present++; total++; }
        else if (status === 'absent') { absent++; total++; }
        else if (status === 'late') { late++; total++; }
      }
    }

    if (total === 0) {
      return [
        { name: t('attendance.present'), value: 0, fill: 'hsl(142, 76%, 36%)' },
        { name: t('attendance.absent'), value: 0, fill: 'hsl(0, 84%, 60%)' },
        { name: t('attendance.late'), value: 0, fill: 'hsl(45, 93%, 47%)' },
      ];
    }

    const p = Math.round((present / total) * 100);
    const a = Math.round((absent / total) * 100);
    const l = Math.max(0, 100 - p - a);

    return [
      { name: t('attendance.present'), value: p, fill: 'hsl(142, 76%, 36%)' },
      { name: t('attendance.absent'), value: a, fill: 'hsl(0, 84%, 60%)' },
      { name: t('attendance.late'), value: l, fill: 'hsl(45, 93%, 47%)' },
    ];
  }, [attendanceStore, attendanceFilteredStudents, attendanceStudentFilter, t]);

  // Динамический тренд посещаемости по датам
  const attendanceTrendData = useMemo(() => {
    const dateMap: Record<string, { p: number, a: number, l: number }> = {};
    const allowedStudents = new Set(attendanceFilteredStudents.map(s => String(s.id)));

    Object.entries(attendanceStore).forEach(([lessonId, marks]) => {
      const lesson = lessons.find(l => String(l.id) === lessonId);
      // Если даты нет, группируем в 'Other'
      const date = lesson?.date_iso ? String(lesson.date_iso).slice(0, 10) : 'Other';
      if (!dateMap[date]) dateMap[date] = { p: 0, a: 0, l: 0 };

      Object.entries(marks).forEach(([sId, status]) => {
        if (!allowedStudents.has(sId)) return;
        if (attendanceStudentFilter !== 'all' && sId !== String(attendanceStudentFilter)) return;

        if (status === 'present' || status === 'excused') dateMap[date].p++;
        else if (status === 'absent') dateMap[date].a++;
        else if (status === 'late') dateMap[date].l++;
      });
    });

    const sortedDates = Object.keys(dateMap).filter(d => d !== 'Other').sort();
    
    if (sortedDates.length > 0) {
      return sortedDates.slice(-7).map(date => {
        const counts = dateMap[date];
        const total = counts.p + counts.a + counts.l;
        if (total === 0) return { label: date.slice(5), present: 0, absent: 0, late: 0 };
        return {
          label: date.slice(5), // показывает MM-DD
          present: Math.round((counts.p / total) * 100),
          absent: Math.round((counts.a / total) * 100),
          late: Math.round((counts.l / total) * 100),
        };
      });
    }

    // Fallback, если дат нет вообще
    const basePresent = attendanceDistribution[0]?.value ?? 0;
    const baseAbsent = attendanceDistribution[1]?.value ?? 0;
    const baseLate = attendanceDistribution[2]?.value ?? 0;
    return ['1', '2', '3', '4', '5'].map((label) => ({ label, present: basePresent, absent: baseAbsent, late: baseLate }));
  }, [attendanceStore, lessons, attendanceFilteredStudents, attendanceDistribution, attendanceStudentFilter]);

  const attendanceByGroup = useMemo(() => {
    const filtered = attendanceGroupFilter !== 'all' ? groupsWithData.filter((g) => g.name === attendanceGroupFilter) : groupsWithData;
    return filtered.map((g) => ({
      name: g.name.length > 8 ? g.name.slice(0, 8) + '..' : g.name,
      fullName: g.name,
      rate: Number(g.attendance || 0),
      color: g.color,
    }));
  }, [groupsWithData, attendanceGroupFilter]);

  const calcAttendanceForStudent = useCallback((studentId: string) => {
    let p = 0, tCount = 0;
    for (const map of Object.values(attendanceStore)) {
      const st = map[studentId];
      if (!st) continue;
      if (st === 'present' || st === 'late' || st === 'excused') p++;
      if (st === 'present' || st === 'late' || st === 'excused' || st === 'absent') tCount++;
    }
    if (tCount === 0) return null;
    return Math.round((p / tCount) * 100);
  }, [attendanceStore]);

  const topStudents = useMemo(() => {
    const list = attendanceGroupFilter !== 'all' ? allStudentsFlat.filter((s: any) => s.group === attendanceGroupFilter) : allStudentsFlat;
    return list
      .map((s: any) => {
        const rate = calcAttendanceForStudent(String(s.id));
        return { ...s, attendance: rate ?? 0, hasMarks: rate !== null };
      })
      .filter((x: any) => x.hasMarks)
      .sort((a: any, b: any) => b.attendance - a.attendance)
      .slice(0, 5);
  }, [attendanceGroupFilter, allStudentsFlat, calcAttendanceForStudent]);

  const bottomStudents = useMemo(() => {
    const list = attendanceGroupFilter !== 'all' ? allStudentsFlat.filter((s: any) => s.group === attendanceGroupFilter) : allStudentsFlat;
    return list
      .map((s: any) => {
        const rate = calcAttendanceForStudent(String(s.id));
        return { ...s, attendance: rate ?? 0, hasMarks: rate !== null };
      })
      .filter((x: any) => x.hasMarks)
      .sort((a: any, b: any) => a.attendance - b.attendance)
      .slice(0, 5);
  }, [attendanceGroupFilter, allStudentsFlat, calcAttendanceForStudent]);

  // Фильтр нарушений
  const filteredDashboardViolations = useMemo(() => {
    const items = Array.isArray(violations) ? violations : [];
    const validGroupNames = new Set(groupsWithData.map(g => normalizeWistGrade(g.name)));

    let list = items.filter(v => {
      const vGrade = normalizeWistGrade(v.group || v.grade || v.studentGroup);
      if (levelFilter !== 'all' && !validGroupNames.has(vGrade)) return false;
      if (violationGroupFilter !== 'all' && vGrade !== normalizeWistGrade(violationGroupFilter)) return false;
      return true;
    });

    return list.slice(0, 6).map(v => ({
      id: v.id,
      student: v.studentName || v.student || v.studentFullName || 'Student',
      type: v.type || v.title || 'Violation',
      date: String(v.date || v.createdAt || '').slice(0, 10),
      status: v.status || 'pending',
      group: v.group || v.studentGroup || v.grade || '',
    }));
  }, [violations, groupsWithData, levelFilter, violationGroupFilter]);

  // Обработчики домашки
  const handleOpenHomework = useCallback((lessonId: string) => {
    const existing = (localDB.getHomeworks() as any)[lessonId];
    if (existing) {
      setHomeworkText(String(existing.text || existing.description || ''));
      setHomeworkFiles(Array.isArray(existing.files) ? existing.files : []);
    } else {
      setHomeworkText('');
      setHomeworkFiles([]);
    }
    setHomeworkModal({ open: true, lessonId });
  }, []);

  const handleSaveHomework = useCallback(() => {
    if (!homeworkModal.lessonId) return;
    const next = localDB.getHomeworks() as Record<string, any>;
    next[homeworkModal.lessonId] = { text: homeworkText, files: homeworkFiles, createdAt: new Date().toISOString(), date: todayISO };
    localDB.saveHomeworks(next);
    setHomeworksStore(next);
    toast.success(t('toast.success.saved'));
    setHomeworkModal({ open: false, lessonId: null });
  }, [homeworkModal.lessonId, homeworkText, homeworkFiles, todayISO, t]);

  const handleAddFile = useCallback(() => {
    const fileName = `${t('common.files')}_${homeworkFiles.length + 1}.pdf`;
    setHomeworkFiles((prev) => [...prev, { name: fileName }]);
    toast.success(t('common.add'));
  }, [homeworkFiles.length, t]);

  const handleRemoveFile = useCallback((index: number) => {
    setHomeworkFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleChartClick = useCallback((data: any) => {
    if (data && data.activePayload && data.activePayload[0]?.payload?.name) {
      setSelectedGroup(String(data.activePayload[0].payload.name));
      setSearchQuery('');
    }
  }, []);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-xl font-bold text-foreground">
            {t('dashboard.welcome')}, {user?.name || 'User'}!
          </h1>
          <p className="text-sm text-muted-foreground">{t('dashboard.overview')}</p>

          <div className="flex items-center gap-2 pt-1">
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => { refreshRemote(); refreshLocal(); }}>
              <RefreshCcw className="w-3.5 h-3.5 mr-2" />
              {t('common.refresh')}
            </Button>
            {loading && <span className="text-xs text-muted-foreground">{t('common.loading')}</span>}
          </div>
        </div>

        <Tabs value={levelFilter} onValueChange={(v) => setLevelFilter(v as LevelFilter)} className="w-auto">
          <TabsList className="grid grid-cols-4">
            <TabsTrigger value="all" className="text-xs px-3">{t('common.all')}</TabsTrigger>
            <TabsTrigger value="kindergarten" className="text-xs px-3"><Baby className="w-3 h-3 mr-1" />{t('level.kindergarten')}</TabsTrigger>
            <TabsTrigger value="primary" className="text-xs px-3"><School className="w-3 h-3 mr-1" />{t('level.primary')}</TabsTrigger>
            <TabsTrigger value="secondary" className="text-xs px-3"><Building2 className="w-3 h-3 mr-1" />{t('level.secondary')}</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Main KPI + Distribution Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="space-y-3">
          <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">{t('students.total')}</p>
                  <p className="text-2xl font-bold text-foreground">{totalStudents}</p>
                </div>
                <div className="p-3 bg-primary/10 rounded-xl"><Users className="w-5 h-5 text-primary" /></div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-success/5 to-success/10 border-success/20">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">{t('dashboard.todayLessons')}</p>
                  <p className="text-2xl font-bold text-foreground">{todayLessons}</p>
                </div>
                <div className="p-3 bg-success/10 rounded-xl"><BookOpen className="w-5 h-5 text-success" /></div>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">{t('dashboard.scheduleNote')}</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-warning/5 to-warning/10 border-warning/20">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">{t('dashboard.totalGrades')}</p>
                  <p className="text-2xl font-bold text-foreground">{totalGroups}</p>
                </div>
                <div className="p-3 bg-warning/10 rounded-xl"><GraduationCap className="w-5 h-5 text-warning" /></div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2">
          <Card className="h-full">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <BarChart3 className="w-5 h-5 text-primary" />
                {t('dashboard.distributionByGrade')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[240px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={groupChartData} margin={{ top: 10, right: 20, left: 10, bottom: 60 }} onClick={handleChartClick}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-45} textAnchor="end" height={70} interval={0} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const d = payload[0].payload;
                          return (
                            <div className="bg-popover border border-border rounded-lg p-3 shadow-lg">
                              <p className="font-semibold">{d.name}</p>
                              <p className="text-sm text-muted-foreground">{d.level}</p>
                              <p className="text-sm">{t('common.students')}: <span className="font-medium">{d.students}</span></p>
                              <p className="text-sm">{t('nav.attendance')}: <span className="font-medium">{d.attendance}%</span></p>
                              <p className="text-xs text-primary mt-1">{t('common.clickToView')}</p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar dataKey="students" radius={[4, 4, 0, 0]} cursor="pointer">
                      {groupChartData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              {!students.length && !loading && (
                <p className="text-xs text-muted-foreground mt-3 text-center">{t('students.noStudentsData')}</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ===== ATTENDANCE ANALYTICS ===== */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-bold flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" />
            {t('dashboard.attendanceAnalytics')}
          </h2>

          <div className="flex flex-wrap items-center gap-2">
            <Select value={attendanceGroupFilter} onValueChange={(v) => { setAttendanceGroupFilter(v); setAttendanceStudentFilter('all'); }}>
              <SelectTrigger className="h-7 text-xs w-[140px]"><SelectValue placeholder="Grade" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('common.allGrades')}</SelectItem>
                {groupsWithData.map((g) => <SelectItem key={g.id} value={g.name}>{g.name}</SelectItem>)}
              </SelectContent>
            </Select>

            <Select value={attendanceStudentFilter} onValueChange={setAttendanceStudentFilter}>
              <SelectTrigger className="h-7 text-xs w-[170px]"><SelectValue placeholder={t('common.student')} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('common.allStudents')}</SelectItem>
                {attendanceFilteredStudents.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>)}
              </SelectContent>
            </Select>

            <Tabs value={attendancePeriod} onValueChange={(v) => setAttendancePeriod(v as any)} className="w-auto">
              <TabsList className="h-7">
                <TabsTrigger value="week" className="text-[11px] px-2 h-6">{t('common.weekShort')}</TabsTrigger>
                <TabsTrigger value="month" className="text-[11px] px-2 h-6">{t('common.monthShort')}</TabsTrigger>
                <TabsTrigger value="quarter" className="text-[11px] px-2 h-6">{t('common.quarterShort')}</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <Card className="p-3 text-center bg-gradient-to-br from-success/5 to-success/10 border-success/20">
            <p className="text-xl font-bold text-success">{attendanceDistribution[0]?.value ?? 0}%</p>
            <p className="text-[10px] text-muted-foreground">{t('dashboard.avgPresent')}</p>
          </Card>
          <Card className="p-3 text-center bg-gradient-to-br from-destructive/5 to-destructive/10 border-destructive/20">
            <p className="text-xl font-bold text-destructive">{attendanceDistribution[1]?.value ?? 0}%</p>
            <p className="text-[10px] text-muted-foreground">{t('attendance.absent')}</p>
          </Card>
          <Card className="p-3 text-center bg-gradient-to-br from-warning/5 to-warning/10 border-warning/20">
            <p className="text-xl font-bold text-warning">{attendanceDistribution[2]?.value ?? 0}%</p>
            <p className="text-[10px] text-muted-foreground">{t('attendance.late')}</p>
          </Card>
          <Card className="p-3 text-center">
            <p className="text-xl font-bold text-foreground">{attendanceStudentFilter !== 'all' ? 1 : attendanceFilteredStudents.length}</p>
            <p className="text-[10px] text-muted-foreground">{t('common.students')}</p>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          <Card className="lg:col-span-2 p-3">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              {t('dashboard.trend')}
            </h3>
            <div className="h-[185px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={attendanceTrendData}>
                  <defs>
                    <linearGradient id="gradPresent" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="hsl(142, 76%, 36%)" stopOpacity={0.3} /><stop offset="95%" stopColor="hsl(142, 76%, 36%)" stopOpacity={0} /></linearGradient>
                    <linearGradient id="gradAbsent" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="hsl(0, 84%, 60%)" stopOpacity={0.3} /><stop offset="95%" stopColor="hsl(0, 84%, 60%)" stopOpacity={0} /></linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }}
                    formatter={(value: number, name: string) => [
                      `${value}%`,
                      name === 'present' ? t('attendance.present') : name === 'absent' ? t('attendance.absent') : t('attendance.late'),
                    ]}
                  />
                  <Area type="monotone" dataKey="present" stroke="hsl(142, 76%, 36%)" fill="url(#gradPresent)" strokeWidth={2} />
                  <Area type="monotone" dataKey="absent" stroke="hsl(0, 84%, 60%)" fill="url(#gradAbsent)" strokeWidth={2} />
                  <Line type="monotone" dataKey="late" stroke="hsl(45, 93%, 47%)" strokeWidth={2} dot={{ r: 3 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card className="p-3">
            <h3 className="text-xs font-semibold mb-2">{t('dashboard.distribution')}</h3>
            <div className="h-[165px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={attendanceDistribution} innerRadius={40} outerRadius={65} paddingAngle={3} dataKey="value">
                    {attendanceDistribution.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => `${v}%`} />
                  <Legend verticalAlign="bottom" iconSize={8} formatter={(value) => <span className="text-xs">{value as any}</span>} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <Card className="p-3">
            <h3 className="text-xs font-semibold mb-2">{t('dashboard.attendanceByGrade')}</h3>
            <div className="h-[170px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={attendanceByGroup} layout="vertical" margin={{ left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10 }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={60} />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '6px', fontSize: '12px' }}
                    formatter={(v: number) => [`${v}%`, t('nav.attendance')]}
                    labelFormatter={(_, p) => p[0]?.payload?.fullName || ''}
                  />
                  <Bar dataKey="rate" radius={[0, 4, 4, 0]}>
                    {attendanceByGroup.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Card className="p-3">
              <h3 className="text-xs font-semibold mb-1.5 flex items-center gap-1">
                <TrendingUp className="w-3 h-3 text-success" /> {t('dashboard.topAttendance')}
              </h3>
              <div className="space-y-1.5">
                {topStudents.length ? topStudents.map((s: any, i: number) => (
                  <div key={s.id} className="flex items-center justify-between text-xs p-1.5 rounded bg-muted/30">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-success w-4">{i + 1}</span>
                      <span className="truncate max-w-[120px]">{s.full_name}</span>
                    </div>
                    <Badge variant="outline" className="text-[10px] h-5 text-success border-success/30">{s.attendance}%</Badge>
                  </div>
                )) : <p className="text-xs text-muted-foreground">{t('dashboard.noAttendanceMarks')}</p>}
              </div>
            </Card>

            <Card className="p-3">
              <h3 className="text-xs font-semibold mb-1.5 flex items-center gap-1">
                <AlertCircle className="w-3 h-3 text-destructive" /> {t('dashboard.needsAttention')}
              </h3>
              <div className="space-y-1.5">
                {bottomStudents.length ? bottomStudents.map((s: any, i: number) => (
                  <div key={s.id} className="flex items-center justify-between text-xs p-1.5 rounded bg-muted/30">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-destructive w-4">{i + 1}</span>
                      <span className="truncate max-w-[120px]">{s.full_name}</span>
                    </div>
                    <Badge variant="outline" className="text-[10px] h-5 text-destructive border-destructive/30">{s.attendance}%</Badge>
                  </div>
                )) : <p className="text-xs text-muted-foreground">{t('dashboard.noAttendanceMarks')}</p>}
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarIcon className="w-5 h-5 text-primary" /> {t('nav.schedule')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {todaySchedule.map((lesson: any) => {
                const hasHomework = !!homeworksStore[lesson.id];
                return (
                  <div key={lesson.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                    <div className="text-xs font-mono text-muted-foreground w-12">{lesson.time}</div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{lesson.subject}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {lesson.group ? `${lesson.group}` : '—'}
                        {lesson.classroom ? ` • ${lesson.roomLabel}` : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      {hasHomework && (
                        <Badge variant="secondary" className="text-xs h-5">
                          <FileText className="w-3 h-3 mr-1" /> {t('common.hw')}
                        </Badge>
                      )}
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleOpenHomework(lesson.id)} title={t('nav.homework')}>
                        <Plus className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })}
              {!todaySchedule.length && <p className="text-center text-muted-foreground py-6 text-sm">{t('dashboard.noLessonsToday')}</p>}
            </div>
          </CardContent>
        </Card>

        {/* Violations Card с локальным фильтром по классам! */}
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between border-b">
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertCircle className="w-5 h-5 text-warning" /> {t('dashboard.recentViolations')}
            </CardTitle>
            <Select value={violationGroupFilter} onValueChange={setViolationGroupFilter}>
              <SelectTrigger className="h-7 text-xs w-[130px] shadow-none">
                <SelectValue placeholder="Grade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('common.allGrades')}</SelectItem>
                {groupsWithData.map((g) => (
                  <SelectItem key={g.id} value={g.name}>{g.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent className="pt-4 p-0">
            <div className="space-y-2 px-4 pb-4">
              {filteredDashboardViolations.map((v: any) => (
  <div key={v.id} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
    <div className="flex-1">
      <p className="font-medium text-sm">{v.student}</p>
      <p className="text-xs text-muted-foreground">
        {v.type}{v.group ? ` • ${v.group}` : ''}{v.date ? ` • ${v.date}` : ''}
      </p>
    </div>
    <Badge 
      variant="outline" 
      className={cn(
        "text-xs border-0", 
        v.status === 'resolved' 
          ? 'bg-success/10 text-success' 
          : 'bg-warning/10 text-warning'
      )}
    >
      {v.status === 'resolved' ? t('violations.resolved') : t('violations.pending')}
    </Badge>
  </div>
))}
              {!filteredDashboardViolations.length && <p className="text-center text-muted-foreground py-4 text-sm">{t('dashboard.noViolations')}</p>}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Groups Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{t('common.allGrades')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-3 font-medium text-muted-foreground">Grade</th>
                  <th className="text-left py-2 px-3 font-medium text-muted-foreground">{t('common.level')}</th>
                  <th className="text-center py-2 px-3 font-medium text-muted-foreground">{t('common.students')}</th>
                  <th className="text-center py-2 px-3 font-medium text-muted-foreground">{t('nav.attendance')}</th>
                  <th className="text-right py-2 px-3 font-medium text-muted-foreground"></th>
                </tr>
              </thead>
              <tbody>
                {groupsWithData.map((group: any) => (
                  <tr key={group.id} className="border-b hover:bg-muted/50 transition-colors">
                    <td className="py-2 px-3">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: group.color }} />
                        <span className="font-medium text-sm">{group.name}</span>
                      </div>
                    </td>
                    <td className="py-2 px-3">
                      <Badge variant="outline" className="text-xs">{t(`level.${group.level.toLowerCase()}`)}</Badge>
                    </td>
                    <td className="py-2 px-3 text-center font-medium">{group.students.length}</td>
                    <td className="py-2 px-3">
                      <div className="flex items-center justify-center gap-2">
                        <Progress value={group.attendance} className="w-14 h-1.5" />
                        <span className="text-xs text-muted-foreground">{group.attendance}%</span>
                      </div>
                    </td>
                    <td className="py-2 px-3 text-right">
                      <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => { setSelectedGroup(group.name); setSearchQuery(''); }}>
                        <Eye className="w-3 h-3 mr-1" /> {t('common.list')}
                      </Button>
                    </td>
                  </tr>
                ))}
                {!groupsWithData.length && (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-muted-foreground">{t('students.noStudentsData')}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Group Detail Modal */}
      <Dialog open={!!selectedGroup} onOpenChange={(open) => !open && setSelectedGroup(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh]">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Users className="w-5 h-5" /> {selectedGroupData?.name}</DialogTitle></DialogHeader>
          {selectedGroupData && (
            <div className="space-y-4">
              <Card className="bg-muted/50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center"><GraduationCap className="w-6 h-6 text-primary" /></div>
                    <div className="flex-1">
                      <p className="font-semibold">{selectedGroupData.teacher?.name}</p>
                      <p className="text-sm text-muted-foreground">{t(`level.${selectedGroupData.level.toLowerCase()}`)}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="icon" disabled={!selectedGroupData.teacher?.email} onClick={() => selectedGroupData.teacher?.email && window.open(`mailto:${selectedGroupData.teacher.email}`)} title={t('common.email')}><Mail className="w-4 h-4" /></Button>
                      <Button variant="outline" size="icon" disabled={!selectedGroupData.teacher?.phone} onClick={() => selectedGroupData.teacher?.phone && window.open(`tel:${selectedGroupData.teacher.phone}`)} title={t('common.call')}><Phone className="w-4 h-4" /></Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder={t('common.searchPlaceholder')} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="text-center p-3 bg-muted/50 rounded-lg"><div className="text-2xl font-bold">{selectedGroupData.students.length}</div><div className="text-xs text-muted-foreground">{t('common.total')}</div></div>
                <div className="text-center p-3 bg-success/10 rounded-lg"><div className="text-2xl font-bold text-success">{selectedGroupData.activeCount}</div><div className="text-xs text-muted-foreground">{t('students.active')}</div></div>
                <div className="text-center p-3 bg-warning/10 rounded-lg"><div className="text-2xl font-bold text-warning">{selectedGroupData.attendance}%</div><div className="text-xs text-muted-foreground">{t('nav.attendance')}</div></div>
              </div>

              <ScrollArea className="h-[300px]">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-background">
                    <tr className="border-b">
                      <th className="text-left py-2 px-3 font-medium">{t('common.name')}</th>
                      <th className="text-center py-2 px-3 font-medium">Grade</th>
                      <th className="text-center py-2 px-3 font-medium">{t('common.status')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredGroupStudents.map((st: any) => (
                      <tr key={st.id} className="border-b hover:bg-muted/50 cursor-pointer" onClick={() => navigate(`/student/${st.id}`)}>
                        <td className="py-2 px-3 font-medium text-primary hover:underline">{st.full_name}</td>
                        <td className="py-2 px-3 text-center text-muted-foreground text-xs">{selectedGroupData.name}</td>
                        <td className="py-2 px-3 text-center">
                          <Badge variant={st.status === 'active' ? 'default' : 'destructive'} className="text-xs">
                            {st.status === 'active' ? t('students.active') : t('students.status.debt')}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </ScrollArea>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Homework Modal */}
      <Dialog open={homeworkModal.open} onOpenChange={(open) => !open && setHomeworkModal({ open: false, lessonId: null })}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><FileText className="w-5 h-5 text-primary" /> {t('nav.homework')}</DialogTitle></DialogHeader>
          {homeworkModal.lessonId && (
            <div className="space-y-4">
              {(() => {
                const l = todaySchedule.find((x: any) => x.id === homeworkModal.lessonId);
                return (
                  <div className="p-3 bg-muted/50 rounded-lg space-y-1">
                    <p className="font-medium">{l?.subject}</p>
                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                      <Clock className="w-4 h-4" /> {l?.time || '--:--'}
                      {l?.group ? <span className="ml-2">{l.group}</span> : null}
                      {l?.classroom ? <span className="ml-2 inline-flex items-center gap-1"><MapPin className="w-4 h-4" /> {l.roomLabel}</span> : null}
                    </p>
                  </div>
                );
              })()}
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('common.description')}</label>
                <Textarea value={homeworkText} onChange={(e) => setHomeworkText(e.target.value)} rows={4} />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">{t('common.attachments')}</label>
                  <Button variant="outline" size="sm" onClick={handleAddFile}><Upload className="w-4 h-4 mr-2" /> {t('common.add')}</Button>
                </div>
                {homeworkFiles.length > 0 && (
                  <div className="space-y-2">
                    {homeworkFiles.map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
                        <div className="flex items-center gap-2"><Paperclip className="w-4 h-4 text-muted-foreground" /><span className="text-sm">{file.name}</span></div>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleRemoveFile(index)}><X className="w-4 h-4" /></Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setHomeworkModal({ open: false, lessonId: null })}>{t('common.cancel')}</Button>
            <Button onClick={handleSaveHomework} disabled={!homeworkText.trim()}>{t('common.save')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CEODashboard;