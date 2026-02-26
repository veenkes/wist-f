import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { formatCurrency } from '@/lib/format';
import { Expense } from '@/types/api.types';
import { financeService } from '@/services';
import { 
  Download, 
  FileText, 
  Calendar, 
  CreditCard,
  User,
  DollarSign,
  Loader2
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useTheme } from '@/contexts/ThemeContext';

interface ExpenseDetailModalProps {
  expenseId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ExpenseDetailModal({ expenseId, open, onOpenChange }: ExpenseDetailModalProps) {
  const { t } = useTheme();
  const [expense, setExpense] = useState<Expense | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && expenseId) {
      loadExpense();
    }
  }, [open, expenseId]);

  const loadExpense = async () => {
    try {
      setLoading(true);
      const data = await financeService.getExpense(expenseId);
      setExpense(data);
    } catch (error) {
      toast({
        title: t('common.error'),
        description: t('errors.expenseLoadFailed'),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!expense) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <div className="text-center py-8 text-muted-foreground">
            {t('expenses.expenseNotFound')}
          </div>
        </DialogContent>
      </Dialog>
    );
  }
  const handleDownloadReceipt = () => {
    toast({
      title: t('expenses.downloadStarted'),
      description: t('expenses.receiptDownloading'),
    });
  };

  const handleDownloadAttachment = (filename: string) => {
    toast({
      title: t('expenses.downloadStarted'),
      description: t('expenses.downloadingFile', { filename }),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('expenses.expenseDetails')}</DialogTitle>
          <DialogDescription>{t('expenses.expenseDetailsDescription')}</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Header Info */}
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-2xl font-bold">{expense.payee}</h3>
              <Badge className="mt-2">{expense.category}</Badge>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-primary">
                {formatCurrency(expense.amount)}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {new Date(expense.date).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
            </div>
          </div>

          <Separator />

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <User className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t('expenses.payee')}</p>
                  <p className="font-medium">{expense.payee}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <DollarSign className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t('expenses.amount')}</p>
                  <p className="font-medium">{formatCurrency(expense.amount)}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <FileText className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t('expenses.expenseId')}</p>
                  <p className="font-medium">{expense.id}</p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Calendar className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t('expenses.date')}</p>
                  <p className="font-medium">
                    {new Date(expense.date).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <CreditCard className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t('expenses.paymentMethod')}</p>
                  <p className="font-medium">{expense.paymentMethod}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <FileText className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t('expenses.category')}</p>
                  <p className="font-medium">{expense.category}</p>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Description */}
          <div>
            <h4 className="font-semibold mb-2">{t('expenses.description')}</h4>
            <p className="text-muted-foreground">{expense.description}</p>
          </div>

          {/* Project (if available) */}
          {expense.project && (
            <>
              <Separator />
              <div>
                <h4 className="font-semibold mb-2">{t('expenses.project')}</h4>
                <p className="text-muted-foreground">{expense.project}</p>
              </div>
            </>
          )}

          {/* Attachments */}
          {expense.attachments && expense.attachments.length > 0 && (
            <>
              <Separator />
              <div>
                <h4 className="font-semibold mb-3">{t('expenses.attachedFiles')}</h4>
                <div className="space-y-2">
                  {expense.attachments.map((attachment, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-muted rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <FileText className="w-5 h-5 text-muted-foreground" />
                        <span className="font-medium">{attachment}</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDownloadAttachment(attachment)}
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          <Separator />

          {/* Action Buttons - Clean and Minimal */}
          <div className="flex items-center justify-between pt-6 border-t mt-8">
            <div></div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                {t('common.close')}
              </Button>
              <Button onClick={handleDownloadReceipt} className="gap-2">
                <Download className="w-4 h-4" />
                {t('expenses.downloadReceiptPDF')}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
