import React, { useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  ThumbsUp, BookOpen, Heart, Award, Sparkles, FileText, 
  MessageSquare, Star, Target, Users, Smile, Lightbulb, 
  TrendingUp, Minus, TrendingDown, Trophy, ChevronRight 
} from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { localDB } from '@/lib/localDb';

interface ReportsTabProps {
  studentId: string;
  studentName: string;
}

const config: Record<string, { label: string; icon: React.ReactNode; color: string; bgColor: string }> = {
  praise: { label: 'Похвала', icon: <ThumbsUp className="w-4 h-4" />, color: 'text-success', bgColor: 'bg-success/10 border-success/20' },
  recommendation: { label: 'Рекомендация', icon: <BookOpen className="w-4 h-4" />, color: 'text-primary', bgColor: 'bg-primary/10 border-primary/20' },
  behavior: { label: 'Поведение', icon: <Heart className="w-4 h-4" />, color: 'text-pink-500', bgColor: 'bg-pink-500/10 border-pink-500/20' },
  achievement: { label: 'Достижение', icon: <Award className="w-4 h-4" />, color: 'text-warning', bgColor: 'bg-warning/10 border-warning/20' },
};

const trendConfig: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  improving: { label: 'Улучшается', icon: <TrendingUp className="w-4 h-4" />, color: 'text-success' },
  stable: { label: 'Стабильно', icon: <Minus className="w-4 h-4" />, color: 'text-primary' },
  declining: { label: 'Требует внимания', icon: <TrendingDown className="w-4 h-4" />, color: 'text-destructive' },
};

