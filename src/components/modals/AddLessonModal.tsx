import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import {
  ChevronDown, BookOpen, Clock, Users, User, FileText, Award, Bell, Tag,
  Save, Send, Copy, X, Plus, Trash2, Link,
  MapPin, Monitor, Projector, Laptop, FlaskConical, PenTool, HelpCircle,
  GripVertical, CheckCircle2, Info
} from 'lucide-react';

import { localDB } from '@/lib/localDb';
import { studentService } from '@/services/student.service';
import { apiClient } from '@/lib/api-client';

interface AddLessonModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialDate?: Date;
  editLesson?: any | null;
}

const SUBJECTS = [
  'Математика', 'Алгебра', 'Геометрия', 'Русский язык', 'Литература',
  'Английский язык', 'Физика', 'Химия', 'Биология', 'История',
  'Обществознание', 'География', 'Информатика', 'Физкультура',
  'Музыка', 'ИЗО', 'Технология', 'ОБЖ', 'Развитие речи', 'Основы счёта'
];

const LESSON_TYPES = [
  { value: 'regular', label: 'Обычный урок', icon: BookOpen },
  { value: 'exam', label: 'Экзамен', icon: Award },
  { value: 'practice', label: 'Практика', icon: PenTool },
  { value: 'laboratory', label: 'Лабораторная', icon: FlaskConical },
  { value: 'online', label: 'Онлайн', icon: Monitor },
  { value: 'extra', label: 'Дополнительный', icon: Plus },
];

const ACADEMIC_YEARS = ['2024-2025', '2025-2026', '2026-2027'];
const SEMESTERS = ['1 семестр', '2 семестр', '3 триместр', '4 триместр'];

const TIME_SLOTS = [
  '07:00', '07:30', '08:00', '08:30', '09:00', '09:30', '10:00', '10:30',
  '11:00', '11:30', '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
  '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00'
];

const RECURRENCE_OPTIONS = [
  { value: 'none', label: 'Без повторения' },
  { value: 'weekly', label: 'Еженедельно' },
];

const STATUS_OPTIONS = [
  { value: 'scheduled', label: 'Запланирован', color: 'bg-blue-500' },
  { value: 'completed', label: 'Завершён', color: 'bg-green-500' },
  { value: 'cancelled', label: 'Отменён', color: 'bg-red-500' },
  { value: 'postponed', label: 'Перенесён', color: 'bg-yellow-500' },
];

const EQUIPMENT_OPTIONS = [
  { value: 'projector', label: 'Проектор', icon: Projector },
  { value: 'computer', label: 'Компьютер', icon: Laptop },
  { value: 'lab', label: 'Лаб. оборудование', icon: FlaskConical },
  { value: 'whiteboard', label: 'Доска', icon: PenTool },
  { value: 'other', label: 'Другое', icon: GripVertical },
];

const ATTENDANCE_MODES = [
  { value: 'manual', label: 'Вручную' },
  { value: 'qr', label: 'QR-код' },
  { value: 'auto', label: 'Автоматически (онлайн)' },
];

const ASSESSMENT_TYPES = [
  { value: 'none', label: 'Без оценки' },
  { value: 'quiz', label: 'Тест' },
  { value: 'test', label: 'Контрольная' },
  { value: 'assignment', label: 'Задание' },
];

const GRADING_SCALES = [
  { value: '5point', label: '5-балльная' },
  { value: '10point', label: '10-балльная' },
  { value: '100point', label: '100-балльная' },
  { value: 'passfail', label: 'Зачёт/Незачёт' },
];

const PRIORITY_LEVELS = [
  { value: 'normal', label: 'Обычный', color: 'bg-muted' },
  { value: 'high', label: 'Высокий', color: 'bg-warning' },
  { value: 'critical', label: 'Критический', color: 'bg-destructive' },
];

const COLOR_LABELS = [
  { value: 'blue', label: 'Синий', class: 'bg-blue-500' },
  { value: 'green', label: 'Зелёный', class: 'bg-green-500' },
  { value: 'yellow', label: 'Жёлтый', class: 'bg-yellow-500' },
  { value: 'red', label: 'Красный', class: 'bg-red-500' },
  { value: 'purple', label: 'Фиолетовый', class: 'bg-purple-500' },
  { value: 'orange', label: 'Оранжевый', class: 'bg-orange-500' },
  { value: 'pink', label: 'Розовый', class: 'bg-pink-500' },
  { value: 'gray', label: 'Серый', class: 'bg-gray-500' },
];

const VISIBILITY_OPTIONS = [
  { value: 'visible', label: 'Видим ученикам' },
  { value: 'draft', label: 'Черновик' },
  { value: 'admin', label: 'Только для администрации' },
];

function SectionHeader({
  icon: Icon, title, isOpen, badge, required
}: {
  icon: React.ElementType; title: string; isOpen: boolean; badge?: string; required?: boolean;
}) {
  return (
    <button
      type="button"
      className="flex items-center gap-3 py-3 px-4 bg-muted/50 rounded-xl hover:bg-muted transition-colors cursor-pointer w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
    >
      <Icon className="h-4 w-4 text-primary" />
      <span className="font-medium text-sm flex-1">{title}</span>
      {required && <Badge variant="outline" className="text-xs border-dashed">Обязательно</Badge>}
      {badge && <Badge className="text-xs bg-primary/10 text-primary border-primary/20">{badge}</Badge>}
      <ChevronDown className={cn(
        "h-4 w-4 text-muted-foreground transition-transform duration-200",
        isOpen && "rotate-180"
      )} />
    </button>
  );
}

