import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/format';
import { ExternalLink, Clock, AlertCircle, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { studentService } from '@/services';
import { de } from 'date-fns/locale';

interface DebtorsListModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface Debtor {
  studentId: string;
  studentName: string;
  amountDue: number;
  balance: number;
  grade: string;
}

export const DebtorsListModal: React.FC<DebtorsListModalProps> = ({ open, onOpenChange }) => {
  const navigate = useNavigate();
  const [debtors, setDebtors] = useState<Debtor[]>([]);
  const [loading, setLoading] = useState(false);

  // Загружаем данные при открытии модалки
  useEffect(() => {
    if (open) {
      fetchDebtors();
    }
  }, [open]);

  const fetchDebtors = async () => {
    setLoading(true);
    try {
      const response = await studentService.listStudents({ 
        page: 1, 
        limit: 200, 
        status: 'debt',
      });
      
      const students = response.data || response.students || [];

      const mapped = students.map((s: any) => ({
        studentId: s.id,
        studentName: `${s.name || ''} ${s.surname || ''}`,
        amountDue: Math.abs(s.balance || 0),
        balance: s.balance || 0,
        grade: s.className || `${s.grade} класс`,
      }));

      setDebtors(mapped);
    } catch (error) {
      console.error('Failed to fetch debtors:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewStudent = (studentId: string) => {
    onOpenChange(false);
    // Переход к профилю студента через поиск
    navigate(`/students?search=${studentId}`);
  };

  const totalDebt = debtors.reduce((sum, d) => sum + d.amountDue, 0);

  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col p-0 overflow-hidden rounded-3xl border-none">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="flex items-center gap-2 text-xl font-black">
            <AlertCircle className="w-6 h-6 text-destructive" />
            Список задолженностей
          </DialogTitle>
          <DialogDescription className="font-medium">
            Студенты с отрицательным балансом — всего {debtors.length}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Summary */}
          <div className="grid grid-cols-2 gap-4 p-5 bg-secondary/10 rounded-[2rem]">
            <div>
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Сумма долга</p>
              <p className="text-2xl font-black text-destructive">{formatCurrency(totalDebt)}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Должников</p>
              <p className="text-2xl font-black text-foreground">{debtors.length}</p>
            </div>
          </div>

          {/* Debtors List */}
          <div className="space-y-2">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <p className="text-xs font-bold text-muted-foreground uppercase">Загрузка...</p>
              </div>
            ) : debtors.length > 0 ? (
              debtors.map(debtor => (
                <div
                  key={debtor.studentId}
                  className="flex items-center justify-between p-4 bg-card border border-border/50 rounded-2xl hover:bg-secondary/10 transition-all active:scale-[0.99]"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-bold text-foreground truncate">{debtor.studentName}</h3>
                      <Badge variant="secondary" className="text-[9px] font-black uppercase px-2 py-0 h-4">
                        {debtor.grade}
                      </Badge>
                    </div>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase">
                      ID: {debtor.studentId.split('-')[0]}
                    </p>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="text-[10px] font-black text-muted-foreground uppercase mb-0.5">Долг</p>
                      <p className="text-lg font-black text-destructive leading-none">{formatCurrency(debtor.amountDue)}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="rounded-xl hover:bg-primary hover:text-white"
                      onClick={() => handleViewStudent(debtor.studentId)}
                    >
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-16 opacity-30">
                <AlertCircle className="w-12 h-12 mx-auto mb-4" />
                <p className="font-black uppercase text-xs">Должников нет</p>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="p-6 border-t bg-muted/20 flex gap-3">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1 rounded-2xl font-bold h-12">
            Закрыть
          </Button>
          <Button onClick={() => { onOpenChange(false); navigate('/payments'); }} className="flex-1 rounded-2xl font-bold h-12 bg-primary shadow-lg shadow-primary/20">
            Все платежи
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};