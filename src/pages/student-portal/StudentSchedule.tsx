import { useState, useRef } from 'react';
import { ChevronLeft, ChevronRight, MapPin, User, BookOpen, Plus, X, Clock, FileText, CheckCircle, Paperclip, Image, File, Download, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, addDays, subDays, startOfWeek, isSameDay } from 'date-fns';
import { ru } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface HwAttachment {
  name: string;
  url: string;
  type: string;
  size: number;
}

interface Homework {
  id: number;
  text: string;
  done: boolean;
  createdAt: string;
  attachments: HwAttachment[];
}

interface LessonData {
  time: string;
  subject: string;
  teacher: string;
  room: string;
}

const mockSchedule: Record<string, LessonData[]> = {
  '1': [
    { time: '08:30 – 09:15', subject: 'Математика', teacher: 'Петрова Е.С.', room: '301' },
    { time: '09:30 – 10:15', subject: 'Русский язык', teacher: 'Козлова И.А.', room: '204' },
    { time: '10:30 – 11:15', subject: 'Английский', teacher: 'Джонсон М.', room: '108' },
    { time: '11:30 – 12:15', subject: 'История', teacher: 'Сидорова Н.В.', room: '402' },
    { time: '13:00 – 13:45', subject: 'Физкультура', teacher: 'Тимуров А.', room: 'Спортзал' },
  ],
  '2': [
    { time: '08:30 – 09:15', subject: 'Физика', teacher: 'Иванов К.Н.', room: '205' },
    { time: '09:30 – 10:15', subject: 'Химия', teacher: 'Нурова Д.М.', room: '307' },
    { time: '10:30 – 11:15', subject: 'Математика', teacher: 'Петрова Е.С.', room: '301' },
    { time: '11:30 – 12:15', subject: 'Литература', teacher: 'Козлова И.А.', room: '204' },
    { time: '13:00 – 13:45', subject: 'Информатика', teacher: 'Алиев Р.Б.', room: '310' },
  ],
  '3': [
    { time: '08:30 – 09:15', subject: 'Английский', teacher: 'Джонсон М.', room: '108' },
    { time: '09:30 – 10:15', subject: 'Математика', teacher: 'Петрова Е.С.', room: '301' },
    { time: '10:30 – 11:15', subject: 'Биология', teacher: 'Хасанова Л.', room: '209' },
    { time: '11:30 – 12:15', subject: 'География', teacher: 'Мирзаев Т.', room: '305' },
  ],
  '4': [
    { time: '08:30 – 09:15', subject: 'Русский язык', teacher: 'Козлова И.А.', room: '204' },
    { time: '09:30 – 10:15', subject: 'Физика', teacher: 'Иванов К.Н.', room: '205' },
    { time: '10:30 – 11:15', subject: 'Математика', teacher: 'Петрова Е.С.', room: '301' },
    { time: '11:30 – 12:15', subject: 'Английский', teacher: 'Джонсон М.', room: '108' },
    { time: '13:00 – 13:45', subject: 'Музыка', teacher: 'Каримова А.', room: '101' },
  ],
  '5': [
    { time: '08:30 – 09:15', subject: 'Информатика', teacher: 'Алиев Р.Б.', room: '310' },
    { time: '09:30 – 10:15', subject: 'История', teacher: 'Сидорова Н.В.', room: '402' },
    { time: '10:30 – 11:15', subject: 'Химия', teacher: 'Нурова Д.М.', room: '307' },
    { time: '11:30 – 12:15', subject: 'Математика', teacher: 'Петрова Е.С.', room: '301' },
  ],
};

const subjectEmoji: Record<string, string> = {
  'Математика': '📐', 'Физика': '⚡', 'Химия': '🧪', 'Английский': '🇬🇧',
  'История': '📜', 'Русский язык': '📝', 'Информатика': '💻', 'Биология': '🌿',
  'География': '🌍', 'Литература': '📖', 'Физкультура': '⚽', 'Музыка': '🎵',
};

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return bytes + ' Б';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' КБ';
  return (bytes / (1024 * 1024)).toFixed(1) + ' МБ';
};

