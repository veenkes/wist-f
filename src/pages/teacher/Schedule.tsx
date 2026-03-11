import React, { useState, useMemo, useCallback, useRef } from 'react';

import {
  Calendar as CalendarIcon,
  Clock,
  Users,
  MapPin,
  ChevronLeft,
  ChevronRight,
  Plus,
  FileText,
  GripVertical,
} from 'lucide-react';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

import {
  format,
  startOfWeek,
  addDays,
  isSameWeek,
  isToday,
  addWeeks,
  subWeeks,
  startOfDay,
  endOfDay,
  isWithinInterval,
  parseISO,
} from 'date-fns';
import { ru } from 'date-fns/locale';

import { useQuery, useQueryClient } from '@tanstack/react-query';

import { AddLessonModal } from '@/components/modals/AddLessonModal';
import { LessonDetailModal } from '@/components/modals/LessonDetailModal';
import { HomeworkModal } from '@/components/modals/HomeworkModal';

import { localDB } from '@/lib/localDb';
import { studentService } from '@/services/student.service';
import { apiClient } from '@/lib/api-client';
import { cn } from '@/lib/utils';

const DAYS = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница'];

interface AttendanceStudent {
  id: string;
  name: string;
  status: 'present' | 'absent' | 'late' | 'excused' | 'not_marked';
}

type Recurrence = 'none' | 'daily' | 'weekly' | 'custom';

interface LessonWithAttendance {
  id: string;

  // для daily-«виртуальных» карточек
  original_id?: string;

  subject: string;
  start_time: string;
  end_time: string;
  classroom: string | null;

  teacher: { id: string; full_name: string } | null;
  group: { id: string; name: string } | null;

  attendance: AttendanceStudent[];

  day_of_week?: number;
  group_id?: string;
  teacher_id?: string;

  is_draft?: boolean;
  order_in_day?: number;

  recurrence?: Recurrence;
  date_iso?: string;

  [key: string]: any;
}

