import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Clock, MapPin, User, Users, CheckCircle, XCircle, AlertCircle,
  BookOpen, FileText, Edit, Download, Paperclip
} from 'lucide-react';

interface AttendanceStudent {
  id: string;
  name: string;
  status: 'present' | 'absent' | 'late' | 'excused' | 'not_marked';
}

interface LessonWithAttendance {
  id: string;
  subject: string;
  start_time: string;
  end_time: string;
  classroom: string | null;
  teacher: { id: string; full_name: string } | null;
  group: { id: string; name: string } | null;
  attendance: AttendanceStudent[];
}

interface HomeworkData {
  text: string;
  files: { name: string; url: string; size?: string }[];
  createdAt?: string;
}

interface LessonDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lesson: LessonWithAttendance | null;
  homework?: HomeworkData | null;
  onOpenHomework: () => void;
  onEditLesson: () => void;
  onUpdateAttendance: (studentId: string, status: 'present' | 'absent' | 'late') => void;
}

export function LessonDetailModal({
  open,
  onOpenChange,
  lesson,
  homework,
  onOpenHomework,
  onEditLesson,
  onUpdateAttendance
}: LessonDetailModalProps) {
  const [activeTab, setActiveTab] = useState('attendance');

  if (!lesson) return null;

  const stats = {
    total: lesson.attendance.length,
    present: lesson.attendance.filter(a => a.status === 'present').length,
    late: lesson.attendance.filter(a => a.status === 'late').length,
    absent: lesson.attendance.filter(a => a.status === 'absent').length,
    not_marked: lesson.attendance.filter(a => a.status === 'not_marked').length,
  };

  const handleMarkAttendance = (studentId: string, status: 'present' | 'absent' | 'late') => {
    onUpdateAttendance(studentId, status);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'present':
        return <Badge className="bg-success/15 text-success hover:bg-success/20 border-0">Присутствует</Badge>;
      case 'late':
        return <Badge className="bg-warning/15 text-warning hover:bg-warning/20 border-0">Опоздал</Badge>;
      case 'absent':
        return <Badge className="bg-destructive/15 text-destructive hover:bg-destructive/20 border-0">Отсутствует</Badge>;
      case 'excused':
        return <Badge variant="secondary">Уважительная</Badge>;
      default:
        return <Badge variant="outline" className="text-muted-foreground border-dashed">Не отмечен</Badge>;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden bg-background">
        {/* ✅ pr-12 чтобы close-крестик не наезжал */}
        <DialogHeader className="p-6 pr-12 border-b bg-card/50">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-3 min-w-0">
              <DialogTitle className="text-2xl font-bold tracking-tight text-foreground truncate">
                {lesson.subject}
              </DialogTitle>

              <div className="flex flex-wrap items-center gap-4 text-sm font-medium text-muted-foreground">
                <div className="flex items-center gap-1.5 bg-primary/5 text-primary px-2.5 py-1 rounded-md">
                  <Clock className="w-4 h-4" />
                  {lesson.start_time?.slice(0, 5)} — {lesson.end_time?.slice(0, 5)}
                </div>

                {lesson.classroom && (
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-4 h-4" />
                    Каб. {lesson.classroom}
                  </div>
                )}

                {lesson.teacher && (
                  <div className="flex items-center gap-1.5">
                    <User className="w-4 h-4" />
                    {lesson.teacher.full_name}
                  </div>
                )}

                {lesson.group && (
                  <div className="flex items-center gap-1.5">
                    <Users className="w-4 h-4" />
                    {lesson.group.name}
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-2 shrink-0">
              <Button variant="outline" size="sm" onClick={onOpenHomework} className="h-9 gap-2">
                <FileText className="w-4 h-4" />
                {homework ? 'Редактировать ДЗ' : 'Добавить ДЗ'}
              </Button>

              <Button variant="outline" size="sm" onClick={onEditLesson} className="h-9 w-10 p-0">
                <Edit className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="p-6 flex-1 overflow-hidden flex flex-col">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
            <TabsList className="grid w-full max-w-md grid-cols-2 mb-4">
              <TabsTrigger value="attendance" className="gap-2 text-sm">
                <Users className="w-4 h-4" />
                Посещаемость
              </TabsTrigger>
              <TabsTrigger value="homework" className="gap-2 text-sm">
                <BookOpen className="w-4 h-4" />
                Домашнее задание
                {homework && (
                  <Badge variant="default" className="ml-1 h-5 w-5 p-0 flex items-center justify-center rounded-full text-[10px]">
                    1
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="attendance" className="flex-1 flex flex-col min-h-0 m-0 border-none outline-none">
              <div className="grid grid-cols-5 gap-3 mb-4">
                <div className="flex flex-col items-center justify-center p-3 bg-muted/30 rounded-xl border border-border/50">
                  <span className="text-2xl font-bold text-foreground">{stats.total}</span>
                  <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground mt-1">Всего</span>
                </div>
                <div className="flex flex-col items-center justify-center p-3 bg-success/5 rounded-xl border border-success/10">
                  <span className="text-2xl font-bold text-success">{stats.present}</span>
                  <span className="text-[11px] font-medium uppercase tracking-wider text-success/80 mt-1">Был(а)</span>
                </div>
                <div className="flex flex-col items-center justify-center p-3 bg-warning/5 rounded-xl border border-warning/10">
                  <span className="text-2xl font-bold text-warning">{stats.late}</span>
                  <span className="text-[11px] font-medium uppercase tracking-wider text-warning/80 mt-1">Опоздал</span>
                </div>
                <div className="flex flex-col items-center justify-center p-3 bg-destructive/5 rounded-xl border border-destructive/10">
                  <span className="text-2xl font-bold text-destructive">{stats.absent}</span>
                  <span className="text-[11px] font-medium uppercase tracking-wider text-destructive/80 mt-1">Не был</span>
                </div>
                <div className="flex flex-col items-center justify-center p-3 bg-muted/30 rounded-xl border border-border/50">
                  <span className="text-2xl font-bold text-muted-foreground">{stats.not_marked}</span>
                  <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground mt-1">Пусто</span>
                </div>
              </div>

              <ScrollArea className="flex-1 -mx-2 px-2">
                <div className="space-y-2 pb-4">
                  {lesson.attendance.map((student) => (
                    <div
                      key={student.id}
                      className="flex items-center justify-between p-3 rounded-xl border border-border/50 bg-card hover:shadow-sm transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold text-sm">
                          {student.name.charAt(0)}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-medium text-sm text-foreground">{student.name}</span>
                          <div className="mt-0.5">{getStatusBadge(student.status)}</div>
                        </div>
                      </div>

                      <div className="flex gap-1.5 bg-muted/30 p-1 rounded-lg border border-border/50">
                        <Button
                          size="sm"
                          variant="ghost"
                          className={`w-10 h-9 p-0 rounded-md transition-colors ${
                            student.status === 'present'
                              ? 'bg-success text-white hover:bg-success/90 hover:text-white'
                              : 'text-muted-foreground hover:text-success hover:bg-success/10'
                          }`}
                          onClick={() => handleMarkAttendance(student.id, 'present')}
                          title="Присутствует"
                        >
                          <CheckCircle className="w-5 h-5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className={`w-10 h-9 p-0 rounded-md transition-colors ${
                            student.status === 'late'
                              ? 'bg-warning text-white hover:bg-warning/90 hover:text-white'
                              : 'text-muted-foreground hover:text-warning hover:bg-warning/10'
                          }`}
                          onClick={() => handleMarkAttendance(student.id, 'late')}
                          title="Опоздал"
                        >
                          <AlertCircle className="w-5 h-5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className={`w-10 h-9 p-0 rounded-md transition-colors ${
                            student.status === 'absent'
                              ? 'bg-destructive text-white hover:bg-destructive/90 hover:text-white'
                              : 'text-muted-foreground hover:text-destructive hover:bg-destructive/10'
                          }`}
                          onClick={() => handleMarkAttendance(student.id, 'absent')}
                          title="Отсутствует"
                        >
                          <XCircle className="w-5 h-5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="homework" className="flex-1 flex flex-col min-h-0 m-0 border-none outline-none">
              {homework ? (
                <ScrollArea className="flex-1 -mx-2 px-2">
                  <div className="space-y-6 pb-4">
                    <div>
                      <h3 className="text-sm font-semibold flex items-center gap-2 mb-3 text-foreground">
                        <FileText className="w-4 h-4 text-primary" />
                        Описание задания
                      </h3>
                      <div className="p-4 rounded-xl bg-muted/30 border border-border/50 text-sm leading-relaxed text-foreground whitespace-pre-wrap">
                        {homework.text || <span className="text-muted-foreground italic">Текст задания отсутствует</span>}
                      </div>
                    </div>

                    {homework.files && homework.files.length > 0 && (
                      <div>
                        <h3 className="text-sm font-semibold flex items-center gap-2 mb-3 text-foreground">
                          <Paperclip className="w-4 h-4 text-primary" />
                          Прикрепленные материалы ({homework.files.length})
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {homework.files.map((file, idx) => (
                            <a
                              key={idx}
                              href={file.url}
                              download={file.name}
                              className="flex items-center justify-between p-3 rounded-xl border border-border bg-card hover:border-primary/50 hover:bg-primary/5 transition-all group"
                            >
                              <div className="flex items-center gap-3 overflow-hidden">
                                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 text-primary">
                                  <FileText className="w-5 h-5" />
                                </div>
                                <div className="flex flex-col min-w-0">
                                  <span className="font-medium text-sm truncate text-foreground group-hover:text-primary transition-colors">
                                    {file.name}
                                  </span>
                                  {file.size && (
                                    <span className="text-xs text-muted-foreground">{file.size}</span>
                                  )}
                                </div>
                              </div>
                              <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full flex-shrink-0 group-hover:bg-primary group-hover:text-primary-foreground transition-all">
                                <Download className="w-4 h-4" />
                              </Button>
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                    {homework.createdAt && (
                      <p className="text-xs text-muted-foreground text-center pt-4">
                        Добавлено: {new Date(homework.createdAt).toLocaleString('ru-RU')}
                      </p>
                    )}
                  </div>
                </ScrollArea>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center">
                  <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                    <BookOpen className="w-8 h-8 text-muted-foreground/50" />
                  </div>
                  <h3 className="font-medium text-lg mb-1 text-foreground">Нет домашнего задания</h3>
                  <p className="text-sm text-muted-foreground mb-6 max-w-[250px]">
                    Добавьте материалы, файлы и описание для учеников
                  </p>
                  <Button onClick={onOpenHomework} className="h-10 rounded-full px-6">
                    <FileText className="w-4 h-4 mr-2" />
                    Добавить задание
                  </Button>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}