const getFileIcon = (type: string) => {
  if (type.startsWith('image/')) return Image;
  return File;
};

const StudentSchedule = () => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [openLesson, setOpenLesson] = useState<{ dayKey: string; index: number } | null>(null);
  const [homeworkMap, setHomeworkMap] = useState<Record<string, Homework[]>>({});
  const [newHwText, setNewHwText] = useState('');
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 5 }, (_, i) => addDays(weekStart, i));
  const dayOfWeek = selectedDate.getDay();
  const lessons = mockSchedule[dayOfWeek.toString()] || [];

  const getLessonKey = (dayKey: string, index: number) => `${format(selectedDate, 'yyyy-MM-dd')}-${dayKey}-${index}`;

  const getHomework = (dayKey: string, index: number): Homework[] => {
    return homeworkMap[getLessonKey(dayKey, index)] || [];
  };

  const uploadFiles = async (files: File[]): Promise<HwAttachment[]> => {
    const attachments: HwAttachment[] = [];
    for (const file of files) {
      const ext = file.name.split('.').pop();
      const path = `student-hw/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { data, error } = await supabase.storage.from('homework-attachments').upload(path, file);
      if (error) {
        toast.error(`Ошибка загрузки: ${file.name}`);
        continue;
      }
      const { data: urlData } = supabase.storage.from('homework-attachments').getPublicUrl(data.path);
      attachments.push({
        name: file.name,
        url: urlData.publicUrl,
        type: file.type,
        size: file.size,
      });
    }
    return attachments;
  };

  const addHomework = async () => {
    if ((!newHwText.trim() && pendingFiles.length === 0) || !openLesson) return;

    setUploading(true);
    let attachments: HwAttachment[] = [];
    if (pendingFiles.length > 0) {
      attachments = await uploadFiles(pendingFiles);
    }

    const key = getLessonKey(openLesson.dayKey, openLesson.index);
    const newItem: Homework = {
      id: Date.now(),
      text: newHwText.trim() || (attachments.length > 0 ? `📎 ${attachments.map(a => a.name).join(', ')}` : ''),
      done: false,
      createdAt: new Date().toISOString(),
      attachments,
    };
    setHomeworkMap(prev => ({ ...prev, [key]: [...(prev[key] || []), newItem] }));
    setNewHwText('');
    setPendingFiles([]);
    setUploading(false);
    if (attachments.length > 0) {
      toast.success(`Загружено ${attachments.length} файл(ов)`);
    }
  };

  const toggleHomework = (hwId: number) => {
    if (!openLesson) return;
    const key = getLessonKey(openLesson.dayKey, openLesson.index);
    setHomeworkMap(prev => ({
      ...prev,
      [key]: (prev[key] || []).map(h => h.id === hwId ? { ...h, done: !h.done } : h),
    }));
  };

  const deleteHomework = (hwId: number) => {
    if (!openLesson) return;
    const key = getLessonKey(openLesson.dayKey, openLesson.index);
    setHomeworkMap(prev => ({
      ...prev,
      [key]: (prev[key] || []).filter(h => h.id !== hwId),
    }));
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    const maxSize = 20 * 1024 * 1024;
    const valid = files.filter(f => {
      if (f.size > maxSize) {
        toast.error(`${f.name} превышает 20 МБ`);
        return false;
      }
      return true;
    });
    setPendingFiles(prev => [...prev, ...valid]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removePendingFile = (index: number) => {
    setPendingFiles(prev => prev.filter((_, i) => i !== index));
  };

  const openHwList = openLesson ? getHomework(openLesson.dayKey, openLesson.index) : [];

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-semibold" style={{ color: 'hsl(var(--sp-text))' }}>Расписание</h1>

      {/* Week Navigation */}
      <div className="rounded-xl border p-3" style={{ backgroundColor: 'hsl(var(--sp-white))', borderColor: 'hsl(var(--sp-border))' }}>
        <div className="flex items-center justify-between mb-3">
          <button className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: 'hsl(var(--sp-yellow-light))' }}
                  onClick={() => setSelectedDate(subDays(selectedDate, 7))}>
            <ChevronLeft className="w-4 h-4" style={{ color: 'hsl(var(--sp-yellow-dark))' }} />
          </button>
          <p className="font-medium text-sm" style={{ color: 'hsl(var(--sp-text))' }}>
            {format(weekStart, 'd MMM', { locale: ru })} – {format(addDays(weekStart, 4), 'd MMM', { locale: ru })}
          </p>
          <button className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: 'hsl(var(--sp-yellow-light))' }}
                  onClick={() => setSelectedDate(addDays(selectedDate, 7))}>
            <ChevronRight className="w-4 h-4" style={{ color: 'hsl(var(--sp-yellow-dark))' }} />
          </button>
        </div>
        <div className="flex justify-between gap-1">
          {weekDays.map((day) => {
            const isSelected = isSameDay(day, selectedDate);
            const isToday = isSameDay(day, new Date());
            return (
              <button key={day.toISOString()} onClick={() => { setSelectedDate(day); setOpenLesson(null); }}
                className="flex flex-col items-center py-2 px-3 rounded-xl transition-all flex-1"
                style={isSelected ? { backgroundColor: 'hsl(var(--sp-yellow))', color: 'white' } : isToday ? { backgroundColor: 'hsl(var(--sp-yellow-light))' } : {}}>
                <span className="text-[10px] font-medium uppercase"
                      style={{ color: isSelected ? 'rgba(255,255,255,0.8)' : 'hsl(var(--sp-text-secondary))' }}>
                  {format(day, 'EEE', { locale: ru })}
                </span>
                <span className="text-sm font-bold mt-0.5"
                      style={{ color: isSelected ? 'white' : 'hsl(var(--sp-text))' }}>
                  {format(day, 'd')}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Today Button */}
      {!isSameDay(selectedDate, new Date()) && (
        <button className="w-full py-2 text-sm font-medium rounded-xl border transition-colors"
                style={{ borderColor: 'hsl(var(--sp-yellow))', color: 'hsl(var(--sp-yellow-dark))', backgroundColor: 'hsl(var(--sp-yellow-light))' }}
                onClick={() => { setSelectedDate(new Date()); setOpenLesson(null); }}>
          Сегодня
        </button>
      )}

      {/* Hidden file input */}
      <input ref={fileInputRef} type="file" multiple className="hidden"
             accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar"
             onChange={handleFileSelect} />

      {/* Lessons */}
      <div className="space-y-2">
        {lessons.length === 0 ? (
          <div className="rounded-xl border p-8 text-center" style={{ backgroundColor: 'hsl(var(--sp-white))', borderColor: 'hsl(var(--sp-border))' }}>
            <p className="text-sm" style={{ color: 'hsl(var(--sp-text-secondary))' }}>Нет уроков</p>
          </div>
        ) : (
          lessons.map((lesson, i) => {
            const dayKey = dayOfWeek.toString();
            const hw = getHomework(dayKey, i);
            const hwCount = hw.length;
            const attachCount = hw.reduce((sum, h) => sum + h.attachments.length, 0);
            const isOpen = openLesson?.dayKey === dayKey && openLesson?.index === i;

            return (
              <div key={i}>
                <button
                  className="w-full rounded-xl border p-3 text-left transition-all active:scale-[0.98]"
                  style={{
                    backgroundColor: isOpen ? 'hsl(var(--sp-yellow-light))' : 'hsl(var(--sp-white))',
                    borderColor: isOpen ? 'hsl(var(--sp-yellow) / 0.4)' : 'hsl(var(--sp-border))',
                  }}
                  onClick={() => setOpenLesson(isOpen ? null : { dayKey, index: i })}
                >
                  <div className="flex items-start gap-3">
                    <div className="text-center min-w-[50px]">
                      <p className="text-xs font-bold" style={{ color: 'hsl(var(--sp-text))' }}>{lesson.time.split(' – ')[0]}</p>
                      <p className="text-[10px]" style={{ color: 'hsl(var(--sp-text-secondary))' }}>{lesson.time.split(' – ')[1]}</p>
                    </div>
                    <div className="w-px h-10 shrink-0" style={{ backgroundColor: 'hsl(var(--sp-yellow-muted))' }} />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-sm">{subjectEmoji[lesson.subject] || '📚'}</span>
                        <span className="text-sm font-semibold px-2 py-0.5 rounded-lg"
                              style={{ backgroundColor: isOpen ? 'hsl(var(--sp-yellow) / 0.2)' : 'hsl(var(--sp-yellow-light))', color: 'hsl(var(--sp-yellow-dark))' }}>
                          {lesson.subject}
                        </span>
                        {hwCount > 0 && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md text-white"
                                style={{ backgroundColor: 'hsl(var(--sp-yellow))' }}>
                            ДЗ {hwCount}
                          </span>
                        )}
                        {attachCount > 0 && (
                          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-md flex items-center gap-0.5"
                                style={{ backgroundColor: 'hsl(var(--sp-yellow-light))', color: 'hsl(var(--sp-yellow-dark))' }}>
                            <Paperclip className="w-2.5 h-2.5" />{attachCount}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs" style={{ color: 'hsl(var(--sp-text-secondary))' }}>
                        <span className="flex items-center gap-1"><User className="w-3 h-3" />{lesson.teacher}</span>
                        <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{lesson.room}</span>
                      </div>
                    </div>
                  </div>
                </button>

                {/* Expanded Homework Panel */}
                {isOpen && (
                  <div className="mt-1 rounded-xl border p-3 space-y-3"
                       style={{ backgroundColor: 'hsl(var(--sp-white))', borderColor: 'hsl(var(--sp-yellow) / 0.3)' }}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <BookOpen className="w-4 h-4" style={{ color: 'hsl(var(--sp-yellow-dark))' }} />
                        <span className="text-xs font-semibold" style={{ color: 'hsl(var(--sp-text))' }}>
                          Мои заметки / ДЗ
                        </span>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                            style={{ backgroundColor: 'hsl(var(--sp-yellow-light))', color: 'hsl(var(--sp-text-secondary))' }}>
                        {openHwList.filter(h => h.done).length}/{openHwList.length} выполнено
                      </span>
                    </div>

                    {/* Homework List */}
                    {openHwList.length > 0 && (
                      <div className="space-y-1.5">
                        {openHwList.map(hw => (
                          <div key={hw.id} className="rounded-lg transition-all overflow-hidden"
                               style={{ backgroundColor: hw.done ? 'hsl(var(--sp-yellow-light) / 0.5)' : 'hsl(var(--sp-yellow-light))' }}>
                            <div className="flex items-start gap-2.5 p-2">
                              <button onClick={() => toggleHomework(hw.id)}
                                      className="mt-0.5 w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all"
                                      style={{
                                        borderColor: hw.done ? 'hsl(var(--sp-yellow))' : 'hsl(var(--sp-yellow-muted))',
                                        backgroundColor: hw.done ? 'hsl(var(--sp-yellow))' : 'transparent',
                                      }}>
                                {hw.done && <CheckCircle className="w-3 h-3 text-white" />}
                              </button>
                              <p className={cn("text-xs flex-1", hw.done && "line-through")}
                                 style={{ color: hw.done ? 'hsl(var(--sp-text-secondary))' : 'hsl(var(--sp-text))' }}>
                                {hw.text}
                              </p>
                              <button onClick={() => deleteHomework(hw.id)}
                                      className="shrink-0 w-5 h-5 rounded flex items-center justify-center"
                                      style={{ color: 'hsl(var(--sp-text-secondary))' }}>
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                            {/* Attached files */}
                            {hw.attachments.length > 0 && (
                              <div className="px-2 pb-2 pt-0.5 space-y-1">
                                {hw.attachments.map((att, ai) => {
                                  const FileIcon = getFileIcon(att.type);
                                  const isImage = att.type.startsWith('image/');
                                  return (
                                    <a key={ai} href={att.url} target="_blank" rel="noopener noreferrer"
                                       className="flex items-center gap-2 p-1.5 rounded-md border transition-all active:scale-[0.98]"
                                       style={{ borderColor: 'hsl(var(--sp-border))', backgroundColor: 'hsl(var(--sp-white))' }}>
                                      {isImage ? (
                                        <img src={att.url} alt={att.name}
                                             className="w-8 h-8 rounded object-cover shrink-0" />
                                      ) : (
                                        <div className="w-8 h-8 rounded flex items-center justify-center shrink-0"
                                             style={{ backgroundColor: 'hsl(var(--sp-yellow-light))' }}>
                                          <FileIcon className="w-4 h-4" style={{ color: 'hsl(var(--sp-yellow-dark))' }} />
                                        </div>
                                      )}
                                      <div className="flex-1 min-w-0">
                                        <p className="text-[10px] font-medium truncate" style={{ color: 'hsl(var(--sp-text))' }}>{att.name}</p>
                                        <p className="text-[9px]" style={{ color: 'hsl(var(--sp-text-secondary))' }}>{formatFileSize(att.size)}</p>
                                      </div>
                                      <Download className="w-3 h-3 shrink-0" style={{ color: 'hsl(var(--sp-text-secondary))' }} />
                                    </a>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Pending files preview */}
                    {pendingFiles.length > 0 && (
                      <div className="space-y-1">
                        <p className="text-[10px] font-medium" style={{ color: 'hsl(var(--sp-text-secondary))' }}>
                          Файлы к загрузке:
                        </p>
                        {pendingFiles.map((f, fi) => {
                          const PfIcon = getFileIcon(f.type);
                          return (
                            <div key={fi} className="flex items-center gap-2 p-1.5 rounded-md border"
                                 style={{ borderColor: 'hsl(var(--sp-yellow) / 0.3)', backgroundColor: 'hsl(var(--sp-yellow-light))' }}>
                              <div className="w-7 h-7 rounded flex items-center justify-center shrink-0"
                                   style={{ backgroundColor: 'hsl(var(--sp-yellow) / 0.2)' }}>
                                <PfIcon className="w-3.5 h-3.5" style={{ color: 'hsl(var(--sp-yellow-dark))' }} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-[10px] font-medium truncate" style={{ color: 'hsl(var(--sp-text))' }}>{f.name}</p>
                                <p className="text-[9px]" style={{ color: 'hsl(var(--sp-text-secondary))' }}>{formatFileSize(f.size)}</p>
                              </div>
                              <button onClick={() => removePendingFile(fi)}
                                      className="shrink-0 w-5 h-5 rounded flex items-center justify-center"
                                      style={{ color: 'hsl(var(--sp-text-secondary))' }}>
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Add Homework Input */}
                    <div className="flex gap-2">
                      <button onClick={() => fileInputRef.current?.click()}
                              className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border transition-all active:scale-95"
                              style={{ borderColor: 'hsl(var(--sp-border))', backgroundColor: 'hsl(var(--sp-warm-white))', color: 'hsl(var(--sp-text-secondary))' }}>
                        <Paperclip className="w-4 h-4" />
                      </button>
                      <input
                        type="text"
                        value={newHwText}
                        onChange={e => setNewHwText(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && !uploading && addHomework()}
                        placeholder="Записать задание..."
                        className="flex-1 text-xs px-3 py-2 rounded-lg border outline-none transition-all"
                        style={{
                          backgroundColor: 'hsl(var(--sp-warm-white))',
                          borderColor: 'hsl(var(--sp-border))',
                          color: 'hsl(var(--sp-text))',
                        }}
                      />
                      <button onClick={addHomework}
                              disabled={(!newHwText.trim() && pendingFiles.length === 0) || uploading}
                              className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-all disabled:opacity-40"
                              style={{ backgroundColor: 'hsl(var(--sp-yellow))', color: 'white' }}>
                        {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default StudentSchedule;
