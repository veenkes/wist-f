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
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { formatCurrency } from '@/lib/format';
import { financeService } from '@/services';
import { toast } from '@/hooks/use-toast';
import { useTheme } from '@/contexts/ThemeContext';
import {
  User,
  Calendar,
  CreditCard,
  FileText,
  CheckCircle,
  XCircle,
  Loader2,
  Download,
  Eye,
  ArrowLeft,
} from 'lucide-react';
import { format } from 'date-fns';

interface Transaction {
  id: string;
  student_id: string;
  student_name: string;
  parent_name: string;
  amount: number;
  payment_method: string;
  payment_source: string;
  purpose: string;
  date: string;
  status: string;
  receipt_id?: string;
  receipt_url?: string;
  notes?: string;
}

interface TransactionDetailModalProps {
  transactionId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate?: () => void;
}

export function TransactionDetailModal({
  transactionId,
  open,
  onOpenChange,
  onUpdate,
}: TransactionDetailModalProps) {
  const { t } = useTheme();
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState(false);

  // Load transaction details when modal opens
  useEffect(() => {
    if (open && transactionId) {
      loadTransaction();
    }
  }, [open, transactionId]);

  const loadTransaction = async () => {
    try {
      setLoading(true);
      const data = await financeService.getTransaction(transactionId);
      setTransaction(data as any);
    } catch (error) {
      toast({
        title: t('common.error'),
        description: t('errors.transactionLoadFailed'),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!transaction) return;

    try {
      setUpdating(true);
      await financeService.updateTransactionStatus(transaction.id, { status: 'Paid' });

      toast({
        title: t('common.success'),
        description: t('payments.paymentVerified'),
      });

      onOpenChange(false);
      onUpdate?.();
    } catch (error) {
      toast({
        title: t('common.error'),
        description: t('payments.verifyFailed'),
        variant: 'destructive',
      });
    } finally {
      setUpdating(false);
    }
  };

  const handleReject = async () => {
    if (!transaction) return;

    try {
      setUpdating(true);
      await financeService.updateTransactionStatus(transaction.id, { status: 'Failed' });

      toast({
        title: t('common.success'),
        description: t('payments.paymentRejected'),
      });

      onOpenChange(false);
      onUpdate?.();
    } catch (error) {
      toast({
        title: t('common.error'),
        description: t('payments.rejectFailed'),
        variant: 'destructive',
      });
    } finally {
      setUpdating(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'paid':
      case 'verified':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'rejected':
      case 'failed':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const handleViewReceipt = () => {
    if (transaction?.receipt_url) {
      window.open(transaction.receipt_url, '_blank');
    } else {
      toast({
        title: t('common.error'),
        description: t('payments.receiptNotAvailable'),
        variant: 'destructive',
      });
    }
  };

  const handleDownloadReceipt = () => {
    if (transaction?.receipt_url) {
      const link = document.createElement('a');
      link.href = transaction.receipt_url;
      link.download = `receipt-${transaction.receipt_id || transaction.id}.pdf`;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      toast({
        title: t('common.error'),
        description: t('payments.receiptNotAvailable'),
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            Transaction Details {transaction ? `- ${transaction.id}` : ''}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : transaction ? (
          <div className="space-y-6 mt-4">
            {/* Header Card */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-2xl font-bold">{formatCurrency(transaction.amount)}</h3>
                    <p className="text-muted-foreground mt-1">{transaction.purpose}</p>
                  </div>
                  <Badge className={getStatusColor(transaction.status)}>
                    {transaction.status}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Details Grid */}
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <User className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Student</p>
                      <p className="font-medium">{transaction.student_name}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <User className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Parent</p>
                      <p className="font-medium">{transaction.parent_name}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Date</p>
                      <p className="font-medium">
                        {transaction.date ? format(new Date(transaction.date), 'PPP') : 'N/A'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <CreditCard className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Payment Method</p>
                      <p className="font-medium">{transaction.payment_method}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <CreditCard className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Payment Source</p>
                      <p className="font-medium">{transaction.payment_source}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {transaction.receipt_id && (
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <FileText className="w-5 h-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Transaction ID</p>
                        <p className="font-mono text-sm">{transaction.receipt_id}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {transaction.notes && (
              <Card>
                <CardContent className="p-4">
                  <p className="text-sm text-muted-foreground mb-2">Notes</p>
                  <p className="text-sm">{transaction.notes}</p>
                </CardContent>
              </Card>
            )}

            <Separator />

            {/* Action Buttons - Clean and Minimal */}
            <div className="flex items-center justify-between pt-6 border-t mt-8">
              <div></div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => onOpenChange(false)} disabled={updating}>
                  {t('common.close')}
                </Button>

              {transaction.receipt_url && (
                <>
                  <Button variant="outline" onClick={handleViewReceipt} className="gap-2">
                    <Eye className="w-4 h-4" />
                    View Receipt
                  </Button>
                  <Button variant="outline" onClick={handleDownloadReceipt} className="gap-2">
                    <Download className="w-4 h-4" />
                    Download Receipt
                  </Button>
                </>
              )}

              {transaction.status?.toLowerCase() === 'pending' && (
                <>
                  <Button
                    variant="destructive"
                    onClick={handleReject}
                    disabled={updating}
                    className="gap-2"
                  >
                    {updating ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <XCircle className="w-4 h-4" />
                    )}
                    Reject
                  </Button>
                  <Button onClick={handleVerify} disabled={updating} className="gap-2">
                    {updating ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <CheckCircle className="w-4 h-4" />
                    )}
                    Verify Payment
                  </Button>
                </>
              )}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            Transaction not found
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

