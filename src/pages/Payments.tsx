import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Search, Filter, Download, Plus, Calendar,
  TrendingUp, Clock, CheckCircle2, XCircle,
  ArrowUpDown, Eye, CheckCheck
} from 'lucide-react';
import { formatCurrency } from '@/lib/format';
import { Transaction } from '@/data/mockData';
import ManualPaymentModal from '@/components/modals/ManualPaymentModal';
import { TransactionDetailModal } from '@/components/modals/TransactionDetailModal';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useTheme } from '@/contexts/ThemeContext';
import { usePageHeader } from '@/contexts/PageContext';
import { financeService } from '@/services';
import { StatsCard } from '@/components/StatsCard';
import type { PaymentStats } from '@/types/api.types';
// 1. Импортируем библиотеку
import * as XLSX from 'xlsx';

const Payments: React.FC = () => {
  const { t } = useTheme();
  const { setPageHeader } = usePageHeader();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [selectedTransactionId, setSelectedTransactionId] = useState<string | null>(null);
  const [showTransactionDetail, setShowTransactionDetail] = useState(false);
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date' | 'amount'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const { toast } = useToast();

  useEffect(() => {
    loadPayments();
  }, []);

  // 2. Функция экспорта в Excel
  const exportToExcel = () => {
    const dataToExport = filteredTransactions.map(t => ({
      'Transaction ID': t.transactionId,
      'Date': new Date(t.date).toLocaleDateString(),
      'Student': t.studentName,
      'Parent': t.parentName || '-',
      'Purpose': t.purpose,
      'Amount': t.amount,
      'Currency': t.currency,
      'Source': t.paymentSource,
      'Method': t.paymentMethod,
      'Status': t.status
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    
    // Настройка ширины колонок
    worksheet['!cols'] = [
      { wch: 15 }, // ID
      { wch: 12 }, // Date
      { wch: 25 }, // Student
      { wch: 25 }, // Parent
      { wch: 20 }, // Purpose
      { wch: 12 }, // Amount
      { wch: 8 },  // Currency
      { wch: 15 }, // Source
      { wch: 15 }, // Method
      { wch: 10 }  // Status
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Payments");
    XLSX.writeFile(workbook, `payments_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // 3. Обновляем хедер: оставили только кнопку Excel и Добавить
  useEffect(() => {
    setPageHeader(
      t('payments.title'),
      <>
        <Button variant="outline" size="sm" onClick={exportToExcel} className="gap-1">
          <Download className="w-4 h-4" />
          Excel
        </Button>
        <Button size="sm" onClick={() => setShowManualEntry(true)} className="gap-1">
          <Plus className="w-4 h-4" />
          {t('common.add')}
        </Button>
      </>
    );
  }, [t, setPageHeader, transactions, searchTerm, sourceFilter, statusFilter, sortBy, sortOrder]); // Добавили зависимости для актуальности данных

  const loadPayments = async () => {
    try {
      setLoading(true);
      const [statsResponse, transactionsResponse] = await Promise.all([
        financeService.getPaymentStats(),
        financeService.listTransactions({ page: 1, limit: 100 })
      ]);
      
      const mappedTransactions: Transaction[] = (transactionsResponse.data || []).map((t) => {
        let paymentMethod: 'Bank Transfer' | 'Card' | 'E-wallet' | 'Cash' = 'Cash';
        if (t.payment_method === 'Bank Transfer') paymentMethod = 'Bank Transfer';
        else if (t.payment_method === 'Card') paymentMethod = 'Card';
        else if (t.payment_method === 'Cash') paymentMethod = 'Cash';
        
        return {
          id: t.id,
          transactionId: t.id,
          studentId: t.student_id,
          studentName: t.studentName || '',
          parentName: '',
          amount: t.amount,
          currency: 'UZS',
          paymentMethod,
          paymentSource: t.payment_source as 'Payme' | 'Uzum Bank' | 'Company Transfer' | 'Cash' | 'Manual',
          purpose: t.purpose,
          date: t.date,
          status: t.status as 'Paid' | 'Pending' | 'Refunded' | 'Verified' | 'Failed',
          verificationStatus: (t.status === 'Pending' ? 'Pending' : 'Verified') as 'Pending' | 'Verified' | 'Failed',
        };
      });
      setTransactions(mappedTransactions);
    } catch (error) {
      console.error('[Payments] Error loading payments:', error);
      toast({
        title: t('common.error'),
        description: t('payments.loadFailed'),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const [paymentStats, setPaymentStats] = useState<PaymentStats>({
    totalRevenue: 0,
    pendingPayments: 0,
    completedPayments: 0,
    totalTransactions: 0,
    paymeCount: 0,
    uzumCount: 0,
  });

  useEffect(() => {
    const loadStats = async () => {
      try {
        const statsData = await financeService.getPaymentStats();
        setPaymentStats(statsData);
      } catch (error) {
        console.error('[Payments] Error loading stats:', error);
      }
    };
    loadStats();
  }, []);

  const stats = useMemo(() => {
    const paidTransactions = transactions.filter(t => t.status === 'Paid' || t.status === 'Verified');
    const pendingVerification = transactions.filter(
      t => t.paymentSource === 'Company Transfer' && t.verificationStatus === 'Pending'
    );
    
    return {
      totalIncome: paymentStats.totalRevenue || paidTransactions.reduce((sum, t) => sum + t.amount, 0),
      pendingVerifications: pendingVerification.length,
      pendingAmount: pendingVerification.reduce((sum, t) => sum + t.amount, 0),
      totalTransactions: paymentStats.totalTransactions || transactions.length,
      paymeSources: paymentStats.paymeCount || transactions.filter(t => t.paymentSource === 'Payme').length,
      uzumSources: paymentStats.uzumCount || transactions.filter(t => t.paymentSource === 'Uzum Bank').length,
      companySources: transactions.filter(t => t.paymentSource === 'Company Transfer').length,
    };
  }, [transactions, paymentStats]);

  const filteredTransactions = useMemo(() => {
    if (!transactions || transactions.length === 0) return [];
    
    let filtered = transactions.filter(transaction => {
      const matchesSearch = 
        (transaction.studentName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (transaction.parentName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (transaction.purpose || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (transaction.transactionId || '').toLowerCase().includes(searchTerm.toLowerCase());

      const matchesSource = sourceFilter === 'all' || transaction.paymentSource === sourceFilter;
      const matchesStatus = statusFilter === 'all' || transaction.status === statusFilter;

      return matchesSearch && matchesSource && matchesStatus;
    });

    filtered.sort((a, b) => {
      if (sortBy === 'date') {
        const comparison = new Date(b.date).getTime() - new Date(a.date).getTime();
        return sortOrder === 'desc' ? comparison : -comparison;
      } else {
        const comparison = b.amount - a.amount;
        return sortOrder === 'desc' ? comparison : -comparison;
      }
    });

    return filtered;
  }, [transactions, searchTerm, sourceFilter, statusFilter, sortBy, sortOrder]);

  const handleVerifyPayment = (transactionId: string) => {
    toast({
      title: t('payments.verified'),
      description: t('payments.transactionVerified', { transactionId }),
    });
  };

  const getSourceBadgeColor = (source: string) => {
    switch (source) {
      case 'Payme': return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20';
      case 'Uzum Bank': return 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20';
      case 'Company Transfer': return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20';
      case 'Cash': return 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20';
      case 'Manual': return 'bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/20';
      default: return '';
    }
  };

  const getStatusBadge = (transaction: Transaction) => {
    if (transaction.status === 'Paid' || transaction.status === 'Verified') {
      return <Badge variant="default" className="gap-1"><CheckCircle2 className="w-3 h-3" /> {transaction.status}</Badge>;
    } else if (transaction.status === 'Pending') {
      return <Badge variant="secondary" className="gap-1"><Clock className="w-3 h-3" /> {t('payments.status.pending')}</Badge>;
    } else if (transaction.status === 'Failed') {
      return <Badge variant="destructive" className="gap-1"><XCircle className="w-3 h-3" /> {t('payments.status.failed')}</Badge>;
    } else if (transaction.status === 'Refunded') {
      return <Badge variant="outline" className="gap-1">{t('payments.status.refunded')}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {loading ? (
          Array.from({ length: 4 }).map((_, index) => (
            <StatsCard
              key={index}
              title=""
              value=""
              icon={TrendingUp}
              loading={true}
            />
          ))
        ) : (
          <>
            <StatsCard
              title={t('payments.totalIncome')}
              value={formatCurrency(stats.totalIncome)}
              icon={TrendingUp}
              iconColor="text-success"
              iconBgColor="bg-success/10"
            />

            <StatsCard
              title={t('payments.pendingVerification')}
              value={stats.pendingVerifications}
              icon={Clock}
              subtitle={formatCurrency(stats.pendingAmount)}
              iconColor="text-warning"
              iconBgColor="bg-warning/10"
            />

            <StatsCard
              title={t('payments.totalTransactions')}
              value={stats.totalTransactions}
              icon={CheckCheck}
              subtitle={`Payme: ${stats.paymeSources} | Uzum: ${stats.uzumSources}`}
              iconColor="text-primary"
              iconBgColor="bg-primary/10"
            />

            <StatsCard
              title="Company Transfers"
              value={stats.companySources}
              icon={Calendar}
              subtitle="Requires verification"
              iconColor="text-warning"
              iconBgColor="bg-warning/10"
            />
          </>
        )}
      </div>

      {/* Filters and Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col lg:flex-row gap-4 mb-6">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder={t('payments.searchPlaceholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Filters */}
            <Select value={sourceFilter} onValueChange={setSourceFilter}>
              <SelectTrigger className="w-full lg:w-[180px]">
                <SelectValue placeholder={t('payments.paymentSource')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('payments.allSources')}</SelectItem>
                <SelectItem value="Payme">Payme</SelectItem>
                <SelectItem value="Uzum Bank">Uzum Bank</SelectItem>
                <SelectItem value="Company Transfer">Company Transfer</SelectItem>
                <SelectItem value="Cash">Cash</SelectItem>
                <SelectItem value="Manual">Manual</SelectItem>
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full lg:w-[180px]">
                <SelectValue placeholder={t('common.status')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('common.allStatus')}</SelectItem>
                <SelectItem value="Paid">{t('payments.status.paid')}</SelectItem>
                <SelectItem value="Verified">{t('payments.status.verified')}</SelectItem>
                <SelectItem value="Pending">{t('payments.status.pending')}</SelectItem>
                <SelectItem value="Failed">{t('payments.status.failed')}</SelectItem>
                <SelectItem value="Refunded">{t('payments.status.refunded')}</SelectItem>
              </SelectContent>
            </Select>

            {/* Sort */}
            <Button
              variant="outline"
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="w-full lg:w-auto"
            >
              <ArrowUpDown className="w-4 h-4 mr-2" />
              {sortBy === 'date' ? 'Date' : 'Amount'} ({sortOrder === 'desc' ? '↓' : '↑'})
            </Button>

            {/* 4. Кнопки экспорта удалены из этой панели, так как они перемещены в хедер */}
            
            <Button variant="wist" onClick={() => setShowManualEntry(true)} className="w-full lg:w-auto">
              <Plus className="w-4 h-4 mr-2" />
              Add Payment
            </Button>
          </div>

          {/* Transactions Table */}
          <div className="rounded-lg border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Transaction ID</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Student</TableHead>
                    <TableHead>Parent</TableHead>
                    <TableHead>Purpose</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTransactions.map((transaction) => (
                    <TableRow key={transaction.id} className="hover:bg-muted/30">
                      <TableCell className="font-mono text-xs">{transaction.transactionId}</TableCell>
                      <TableCell className="text-sm">{new Date(transaction.date).toLocaleDateString()}</TableCell>
                      <TableCell className="font-medium">{transaction.studentName}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{transaction.parentName}</TableCell>
                      <TableCell className="text-sm">{transaction.purpose}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={getSourceBadgeColor(transaction.paymentSource)}>
                          {transaction.paymentSource}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-semibold">{formatCurrency(transaction.amount)}</TableCell>
                      <TableCell>{getStatusBadge(transaction)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          {transaction.paymentSource === 'Company Transfer' && transaction.verificationStatus === 'Pending' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleVerifyPayment(transaction.transactionId || '')}
                              className="text-xs"
                            >
                              <CheckCheck className="w-3 h-3 mr-1" />
                              Verify
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedTransactionId(transaction.id);
                              setShowTransactionDetail(true);
                            }}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          {filteredTransactions.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No payments found matching your criteria.</p>
            </div>
          )}

          {/* Summary Footer */}
          <div className="mt-6 flex justify-between items-center text-sm">
            <span className="text-muted-foreground">
              Showing {filteredTransactions.length} of {transactions.length} transactions
            </span>
            <span className="font-semibold">
              Total: {formatCurrency(filteredTransactions.reduce((sum, t) => sum + t.amount, 0))}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Modals */}
      {selectedTransactionId && (
        <TransactionDetailModal
          transactionId={selectedTransactionId}
          open={showTransactionDetail}
          onOpenChange={setShowTransactionDetail}
          onUpdate={loadPayments}
        />
      )}

      <ManualPaymentModal
        isOpen={showManualEntry}
        onClose={() => setShowManualEntry(false)}
        onSuccess={loadPayments}
      />
    </div>
  );
};

export default Payments;