export const Schedule: React.FC = () => {
  const queryClient = useQueryClient();

  const [selectedWeek, setSelectedWeek] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [pickedDate, setPickedDate] = useState<Date>(new Date());

  const [selectedGroup, setSelectedGroup] = useState('all');
  const [selectedTeacher, setSelectedTeacher] = useState('all');

  const [selectedLesson, setSelectedLesson] = useState<LessonWithAttendance | null>(null);

  const [addLessonModal, setAddLessonModal] = useState(false);
  const [editLessonData, setEditLessonData] = useState<any>(null);
  const [addLessonInitialDate, setAddLessonInitialDate] = useState<Date>(new Date());

  const [homeworkModal, setHomeworkModal] = useState(false);
  const [homeworkLesson, setHomeworkLesson] = useState<LessonWithAttendance | null>(null);

  const [savedHomeworks, setSavedHomeworks] = useState<Record<string, any>>(localDB.getHomeworks());
  const [attendanceUpdates, setAttendanceUpdates] = useState<Record<string, any>>(localDB.getAttendance());

  const weekDates = useMemo(() => DAYS.map((_, index) => addDays(selectedWeek, index)), [selectedWeek]);
  const isCurrentWeek = isSameWeek(selectedWeek, new Date(), { weekStartsOn: 1 });

  const weekInterval = useMemo(() => {
    const start = startOfDay(selectedWeek);
    const end = endOfDay(addDays(selectedWeek, 4));
    return { start, end };
  }, [selectedWeek]);

  const { data: realStudentsData } = useQuery({
    queryKey: ['students-list'],
    queryFn: () => studentService.listStudents({ limit: 1000 }),
    staleTime: 5 * 60 * 1000,
  });
  const realStudents = realStudentsData?.data || [];

  const groups = useMemo(() => {
    const unique = new Set<string>();
    realStudents.forEach((s: any) => {
      const cName = `${s.grade || ''} ${s.className || ''}`.trim();
      if (cName) unique.add(cName);
    });
    return Array.from(unique).map((name) => ({ id: name, name }));
  }, [realStudents]);

  // ИСПРАВЛЕННЫЙ ЗАПРОС УЧИТЕЛЕЙ ПО ТВОЕМУ JSON
  const { data: teachers = [] } = useQuery({
    queryKey: ['teachers'],
    queryFn: async () => {
      try {
        const res = await apiClient.get<any>('/employees');
        // Достаем массив из объекта
        const employeeList = res?.employees || res?.data?.employees || [];
        // Оставляем только тех, у кого роль Teacher
        return employeeList.filter((emp: any) => emp.role === 'Teacher');
      } catch {
        return [];
      }
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: lessonsData = [], isLoading } = useQuery({
    queryKey: ['schedule-lessons', selectedGroup, selectedTeacher],
    queryFn: async () => {
      let data = localDB.getLessons();
      if (selectedGroup !== 'all') data = data.filter((l: any) => (l.group_id ?? l.groupId) === selectedGroup);
      if (selectedTeacher !== 'all') data = data.filter((l: any) => (l.teacher_id ?? l.teacherId) === selectedTeacher);
      return data;
    },
  });

  // --- DnD state ---
  const dragRef = useRef<{ lessonId: string; fromDay: number } | null>(null);
  const [dragOverDayIndex, setDragOverDayIndex] = useState<number | null>(null);
  const [dragOverLessonId, setDragOverLessonId] = useState<string | null>(null);

  const getLessonById = useCallback(
    (id: string) => (lessonsData as any[]).find((l: any) => l.id === id),
    [lessonsData]
  );

  const isLessonDraggable = useCallback(
    (lesson: LessonWithAttendance) => {
      // daily — “виртуальные” карточки (или шаблон) не двигаем
      const rec: Recurrence = (lesson.recurrence ?? 'weekly') as Recurrence;
      if (rec === 'daily') return false;
      // если это виртуальная карточка daily (имеет original_id) — не двигаем
      if (lesson.original_id) return false;
      return true;
    },
    []
  );

  const lessonsByDay = useMemo(() => {
    const organized: Record<number, LessonWithAttendance[]> = { 0: [], 1: [], 2: [], 3: [], 4: [] };

    const pushLesson = (dayIndex: number, baseLesson: any, overrideId?: string, originalId?: string) => {
      const lessonAttendanceUpdates = attendanceUpdates[baseLesson.id] || {};
      const groupId = baseLesson.group_id ?? baseLesson.groupId;

      // индивидуальный выбор учеников НЕ учитываем — только группа
      const lessonGroupStudents = realStudents.filter((s: any) => {
        const sGroup = `${s.grade || ''} ${s.className || ''}`.trim();
        return sGroup === groupId;
      });

      const teacherId = baseLesson.teacher_id ?? baseLesson.teacherId;
      const teacherObj = (teachers as any[]).find((t: any) => t.id === teacherId);

      organized[dayIndex].push({
        ...baseLesson,
        id: overrideId ?? baseLesson.id,
        original_id: originalId,
        subject: baseLesson.subject,
        start_time: baseLesson.start_time ?? baseLesson.startTime,
        end_time: baseLesson.end_time ?? baseLesson.endTime,
        classroom: baseLesson.classroom ?? null,
        teacher: teacherObj
          ? { id: teacherObj.id, full_name: teacherObj.full_name || 'Преподаватель' } // Используем full_name
          : null,
        group: groupId ? { id: groupId, name: groupId } : null,
        attendance: lessonGroupStudents.map((student: any) => ({
          id: student.id,
          name: `${student.name} ${student.surname}`,
          status: lessonAttendanceUpdates[student.id] || 'not_marked',
        })),
        day_of_week: baseLesson.day_of_week ?? baseLesson.dayOfWeek,
        group_id: groupId,
        teacher_id: teacherId,
        is_draft: !!baseLesson.is_draft,
        order_in_day: Number(baseLesson.order_in_day || 0),
        recurrence: (baseLesson.recurrence ?? 'weekly') as Recurrence,
        date_iso: baseLesson.date_iso,
      });
    };

    (lessonsData as any[]).forEach((lesson: any) => {
      const rec: Recurrence = (lesson.recurrence ?? 'weekly') as Recurrence;

      // 1) none — показываем только на неделе date_iso
      if (rec === 'none') {
        if (!lesson.date_iso) return;

        let d: Date;
        try {
          d = parseISO(lesson.date_iso);
        } catch {
          return;
        }

        if (!isWithinInterval(d, weekInterval)) return;

        const jsDay = d.getDay(); // 0..6
        const dayOfWeek = jsDay === 0 ? 7 : jsDay; // 1..7
        const dayIndex = dayOfWeek - 1;
        if (dayIndex < 0 || dayIndex > 4) return;

        pushLesson(dayIndex, lesson);
        return;
      }

      // 2) daily — на каждый будний день (виртуальные карточки)
      if (rec === 'daily') {
        for (let dayIndex = 0; dayIndex <= 4; dayIndex++) {
          pushLesson(dayIndex, lesson, `${lesson.id}__d${dayIndex}`, lesson.id);
        }
        return;
      }

      // 3) weekly/custom — по day_of_week
      const dayOfWeek = lesson.day_of_week ?? lesson.dayOfWeek;
      const dayIndex = (dayOfWeek ?? 0) - 1;
      if (dayIndex < 0 || dayIndex > 4) return;

      pushLesson(dayIndex, lesson);
    });

    // сортировка: order_in_day потом время
    Object.keys(organized).forEach((key) => {
      organized[Number(key)].sort((a, b) => {
        const ao = Number(a.order_in_day || 0);
        const bo = Number(b.order_in_day || 0);
        if (ao !== bo) return ao - bo;
        return String(a.start_time || '').localeCompare(String(b.start_time || ''));
      });
    });

    return organized;
  }, [lessonsData, attendanceUpdates, realStudents, teachers, weekInterval]);

  const openAddLesson = useCallback((date: Date) => {
    setEditLessonData(null);
    setAddLessonInitialDate(date);
    setAddLessonModal(true);
  }, []);

  const handleOpenLesson = useCallback((lesson: LessonWithAttendance) => {
    setSelectedLesson(lesson);
  }, []);

  const handleOpenHomework = useCallback(() => {
    if (!selectedLesson) return;
    setHomeworkLesson(selectedLesson);
    setHomeworkModal(true);
  }, [selectedLesson]);

  const handleSaveHomework = useCallback((lessonId: string, homework: any) => {
    setSavedHomeworks((prev) => {
      const next = { ...prev, [lessonId]: homework };
      localDB.saveHomeworks(next);
      return next;
    });
  }, []);

  const handleUpdateAttendance = useCallback(
    (studentId: string, status: 'present' | 'absent' | 'late') => {
      if (!selectedLesson) return;

      // daily виртуалка → пишем в original_id
      const realId = selectedLesson.original_id ?? selectedLesson.id;

      setAttendanceUpdates((prev) => {
        const next = {
          ...prev,
          [realId]: {
            ...(prev[realId] || {}),
            [studentId]: status,
          },
        };
        localDB.saveAttendance(next);
        return next;
      });

      setSelectedLesson((prev) => {
        if (!prev) return null;
        return { ...prev, attendance: prev.attendance.map((a) => (a.id === studentId ? { ...a, status } : a)) };
      });
    },
    [selectedLesson]
  );

  const handleEditLesson = useCallback(() => {
    if (!selectedLesson) return;

    // daily виртуалка → редактируем оригинал
    const baseId = selectedLesson.original_id ?? selectedLesson.id;
    const raw = getLessonById(baseId) ?? selectedLesson;

    setEditLessonData(raw);
    setSelectedLesson(null);
    setAddLessonModal(true);
  }, [selectedLesson, getLessonById]);

  // ---------------- DnD helpers ----------------

  const startDrag = (lesson: LessonWithAttendance, fromDayIndex: number) => {
    if (!isLessonDraggable(lesson)) return;
    dragRef.current = { lessonId: lesson.id, fromDay: fromDayIndex + 1 };
  };

  const reorderArray = (arr: string[], fromId: string, toId: string) => {
    const fromIndex = arr.indexOf(fromId);
    const toIndex = arr.indexOf(toId);
    if (fromIndex === -1 || toIndex === -1) return arr;

    const copy = [...arr];
    copy.splice(fromIndex, 1);
    copy.splice(toIndex, 0, fromId);
    return copy;
  };

  const patchDateIsoIfNeeded = async (lessonId: string, targetDayIndex: number) => {
    const lesson = getLessonById(lessonId);
    if (!lesson) return;

    const rec: Recurrence = (lesson.recurrence ?? 'weekly') as Recurrence;
    if (rec !== 'none') return;

    const newDate = addDays(selectedWeek, targetDayIndex);
    try {
      localDB.updateLesson(lessonId, { date_iso: newDate.toISOString(), day_of_week: targetDayIndex + 1 });
    } catch (e) {
      console.error(e);
    }
  };

  const handleDropOnLesson = async (targetDayIndex: number, targetLessonId: string) => {
    const drag = dragRef.current;
    dragRef.current = null;
    setDragOverLessonId(null);
    setDragOverDayIndex(null);

    if (!drag) return;

    const draggedRaw = getLessonById(drag.lessonId);
    if (draggedRaw && (draggedRaw.recurrence ?? 'weekly') === 'daily') return;

    const targetDay = targetDayIndex + 1;
    const fromDay = drag.fromDay;

    const targetIds = (lessonsByDay[targetDayIndex] || [])
      .filter((l) => !l.original_id) 
      .map((l) => l.id);

    let newTargetIds = targetIds;

    if (!newTargetIds.includes(drag.lessonId)) {
      newTargetIds = [...newTargetIds, drag.lessonId];
    }

    newTargetIds = reorderArray(newTargetIds, drag.lessonId, targetLessonId);

    const sourceDayIndex = fromDay - 1;
    const sourceIds =
      sourceDayIndex >= 0 && sourceDayIndex <= 4
        ? (lessonsByDay[sourceDayIndex] || [])
            .filter((l) => !l.original_id)
            .map((l) => l.id)
            .filter((id) => id !== drag.lessonId)
        : undefined;

    try {
      if (fromDay === targetDay) {
        localDB.reorderLessonsForDay(targetDay, newTargetIds);
      } else {
        localDB.moveLessonToDayAndReorder(drag.lessonId, targetDay, newTargetIds, sourceIds, fromDay);
        await patchDateIsoIfNeeded(drag.lessonId, targetDayIndex);
      }

      await queryClient.invalidateQueries({ queryKey: ['schedule-lessons'] });
    } catch (e) {
      console.error(e);
    }
  };

  const handleDropOnDay = async (targetDayIndex: number) => {
    const drag = dragRef.current;
    dragRef.current = null;
    setDragOverLessonId(null);
    setDragOverDayIndex(null);

    if (!drag) return;

    const draggedRaw = getLessonById(drag.lessonId);
    if (draggedRaw && (draggedRaw.recurrence ?? 'weekly') === 'daily') return;

    const targetDay = targetDayIndex + 1;
    const fromDay = drag.fromDay;

    const targetIds = (lessonsByDay[targetDayIndex] || [])
      .filter((l) => !l.original_id)
      .map((l) => l.id);

    let newTargetIds = targetIds;
    if (!newTargetIds.includes(drag.lessonId)) newTargetIds = [...newTargetIds, drag.lessonId];

    const sourceDayIndex = fromDay - 1;
    const sourceIds =
      sourceDayIndex >= 0 && sourceDayIndex <= 4
        ? (lessonsByDay[sourceDayIndex] || [])
            .filter((l) => !l.original_id)
            .map((l) => l.id)
            .filter((id) => id !== drag.lessonId)
        : undefined;

    try {
      if (fromDay === targetDay) {
        const idsWithout = targetIds.filter((id) => id !== drag.lessonId);
        localDB.reorderLessonsForDay(targetDay, [...idsWithout, drag.lessonId]);
      } else {
        localDB.moveLessonToDayAndReorder(drag.lessonId, targetDay, newTargetIds, sourceIds, fromDay);
        await patchDateIsoIfNeeded(drag.lessonId, targetDayIndex);
      }

      await queryClient.invalidateQueries({ queryKey: ['schedule-lessons'] });
    } catch (e) {
      console.error(e);
    }
  };

  // -----------------------------------------------------------

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Расписание</h1>
          <p className="text-sm text-muted-foreground">
            {format(selectedWeek, 'd MMM', { locale: ru })} — {format(addDays(selectedWeek, 4), 'd MMM yyyy', { locale: ru })}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => setSelectedWeek(subWeeks(selectedWeek, 1))}>
            <ChevronLeft className="w-4 h-4" />
          </Button>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant={isCurrentWeek ? 'default' : 'outline'} size="sm" className="gap-1.5">
                <CalendarIcon className="w-3.5 h-3.5" />
                {isCurrentWeek ? 'Сегодня' : format(pickedDate, 'd MMM', { locale: ru })}
              </Button>
            </PopoverTrigger>

            <PopoverContent className="w-auto p-0" align="center">
              <Calendar
                mode="single"
                selected={pickedDate}
                onSelect={(date) => {
                  if (!date) return;
                  setPickedDate(date);
                  setSelectedWeek(startOfWeek(date, { weekStartsOn: 1 }));
                }}
                locale={ru}
                className="p-3 pointer-events-auto"
              />
              <div className="px-3 pb-3">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-xs"
                  onClick={() => {
                    const now = new Date();
                    setPickedDate(now);
                    setSelectedWeek(startOfWeek(now, { weekStartsOn: 1 }));
                  }}
                >
                  Перейти к сегодня
                </Button>
              </div>
            </PopoverContent>
          </Popover>

          <Button variant="ghost" size="icon" onClick={() => setSelectedWeek(addWeeks(selectedWeek, 1))}>
            <ChevronRight className="w-4 h-4" />
          </Button>

          <div className="h-6 w-px bg-border mx-2" />

          <Button onClick={() => openAddLesson(pickedDate)}>
            <Plus className="w-4 h-4 mr-2" />
            Добавить урок
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Select value={selectedGroup} onValueChange={setSelectedGroup}>
          <SelectTrigger className="w-[160px] h-9">
            <SelectValue placeholder="Класс / Группа" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все классы</SelectItem>
            {groups.map((g) => (
              <SelectItem key={g.id} value={g.id}>
                {g.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={selectedTeacher} onValueChange={setSelectedTeacher}>
          <SelectTrigger className="w-[180px] h-9">
            <SelectValue placeholder="Преподаватель" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все учителя</SelectItem>
            {(teachers as any[]).map((t: any) => (
              <SelectItem key={t.id} value={t.id}>
                {t.full_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          {DAYS.map((day, dayIndex) => {
            const dateForDay = weekDates[dayIndex];
            const isTodayDate = isToday(dateForDay);
            const dayLessons = lessonsByDay[dayIndex] || [];

            return (
              <div
                key={day}
                className={cn('space-y-2 rounded-xl', dragOverDayIndex === dayIndex && 'ring-2 ring-primary/25')}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOverDayIndex(dayIndex);
                }}
                onDragLeave={() => setDragOverDayIndex((prev) => (prev === dayIndex ? null : prev))}
                onDrop={(e) => {
                  e.preventDefault();
                  handleDropOnDay(dayIndex);
                }}
              >
                <div className={`text-center p-2 rounded-lg ${isTodayDate ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                  <div className="font-medium text-sm">{day}</div>
                  <div className={`text-xs ${isTodayDate ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                    {format(dateForDay, 'd MMM', { locale: ru })}
                  </div>
                </div>

                <div className="space-y-2 min-h-[200px]">
                  {dayLessons.length > 0 ? (
                    dayLessons.map((lesson) => {
                      const realId = lesson.original_id ?? lesson.id;
                      const hasHomework = savedHomeworks[realId];

                      const draggable = isLessonDraggable(lesson);
                      const rec: Recurrence = (lesson.recurrence ?? 'weekly') as Recurrence;

                      return (
                        <Card
                          key={lesson.id}
                          draggable={draggable}
                          onDragStart={() => startDrag(lesson, dayIndex)}
                          onDragOver={(e) => {
                            if (!draggable) return;
                            e.preventDefault();
                            setDragOverLessonId(lesson.id);
                            setDragOverDayIndex(dayIndex);
                          }}
                          onDrop={(e) => {
                            if (!draggable) return;
                            e.preventDefault();
                            handleDropOnLesson(dayIndex, lesson.id);
                          }}
                          className={cn(
                            'p-3 cursor-pointer transition-all border-l-4 group select-none',
                            'hover:shadow-lg',
                            lesson.is_draft ? 'border-l-muted-foreground/40 opacity-90' : 'border-l-primary/50 hover:border-l-primary',
                            dragOverLessonId === lesson.id && 'ring-2 ring-primary/20'
                          )}
                          onClick={() => handleOpenLesson(lesson)}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="font-semibold truncate text-sm group-hover:text-primary transition-colors flex-1">
                              {lesson.subject}
                            </div>

                            <div className="flex items-center gap-1">
                              {draggable ? (
                                <GripVertical className="w-3.5 h-3.5 text-muted-foreground/60" />
                              ) : (
                                <span className="w-3.5 h-3.5" />
                              )}

                              {rec === 'none' && (
                                <Badge variant="outline" className="h-5 px-1.5 text-[10px]">
                                  Разовый
                                </Badge>
                              )}

                              {rec === 'daily' && (
                                <Badge variant="outline" className="h-5 px-1.5 text-[10px]">
                                  Каждый день
                                </Badge>
                              )}

                              {lesson.is_draft && (
                                <Badge variant="outline" className="h-5 px-1.5 text-[10px]">
                                  Черновик
                                </Badge>
                              )}

                              {hasHomework && (
                                <Badge variant="secondary" className="h-5 px-1.5">
                                  <FileText className="w-3 h-3" />
                                </Badge>
                              )}
                            </div>
                          </div>

                          <div className="text-xs text-muted-foreground mt-1.5 space-y-1">
                            <div className="flex items-center gap-1.5">
                              <Clock className="w-3 h-3 text-primary/70" />
                              <span className="font-medium">
                                {String(lesson.start_time).slice(0, 5)} - {String(lesson.end_time).slice(0, 5)}
                              </span>
                            </div>

                            {lesson.classroom && (
                              <div className="flex items-center gap-1.5">
                                <MapPin className="w-3 h-3 text-primary/70" />
                                Каб. {lesson.classroom}
                              </div>
                            )}

                            {lesson.group && (
                              <div className="flex items-center gap-1.5">
                                <Users className="w-3 h-3 text-primary/70" />
                                {lesson.group.name}
                              </div>
                            )}
                          </div>
                        </Card>
                      );
                    })
                  ) : (
                    <div className="text-center py-8 text-muted-foreground text-xs">
                      <CalendarIcon className="w-6 h-6 mx-auto mb-1 opacity-30" />
                      Нет уроков
                    </div>
                  )}

                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full border border-dashed h-8 text-xs text-muted-foreground hover:text-primary"
                    onClick={() => {
                      setPickedDate(dateForDay);
                      openAddLesson(dateForDay);
                    }}
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    Добавить
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <LessonDetailModal
        open={!!selectedLesson}
        onOpenChange={(open) => !open && setSelectedLesson(null)}
        lesson={selectedLesson}
        homework={selectedLesson ? savedHomeworks[(selectedLesson.original_id ?? selectedLesson.id)] : null}
        onOpenHomework={handleOpenHomework}
        onEditLesson={handleEditLesson}
        onUpdateAttendance={handleUpdateAttendance}
      />

      <HomeworkModal
        open={homeworkModal}
        onOpenChange={setHomeworkModal}
        lesson={homeworkLesson}
        savedHomework={homeworkLesson ? savedHomeworks[(homeworkLesson.original_id ?? homeworkLesson.id)] : null}
        onSave={handleSaveHomework}
      />

      <AddLessonModal
        open={addLessonModal}
        onOpenChange={(open) => {
          setAddLessonModal(open);
          if (!open) setEditLessonData(null);
        }}
        editLesson={editLessonData}
        initialDate={addLessonInitialDate}
      />
    </div>
  );
};

export default Schedule;