function FieldTooltip({ text }: { text: string }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button type="button" className="ml-1 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 rounded-full">
          <HelpCircle className="h-3.5 w-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="text-xs max-w-xs" side="top">
        {text}
      </PopoverContent>
    </Popover>
  );
}

export function AddLessonModal({ open, onOpenChange, editLesson, initialDate }: AddLessonModalProps) {
  const queryClient = useQueryClient();

  const [mode, setMode] = useState<'create' | 'edit' | 'duplicate'>('create');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDraftAction, setIsDraftAction] = useState(false);

  const [openSections, setOpenSections] = useState({
    basic: false, schedule: false, teacher: false, students: false,
    content: false, assessment: false, notifications: false, tags: false,
  });

  const [formData, setFormData] = useState({
    title: '', subject: '', lessonType: 'regular',
    classes: [] as string[], academicYear: '2024-2025', semester: '1 семестр',
    date: new Date(), startTime: '09:00', endTime: '09:45', duration: 45,
    timezone: 'Europe/Moscow', recurrence: 'none', status: 'scheduled',
    teacherId: '', assistantTeacherId: '', classroom: '', onlineLink: '',
    equipment: [] as string[],
    groupId: '', individualStudents: [] as string[],
    attendanceEnabled: true, attendanceMode: 'manual',
    description: '', objectives: [''], homeworkText: '',
    homeworkFiles: [] as string[],
    materials: [] as { type: string; url: string; name: string }[],
    estimatedHomeworkTime: 30,
    assessmentType: 'none', maxScore: 100, passingScore: 60,
    gradingScale: '5point', autoGrade: false,
    notifyStudents: true, notifyParents: false, notifyTeacher: true,
    notificationTime: 'immediately', visibility: 'visible',
    tags: [] as string[], priority: 'normal', colorLabel: 'blue', internalNotes: '',
  });

  const [newTag, setNewTag] = useState('');
  const [newObjective, setNewObjective] = useState('');
  const [subjectSearch, setSubjectSearch] = useState('');

  const { data: realStudentsData } = useQuery({
    queryKey: ['students-list'],
    queryFn: () => studentService.listStudents({ limit: 1000 }),
    staleTime: 5 * 60 * 1000,
  });
  const students = realStudentsData?.data || [];

  const groups = useMemo(() => {
    const unique = new Set<string>();
    students.forEach((s: any) => {
      const cName = `${s.grade || ''} ${s.className || ''}`.trim();
      if (cName) unique.add(cName);
    });
    return Array.from(unique).map(name => ({ id: name, name }));
  }, [students]);

  const { data: teachers = [] } = useQuery({
    queryKey: ['teachers-list'],
    queryFn: async () => {
      try {
        const res = await apiClient.get<any>('/employees');
        const employeeList = res?.employees || res?.data?.employees || [];
        return employeeList.filter((emp: any) => emp.role === 'Teacher');
      } catch {
        return [];
      }
    },
    staleTime: 5 * 60 * 1000,
  });

  const filteredSubjects = useMemo(() => {
    if (!subjectSearch) return SUBJECTS;
    return SUBJECTS.filter(s => s.toLowerCase().includes(subjectSearch.toLowerCase()));
  }, [subjectSearch]);

  // ФИКС: Защита от зависания pointer-events при закрытии модалки
  useEffect(() => {
    if (!open) {
      document.body.style.pointerEvents = '';
    }
  }, [open]);

  // режим при открытии
  useEffect(() => {
    if (!open) return;
    setMode(editLesson ? 'edit' : 'create');
  }, [open, editLesson]);

  // подстановка даты при создании
  useEffect(() => {
    if (!open) return;
    if (!editLesson) {
      setFormData(prev => ({
        ...prev,
        date: initialDate ?? new Date(),
      }));
      setOpenSections(prev => ({ ...prev, basic: true, schedule: true }));
    }
  }, [open, editLesson, initialDate]);

  // duration авто
  useEffect(() => {
    if (formData.startTime && formData.endTime) {
      const [startH, startM] = formData.startTime.split(':').map(Number);
      const [endH, endM] = formData.endTime.split(':').map(Number);
      const duration = (endH * 60 + endM) - (startH * 60 + startM);
      if (duration > 0) {
        setFormData(prev => ({ ...prev, duration }));
      }
    }
  }, [formData.startTime, formData.endTime]);

  // заполнение формы при edit
  useEffect(() => {
    if (!open) return;
    if (!editLesson) return;

    setFormData(prev => ({
      ...prev,

      title: editLesson.title ?? prev.title,
      subject: editLesson.subject ?? prev.subject,
      lessonType: editLesson.lessonType ?? editLesson.lesson_type ?? prev.lessonType,
      classes: editLesson.classes ?? prev.classes,
      academicYear: editLesson.academicYear ?? editLesson.academic_year ?? prev.academicYear,
      semester: editLesson.semester ?? prev.semester,

      startTime: String(editLesson.start_time ?? editLesson.startTime ?? prev.startTime).slice(0, 5),
      endTime: String(editLesson.end_time ?? editLesson.endTime ?? prev.endTime).slice(0, 5),
      duration: editLesson.duration ?? prev.duration,
      timezone: editLesson.timezone ?? prev.timezone,
      recurrence: editLesson.recurrence ?? prev.recurrence,
      status: editLesson.status ?? prev.status,

      teacherId: editLesson.teacher_id ?? editLesson.teacherId ?? prev.teacherId,
      assistantTeacherId: editLesson.assistantTeacherId ?? editLesson.assistant_teacher_id ?? prev.assistantTeacherId,
      classroom: editLesson.classroom ?? prev.classroom ?? '',
      onlineLink: editLesson.onlineLink ?? editLesson.online_link ?? prev.onlineLink,
      equipment: editLesson.equipment ?? prev.equipment,

      groupId: editLesson.group_id ?? editLesson.groupId ?? prev.groupId,
      individualStudents: editLesson.individualStudents ?? prev.individualStudents,
      attendanceEnabled: editLesson.attendanceEnabled ?? editLesson.attendance_enabled ?? prev.attendanceEnabled,
      attendanceMode: editLesson.attendanceMode ?? editLesson.attendance_mode ?? prev.attendanceMode,

      description: editLesson.description ?? prev.description,
      objectives: editLesson.objectives ?? prev.objectives,
      homeworkText: editLesson.homeworkText ?? editLesson.homework_text ?? prev.homeworkText,
      homeworkFiles: editLesson.homeworkFiles ?? editLesson.homework_files ?? prev.homeworkFiles,
      materials: editLesson.materials ?? prev.materials,
      estimatedHomeworkTime: editLesson.estimatedHomeworkTime ?? editLesson.estimated_homework_time ?? prev.estimatedHomeworkTime,

      assessmentType: editLesson.assessmentType ?? editLesson.assessment_type ?? prev.assessmentType,
      maxScore: editLesson.maxScore ?? editLesson.max_score ?? prev.maxScore,
      passingScore: editLesson.passingScore ?? editLesson.passing_score ?? prev.passingScore,
      gradingScale: editLesson.gradingScale ?? editLesson.grading_scale ?? prev.gradingScale,
      autoGrade: editLesson.autoGrade ?? editLesson.auto_grade ?? prev.autoGrade,

      notifyStudents: editLesson.notifyStudents ?? editLesson.notify_students ?? prev.notifyStudents,
      notifyParents: editLesson.notifyParents ?? editLesson.notify_parents ?? prev.notifyParents,
      notifyTeacher: editLesson.notifyTeacher ?? editLesson.notify_teacher ?? prev.notifyTeacher,
      notificationTime: editLesson.notificationTime ?? editLesson.notification_time ?? prev.notificationTime,
      visibility: editLesson.visibility ?? prev.visibility,

      tags: editLesson.tags ?? prev.tags,
      priority: editLesson.priority ?? prev.priority,
      colorLabel: editLesson.colorLabel ?? editLesson.color_label ?? prev.colorLabel,
      internalNotes: editLesson.internalNotes ?? editLesson.internal_notes ?? prev.internalNotes,
    }));

    setOpenSections(prev => ({ ...prev, basic: true, schedule: true }));
  }, [editLesson, open]);

  const toggleSection = (section: keyof typeof openSections) =>
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));

  const updateFormData = (field: string, value: any) =>
    setFormData(prev => ({ ...prev, [field]: value }));

  const addTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData(prev => ({ ...prev, tags: [...prev.tags, newTag.trim()] }));
      setNewTag('');
    }
  };

  const removeTag = (tag: string) =>
    setFormData(prev => ({ ...prev, tags: prev.tags.filter(t => t !== tag) }));

  const addObjective = () => {
    if (newObjective.trim()) {
      setFormData(prev => ({
        ...prev,
        objectives: [...prev.objectives.filter(o => o), newObjective.trim()],
      }));
      setNewObjective('');
    }
  };

  const removeObjective = (index: number) =>
    setFormData(prev => ({ ...prev, objectives: prev.objectives.filter((_, i) => i !== index) }));

  const toggleEquipment = (value: string) =>
    setFormData(prev => ({
      ...prev,
      equipment: prev.equipment.includes(value)
        ? prev.equipment.filter(e => e !== value)
        : [...prev.equipment, value]
    }));

  const toggleClass = (value: string) =>
    setFormData(prev => ({
      ...prev,
      classes: prev.classes.includes(value)
        ? prev.classes.filter(c => c !== value)
        : [...prev.classes, value]
    }));

  const toggleStudent = (studentId: string) =>
    setFormData(prev => ({
      ...prev,
      individualStudents: prev.individualStudents.includes(studentId)
        ? prev.individualStudents.filter(s => s !== studentId)
        : [...prev.individualStudents, studentId]
    }));

  const buildLessonPayload = (asDraft: boolean) => {
    const payload: any = {
      ...formData,
      is_draft: !!asDraft,
      day_of_week: formData.date.getDay() || 7,
      start_time: formData.startTime,
      end_time: formData.endTime,
      group_id: formData.groupId || null,
      teacher_id: formData.teacherId || null,
      classroom: formData.classroom || null,
      date_iso: formData.date instanceof Date ? formData.date.toISOString() : formData.date,
    };
    if (payload.assistantTeacherId === 'none') payload.assistantTeacherId = '';
    return payload;
  };

  const handleSubmit = async (asDraft = false) => {
    if (!formData.subject) return toast.error('Выберите предмет');
    if (!formData.startTime || !formData.endTime) return toast.error('Укажите время урока');

    setIsSubmitting(true);
    setIsDraftAction(asDraft);

    try {
      const lessonData = buildLessonPayload(asDraft);

      if (mode === 'edit' && editLesson?.id) {
        localDB.updateLesson(editLesson.id, lessonData);
        toast.success(asDraft ? 'Сохранено как черновик' : 'Урок обновлён');
      } else {
        localDB.saveLesson(lessonData);
        toast.success(
          asDraft
            ? 'Сохранено как черновик'
            : mode === 'duplicate'
              ? 'Копия урока создана'
              : 'Урок добавлен в расписание'
        );
      }

      queryClient.invalidateQueries({ queryKey: ['schedule-lessons'] });
      
      // Задержка закрытия для плавной анимации и снятия блока
      setTimeout(() => onOpenChange(false), 150);
    } catch (error) {
      console.error(error);
      toast.error('Ошибка при сохранении урока');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!editLesson?.id) return;
    if (!confirm('Вы уверены, что хотите удалить этот урок?')) return;

    setIsSubmitting(true);
    try {
      localDB.deleteLesson(editLesson.id);
      toast.success('Урок удалён');
      queryClient.invalidateQueries({ queryKey: ['schedule-lessons'] });
      
      setTimeout(() => onOpenChange(false), 150);
    } catch (error) {
      toast.error('Ошибка при удалении урока');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDuplicate = () => {
    setMode('duplicate');
    setOpenSections(prev => ({ ...prev, basic: true, schedule: true }));
    toast.info('Выберите дату/время для копии и нажмите "Создать копию"');
  };

  const handleCancel = () => {
    setTimeout(() => onOpenChange(false), 150);
  };

  const selectedTeacher = (teachers as any[]).find((t: any) => t.id === formData.teacherId);

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleCancel(); else onOpenChange(v); }}>
      <DialogContent className="max-w-2xl h-[90vh] max-h-[90vh] p-0 flex flex-col overflow-hidden bg-background">
        
        {/* HEADER */}
        <DialogHeader className="px-6 py-4 border-b bg-card/50 shrink-0">
          <div className="flex items-start justify-between">
            <div>
              <DialogTitle className="text-xl font-bold tracking-tight">
                {mode === 'edit' ? 'Редактировать урок' : mode === 'duplicate' ? 'Дублировать урок' : 'Добавить урок'}
              </DialogTitle>
              <p className="text-xs text-muted-foreground mt-1">
                {mode === 'duplicate'
                  ? 'Измените дату/время и сохраните копию'
                  : 'Заполните информацию для создания урока'}
              </p>
            </div>
            <div className="flex items-center gap-2 pr-8">
              {formData.status && (
                <Badge variant="outline" className="text-xs border-dashed">
                  <span className={cn(
                    "w-1.5 h-1.5 rounded-full mr-1.5",
                    STATUS_OPTIONS.find(s => s.value === formData.status)?.color
                  )} />
                  {STATUS_OPTIONS.find(s => s.value === formData.status)?.label}
                </Badge>
              )}
            </div>
          </div>
        </DialogHeader>

        {/* Нативный скролл контейнер (вместо ScrollArea) */}
        <div className="flex-1 overflow-y-auto px-6 pb-6 pt-4 space-y-4 custom-scrollbar">

            {/* SECTION 1: Basic */}
            <Collapsible open={openSections.basic} onOpenChange={() => toggleSection('basic')}>
              <CollapsibleTrigger className="w-full">
                <SectionHeader icon={BookOpen} title="Основная информация" isOpen={openSections.basic} required />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="p-5 pt-4 space-y-5 border-x border-b rounded-b-xl bg-card shadow-sm mt-0.5">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2 space-y-2">
                      <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center">
                        Название урока
                        <FieldTooltip text="Опциональное название для урока" />
                      </Label>
                      <Input
                        placeholder="Например: Введение в алгебру"
                        value={formData.title}
                        onChange={(e) => updateFormData('title', e.target.value)}
                        className="h-10 focus-visible:ring-primary/30"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Предмет *</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="w-full h-10 justify-start text-left font-normal focus-visible:ring-primary/30">
                            {formData.subject || 'Выберите предмет'}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-56 p-2" align="start">
                          <Input
                            placeholder="Поиск предмета..."
                            value={subjectSearch}
                            onChange={(e) => setSubjectSearch(e.target.value)}
                            className="h-8 text-sm mb-2 focus-visible:ring-primary/30"
                          />
                          <div className="space-y-0.5 max-h-48 overflow-y-auto custom-scrollbar">
                            {filteredSubjects.map((subject) => (
                              <button
                                key={subject}
                                type="button"
                                className={cn(
                                  "w-full text-left px-2 py-1.5 text-sm rounded hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
                                  formData.subject === subject && "bg-primary/10 text-primary font-medium"
                                )}
                                onClick={() => {
                                  updateFormData('subject', subject);
                                  setSubjectSearch('');
                                }}
                              >
                                {subject}
                              </button>
                            ))}
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Тип урока</Label>
                      <Select value={formData.lessonType} onValueChange={(v) => updateFormData('lessonType', v)}>
                        <SelectTrigger className="h-10 focus:ring-primary/30">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {LESSON_TYPES.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              <div className="flex items-center gap-2">
                                <type.icon className="h-3.5 w-3.5" />
                                {type.label}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Классы / Группы</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="w-full h-10 justify-start text-left font-normal focus-visible:ring-primary/30">
                            {formData.classes.length > 0
                              ? `${formData.classes.length} выбрано`
                              : 'Выберите классы'
                            }
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-56 p-2" align="start">
                          <div className="space-y-1 max-h-48 overflow-y-auto custom-scrollbar">
                            {groups.map((group: any) => (
                              <div key={group.id} className="flex items-center space-x-2 p-1.5 hover:bg-muted rounded">
                                <Checkbox
                                  checked={formData.classes.includes(group.id)}
                                  onCheckedChange={() => toggleClass(group.id)}
                                  className="focus-visible:ring-primary/30"
                                />
                                <span className="text-sm">{group.name}</span>
                              </div>
                            ))}
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Учебный год</Label>
                      <Select value={formData.academicYear} onValueChange={(v) => updateFormData('academicYear', v)}>
                        <SelectTrigger className="h-10 focus:ring-primary/30"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {ACADEMIC_YEARS.map((year) => (
                            <SelectItem key={year} value={year}>{year}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Семестр</Label>
                      <Select value={formData.semester} onValueChange={(v) => updateFormData('semester', v)}>
                        <SelectTrigger className="h-10 focus:ring-primary/30"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {SEMESTERS.map((sem) => (
                            <SelectItem key={sem} value={sem}>{sem}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* SECTION 2: Schedule */}
            <Collapsible open={openSections.schedule} onOpenChange={() => toggleSection('schedule')}>
              <CollapsibleTrigger className="w-full">
                <SectionHeader icon={Clock} title="Расписание и время" isOpen={openSections.schedule} required />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="p-5 pt-4 space-y-4 border-x border-b rounded-b-xl bg-card shadow-sm mt-0.5">
                  <div className="flex flex-col md:flex-row gap-5">
                    <div className="flex-1 grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Начало *</Label>
                        <Select value={formData.startTime} onValueChange={(v) => updateFormData('startTime', v)}>
                          <SelectTrigger className="h-10 focus:ring-primary/30"><SelectValue placeholder="--:--" /></SelectTrigger>
                          <SelectContent>
                            {TIME_SLOTS.map((time) => (
                              <SelectItem key={time} value={time}>{time}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Окончание *</Label>
                        <Select value={formData.endTime} onValueChange={(v) => updateFormData('endTime', v)}>
                          <SelectTrigger className="h-10 focus:ring-primary/30"><SelectValue placeholder="--:--" /></SelectTrigger>
                          <SelectContent>
                            {TIME_SLOTS.map((time) => (
                              <SelectItem key={time} value={time}>{time}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Длительность (мин)</Label>
                        <Input
                          type="number"
                          value={formData.duration}
                          onChange={(e) => updateFormData('duration', parseInt(e.target.value) || 0)}
                          className="h-10 focus-visible:ring-primary/30"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Повторение</Label>
                        <Select value={formData.recurrence} onValueChange={(v) => updateFormData('recurrence', v)}>
                          <SelectTrigger className="h-10 focus:ring-primary/30"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {RECURRENCE_OPTIONS.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="col-span-2 space-y-2">
                        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Статус</Label>
                        <Select value={formData.status} onValueChange={(v) => updateFormData('status', v)}>
                          <SelectTrigger className="h-10 focus:ring-primary/30"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {STATUS_OPTIONS.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                <div className="flex items-center gap-2">
                                  <span className={cn("w-2.5 h-2.5 rounded-full", opt.color)} />
                                  {opt.label}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="flex-shrink-0 md:w-auto w-full">
                      <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 block">Дата</Label>
                      <div className="border rounded-xl overflow-hidden bg-background shadow-sm">
                        <Calendar
                          mode="single"
                          selected={formData.date}
                          onSelect={(date) => date && updateFormData('date', date)}
                          locale={ru}
                          className="p-3 pointer-events-auto"
                        />
                      </div>
                      <p className="text-xs font-medium text-muted-foreground mt-2 text-center">
                        {format(formData.date, 'EEEE, d MMMM yyyy', { locale: ru })}
                      </p>
                    </div>
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* SECTION 3: Teacher */}
            <Collapsible open={openSections.teacher} onOpenChange={() => toggleSection('teacher')}>
              <CollapsibleTrigger className="w-full">
                <SectionHeader
                  icon={User}
                  title="Преподаватель и кабинет"
                  isOpen={openSections.teacher}
                  badge={selectedTeacher?.full_name?.split(' ')[0] || selectedTeacher?.name?.split(' ')[0]}
                />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="p-5 pt-4 space-y-5 border-x border-b rounded-b-xl bg-card shadow-sm mt-0.5">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Преподаватель</Label>
                      <Select value={formData.teacherId} onValueChange={(v) => updateFormData('teacherId', v)}>
                        <SelectTrigger className="h-10 focus:ring-primary/30"><SelectValue placeholder="Выберите преподавателя" /></SelectTrigger>
                        <SelectContent>
                          {(teachers as any[]).map((teacher: any) => (
                            <SelectItem key={teacher.id} value={teacher.id}>
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                                  {(teacher.name || teacher.full_name)?.charAt(0)}
                                </div>
                                {teacher.name || teacher.full_name}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Ассистент (опционально)</Label>
                      <Select
                        value={formData.assistantTeacherId || 'none'}
                        onValueChange={(v) => updateFormData('assistantTeacherId', v === 'none' ? '' : v)}
                      >
                        <SelectTrigger className="h-10 focus:ring-primary/30"><SelectValue placeholder="Не выбрано" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Не выбрано</SelectItem>
                          {(teachers as any[]).map((teacher: any) => (
                            <SelectItem key={teacher.id} value={teacher.id}>{teacher.name || teacher.full_name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center">
                        <MapPin className="w-3.5 h-3.5 mr-1" />
                        Кабинет
                      </Label>
                      <Input
                        value={formData.classroom}
                        onChange={(e) => updateFormData('classroom', e.target.value)}
                        placeholder="Например: 301 (30 мест)"
                        className="h-10 focus-visible:ring-primary/30"
                      />
                    </div>

                    {formData.lessonType === 'online' && (
                      <div className="space-y-2">
                        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center">
                          <Link className="w-3.5 h-3.5 mr-1" />
                          Ссылка на онлайн-урок
                        </Label>
                        <Input
                          value={formData.onlineLink}
                          onChange={(e) => updateFormData('onlineLink', e.target.value)}
                          placeholder="https://meet.google.com/..."
                          className="h-10 focus-visible:ring-primary/30"
                        />
                      </div>
                    )}

                    <div className="col-span-2 space-y-2">
                      <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Необходимое оборудование</Label>
                      <div className="flex flex-wrap gap-2">
                        {EQUIPMENT_OPTIONS.map((eq) => (
                          <Button
                            key={eq.value}
                            type="button"
                            variant={formData.equipment.includes(eq.value) ? "default" : "outline"}
                            size="sm"
                            className="h-8 text-xs focus-visible:ring-primary/30"
                            onClick={() => toggleEquipment(eq.value)}
                          >
                            <eq.icon className="w-3.5 h-3.5 mr-1.5" />
                            {eq.label}
                          </Button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* SECTION 4: Students */}
            <Collapsible open={openSections.students} onOpenChange={() => toggleSection('students')}>
              <CollapsibleTrigger className="w-full">
                <SectionHeader icon={Users} title="Ученики и посещаемость" isOpen={openSections.students} />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="p-5 pt-4 space-y-5 border-x border-b rounded-b-xl bg-card shadow-sm mt-0.5">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Класс учеников</Label>
                      <Select value={formData.groupId} onValueChange={(v) => updateFormData('groupId', v)}>
                        <SelectTrigger className="h-10 focus:ring-primary/30"><SelectValue placeholder="Выберите класс" /></SelectTrigger>
                        <SelectContent>
                          {groups.map((group: any) => (
                            <SelectItem key={group.id} value={group.id}>
                              {group.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Режим посещаемости</Label>
                      <Select value={formData.attendanceMode} onValueChange={(v) => updateFormData('attendanceMode', v)}>
                        <SelectTrigger className="h-10 focus:ring-primary/30"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {ATTENDANCE_MODES.map((mode) => (
                            <SelectItem key={mode.value} value={mode.value}>{mode.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="col-span-2 flex items-center justify-between p-4 bg-muted/40 border border-border/50 rounded-xl">
                      <div className="flex items-center gap-2.5">
                        <CheckCircle2 className="w-5 h-5 text-primary" />
                        <span className="text-sm font-medium">Отслеживание посещаемости</span>
                      </div>
                      <Switch
                        checked={formData.attendanceEnabled}
                        onCheckedChange={(checked) => updateFormData('attendanceEnabled', checked)}
                        className="focus-visible:ring-primary/30"
                      />
                    </div>

                    <div className="col-span-2 space-y-2">
                      <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Индивидуальный выбор учеников</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="w-full h-10 justify-start text-left font-normal focus-visible:ring-primary/30">
                            {formData.individualStudents.length > 0
                              ? `${formData.individualStudents.length} учеников выбрано`
                              : 'Выбрать учеников вручную'
                            }
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-64 p-2" align="start">
                          <div className="space-y-1 max-h-48 overflow-y-auto custom-scrollbar pr-1">
                            {students.map((student: any) => (
                              <div key={student.id} className="flex items-center space-x-2 p-2 hover:bg-muted rounded-md cursor-pointer">
                                <Checkbox
                                  checked={formData.individualStudents.includes(student.id)}
                                  onCheckedChange={() => toggleStudent(student.id)}
                                  className="focus-visible:ring-primary/30"
                                />
                                <span className="text-sm font-medium">{student.name} {student.surname}</span>
                              </div>
                            ))}
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* SECTION 5: Content */}
            <Collapsible open={openSections.content} onOpenChange={() => toggleSection('content')}>
              <CollapsibleTrigger className="w-full">
                <SectionHeader icon={FileText} title="Содержание и материалы" isOpen={openSections.content} />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="p-5 pt-4 space-y-5 border-x border-b rounded-b-xl bg-card shadow-sm mt-0.5">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Описание урока</Label>
                    <Textarea
                      value={formData.description}
                      onChange={(e) => updateFormData('description', e.target.value)}
                      placeholder="Краткое описание темы и целей урока..."
                      className="min-h-[80px] text-sm focus-visible:ring-primary/30 resize-none"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Цели урока</Label>
                    <div className="space-y-2">
                      {formData.objectives.filter(o => o).map((obj, idx) => (
                        <div key={idx} className="flex items-center gap-3 p-2 bg-muted/30 rounded-lg border border-border/50">
                          <span className="w-6 h-6 rounded-md bg-primary/10 text-primary text-xs flex items-center justify-center font-bold">
                            {idx + 1}
                          </span>
                          <span className="flex-1 text-sm font-medium">{obj}</span>
                          <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive focus-visible:ring-destructive/30" onClick={() => removeObjective(idx)}>
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                      <div className="flex gap-2 pt-1">
                        <Input
                          value={newObjective}
                          onChange={(e) => setNewObjective(e.target.value)}
                          placeholder="Добавить цель..."
                          className="h-10 text-sm focus-visible:ring-primary/30"
                          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addObjective())}
                        />
                        <Button type="button" variant="secondary" className="h-10 px-4 focus-visible:ring-primary/30" onClick={addObjective}>
                          <Plus className="h-4 w-4 mr-1.5" /> Добавить
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Домашнее задание</Label>
                    <Textarea
                      value={formData.homeworkText}
                      onChange={(e) => updateFormData('homeworkText', e.target.value)}
                      placeholder="Описание домашнего задания..."
                      className="min-h-[60px] text-sm focus-visible:ring-primary/30 resize-none"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Время на ДЗ (мин)</Label>
                    <Input
                      type="number"
                      value={formData.estimatedHomeworkTime}
                      onChange={(e) => updateFormData('estimatedHomeworkTime', parseInt(e.target.value) || 0)}
                      className="h-10 w-32 focus-visible:ring-primary/30"
                    />
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* SECTION 6: Assessment */}
            <Collapsible open={openSections.assessment} onOpenChange={() => toggleSection('assessment')}>
              <CollapsibleTrigger className="w-full">
                <SectionHeader icon={Award} title="Оценивание" isOpen={openSections.assessment} />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="p-5 pt-4 space-y-5 border-x border-b rounded-b-xl bg-card shadow-sm mt-0.5">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Тип оценки</Label>
                      <Select value={formData.assessmentType} onValueChange={(v) => updateFormData('assessmentType', v)}>
                        <SelectTrigger className="h-10 focus:ring-primary/30"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {ASSESSMENT_TYPES.map((type) => (
                            <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Шкала оценок</Label>
                      <Select value={formData.gradingScale} onValueChange={(v) => updateFormData('gradingScale', v)}>
                        <SelectTrigger className="h-10 focus:ring-primary/30"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {GRADING_SCALES.map((scale) => (
                            <SelectItem key={scale.value} value={scale.value}>{scale.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {formData.assessmentType !== 'none' && (
                      <>
                        <div className="space-y-2">
                          <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Максимальный балл</Label>
                          <Input
                            type="number"
                            value={formData.maxScore}
                            onChange={(e) => updateFormData('maxScore', parseInt(e.target.value) || 0)}
                            className="h-10 focus-visible:ring-primary/30"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Проходной балл</Label>
                          <Input
                            type="number"
                            value={formData.passingScore}
                            onChange={(e) => updateFormData('passingScore', parseInt(e.target.value) || 0)}
                            className="h-10 focus-visible:ring-primary/30"
                          />
                        </div>
                        <div className="col-span-2 flex items-center justify-between p-4 bg-muted/40 border border-border/50 rounded-xl">
                          <div className="flex items-center gap-2.5">
                            <CheckCircle2 className="h-5 h-5 text-primary" />
                            <span className="text-sm font-medium">Автоматическая проверка</span>
                          </div>
                          <Switch 
                            checked={formData.autoGrade} 
                            onCheckedChange={(checked) => updateFormData('autoGrade', checked)} 
                            className="focus-visible:ring-primary/30" 
                          />
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* SECTION 7: Notifications */}
            <Collapsible open={openSections.notifications} onOpenChange={() => toggleSection('notifications')}>
              <CollapsibleTrigger className="w-full">
                <SectionHeader icon={Bell} title="Уведомления и видимость" isOpen={openSections.notifications} />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="p-5 pt-4 space-y-5 border-x border-b rounded-b-xl bg-card shadow-sm mt-0.5">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="flex items-center justify-between p-3 bg-muted/30 border border-border/50 rounded-xl">
                      <span className="text-sm font-medium">Ученикам</span>
                      <Switch checked={formData.notifyStudents} onCheckedChange={(checked) => updateFormData('notifyStudents', checked)} className="focus-visible:ring-primary/30" />
                    </div>
                    <div className="flex items-center justify-between p-3 bg-muted/30 border border-border/50 rounded-xl">
                      <span className="text-sm font-medium">Родителям</span>
                      <Switch checked={formData.notifyParents} onCheckedChange={(checked) => updateFormData('notifyParents', checked)} className="focus-visible:ring-primary/30" />
                    </div>
                    <div className="flex items-center justify-between p-3 bg-muted/30 border border-border/50 rounded-xl">
                      <span className="text-sm font-medium">Учителю</span>
                      <Switch checked={formData.notifyTeacher} onCheckedChange={(checked) => updateFormData('notifyTeacher', checked)} className="focus-visible:ring-primary/30" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Время уведомления</Label>
                      <Select value={formData.notificationTime} onValueChange={(v) => updateFormData('notificationTime', v)}>
                        <SelectTrigger className="h-10 focus:ring-primary/30"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="immediately">Сразу</SelectItem>
                          <SelectItem value="1hour">За 1 час</SelectItem>
                          <SelectItem value="1day">За 1 день</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Видимость</Label>
                      <Select value={formData.visibility} onValueChange={(v) => updateFormData('visibility', v)}>
                        <SelectTrigger className="h-10 focus:ring-primary/30"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {VISIBILITY_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* SECTION 8: Tags */}
            <Collapsible open={openSections.tags} onOpenChange={() => toggleSection('tags')}>
              <CollapsibleTrigger className="w-full">
                <SectionHeader icon={Tag} title="Теги и метаданные" isOpen={openSections.tags} badge={formData.tags.length > 0 ? `${formData.tags.length}` : undefined} />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="p-5 pt-4 space-y-5 border-x border-b rounded-b-xl bg-card shadow-sm mt-0.5">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Теги</Label>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {formData.tags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="px-2.5 py-1 text-xs">
                          {tag}
                          <button type="button" onClick={() => removeTag(tag)} className="ml-1.5 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 rounded-full">
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <Input
                        value={newTag}
                        onChange={(e) => setNewTag(e.target.value)}
                        placeholder="Добавить тег..."
                        className="h-10 text-sm focus-visible:ring-primary/30"
                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                      />
                      <Button type="button" variant="secondary" className="h-10 px-4 focus-visible:ring-primary/30" onClick={addTag}>
                        <Plus className="h-4 w-4 mr-1.5" /> Добавить
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Приоритет</Label>
                      <Select value={formData.priority} onValueChange={(v) => updateFormData('priority', v)}>
                        <SelectTrigger className="h-10 focus:ring-primary/30"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {PRIORITY_LEVELS.map((level) => (
                            <SelectItem key={level.value} value={level.value}>
                              <div className="flex items-center gap-2">
                                <span className={cn("w-2.5 h-2.5 rounded-full", level.color)} />
                                {level.label}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Цвет в календаре</Label>
                      <div className="flex gap-2 mt-1">
                        {COLOR_LABELS.map((color) => (
                          <button
                            key={color.value}
                            type="button"
                            className={cn(
                              "w-8 h-8 rounded-full transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 shadow-sm",
                              color.class,
                              formData.colorLabel === color.value && "ring-2 ring-offset-2 ring-foreground scale-110"
                            )}
                            onClick={() => updateFormData('colorLabel', color.value)}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center">
                      <Info className="h-3.5 w-3.5 mr-1.5" />
                      Внутренние заметки (только для администрации)
                    </Label>
                    <Textarea
                      value={formData.internalNotes}
                      onChange={(e) => updateFormData('internalNotes', e.target.value)}
                      placeholder="Заметки, не видимые ученикам..."
                      className="min-h-[80px] text-sm focus-visible:ring-primary/30 resize-none"
                    />
                  </div>

                </div>
              </CollapsibleContent>
            </Collapsible>

          </div>
    
        

        {/* SECTION 9: Actions */}
        <div className="px-6 py-4 border-t bg-card/50 flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0">
          <div className="flex flex-wrap gap-2 w-full sm:w-auto justify-center sm:justify-start">

            {mode === 'edit' && editLesson?.id && (
              <Button type="button" variant="destructive" size="sm" onClick={handleDelete} disabled={isSubmitting} className="h-10 focus-visible:ring-destructive/30">
                <Trash2 className="h-4 w-4 mr-1.5" />
                Удалить
              </Button>
            )}

            {mode === 'edit' && (
              <Button type="button" variant="outline" size="sm" onClick={handleDuplicate} disabled={isSubmitting} className="h-10 focus-visible:ring-primary/30">
                <Copy className="h-4 w-4 mr-1.5" />
                Дублировать
              </Button>
            )}

          </div>

          <div className="flex flex-wrap gap-2 w-full sm:w-auto justify-center sm:justify-end">
            <Button type="button" variant="ghost" size="sm" onClick={handleCancel} disabled={isSubmitting} className="h-10 focus-visible:ring-primary/30">
              Отмена
            </Button>

            <Button type="button" variant="outline" size="sm" onClick={() => handleSubmit(true)} disabled={isSubmitting} className="h-10 focus-visible:ring-primary/30">
              <Save className="h-4 w-4 mr-1.5" />
              {isSubmitting && isDraftAction ? 'Сохранение...' : 'Черновик'}
            </Button>

            <Button type="button" size="sm" onClick={() => handleSubmit(false)} disabled={isSubmitting} className="h-10 focus-visible:ring-primary/30">
              <Send className="h-4 w-4 mr-1.5" />
              {isSubmitting && !isDraftAction
                ? 'Сохранение...'
                : mode === 'duplicate'
                  ? 'Создать копию'
                  : mode === 'edit'
                    ? 'Сохранить'
                    : 'Опубликовать'}
            </Button>
          </div>
        </div>

      </DialogContent>
    </Dialog>
  );
}