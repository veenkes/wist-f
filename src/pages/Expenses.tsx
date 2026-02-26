import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, 
  Search, 
  Download, 
  TrendingUp, 
  TrendingDown,
  FileText,
  Filter,
  Calendar,
  DollarSign,
  PieChart
} from 'lucide-react';
import { formatCurrency } from '@/lib/format';
import { Expense } from '@/types/api.types';
import { AddExpenseModal } from '@/components/modals/AddExpenseModal';
import { ExpenseDetailModal } from '@/components/modals/ExpenseDetailModal';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, Cell } from 'recharts';
import { financeService } from '@/services';
import { toast } from '@/hooks/use-toast';
import { usePageHeader } from '@/contexts/PageContext';
import { useTheme } from '@/contexts/ThemeContext';
import { StatsCard } from '@/components/StatsCard';
// Импортируем библиотеку xlsx
import * as XLSX from 'xlsx';

const COLORS = ['#f59e0b', '#3b82f6', '#10b981', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

export function Expenses() {
  const { t } = useTheme();
  const { setPageHeader } = usePageHeader();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date' | 'amount'>('date');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [stats, setStats] = useState<any>(null);
  
  useEffect(() => {
    loadExpenses();
  }, []);

  // Функция экспорта в Excel
  const exportToExcel = () => {
    // 1. Подготовка данных для экспорта
    const dataToExport = filteredExpenses.map(expense => ({
      ID: expense.id,
      Date: new Date(expense.date).toLocaleDateString(),
      Category: expense.category,
      Payee: expense.payee,
      Amount: expense.amount,
      'Payment Method': expense.paymentMethod,
      Description: expense.description || '' // Добавляем описание, если есть
    }));

    // 2. Создание рабочего листа (worksheet)
    const worksheet = XLSX.utils.json_to_sheet(dataToExport);

    // Настройка ширины колонок (опционально, для красоты)
    const columnWidths = [
      { wch: 10 }, // ID
      { wch: 12 }, // Date
      { wch: 20 }, // Category
      { wch: 20 }, // Payee
      { wch: 12 }, // Amount
      { wch: 15 }, // Payment Method
      { wch: 30 }  // Description
    ];
    worksheet['!cols'] = columnWidths;

    // 3. Создание рабочей книги (workbook)
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Expenses");

    // 4. Генерация имени файла и скачивание
    const fileName = `expenses-${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  useEffect(() => {
    setPageHeader(
      t('expenses.title'),
      <>
        <Button variant="outline" size="sm" onClick={exportToExcel} className="gap-1">
          <Download className="w-4 h-4" />
          Excel
        </Button>
        <Button size="sm" onClick={() => setIsAddModalOpen(true)} className="gap-1">
          <Plus className="w-4 h-4" />
          {t('expenses.addExpense')}
        </Button>
      </>
    );
  }, [setPageHeader, t, expenses, searchQuery, selectedCategory, selectedPaymentMethod, sortBy]); // Добавил зависимости, чтобы экспорт брал актуальные отфильтрованные данные

  const loadExpenses = async () => {
    try {
      setLoading(true);
      const [expensesResponse, statsResponse] = await Promise.all([
        financeService.listExpenses({ page: 1, limit: 100 }),
        financeService.getExpenseStats()
      ]);
      
      setExpenses(expensesResponse.data);
      setStats(statsResponse);
    } catch (error) {
      toast({
        title: t('common.error'),
        description: t('expenses.loadFailed'),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  
  const thisMonthExpenses = expenses.filter(expense => {
    const expenseDate = new Date(expense.date);
    return expenseDate.getMonth() === currentMonth && expenseDate.getFullYear() === currentYear;
  });

  const lastMonthExpenses = expenses.filter(expense => {
    const expenseDate = new Date(expense.date);
    const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
    return expenseDate.getMonth() === lastMonth && expenseDate.getFullYear() === lastMonthYear;
  });

  const totalThisMonth = thisMonthExpenses.reduce((sum, e) => sum + e.amount, 0);
  const totalLastMonth = lastMonthExpenses.reduce((sum, e) => sum + e.amount, 0);
  const percentageChange = totalLastMonth > 0 
    ? ((totalThisMonth - totalLastMonth) / totalLastMonth) * 100 
    : 0;

  const categoryTotals = thisMonthExpenses.reduce((acc, expense) => {
    acc[expense.category] = (acc[expense.category] || 0) + expense.amount;
    return acc;
  }, {} as Record<string, number>);

  const sortedChartData = Object.entries(categoryTotals)
    .map(([category, amount]) => ({
      name: category,
      value: amount
    }))
    .sort((a, b) => b.value - a.value);

  // Filter and sort expenses
  const filteredExpenses = expenses
    .filter(expense => {
      const matchesSearch = 
        (expense.payee?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
        (expense.category?.toLowerCase() || '').includes(searchQuery.toLowerCase());
      
      const matchesCategory = selectedCategory === 'all' || expense.category === selectedCategory;
      const matchesPaymentMethod = selectedPaymentMethod === 'all' || expense.paymentMethod === selectedPaymentMethod;
      
      return matchesSearch && matchesCategory && matchesPaymentMethod;
    })
    .sort((a, b) => {
      if (sortBy === 'date') {
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      }
      return b.amount - a.amount;
    });

  const getCategoryColor = (category: string) => {
    const colors = ['bg-blue-500', 'bg-purple-500', 'bg-cyan-500', 'bg-pink-500', 'bg-orange-500', 
                    'bg-yellow-500', 'bg-green-500', 'bg-red-500', 'bg-indigo-500', 'bg-teal-500'];
    let hash = 0;
    for (let i = 0; i < category.length; i++) {
      hash = category.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards and Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 flex flex-col space-y-3 h-full">
          {loading ? (
            Array.from({ length: 3 }).map((_, index) => (
              <StatsCard
                key={index}
                title=""
                value=""
                icon={DollarSign}
                loading={true}
              />
            ))
          ) : (
            <>
              <StatsCard
                title={t('expenses.totalThisMonth')}
                value={formatCurrency(stats?.total_month || totalThisMonth)}
                icon={DollarSign}
                iconColor="text-destructive"
                iconBgColor="bg-destructive/10"
              />
              <StatsCard
                title={t('expenses.expensesThisMonth')}
                value={stats?.count_month || thisMonthExpenses.length}
                icon={FileText}
                iconColor="text-primary"
                iconBgColor="bg-primary/10"
              />
              <StatsCard
                title={t('expenses.topCategory')}
                value={stats?.top_category || (Object.keys(categoryTotals).length > 0 
                  ? Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])[0][0]
                  : 'N/A')}
                icon={PieChart}
                iconColor="text-primary"
                iconBgColor="bg-primary/10"
              />
            </>
          )}
        </div>

        <div className="lg:col-span-2">
          {sortedChartData.length > 0 ? (
            <Card className="p-6 h-full">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold">{t('expenses.categoryBreakdown')}</h2>
                {totalLastMonth > 0 && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    {percentageChange >= 0 ? (
                      <TrendingUp className="w-4 h-4 text-green-500" />
                    ) : (
                      <TrendingDown className="w-4 h-4 text-red-500" />
                    )}
                    <span className={percentageChange >= 0 ? 'text-green-500' : 'text-red-500'}>
                      {percentageChange >= 0 ? '+' : ''}{percentageChange.toFixed(1)}% {t('expenses.vsLastMonth')}
                    </span>
                  </div>
                )}
              </div>
              <div className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={sortedChartData}
                    margin={{ top: 20, right: 30, left: 20, bottom: 50 }}
                    barCategoryGap="20%"
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.15} vertical={false} />
                    <XAxis 
                      dataKey="name" 
                      angle={-45}
                      textAnchor="end"
                      height={70}
                      stroke="#6b7280"
                      fontSize={13}
                      tick={{ fill: '#6b7280' }}
                      interval={0}
                      tickLine={false}
                    />
                    <YAxis 
                      tickFormatter={(value) => {
                        if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
                        if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
                        return value.toString();
                      }}
                      stroke="#6b7280"
                      fontSize={12}
                      tick={{ fill: '#6b7280' }}
                      width={60}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip 
                      formatter={(value: number) => formatCurrency(value)}
                      contentStyle={{ 
                        backgroundColor: 'rgba(255, 255, 255, 0.98)',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                        padding: '8px 12px'
                      }}
                      labelStyle={{ 
                        color: '#374151',
                        fontWeight: 600,
                        marginBottom: '4px',
                        fontSize: '13px'
                      }}
                      cursor={{ fill: 'rgba(0, 0, 0, 0.03)' }}
                    />
                    <Bar 
                      dataKey="value" 
                      radius={[16, 16, 0, 0]}
                      animationDuration={1200}
                      animationBegin={0}
                      barSize={60}
                    >
                      {sortedChartData.map((entry, index) => {
                        const barColors = ['#f97316', '#3b82f6', '#3b82f6', '#3b82f6', '#3b82f6', '#3b82f6'];
                        return (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={barColors[index % barColors.length]} 
                          />
                        );
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          ) : (
            <Card className="p-6 h-full">
              <div className="h-[350px] flex items-center justify-center">
                <div className="text-center text-muted-foreground">
                  <PieChart className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>{t('expenses.noExpenses')}</p>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Filters and Actions */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder={t('expenses.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-full md:w-48">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder={t('expenses.category')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('expenses.allCategories')}</SelectItem>
              {/* Список категорий (оставил как в вашем коде) */}
              <SelectItem value="Office">Basic Salary FS</SelectItem>
              <SelectItem value="Pre-school Salary FS">Pre-school Salary FS</SelectItem>
              <SelectItem value="Pre-school bonus FS">Pre-school bonus FS</SelectItem>
              <SelectItem value="Primary Salary FS">Primary Salary FS</SelectItem>
              <SelectItem value="Primary bonus FS">Primary bonus FS</SelectItem>
              <SelectItem value="Secondary Salary FS">Secondary Salary FS</SelectItem>
              <SelectItem value="Secondary bonus FS">Secondary bonus FS</SelectItem>
              <SelectItem value="Зарплата мест. учит">Зарплата мест. учит</SelectItem>
              <SelectItem value="Зарплата администрация">Зарплата администрация</SelectItem>
              <SelectItem value="Зарплата тех. Персонал">Зарплата тех. Персонал</SelectItem>
              <SelectItem value="Отпускные">Отпускные</SelectItem>
              <SelectItem value="НДФЛ">НДФЛ</SelectItem>
              <SelectItem value="Социальный налог">Социальный налог</SelectItem>
              <SelectItem value="ИНПС">ИНПС</SelectItem>
              <SelectItem value="НДС">НДС</SelectItem>
              <SelectItem value="Налог на прибыль иностр.юр.лиц">Налог на прибыль иностр.юр.лиц</SelectItem>
              <SelectItem value="Прочие налоги">Прочие налоги</SelectItem>
              <SelectItem value="Аренда квартир иност.">Аренда квартир иност.</SelectItem>
              <SelectItem value="Электроэнергия">Электроэнергия</SelectItem>
              <SelectItem value="Газ">Газ</SelectItem>
              <SelectItem value="Вода">Вода</SelectItem>
              <SelectItem value="Мусор">Мусор</SelectItem>
              <SelectItem value="Интернет">Интернет</SelectItem>
              <SelectItem value="Услуги телефонии">Услуги телефонии</SelectItem>
              <SelectItem value="Услуги почты">Услуги почты</SelectItem>
              <SelectItem value="Бензин">Бензин</SelectItem>
              <SelectItem value="Обслуживание зданий">Обслуживание зданий</SelectItem>
              <SelectItem value="Мебель">Мебель</SelectItem>
              <SelectItem value="Шкаф">Шкаф</SelectItem>
              <SelectItem value="Парта">Парта</SelectItem>
              <SelectItem value="Стол-стул">Стол-стул</SelectItem>
              <SelectItem value="Пуфик">Пуфик</SelectItem>
              <SelectItem value="Компьютер">Компьютер</SelectItem>
              <SelectItem value="Принтер">Принтер</SelectItem>
              <SelectItem value="Камера">Камера</SelectItem>
              <SelectItem value="Стабилизатор">Стабилизатор</SelectItem>
              <SelectItem value="Проектор">Проектор</SelectItem>
              <SelectItem value="коммутатор">коммутатор</SelectItem>
              <SelectItem value="Видео регистратор">Видео регистратор</SelectItem>
              <SelectItem value="Зарядное устройство Apple">Зарядное устройство Apple</SelectItem>
              <SelectItem value="Интерактивный сенсорный дисплей">Интерактивный сенсорный дисплей</SelectItem>
              <SelectItem value="Сенсорная интрактивная доска">Сенсорная интрактивная доска</SelectItem>
              <SelectItem value="Сенсорная панель">Сенсорная панель</SelectItem>
              <SelectItem value="Сортировщик банкнот">Сортировщик банкнот</SelectItem>
              <SelectItem value="Утюг">Утюг</SelectItem>
              <SelectItem value="Мобильная рация">Мобильная рация</SelectItem>
              <SelectItem value="Прочие инвент.">Прочие инвент.</SelectItem>
              <SelectItem value="Канцтовары">Канцтовары</SelectItem>
              <SelectItem value="Хозяйственные товары">Хозяйственные товары</SelectItem>
              <SelectItem value="Книги">Книги</SelectItem>
              <SelectItem value="Школьные тетради">Школьные тетради</SelectItem>
              <SelectItem value="Спорт инвентары">Спорт инвентары</SelectItem>
              <SelectItem value="Музыкальные инструменты">Музыкальные инструменты</SelectItem>
              <SelectItem value="Игрушки">Игрушки</SelectItem>
              <SelectItem value="Ковры">Ковры</SelectItem>
              <SelectItem value="Медицинские принадлежности">Медицинские принадлежности</SelectItem>
              <SelectItem value="Химические приборы">Химические приборы</SelectItem>
              <SelectItem value="Школьные экскурсии">Школьные экскурсии</SelectItem>
              <SelectItem value="Программное обеспечение">Программное обеспечение</SelectItem>
              <SelectItem value="Таможенные услуги">Таможенные услуги</SelectItem>
              <SelectItem value="Обслуживание сайта школы">Обслуживание сайта школы</SelectItem>
              <SelectItem value="Консалтинговые услуги">Консалтинговые услуги</SelectItem>
              <SelectItem value="аудиторские услуги">аудиторские услуги</SelectItem>
              <SelectItem value="Подбор персонала">Подбор персонала</SelectItem>
              <SelectItem value="Импорт услуги">Импорт услуги</SelectItem>
              <SelectItem value="Рекламные услуги">Рекламные услуги</SelectItem>
              <SelectItem value="Услуги по проведению экзаменов">Услуги по проведению экзаменов</SelectItem>
              <SelectItem value="Онлайн подписки">Онлайн подписки</SelectItem>
              <SelectItem value="Онлайн тестирование">Онлайн тестирование</SelectItem>
              <SelectItem value="Аккредитация CIS">Аккредитация CIS</SelectItem>
              <SelectItem value="Дизайн проектов">Дизайн проектов</SelectItem>
              <SelectItem value="Услуга по повышение квалификации персонала">Услуга по повышение квалификации персонала</SelectItem>
              <SelectItem value="Плата лицензии иност.">Плата лицензии иност.</SelectItem>
              <SelectItem value="Премии и подарки">Премии и подарки</SelectItem>
              <SelectItem value="Расходы на мероприятия">Расходы на мероприятия</SelectItem>
              <SelectItem value="Вода в бутылях">Вода в бутылях</SelectItem>
              <SelectItem value="Тех. персонал">Тех. персонал</SelectItem>
              <SelectItem value="Спец одежда">Спец одежда</SelectItem>
              <SelectItem value="Питание (тех. персонала)">Питание (тех. персонала)</SelectItem>
              <SelectItem value="Комиссия банка">Комиссия банка</SelectItem>
              <SelectItem value="Эхсон">Эхсон</SelectItem>
              <SelectItem value="Другие">Другие</SelectItem>
            </SelectContent>
          </Select>

          <Select value={selectedPaymentMethod} onValueChange={setSelectedPaymentMethod}>
            <SelectTrigger className="w-full md:w-48">
              <SelectValue placeholder={t('expenses.paymentMethod')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('expenses.allPaymentMethods')}</SelectItem>
              <SelectItem value="Cash">Cash</SelectItem>
              <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
              <SelectItem value="Card">Card</SelectItem>
              <SelectItem value="Check">Check</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={(v) => setSortBy(v as 'date' | 'amount')}>
            <SelectTrigger className="w-full md:w-40">
              <SelectValue placeholder={t('expenses.sortBy')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date">{t('expenses.sortByDate')}</SelectItem>
              <SelectItem value="amount">{t('expenses.sortByAmount')}</SelectItem>
            </SelectContent>
          </Select>

          {/* Кнопка теперь вызывает exportToExcel */}
          <Button variant="outline" onClick={exportToExcel} className="gap-2">
            <Download className="w-4 h-4" />
            Excel
          </Button>
        </div>
      </Card>

      {/* Expenses List */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b">
              <tr className="bg-muted/50">
                <th className="text-left p-4 font-semibold">{t('expenses.date')}</th>
                <th className="text-left p-4 font-semibold">{t('expenses.category')}</th>
                <th className="text-left p-4 font-semibold">{t('expenses.payee')}</th>
                <th className="text-left p-4 font-semibold">{t('expenses.paymentMethod')}</th>
                <th className="text-right p-4 font-semibold">{t('expenses.amount')}</th>
                <th className="text-center p-4 font-semibold">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {filteredExpenses.map((expense) => (
                <tr key={expense.id} className="border-b hover:bg-muted/30 transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <span>{new Date(expense.date).toLocaleDateString()}</span>
                    </div>
                  </td>
                  <td className="p-4">
                    <Badge className={`${getCategoryColor(expense.category)} text-white`}>
                      {expense.category}
                    </Badge>
                  </td>
                  <td className="p-4 font-medium">{expense.payee}</td>
                  <td className="p-4">
                    <Badge variant="outline">{expense.paymentMethod}</Badge>
                  </td>
                  <td className="p-4 text-right font-semibold">{formatCurrency(expense.amount)}</td>
                  <td className="p-4 text-center">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedExpense(expense)}
                    >
                      {t('common.details')}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {filteredExpenses.length === 0 && (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">{t('expenses.noExpenses')}</p>
            </div>
          )}
        </div>
      </Card>

      {/* Modals */}
      <AddExpenseModal 
        open={isAddModalOpen} 
        onOpenChange={setIsAddModalOpen}
        onSuccess={loadExpenses}
      />
      
      {selectedExpense && (
        <ExpenseDetailModal
          expenseId={selectedExpense.id}
          open={!!selectedExpense}
          onOpenChange={(open) => !open && setSelectedExpense(null)}
        />
      )}
    </div>
  );
}