export const ReportsTab: React.FC<ReportsTabProps> = ({ studentId }) => {
  const [selectedDailyReport, setSelectedDailyReport] = useState<any | null>(null);
  const [selectedFinalReport, setSelectedFinalReport] = useState<any | null>(null);
  
  const dailyReports = useMemo(() => {
    const all = localDB.getReports?.() || [];
    return all.filter((r: any) => r.studentId === studentId);
  }, [studentId]);

  const finalReports = useMemo(() => {
    const all = localDB.getFinalReports?.() || [];
    return all.filter((r: any) => r.studentId === studentId);
  }, [studentId]);

  if (dailyReports.length === 0 && finalReports.length === 0) {
    return (
      <Card className="p-12 text-center">
        <Sparkles className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
        <p className="text-muted-foreground">У ученика пока нет отчетов</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* ИТОГОВЫЕ ОТЧЕТЫ */}
      {finalReports.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-bold text-lg mb-2">Итоговые отчеты</h3>
          {finalReports.map((report: any) => {
            const trend = trendConfig[report.overallTrend] || trendConfig.stable;
            return (
              <Card 
                key={report.id} 
                className="p-4 border-primary/30 bg-primary/5 cursor-pointer hover:shadow-md transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 group"
                onClick={() => setSelectedFinalReport(report)}
                tabIndex={0}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-primary" />
                    <h4 className="font-bold text-sm">{report.period} — {report.academicYear}</h4>
                  </div>
                  <div className={`flex items-center gap-1 text-xs font-medium ${trend.color}`}>
                    {trend.icon}{trend.label}
                  </div>
                </div>
                <p className="text-sm mt-2 line-clamp-2 text-muted-foreground">{report.overallComment}</p>
                <div className="flex items-center justify-between mt-3">
                  <span className="text-xs text-muted-foreground">{format(new Date(report.date || new Date()), 'dd MMMM yyyy', { locale: ru })}</span>
                  <ChevronRight className="w-4 h-4 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {/* ЕЖЕДНЕВНЫЕ ОТЧЕТЫ */}
      {dailyReports.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-bold text-lg mb-2">Текущие отчеты и замечания</h3>
          {dailyReports.map((r: any) => {
            const conf = config[r.type] || config.praise;
            return (
              <Card 
                key={r.id} 
                className={`p-4 border ${conf.bgColor} cursor-pointer hover:shadow-md transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 group`}
                onClick={() => setSelectedDailyReport(r)}
                tabIndex={0}
              >
                <div className="flex gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${conf.bgColor} ${conf.color}`}>
                    {conf.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-1 flex-wrap gap-2">
                      <div className="flex gap-2 items-center">
                        <Badge variant="outline" className={`text-[10px] ${conf.color} border-current/20`}>{conf.label}</Badge>
                        <Badge variant="outline" className="text-[10px] bg-background/50">{r.subject}</Badge>
                      </div>
                      <span className="text-[10px] text-muted-foreground">{format(new Date(r.date), 'dd.MM.yyyy')}</span>
                    </div>
                    <h4 className="font-semibold text-sm">{r.title}</h4>
                    <p className="text-xs mt-1 line-clamp-1 text-muted-foreground">{r.content}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground/50 shrink-0 self-center group-hover:text-foreground transition-colors" />
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {/* МОДАЛКА ИТОГОВОГО ОТЧЕТА */}
      <Dialog open={!!selectedFinalReport} onOpenChange={(open) => !open && setSelectedFinalReport(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0 overflow-hidden bg-background">
          {selectedFinalReport && (() => {
            const trend = trendConfig[selectedFinalReport.overallTrend] || trendConfig.stable;
            return (
              <>
                <DialogHeader className="p-6 border-b bg-card/50 shrink-0">
                  <DialogTitle className="flex items-center gap-3 text-xl">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                      <FileText className="w-5 h-5" />
                    </div>
                    Итоговый отчет — {selectedFinalReport.period}
                  </DialogTitle>
                </DialogHeader>
                
                <ScrollArea className="flex-1 custom-scrollbar">
                  <div className="p-6 space-y-6">
                    {/* Бейджи и мета-информация */}
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline">{selectedFinalReport.academicYear}</Badge>
                        <Badge variant="outline">{selectedFinalReport.period}</Badge>
                      </div>
                      <div className={`flex items-center gap-1.5 text-sm font-semibold ${trend.color} bg-background p-1.5 px-3 rounded-lg border`}>
                        {trend.icon}{trend.label}
                      </div>
                    </div>

                    <div className="bg-muted/30 rounded-xl p-4 space-y-2 border border-border/50 text-sm">
                      <div className="flex justify-between"><span className="text-muted-foreground">Дата</span><span className="font-medium">{format(new Date(selectedFinalReport.date || new Date()), 'dd MMMM yyyy', { locale: ru })}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Автор</span><span className="font-medium">{selectedFinalReport.author}</span></div>
                      {selectedFinalReport.attendanceSummary && (
                        <div className="flex justify-between"><span className="text-muted-foreground">Посещаемость</span><span className="font-medium">{selectedFinalReport.attendanceSummary}</span></div>
                      )}
                    </div>

                    {/* Оценки по предметам */}
                    {selectedFinalReport.subjects && selectedFinalReport.subjects.length > 0 && (
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
                          <BookOpen className="w-4 h-4" /> Оценки по предметам
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {selectedFinalReport.subjects.map((s: any, idx: number) => (
                            <div key={idx} className="flex items-start gap-3 p-3 bg-card rounded-xl border border-border/50 shadow-sm">
                              <Badge className="bg-primary/10 text-primary border-primary/20 text-sm font-bold shadow-none mt-0.5">
                                {s.grade}
                              </Badge>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-foreground">{s.subject}</p>
                                {s.comment && <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{s.comment}</p>}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <Separator />

                    {/* Текстовые блоки */}
                    <div className="space-y-4">
                      {[
                        { label: 'Академический комментарий', value: selectedFinalReport.overallComment, icon: <MessageSquare className="w-4 h-4 text-primary" /> },
                        { label: 'Поведение и отношение', value: selectedFinalReport.behaviourComment, icon: <Heart className="w-4 h-4 text-pink-500" /> },
                        { label: 'Сильные стороны', value: selectedFinalReport.strengthsComment, icon: <Star className="w-4 h-4 text-warning" /> },
                        { label: 'Зоны для роста', value: selectedFinalReport.areasToImprove, icon: <Target className="w-4 h-4 text-destructive" /> },
                        { label: 'Цели на следующий период', value: selectedFinalReport.goalsForNext, icon: <Award className="w-4 h-4 text-success" /> },
                        { label: 'Достижения', value: selectedFinalReport.specialAchievements, icon: <Trophy className="w-4 h-4 text-warning" /> },
                        { label: 'Внеклассная активность', value: selectedFinalReport.extracurriculars, icon: <Users className="w-4 h-4 text-primary" /> },
                        { label: 'Социально-эмоциональное развитие', value: selectedFinalReport.socialEmotional, icon: <Smile className="w-4 h-4 text-success" /> },
                        { label: 'Рекомендации учителя', value: selectedFinalReport.teacherRecommendations, icon: <Lightbulb className="w-4 h-4 text-warning" /> },
                        { label: 'Советы родителям', value: selectedFinalReport.parentGuidance, icon: <Users className="w-4 h-4 text-primary" /> },
                      ].filter(s => s.value).map((section, idx) => (
                        <div key={idx} className="p-4 rounded-xl border border-border/50 bg-muted/10">
                          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2 mb-2">
                            {section.icon} {section.label}
                          </p>
                          <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{section.value}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </ScrollArea>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* МОДАЛКА ЕЖЕДНЕВНОГО ОТЧЕТА */}
      <Dialog open={!!selectedDailyReport} onOpenChange={open => { if (!open) setSelectedDailyReport(null); }}>
        <DialogContent className="max-w-md p-0 overflow-hidden bg-background">
          {selectedDailyReport && (() => {
            const configObj = config[selectedDailyReport.type] || config.praise;
            return (
              <>
                <DialogHeader className="p-6 border-b shrink-0">
                  <DialogTitle className="flex items-center gap-3 text-lg leading-tight">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${configObj.bgColor} ${configObj.color}`}>
                      {configObj.icon}
                    </div>
                    {selectedDailyReport.title}
                  </DialogTitle>
                </DialogHeader>
                
                <div className="p-6 space-y-5">
                  <div className="flex flex-wrap gap-2">
                    <Badge className={`${configObj.bgColor} ${configObj.color} border-current/20 hover:bg-transparent`}>{configObj.label}</Badge>
                    <Badge variant="outline" className="bg-muted/50">{selectedDailyReport.subject}</Badge>
                    {selectedDailyReport.term && <Badge variant="outline" className="bg-muted/50">{selectedDailyReport.term}</Badge>}
                  </div>
                  
                  <div className="bg-muted/30 rounded-xl p-4 space-y-2 text-sm border border-border/50">
                    <div className="flex justify-between"><span className="text-muted-foreground">Дата</span><span className="font-medium">{format(new Date(selectedDailyReport.date), 'dd MMMM yyyy', { locale: ru })}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Автор</span><span className="font-medium">{selectedDailyReport.author}</span></div>
                  </div>
                  
                  <Separator />
                  
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                      <MessageSquare className="w-4 h-4" /> Содержание
                    </p>
                    <p className="text-sm leading-relaxed text-foreground whitespace-pre-wrap">{selectedDailyReport.content}</p>
                  </div>
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

    </div>
  );
};