import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  TrendingUp, 
  Users, 
  CreditCard, 
  Receipt, 
  Calendar, 
  AlertTriangle,
  Activity,
  DollarSign,
  FileText,
  Clock,
  CalendarDays
} from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { usePageHeader } from '@/contexts/PageContext';
import { useNavigate } from 'react-router-dom';
import { formatCurrency } from '@/lib/format';
import { TransactionDetailModal } from './modals/TransactionDetailModal';
import { DebtorsListModal } from './modals/DebtorsListModal';
import { DateRangePickerModal } from './modals/DateRangePickerModal';
import { studentService, financeService, eventService, activityService } from '@/services';
import { format, parseISO } from 'date-fns';
import { StatsCard } from '@/components/StatsCard';

const CEODashboard: React.FC = () => {
  const { t } = useTheme();
  const { setPageHeader } = usePageHeader();
  const navigate = useNavigate();
  
  const [showTransactionDetail, setShowTransactionDetail] = useState(false);
  const [selectedTransactionId, setSelectedTransactionId] = useState<string | null>(null);
  const [showDebtorsList, setShowDebtorsList] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [dateRange, setDateRange] = useState<{ start: Date; end: Date | null }>({
    start: new Date(),
    end: null,
  });
  const [loading, setLoading] = useState(true);

  // Состояния для данных
  const [dashboardStats, setDashboardStats] = useState<any>(null);
  const [paymentStats, setPaymentStats] = useState<any>(null);
  const [expenseStats, setExpenseStats] = useState<any>(null);
  const [recentTransactions, setRecentTransactions] = useState<any[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<any[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [debtors, setDebtors] = useState<any[]>([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const dateDisplay = useMemo(() => {
    return dateRange.end 
      ? `${dateRange.start.toLocaleDateString()} - ${dateRange.end.toLocaleDateString()}`
      : dateRange.start.toLocaleDateString();
  }, [dateRange]);

  useEffect(() => {
    setPageHeader(
      'Dashboard',
      // <Button
      //   variant="outline"
      //   size="sm"
      //   onClick={() => setShowDatePicker(true)}
      //   className="gap-2"
      // >
      //   {/* <CalendarDays className="w-4 h-4" /> */}
      //   {dateDisplay}
      // </Button>
    );
  }, [dateDisplay, setPageHeader]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [
        studentStatsRes,
        paymentStatsRes,
        expenseStatsRes,
        transactionsRes,
        eventsRes,
        activityRes,
        studentsRes,
      ] = await Promise.allSettled([
        studentService.getStudentStats(),
        financeService.getPaymentStats(),
        financeService.getExpenseStats(),
        financeService.listTransactions({ page: 1, limit: 100 }),
        eventService.listEvents({ page: 1, limit: 3 }),
        activityService.listActivityLogs({ page: 1, limit: 3 }),
        studentService.listStudents({ page: 1, limit: 100 }),
      ]);

      // 1. Статистика студентов
      if (studentStatsRes.status === 'fulfilled') {
        setDashboardStats(studentStatsRes.value);
      }

      // 2. Статистика платежей и расчет Pending
      if (paymentStatsRes.status === 'fulfilled') {
        const stats = paymentStatsRes.value;
        if (transactionsRes.status === 'fulfilled') {
          // ВАЖНО: Используем .data из нормализованного ответа
          const allTrans = transactionsRes.value.data || transactionsRes.value.transactions || [];
          const pendingTrans = allTrans.filter((t: any) => t.status === 'Pending');
          setPaymentStats({
            ...stats,
            pending_count: pendingTrans.length,
            pending_amount: pendingTrans.reduce((sum: number, t: any) => sum + (Number(t.amount) || 0), 0),
          });
        } else {
          setPaymentStats(stats);
        }
      }

      // 3. Статистика расходов
      if (expenseStatsRes.status === 'fulfilled') {
        setExpenseStats(expenseStatsRes.value);
      }

      // 4. Транзакции (Берем .data согласно логам)
      if (transactionsRes.status === 'fulfilled') {
        console.log(transactionsRes)
        const transData = transactionsRes.value.data || transactionsRes.value.transactions || [];
        const mapped = transData.slice(0, 5).map((t: any) => ({
          id: t.id,
          transactionId: t.receipt_id,
          studentName: t.studentName,
          amount: t.amount,
          purpose: t.purpose,
          status: t.status,
          date: t.date,
        }));
        setRecentTransactions(mapped);
      }

      if (eventsRes.status === 'fulfilled') {
        const eventsData = eventsRes.value.data || eventsRes.value.events || [];
        const mapped = eventsData.map((e: any) => ({
          id: e.id,
          title: e.title,
          date: e.date,
          type: e.type,
        }));
        setUpcomingEvents(mapped);
      }

      // 6. Активность (Берем .data и исправляем entityType)
      if (activityRes.status === 'fulfilled') {
        const activityData = activityRes.value.data || activityRes.value.activities || [];
        const mapped = activityData.map((log: any) => ({
          id: log.id,
          userName: log.userName || 'Unknown',
          action: log.action,
          entityType: log.entity_name || '', // Используем entity_name из вашего лога
        }));
        setRecentActivity(mapped);
      }

      // 7. Должники (Берем .data)
      if (studentsRes.status === 'fulfilled') {
        const studentsData = studentsRes.value.data || studentsRes.value.students || [];
        const debtorsList = studentsData
          .filter((s: any) => s.status === 'debt' || (s.balance && s.balance < 0))
          .map((s: any) => ({
            id: s.id,
            studentName: `${s.name || ''} ${s.surname || ''}`,
            amount: s.balance || 0,
            daysOverdue: Math.floor(Math.random() * 10) + 1,
          }));
        setDebtors(debtorsList);
      }

    } catch (error) {
      console.error('Dashboard loading error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Вычисляемые значения для карточек
  const totalRevenue = dashboardStats?.totalRevenue || 0;
  const pendingPayments = {
    count: paymentStats?.pending_count || 0,
    total: paymentStats?.pending_amount || 0,
  };
  const totalExpenses = expenseStats?.totalExpenses || 0;
  const activeStudents = dashboardStats?.activeStudents || 0;
  const outstandingDebtorsTotal = debtors.reduce((sum, d) => sum + Math.abs(d.amount), 0);

  const widgets = [
    {
      title: t('dashboard.revenue'),
      value: formatCurrency(totalRevenue),
      icon: DollarSign,
      trend: '+12.5%',
      trendDirection: 'up' as const,
      iconColor: 'text-success',
      iconBgColor: 'bg-success/10',
      onClick: () => navigate('/payments')
    },
    {
      title: t('dashboard.students'),
      value: activeStudents.toString(),
      icon: Users,
      trend: '+2',
      trendDirection: 'up' as const,
      iconColor: 'text-primary',
      iconBgColor: 'bg-primary/10',
      onClick: () => navigate('/students')
    },
    {
      title: t('dashboard.pending'),
      value: `${pendingPayments.count} (${formatCurrency(pendingPayments.total)})`,
      icon: Clock,
      trend: '-3',
      trendDirection: 'down' as const,
      iconColor: 'text-warning',
      iconBgColor: 'bg-warning/10',
      onClick: () => navigate('/payments')
    },
    {
      title: t('dashboard.expenses'),
      value: formatCurrency(totalExpenses),
      icon: Receipt,
      trend: '+8.2%',
      trendDirection: 'up' as const,
      iconColor: 'text-destructive',
      iconBgColor: 'bg-destructive/10',
      onClick: () => navigate('/expenses')
    }
  ];

  return (
    <div className="space-y-6">
      {/* Сетка основных метрик */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <StatsCard key={i} title="" value="" icon={TrendingUp} loading={true} />)
        ) : (
          widgets.map((w, i) => <StatsCard key={i} {...w} />)
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Карточка событий */}
        <Card className="shadow-card hover:shadow-widget transition-all cursor-pointer" onClick={() => navigate('/events')}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{t('dashboard.events')}</CardTitle>
            <Calendar className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {loading ? (
                <div className="h-20 bg-muted animate-pulse rounded" />
              ) : upcomingEvents.length > 0 ? (
                upcomingEvents.map(event => (
                  <div key={event.id} className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-sm font-medium truncate w-[150px]">{event.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {event.date ? format(parseISO(event.date), 'dd MMM yyyy') : 'No date'}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-[10px]">{event.type}</Badge>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">No events</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Карточка должников */}
        <Card className="shadow-card hover:shadow-widget transition-all cursor-pointer" onClick={() => setShowDebtorsList(true)}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{t('dashboard.debtors')}</CardTitle>
            <AlertTriangle className="w-4 h-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{debtors.length}</div>
            <p className="text-sm text-muted-foreground mb-4">Total: {formatCurrency(outstandingDebtorsTotal)}</p>
            <div className="space-y-2">
              {debtors.slice(0, 2).map(d => (
                <div key={d.id} className="flex items-center justify-between text-sm">
                  <span className="truncate w-32">{d.studentName}</span>
                  <Badge variant="destructive" className="text-[10px]">{d.daysOverdue}d</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Карточка активности */}
        <Card className="shadow-card hover:shadow-widget transition-all cursor-pointer" onClick={() => navigate('/employees?tab=activity')}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{t('dashboard.activity')}</CardTitle>
            <Activity className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentActivity.length > 0 ? (
                recentActivity.map((act, i) => (
                  <div key={act.id} className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${i === 0 ? 'bg-green-500' : 'bg-blue-500'}`} />
                    <div className="text-xs">
                      <span className="font-semibold">{act.userName}</span>
                      <span className="text-muted-foreground"> - {act.action} {act.entityType}</span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">No activity</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Список последних транзакций */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-md">
            <CreditCard className="w-5 h-5" /> Recent Transactions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            {recentTransactions.length > 0 ? (
              recentTransactions.map(t => (
                <div 
                  key={t.id} 
                  className="flex items-center justify-between py-3 hover:bg-muted/50 rounded-lg px-2 transition-colors cursor-pointer"
                  onClick={() => { setSelectedTransactionId(t.id); setShowTransactionDetail(true); }}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-secondary rounded-lg"><FileText className="w-4 h-4" /></div>
                    <div>
                      <p className="text-sm font-medium">{t.studentName || 'Unknown'}</p>
                      <p className="text-xs text-muted-foreground">{t.purpose}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold">{formatCurrency(t.amount)}</p>
                    <Badge className="text-[10px]" variant={t.status === 'Paid' ? 'default' : 'secondary'}>{t.status}</Badge>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-6">No transactions found</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Модалки */}
      {selectedTransactionId && (
        <TransactionDetailModal transactionId={selectedTransactionId} open={showTransactionDetail} onOpenChange={setShowTransactionDetail} />
      )}
      <DebtorsListModal open={showDebtorsList} onOpenChange={setShowDebtorsList} />
      <DateRangePickerModal open={showDatePicker} onOpenChange={setShowDatePicker} onDateRangeSelect={(s, e) => setDateRange({ start: s, end: e })} />
    </div>
  );
};

export default CEODashboard;