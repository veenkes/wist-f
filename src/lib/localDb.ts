// src/lib/localDb.ts
type AnyObj = Record<string, any>;

const LS_KEYS = {
  lessons: 'wist_lessons',
  attendance: 'wist_attendance',
  homeworks: 'wist_homeworks',
  reports: 'wist_reports', // Добавили ключ для отчетов
};

function safeParse<T>(value: string | null, fallback: T): T {
  try {
    if (!value) return fallback;
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function safeStringify(value: any) {
  return JSON.stringify(value);
}

function uid() {
  return (
    'l_' +
    Date.now().toString(36) +
    '_' +
    Math.random().toString(36).slice(2, 9)
  );
}

function normalizeLesson(input: AnyObj): AnyObj {
  const lesson = { ...input };

  if (!lesson.id) lesson.id = uid();

  if (!lesson.start_time && lesson.startTime) lesson.start_time = lesson.startTime;
  if (!lesson.end_time && lesson.endTime) lesson.end_time = lesson.endTime;

  if (!lesson.group_id && lesson.groupId) lesson.group_id = lesson.groupId;
  if (!lesson.teacher_id && lesson.teacherId) lesson.teacher_id = lesson.teacherId;

  if (!lesson.day_of_week && lesson.dayOfWeek) lesson.day_of_week = lesson.dayOfWeek;

  if (lesson.is_draft === undefined) lesson.is_draft = false;

  if (lesson.order_in_day === undefined || lesson.order_in_day === null) {
    lesson.order_in_day = 0;
  }

  if (!Array.isArray(lesson.individualStudents)) lesson.individualStudents = [];
  if (!Array.isArray(lesson.classes)) lesson.classes = [];
  if (!Array.isArray(lesson.equipment)) lesson.equipment = [];
  if (!Array.isArray(lesson.tags)) lesson.tags = [];
  if (!Array.isArray(lesson.objectives)) lesson.objectives = [''];
  if (!Array.isArray(lesson.homeworkFiles)) lesson.homeworkFiles = [];
  if (!Array.isArray(lesson.materials)) lesson.materials = [];

  if (typeof lesson.start_time === 'string' && lesson.start_time.length >= 5) {
    lesson.start_time = lesson.start_time.slice(0, 5);
  }
  if (typeof lesson.end_time === 'string' && lesson.end_time.length >= 5) {
    lesson.end_time = lesson.end_time.slice(0, 5);
  }

  if (lesson.classroom === '') lesson.classroom = null;

  return lesson;
}

function getAllLessons(): AnyObj[] {
  return safeParse<AnyObj[]>(localStorage.getItem(LS_KEYS.lessons), []);
}

function setAllLessons(lessons: AnyObj[]) {
  localStorage.setItem(LS_KEYS.lessons, safeStringify(lessons));
}

export const localDB = {
  getLessons(): AnyObj[] {
    const lessons = getAllLessons().map(normalizeLesson);

    const byDay: Record<number, AnyObj[]> = {};
    for (const l of lessons) {
      const d = Number(l.day_of_week || 0);
      if (!byDay[d]) byDay[d] = [];
      byDay[d].push(l);
    }
    Object.keys(byDay).forEach((dStr) => {
      const d = Number(dStr);
      const arr = byDay[d];
      arr.sort((a, b) => {
        const ao = Number(a.order_in_day || 0);
        const bo = Number(b.order_in_day || 0);
        if (ao !== bo) return ao - bo;
        return String(a.start_time || '').localeCompare(String(b.start_time || ''));
      });
      const allZero = arr.every((x) => Number(x.order_in_day || 0) === 0);
      if (allZero) {
        arr.forEach((x, i) => (x.order_in_day = i + 1));
      }
    });

    setAllLessons(lessons);
    return lessons;
  },

  saveLesson(lessonData: AnyObj) {
    const lessons = getAllLessons();
    const lesson = normalizeLesson(lessonData);

    const day = Number(lesson.day_of_week || 0);
    const dayLessons = lessons
      .map(normalizeLesson)
      .filter((l) => Number(l.day_of_week || 0) === day);

    const maxOrder = dayLessons.reduce((m, l) => Math.max(m, Number(l.order_in_day || 0)), 0);
    if (!lesson.order_in_day || lesson.order_in_day <= 0) {
      lesson.order_in_day = maxOrder + 1;
    }

    lessons.push(lesson);
    setAllLessons(lessons);
    return lesson;
  },

  updateLesson(id: string, patch: AnyObj) {
    const lessons = getAllLessons();
    const idx = lessons.findIndex((l) => l.id === id);
    if (idx === -1) throw new Error('Lesson not found: ' + id);

    const current = normalizeLesson(lessons[idx]);

    const nextRaw: AnyObj = { ...current, ...patch };

    const next = normalizeLesson(nextRaw);

    lessons[idx] = next;
    setAllLessons(lessons);
    return next;
  },

  deleteLesson(id: string) {
    const lessons = getAllLessons().filter((l) => l.id !== id);
    setAllLessons(lessons);
  },

  reorderLessonsForDay(day_of_week: number, orderedIds: string[]) {
    const lessons = getAllLessons().map(normalizeLesson);

    const idToIndex = new Map<string, number>();
    orderedIds.forEach((id, i) => idToIndex.set(id, i));

    for (const l of lessons) {
      if (Number(l.day_of_week || 0) !== day_of_week) continue;
      if (!idToIndex.has(l.id)) continue;
      l.order_in_day = (idToIndex.get(l.id) || 0) + 1;
    }

    setAllLessons(lessons);
  },

  moveLessonToDayAndReorder(
    lessonId: string,
    targetDay: number,
    orderedIdsInTargetDay: string[],
    orderedIdsInSourceDay?: string[],
    sourceDay?: number
  ) {
    const lessons = getAllLessons().map(normalizeLesson);
    const idx = lessons.findIndex((l) => l.id === lessonId);
    if (idx === -1) throw new Error('Lesson not found: ' + lessonId);

    lessons[idx].day_of_week = targetDay;

    const mapTarget = new Map<string, number>();
    orderedIdsInTargetDay.forEach((id, i) => mapTarget.set(id, i));
    for (const l of lessons) {
      if (Number(l.day_of_week || 0) === targetDay && mapTarget.has(l.id)) {
        l.order_in_day = (mapTarget.get(l.id) || 0) + 1;
      }
    }

    if (sourceDay && orderedIdsInSourceDay) {
      const mapSource = new Map<string, number>();
      orderedIdsInSourceDay.forEach((id, i) => mapSource.set(id, i));
      for (const l of lessons) {
        if (Number(l.day_of_week || 0) === sourceDay && mapSource.has(l.id)) {
          l.order_in_day = (mapSource.get(l.id) || 0) + 1;
        }
      }
    }

    setAllLessons(lessons);
    return lessons[idx];
  },

  getAttendance(): Record<string, AnyObj> {
    return safeParse<Record<string, AnyObj>>(localStorage.getItem(LS_KEYS.attendance), {});
  },
  saveAttendance(data: Record<string, AnyObj>) {
    localStorage.setItem(LS_KEYS.attendance, safeStringify(data));
  },

  getHomeworks(): Record<string, AnyObj> {
    return safeParse<Record<string, AnyObj>>(localStorage.getItem(LS_KEYS.homeworks), {});
  },
  saveHomeworks(data: Record<string, AnyObj>) {
    localStorage.setItem(LS_KEYS.homeworks, safeStringify(data));
  },

  getReports(): AnyObj[] {
    return safeParse<AnyObj[]>(localStorage.getItem(LS_KEYS.reports), []);
  },
  saveReport(report: AnyObj) {
    const reports = this.getReports();
    const newReport = { ...report, id: uid() };
    reports.unshift(newReport);
    localStorage.setItem(LS_KEYS.reports, safeStringify(reports));
    return newReport;
  },

  getFinalReports: () => JSON.parse(localStorage.getItem('wist_final_reports') || '[]'),
  saveFinalReport: (report: any) => {
    const reports = localDB.getFinalReports();
    const newReport = { ...report, id: `final_report_${Date.now()}` };
    localStorage.setItem('wist_final_reports', JSON.stringify([newReport, ...reports]));
    return newReport;
  },

  getViolations(): AnyObj[] {
    return safeParse<AnyObj[]>(localStorage.getItem('wist_violations'), []);
  },
  saveViolation(data: AnyObj) {
    const items = this.getViolations();
    const newItem = { ...data, id: uid() };
    items.unshift(newItem); // Новые сверху
    localStorage.setItem('wist_violations', safeStringify(items));
    return newItem;
  },
  updateViolation(id: string, patch: AnyObj) {
    const items = this.getViolations();
    const idx = items.findIndex((v) => v.id === id);
    if (idx > -1) {
      items[idx] = { ...items[idx], ...patch };
      localStorage.setItem('wist_violations', safeStringify(items));
      return items[idx];
    }
  },

  getRemarks(): AnyObj[] {
    return safeParse<AnyObj[]>(localStorage.getItem('wist_remarks'), []);
  },
  saveRemark(data: AnyObj) {
    const items = this.getRemarks();
    const newItem = { ...data, id: uid() };
    items.unshift(newItem);
    localStorage.setItem('wist_remarks', safeStringify(items));
    return newItem;
  },
};