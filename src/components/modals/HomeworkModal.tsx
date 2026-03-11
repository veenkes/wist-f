import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { 
  FileText, Upload, Paperclip, X, Clock, Users, MapPin, BookOpen, 
  Bell, Send, Link2, Calendar, Star, CheckCircle, AlertTriangle,
  Image, File, Video, Plus, Loader2
} from 'lucide-react';

interface LessonInfo {
  id: string;
  subject: string;
  start_time: string;
  end_time: string;
  classroom?: string;
  group?: { name: string };
}

interface HomeworkFile {
  name: string;
  url?: string;
  type?: 'document' | 'image' | 'video' | 'link';
  size?: string;
}

interface HomeworkData {
  text: string;
  files: HomeworkFile[];
  createdAt?: string;
  dueDate?: string;
  priority?: 'normal' | 'important' | 'urgent';
  instructions?: string;
  links?: string[];
  notifyStudents?: boolean;
  notifyParents?: boolean;
}

interface HomeworkModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lesson: LessonInfo | null;
  savedHomework?: HomeworkData | null;
  onSave: (lessonId: string, homework: HomeworkData) => void;
}

export function HomeworkModal({ open, onOpenChange, lesson, savedHomework, onSave }: HomeworkModalProps) {
  const [homeworkText, setHomeworkText] = useState('');
  const [homeworkFiles, setHomeworkFiles] = useState<HomeworkFile[]>([]);
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState<'normal' | 'important' | 'urgent'>('normal');
  const [instructions, setInstructions] = useState('');
  const [links, setLinks] = useState<string[]>([]);
  const [newLink, setNewLink] = useState('');
  const [notifyStudents, setNotifyStudents] = useState(true);
  const [notifyParents, setNotifyParents] = useState(false);
  const [notifyMessage, setNotifyMessage] = useState('');
  const [activeTab, setActiveTab] = useState('content');
  const [isUploading, setIsUploading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      if (savedHomework) {
        setHomeworkText(savedHomework.text || '');
        setHomeworkFiles(savedHomework.files || []);
        setDueDate(savedHomework.dueDate || '');
        setPriority(savedHomework.priority || 'normal');
        setInstructions(savedHomework.instructions || '');
        setLinks(savedHomework.links || []);
        setNotifyStudents(savedHomework.notifyStudents ?? true);
        setNotifyParents(savedHomework.notifyParents ?? false);
      } else {
        setHomeworkText('');
        setHomeworkFiles([]);
        setDueDate('');
        setPriority('normal');
        setInstructions('');
        setLinks([]);
        setNotifyStudents(true);
        setNotifyParents(false);
      }
      setNewLink('');
      setNotifyMessage('');
      setActiveTab('content');
    }
  }, [savedHomework, open]);

  const handleSave = () => {
    if (!lesson) return;
    
    if (!homeworkText.trim()) {
      toast.error('Введите описание домашнего задания');
      return;
    }

    const homework: HomeworkData = {
      text: homeworkText,
      files: homeworkFiles,
      createdAt: savedHomework?.createdAt || new Date().toISOString(),
      dueDate: dueDate || undefined,
      priority,
      instructions: instructions || undefined,
      links: links.length > 0 ? links : undefined,
      notifyStudents,
      notifyParents,
    };

    onSave(lesson.id, homework);

    if (notifyStudents || notifyParents) {
      const recipients: string[] = [];
      if (notifyStudents) recipients.push('ученикам');
      if (notifyParents) recipients.push('родителям');
      
      toast.success(`Домашнее задание сохранено. Уведомления отправлены ${recipients.join(' и ')}.`, {
        description: `${lesson.subject} — ${homeworkText.slice(0, 50)}${homeworkText.length > 50 ? '...' : ''}`,
      });
    } else {
      toast.success('Домашнее задание сохранено');
    }

    onOpenChange(false);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const getFileType = (fileType: string): 'document' | 'image' | 'video' => {
    if (fileType.startsWith('image/')) return 'image';
    if (fileType.startsWith('video/')) return 'video';
    return 'document';
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles || selectedFiles.length === 0) return;

    setIsUploading(true);

    const newFilesPromises = Array.from(selectedFiles).map((file) => {
      return new Promise<HomeworkFile>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => {
          resolve({
            name: file.name,
            url: event.target?.result as string, // Base64 string
            type: getFileType(file.type),
            size: formatFileSize(file.size)
          });
        };
        reader.onerror = (err) => reject(err);
        reader.readAsDataURL(file);
      });
    });

    Promise.all(newFilesPromises)
      .then((uploadedFiles) => {
        setHomeworkFiles((prev) => [...prev, ...uploadedFiles]);
        toast.success('Файлы успешно добавлены');
      })
      .catch(() => {
        toast.error('Ошибка при обработке файлов');
      })
      .finally(() => {
        setIsUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      });
  };

  const handleRemoveFile = (index: number) => {
    setHomeworkFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleAddLink = () => {
    if (newLink.trim()) {
      const url = newLink.startsWith('http') ? newLink : `https://${newLink}`;
      setLinks(prev => [...prev, url]);
      setNewLink('');
      toast.success('Ссылка добавлена');
    }
  };

  const handleRemoveLink = (index: number) => {
    setLinks(prev => prev.filter((_, i) => i !== index));
  };

  const getFileIcon = (type?: string) => {
    switch (type) {
      case 'image': return <Image className="w-4 h-4 text-primary" />;
      case 'video': return <Video className="w-4 h-4 text-accent-foreground" />;
      default: return <FileText className="w-4 h-4 text-primary" />;
    }
  };

  const getPriorityBadge = () => {
    switch (priority) {
      case 'urgent': return <Badge className="bg-destructive text-white">Срочное</Badge>;
      case 'important': return <Badge className="bg-warning text-white">Важное</Badge>;
      default: return <Badge variant="secondary">Обычное</Badge>;
    }
  };

  if (!lesson) return null;

  const autoNotifyMessage = `📚 ${lesson.subject}\n\nНовое домашнее задание: ${homeworkText.slice(0, 100)}${homeworkText.length > 100 ? '...' : ''}\n${dueDate ? `📅 Срок сдачи: ${new Date(dueDate).toLocaleDateString('ru-RU')}` : ''}\n${homeworkFiles.length > 0 ? `📎 Прикреплено файлов: ${homeworkFiles.length}` : ''}\n${links.length > 0 ? `🔗 Ссылок: ${links.length}` : ''}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col p-6">
        <DialogHeader className="mb-2">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <BookOpen className="w-5 h-5 text-primary" />
            Домашнее задание
          </DialogTitle>
          <DialogDescription>
            Создайте задание и отправьте уведомления ученикам
          </DialogDescription>
        </DialogHeader>
        
        {/* Lesson Info */}
        <div className="p-3 bg-muted/50 rounded-lg flex items-center justify-between mb-4 border border-border/50">
          <div>
            <p className="font-medium text-sm">{lesson.subject}</p>
            <div className="flex flex-wrap gap-3 text-xs text-muted-foreground mt-1">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {lesson.start_time?.slice(0, 5)} - {lesson.end_time?.slice(0, 5)}
              </span>
              {lesson.classroom && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  Каб. {lesson.classroom}
                </span>
              )}
              {lesson.group && (
                <span className="flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  {lesson.group.name}
                </span>
              )}
            </div>
          </div>
          {getPriorityBadge()}
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="content" className="gap-1.5 text-xs">
              <FileText className="w-3.5 h-3.5" />
              Задание
            </TabsTrigger>
            <TabsTrigger value="materials" className="gap-1.5 text-xs">
              <Paperclip className="w-3.5 h-3.5" />
              Материалы
              {(homeworkFiles.length + links.length) > 0 && (
                <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">{homeworkFiles.length + links.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="notify" className="gap-1.5 text-xs">
              <Bell className="w-3.5 h-3.5" />
              Уведомления
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-1 mt-4 pr-3 -mr-3">
            <TabsContent value="content" className="space-y-4 mt-0">
              {/* Homework Text */}
              <div className="space-y-2">
                <Label>Описание задания *</Label>
                <Textarea
                  placeholder="Опишите домашнее задание подробно..."
                  value={homeworkText}
                  onChange={(e) => setHomeworkText(e.target.value)}
                  rows={5}
                  className="resize-none"
                />
              </div>

              {/* Instructions */}
              <div className="space-y-2">
                <Label>Инструкции для выполнения</Label>
                <Textarea
                  placeholder="Дополнительные указания, формат сдачи, критерии оценки..."
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  rows={3}
                  className="resize-none"
                />
              </div>

              {/* Due Date & Priority */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    Срок сдачи
                  </Label>
                  <Input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5">
                    <Star className="w-3.5 h-3.5" />
                    Приоритет
                  </Label>
                  <Select value={priority} onValueChange={(v) => setPriority(v as any)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="normal">Обычное</SelectItem>
                      <SelectItem value="important">Важное</SelectItem>
                      <SelectItem value="urgent">Срочное</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {savedHomework?.createdAt && (
                <div className="text-xs text-muted-foreground pt-2">
                  Последнее обновление: {new Date(savedHomework.createdAt).toLocaleString('ru-RU')}
                </div>
              )}
            </TabsContent>

            <TabsContent value="materials" className="space-y-4 mt-0">
              {/* Скрытый инпут для файлов */}
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                className="hidden" 
                multiple 
                accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
              />

              <div className="flex flex-col gap-4">
                <Button 
                  variant="outline" 
                  className="w-full h-12 border-dashed border-2 hover:bg-muted/50" 
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                >
                  {isUploading ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin text-muted-foreground" />
                  ) : (
                    <Upload className="w-4 h-4 mr-2 text-muted-foreground" />
                  )}
                  {isUploading ? 'Обработка файлов...' : 'Нажмите, чтобы загрузить файлы с компьютера'}
                </Button>
              </div>

              {/* Attached Files */}
              {homeworkFiles.length > 0 && (
                <div className="space-y-2 mt-4">
                  <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Прикрепленные файлы ({homeworkFiles.length})
                  </Label>
                  <div className="grid grid-cols-1 gap-2">
                    {homeworkFiles.map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border/50 group">
                        <div className="flex items-center gap-3 overflow-hidden">
                          <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
                            {getFileIcon(file.type)}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="text-sm font-medium truncate">{file.name}</span>
                            {file.size && <span className="text-[10px] text-muted-foreground">{file.size}</span>}
                          </div>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" 
                          onClick={() => handleRemoveFile(index)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Links */}
              <div className="space-y-2 mt-6">
                <Label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  <Link2 className="w-3.5 h-3.5" />
                  Ссылки на ресурсы
                </Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="https://example.com/resource"
                    value={newLink}
                    onChange={(e) => setNewLink(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddLink()}
                  />
                  <Button variant="outline" size="icon" onClick={handleAddLink} disabled={!newLink.trim()}>
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                
                {links.length > 0 && (
                  <div className="space-y-2 mt-3">
                    {links.map((link, index) => (
                      <div key={index} className="flex items-center justify-between p-2.5 bg-muted/30 rounded-lg border border-border/50 group">
                        <div className="flex items-center gap-2 overflow-hidden flex-1">
                          <div className="w-6 h-6 rounded flex items-center justify-center bg-primary/5 flex-shrink-0">
                            <Link2 className="w-3.5 h-3.5 text-primary" />
                          </div>
                          <a href={link} target="_blank" rel="noopener noreferrer" className="text-sm truncate text-primary hover:underline block flex-1">
                            {link}
                          </a>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-7 w-7 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity ml-2" 
                          onClick={() => handleRemoveLink(index)}
                        >
                          <X className="w-3.5 h-3.5 text-muted-foreground" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {homeworkFiles.length === 0 && links.length === 0 && !isUploading && (
                <div className="text-center py-8 text-muted-foreground bg-muted/10 rounded-lg border-2 border-dashed mt-4">
                  <Paperclip className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Нет прикрепленных материалов</p>
                  <p className="text-xs mt-1">Добавьте файлы или ссылки для учеников</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="notify" className="space-y-4 mt-0">
              <div className="space-y-3">
                <Label>Кому отправить уведомление</Label>
                
                <div className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                  <Checkbox 
                    id="notify-students" 
                    checked={notifyStudents} 
                    onCheckedChange={(c) => setNotifyStudents(!!c)} 
                  />
                  <label htmlFor="notify-students" className="flex items-center gap-2 cursor-pointer flex-1">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <Users className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Ученики группы</p>
                      <p className="text-xs text-muted-foreground">{lesson.group?.name || 'Все ученики'}</p>
                    </div>
                  </label>
                  <CheckCircle className={`w-4 h-4 ${notifyStudents ? 'text-success' : 'text-muted-foreground/30'}`} />
                </div>

                <div className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                  <Checkbox 
                    id="notify-parents" 
                    checked={notifyParents} 
                    onCheckedChange={(c) => setNotifyParents(!!c)} 
                  />
                  <label htmlFor="notify-parents" className="flex items-center gap-2 cursor-pointer flex-1">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <Users className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Родители учеников</p>
                      <p className="text-xs text-muted-foreground">Уведомление о новом задании</p>
                    </div>
                  </label>
                  <CheckCircle className={`w-4 h-4 ${notifyParents ? 'text-success' : 'text-muted-foreground/30'}`} />
                </div>
              </div>

              {(notifyStudents || notifyParents) && (
                <div className="space-y-2 mt-6">
                  <Label className="flex items-center gap-1.5">
                    <Send className="w-3.5 h-3.5" />
                    Предпросмотр уведомления
                  </Label>
                  <div className="p-4 rounded-lg border bg-muted/30">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Bell className="w-4 h-4 text-primary" />
                      </div>
                      <div className="space-y-1 flex-1">
                        <p className="text-sm font-medium">Новое домашнее задание</p>
                        <p className="text-xs text-muted-foreground whitespace-pre-line">
                          {autoNotifyMessage}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 mt-4">
                    <Label className="text-xs">Дополнительное сообщение (необязательно)</Label>
                    <Textarea
                      placeholder="Добавьте комментарий к уведомлению..."
                      value={notifyMessage}
                      onChange={(e) => setNotifyMessage(e.target.value)}
                      rows={2}
                      className="resize-none"
                    />
                  </div>
                </div>
              )}

              {priority === 'urgent' && (
                <div className="flex items-start gap-3 p-3 bg-destructive/10 rounded-lg border border-destructive/20 mt-4">
                  <AlertTriangle className="w-5 h-5 text-destructive mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-destructive">Срочное задание</p>
                    <p className="text-xs text-destructive/80 mt-0.5">Уведомление будет отправлено с пометкой «Срочно»</p>
                  </div>
                </div>
              )}

              {!notifyStudents && !notifyParents && (
                <div className="text-center py-6 text-muted-foreground">
                  <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Уведомления отключены</p>
                  <p className="text-xs mt-1">Задание будет сохранено без оповещений</p>
                </div>
              )}
            </TabsContent>
          </ScrollArea>
        </Tabs>

        <DialogFooter className="mt-6 pt-4 border-t border-border/50">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Отмена
          </Button>
          <Button onClick={handleSave} disabled={!homeworkText.trim() || isUploading}>
            {(notifyStudents || notifyParents) ? (
              <>
                <Send className="w-4 h-4 mr-2" />
                Сохранить и уведомить
              </>
            ) : (
              <>
                <FileText className="w-4 h-4 mr-2" />
                Сохранить задание
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}