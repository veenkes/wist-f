import React, { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, ShieldAlert, ShieldX, Clock, MapPin, Calendar, CheckCircle2, AlertCircle, MessageSquare } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { localDB } from '@/lib/localDb';

interface ViolationsTabProps {
  violations?: any[]; // Оставляем для совместимости, но тянуть будем из localDB
}

export const ViolationsTab: React.FC<ViolationsTabProps> = ({ violations: _ }) => {
  // Вытаскиваем studentId из URL, так как компонент находится внутри роута
  const studentId = window.location.pathname.split('/').pop();

  const violations = useMemo(() => {
    return (localDB.getViolations?.() || []).filter((v: any) => v.studentId === studentId);
  }, [studentId]);

  const remarks = useMemo(() => {
    return (localDB.getRemarks?.() || []).filter((r: any) => r.studentId === studentId);
  }, [studentId]);

  if (violations.length === 0 && remarks.length === 0) {
    return (
      <Card className="p-8 text-center">
        <CheckCircle2 className="w-12 h-12 text-success mx-auto mb-3" />
        <h3 className="font-semibold text-lg mb-1">Нет нарушений</h3>
        <p className="text-sm text-muted-foreground">У ученика нет зафиксированных инцидентов.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {violations.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-3">Нарушения дисциплины</h3>
          <div className="space-y-3">
            {violations.map(v => (
              <Card key={v.id} className="p-4 border-l-4 border-l-destructive">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold text-sm">{v.type}</h4>
                      <Badge variant="outline" className="text-[10px]">{v.category}</Badge>
                    </div>
                    <p className="text-sm mt-1">{v.description}</p>
                    <div className="flex gap-4 mt-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Calendar className="w-3 h-3"/>{format(new Date(v.date), 'dd MMM yyyy', {locale: ru})}</span>
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3"/>{v.time}</span>
                      <span className="flex items-center gap-1"><MapPin className="w-3 h-3"/>{v.location}</span>
                    </div>
                  </div>
                  <Badge className={v.status === 'resolved' ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'}>
                    {v.status === 'resolved' ? 'Решено' : 'На рассмотрении'}
                  </Badge>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {remarks.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-3">Замечания</h3>
          <div className="space-y-3">
            {remarks.map((r: any) => (
              <Card key={r.id} className="p-4 border-l-4 border-l-muted-foreground/30">
                <div className="flex gap-3">
                  <MessageSquare className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm">{r.remark}</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      {format(new Date(r.date), 'dd MMM yyyy', {locale: ru})} • {r.reportedBy}
                    </p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};