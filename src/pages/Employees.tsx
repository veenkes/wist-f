import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { employeeService, activityService } from '@/services';
import { ActivityLog as ApiActivityLog } from '@/types/api.types';
import { ApiClientError } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Plus, UserCircle, Mail, Phone, DollarSign, Activity as ActivityIcon, Users, Clock, Download, Eye } from 'lucide-react';
import { formatPhone, formatCurrency, formatNumber } from '@/lib/format';
import { toast } from '@/hooks/use-toast';
import { useNavigate, useSearchParams } from 'react-router-dom';
import AddEmployeeModal from '@/components/modals/AddEmployeeModal';
import EmployeeDetailModal from '@/components/modals/EmployeeDetailModal';
import { useTheme } from '@/contexts/ThemeContext';
import { usePageHeader } from '@/contexts/PageContext';

interface Employee {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  avatar_url: string | null;
  salary: number | null;
  payment_schedule: string | null;
  status: string;
  permissions: any;
  role: string;
  created_at: string;
  last_active?: string;
}

interface ActivityLog {
  id: string;
  userId: string;
  userName: string;
  userRole: string;
  avatar?: string;
  action: string;
  entityType: string;
  entityId: string;
  entityName: string;
  timestamp: Date;
  currentPage?: string;
  isOnline: boolean;
}

const mockActivityLogs: ActivityLog[] = [
  {
    id: '1',
    userId: 'u1',
    userName: 'Aliya Rakhimova',
    userRole: 'Admin',
    action: 'Edited student profile',
    entityType: 'student',
    entityId: 's1',
    entityName: 'Aruzhan Karimova',
    timestamp: new Date(Date.now() - 5 * 60000),
    currentPage: '/students',
    isOnline: true,
  },
  {
    id: '2',
    userId: 'u2',
    userName: 'Sanjar Yusupov',
    userRole: 'Accountant',
    action: 'Approved payment',
    entityType: 'payment',
    entityId: 'p1',
    entityName: 'Payment #1024',
    timestamp: new Date(Date.now() - 15 * 60000),
    currentPage: '/payments',
    isOnline: true,
  },
  {
    id: '3',
    userId: 'u3',
    userName: 'Dilnoza Nazarova',
    userRole: 'Finance Analyst',
    action: 'Added new expense',
    entityType: 'expense',
    entityId: 'e1',
    entityName: 'Office Supplies',
    timestamp: new Date(Date.now() - 30 * 60000),
    currentPage: '/expenses',
    isOnline: true,
  },
  {
    id: '4',
    userId: 'u4',
    userName: 'Rustam Karimov',
    userRole: 'Admin',
    action: 'Created new event',
    entityType: 'event',
    entityId: 'ev1',
    entityName: 'Parent-Teacher Conference',
    timestamp: new Date(Date.now() - 60 * 60000),
    isOnline: false,
  },
  {
    id: '5',
    userId: 'u5',
    userName: 'Malika Sharipova',
    userRole: 'Cashier',
    action: 'Processed cash payment',
    entityType: 'payment',
    entityId: 'p2',
    entityName: 'Payment #1025',
    timestamp: new Date(Date.now() - 90 * 60000),
    isOnline: false,
  },
  {
    id: '6',
    userId: 'u2',
    userName: 'Sanjar Yusupov',
    userRole: 'Accountant',
    action: 'Updated student balance',
    entityType: 'student',
    entityId: 's2',
    entityName: 'Murod Ismoilov',
    timestamp: new Date(Date.now() - 120 * 60000),
    currentPage: '/payments',
    isOnline: true,
  },
  {
    id: '7',
    userId: 'u1',
    userName: 'Aliya Rakhimova',
    userRole: 'Admin',
    action: 'Sent notification',
    entityType: 'notification',
    entityId: 'n1',
    entityName: 'Tuition Reminder',
    timestamp: new Date(Date.now() - 180 * 60000),
    currentPage: '/students',
    isOnline: true,
  },
];


export const Employees: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // Protect page from Accountant role
  useEffect(() => {
    if (user?.role === 'Accountant') {
      navigate('/dashboard', { replace: true });
    }
  }, [user, navigate]);
  
  if (user?.role === 'Accountant') {
    return null; // Don't render anything while redirecting
  }
  const [searchParams, setSearchParams] = useSearchParams();
  const { t } = useTheme();
  const { setPageHeader } = usePageHeader();
  const initialTab = searchParams.get('tab') || 'employees';
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [filteredEmployees, setFilteredEmployees] = useState<Employee[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterEmployeeRole, setFilterEmployeeRole] = useState<string>('all');
  
  // Activity log states
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [activityStats, setActivityStats] = useState<any>(null);
  const [activitySearchQuery, setActivitySearchQuery] = useState('');
  const [filterAction, setFilterAction] = useState<string>('all');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [showOnlineOnly, setShowOnlineOnly] = useState(false);

  // Calculate online users from activity logs
  const onlineUsers = React.useMemo(() => {
    if (!activityLogs || activityLogs.length === 0) return [];
    return activityLogs.filter(log => log.isOnline).reduce((acc, log) => {
      if (!acc.find(u => u.userId === log.userId)) {
        acc.push(log);
      }
      return acc;
    }, [] as ActivityLog[]);
  }, [activityLogs]);

  const loadActivityLogs = async () => {
    try {
      // Load logs and stats separately to avoid one failure breaking the other
      const logsResponse = await activityService.listActivityLogs({ page: 1, limit: 100 });
      
      // listActivityLogs now returns PaginatedResponse<ActivityLog> with normalized data
      // Map to local ActivityLog format (with additional fields for UI)
      const mappedLogs = logsResponse.data.map((log) => ({
        id: log.id,
        userId: log.userId || '',
        userName: log.userName || t('common.notSpecified'),
        userRole: log.userRole || '',
        action: log.action,
        entityType: log.details || '',
        entityId: log.entityId || log.id,
        entityName: log.entity || '',
        timestamp: typeof log.timestamp === 'string' ? new Date(log.timestamp) : log.timestamp,
        currentPage: '',
        isOnline: false,
      }));
      
      setActivityLogs(mappedLogs);
      
      // Try to load stats separately, but don't fail if it errors
      try {
        const statsResponse = await activityService.getActivityStats();
        setActivityStats(statsResponse);
      } catch (statsError) {
        console.error('Failed to load activity stats:', statsError);
        // Set default stats if loading fails
        setActivityStats({
          actionsToday: 0,
        });
      }
    } catch (error) {
      console.error('Failed to load activity logs:', error);
      setActivityLogs([]);
    }
  };

  const loadEmployees = async () => {
    try {
      setLoading(true);
      
      // Fetch employees from backend API
      const response = await employeeService.listEmployees({
        page: 1,
        limit: 100, // Load all employees for now
      });

      // listEmployees now returns PaginatedResponse<Employee> with normalized data
      // Map normalized Employee to local Employee format (with additional fields for UI)
      const mappedEmployees = response.data.map((emp) => ({
        id: emp.id,
        user_id: emp.id,
        full_name: emp.fullName,
        email: emp.email,
        phone: emp.phone || null,
        avatar_url: null,
        salary: emp.salary || null,
        payment_schedule: emp.paymentSchedule,
        status: emp.status || 'Active', // Keep original case for status (Active, Inactive, On Leave)
        permissions: null,
        role: emp.role || 'Unknown', // Keep original case for role
        created_at: emp.createdAt,
        last_active: emp.lastActive,
        isOnline: emp.isOnline || false,
        telegram_chat_id: emp.telegramChatId || null,
      }));

      setEmployees(mappedEmployees);
      setFilteredEmployees(mappedEmployees);
    } catch (error: any) {
      
      let errorMessage = t('employees.loadFailed');
      if (error instanceof ApiClientError) {
        errorMessage = error.message;
      }
      
      setEmployees([]);
      setFilteredEmployees([]);
      toast({
        title: t('employees.error'),
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadEmployees();
      loadActivityLogs();
    }
  }, [user]);

  useEffect(() => {
    setPageHeader(
      t('employees.title'),
      <Button 
        onClick={() => setIsAddModalOpen(true)} 
        size="sm"
        className="gap-2"
        disabled={user?.role?.toUpperCase() !== 'CEO'}
      >
        <Plus size={16} />
        {t('employees.addEmployee')}
      </Button>
    );
  }, [t, user, setPageHeader]);

  useEffect(() => {
    let filtered = employees.filter(
      (emp) =>
        emp.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.phone?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.role.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Apply status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter(emp => emp.status === filterStatus);
    }

    // Apply role filter
    if (filterEmployeeRole !== 'all') {
      filtered = filtered.filter(emp => emp.role === filterEmployeeRole);
    }

    setFilteredEmployees(filtered);
  }, [searchQuery, employees, filterStatus, filterEmployeeRole]);

  const handleEmployeeClick = (employee: Employee) => {
    if (user?.role?.toUpperCase() === 'CEO') {
      setSelectedEmployee(employee);
      setIsDetailModalOpen(true);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-500/20 text-green-700 dark:text-green-300';
      case 'inactive':
        return 'bg-gray-500/20 text-gray-700 dark:text-gray-300';
      case 'suspended':
        return 'bg-red-500/20 text-red-700 dark:text-red-300';
      default:
        return 'bg-gray-500/20 text-gray-700 dark:text-gray-300';
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'ceo':
        return 'bg-purple-500/20 text-purple-700 dark:text-purple-300';
      case 'admin':
        return 'bg-blue-500/20 text-blue-700 dark:text-blue-300';
      case 'accountant':
        return 'bg-green-500/20 text-green-700 dark:text-green-300';
      case 'teacher':
        return 'bg-orange-500/20 text-orange-700 dark:text-orange-300';
      case 'support':
        return 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-300';
      default:
        return 'bg-gray-500/20 text-gray-700 dark:text-gray-300';
    }
  };

  // Activity Log functions
  const filteredLogs = activityLogs.filter((log) => {
    const matchesSearch = !activitySearchQuery || 
                         (log.userName && log.userName.toLowerCase().includes(activitySearchQuery.toLowerCase())) ||
                         (log.action && log.action.toLowerCase().includes(activitySearchQuery.toLowerCase())) ||
                         (log.entityName && log.entityName.toLowerCase().includes(activitySearchQuery.toLowerCase()));
    const matchesAction = filterAction === 'all' || (log.action && log.action.toLowerCase().includes(filterAction.toLowerCase()));
    const matchesRole = filterRole === 'all' || (log.userRole && log.userRole === filterRole);
    const matchesOnline = !showOnlineOnly || log.isOnline;

    return matchesSearch && matchesAction && matchesRole && matchesOnline;
  });

  const handleEntityClick = (entityType: string, entityId: string) => {
    switch (entityType) {
      case 'student':
        navigate('/students');
        break;
      case 'payment':
        navigate('/payments');
        break;
      case 'expense':
        navigate('/expenses');
        break;
      case 'event':
        navigate('/events');
        break;
      case 'notification':
        navigate('/notifications');
        break;
    }
  };

  const getActivityRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'Admin':
        return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'Accountant':
        return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'Finance Analyst':
        return 'bg-purple-500/10 text-purple-500 border-purple-500/20';
      case 'Cashier':
        return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const formatTimestamp = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return t('employees.time.justNow');
    if (minutes < 60) return t('employees.time.minutesAgo', { minutes });
    if (hours < 24) return t('employees.time.hoursAgo', { hours });
    return t('employees.time.daysAgo', { days });
  };

  const exportToCSV = () => {
    const headers = [
      t('employees.csv.headers.user'),
      t('employees.csv.headers.role'),
      t('employees.csv.headers.action'),
      t('employees.csv.headers.entity'),
      t('employees.csv.headers.timestamp'),
    ];
    const rows = filteredLogs.map(log => [
      log.userName,
      log.userRole,
      log.action,
      log.entityName,
      log.timestamp.toLocaleString(),
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = t('employees.csv.filename');
    a.click();
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center h-full">
        <Card className="p-8 text-center">
          <h2 className="text-2xl font-bold mb-4">{t('employees.loading')}</h2>
          <p className="text-muted-foreground">{t('employees.pleaseWait')}</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs 
        value={initialTab} 
        onValueChange={(value) => {
          setSearchParams({ tab: value });
        }}
        className="w-full"
      >
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="employees" className="gap-2">
            <Users size={16} />
            {t('nav.employees')}
          </TabsTrigger>
          <TabsTrigger value="activity" className="gap-2">
            <ActivityIcon size={16} />
            {t('employees.activityLog')}
          </TabsTrigger>
        </TabsList>

        {/* Employees Tab */}
        <TabsContent value="employees" className="space-y-4">
          <Card className="p-4">
            <div className="space-y-4 mb-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={t('employees.searchPlaceholder')}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-4">
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder={t('common.status')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('common.allStatus')}</SelectItem>
                    <SelectItem value="active">{t('employees.status.active')}</SelectItem>
                    <SelectItem value="inactive">{t('employees.status.inactive')}</SelectItem>
                    <SelectItem value="suspended">{t('employees.status.suspended')}</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={filterEmployeeRole} onValueChange={setFilterEmployeeRole}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder={t('employees.role')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('common.allRoles')}</SelectItem>
                    <SelectItem value="ceo">{t('employees.roles.ceo')}</SelectItem>
                    <SelectItem value="admin">{t('employees.roles.admin')}</SelectItem>
                    <SelectItem value="accountant">{t('employees.roles.accountant')}</SelectItem>
                    <SelectItem value="teacher">{t('employees.roles.teacher')}</SelectItem>
                    <SelectItem value="support">{t('employees.roles.support')}</SelectItem>
                    <SelectItem value="manager">{t('employees.roles.manager')}</SelectItem>
                  </SelectContent>
                </Select>

                {(filterStatus !== 'all' || filterEmployeeRole !== 'all' || searchQuery) && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setFilterStatus('all');
                      setFilterEmployeeRole('all');
                      setSearchQuery('');
                    }}
                  >
                    {t('common.clearFilters')}
                  </Button>
                )}
              </div>

              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>{t('employees.totalEmployees')}: {filteredEmployees.length}</span>
                <span>{t('employees.activeEmployees')}: {filteredEmployees.filter(e => e.status === 'active').length}</span>
              </div>
            </div>

            {loading ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">{t('employees.loadingEmployees')}</p>
              </div>
            ) : filteredEmployees.length === 0 ? (
              <div className="text-center py-12">
                <UserCircle className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">{t('employees.noEmployeesFound')}</h3>
                {employees.length === 0 ? (
                  <div className="space-y-2">
                    <p className="text-muted-foreground max-w-md mx-auto">
                      {t('employees.getStartedMessage')}
                    </p>
                    <Button 
                      onClick={() => setIsAddModalOpen(true)} 
                      className="mt-4"
                      disabled={user?.role?.toUpperCase() !== 'CEO'}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      {t('employees.addFirstEmployee')}
                    </Button>
                  </div>
                ) : (
                  <p className="text-muted-foreground">
                    {t('employees.tryAdjustingFilters')}
                  </p>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredEmployees.map((employee) => (
                  <Card
                    key={employee.id}
                    className={`p-4 transition-all border-2 ${
                      employee.status === 'active' 
                        ? 'border-green-500/20' 
                        : employee.status === 'suspended'
                        ? 'border-red-500/20'
                        : 'border-border'
                    } ${user?.role?.toUpperCase() === 'CEO' ? 'cursor-pointer hover:shadow-lg hover:border-primary/50' : ''}`}
                    onClick={() => handleEmployeeClick(employee)}
                  >
                    <div className="flex items-start gap-4">
                      <div className="relative">
                        <Avatar className="h-14 w-14">
                          <AvatarImage src={employee.avatar_url || undefined} />
                          <AvatarFallback className="text-lg font-semibold">
                            {employee.full_name
                              .split(' ')
                              .map((n) => n[0])
                              .join('')
                              .toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        {Math.random() > 0.5 && (
                          <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-background rounded-full" 
                               title={t('employees.online')} />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h3 className="font-semibold text-foreground truncate text-lg">
                              {employee.full_name}
                            </h3>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge className={`${getRoleBadgeColor(employee.role)}`}>
                                {employee.role.toUpperCase()}
                              </Badge>
                              <Badge className={getStatusColor(employee.status)}>
                                {employee.status}
                              </Badge>
                            </div>
                          </div>
                        </div>
                        <div className="space-y-1.5 text-sm text-muted-foreground mt-3">
                          <div className="flex items-center gap-2">
                            <Mail size={14} className="flex-shrink-0" />
                            <span className="truncate">{employee.email}</span>
                          </div>
                          {employee.phone && (
                            <div className="flex items-center gap-2">
                              <Phone size={14} className="flex-shrink-0" />
                              <span>{formatPhone(employee.phone)}</span>
                            </div>
                          )}
                          {employee.salary && (
                            <div className="flex items-center gap-2">
                              <DollarSign size={14} className="flex-shrink-0" />
                              <span className="font-medium text-foreground">
                                {formatCurrency(employee.salary)} / {employee.payment_schedule}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </Card>
        </TabsContent>

        {/* Activity Log Tab */}
        <TabsContent value="activity" className="space-y-4">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{t('employees.onlineUsers')}</CardTitle>
                <Users className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">{onlineUsers.length}</div>
                <p className="text-xs text-muted-foreground mt-1">{t('employees.currentlyActive')}</p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{t('employees.actionsToday')}</CardTitle>
                <ActivityIcon className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">
                  {activityStats?.actionsToday || activityLogs.length}
                </div>
                <p className="text-xs text-muted-foreground mt-1">{t('employees.totalRecorded')}</p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{t('employees.avgResponseTime')}</CardTitle>
                <Clock className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">
                  {activityStats?.avg_response_time || t('employees.notAvailable')}
                </div>
                <p className="text-xs text-muted-foreground mt-1">{t('employees.averageToday')}</p>
              </CardContent>
            </Card>
          </div>

          {/* Filters and Search */}
          <Card className="p-6">
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={t('employees.searchActivity')}
                    value={activitySearchQuery}
                    onChange={(e) => setActivitySearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Button onClick={exportToCSV} variant="outline" className="gap-2">
                  <Download size={16} />
                  {t('employees.exportCSV')}
                </Button>
              </div>

              <div className="flex flex-wrap gap-4">
                <Select value={filterAction} onValueChange={setFilterAction}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder={t('employees.filterByAction')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('common.allActions')}</SelectItem>
                    <SelectItem value="edited">{t('employees.actions.edited')}</SelectItem>
                    <SelectItem value="approved">{t('employees.actions.approved')}</SelectItem>
                    <SelectItem value="added">{t('employees.actions.added')}</SelectItem>
                    <SelectItem value="created">{t('employees.actions.created')}</SelectItem>
                    <SelectItem value="processed">{t('employees.actions.processed')}</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={filterRole} onValueChange={setFilterRole}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder={t('employees.filterByRole')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('common.allRoles')}</SelectItem>
                    <SelectItem value="Admin">{t('employees.roles.admin')}</SelectItem>
                    <SelectItem value="Accountant">{t('employees.roles.accountant')}</SelectItem>
                    <SelectItem value="Finance Analyst">{t('employees.roles.manager')}</SelectItem>
                    <SelectItem value="Cashier">{t('employees.roles.support')}</SelectItem>
                  </SelectContent>
                </Select>

                <Button
                  variant={showOnlineOnly ? 'default' : 'outline'}
                  onClick={() => setShowOnlineOnly(!showOnlineOnly)}
                  className="gap-2"
                >
                  <Users size={16} />
                  {showOnlineOnly ? t('employees.showAll') : t('employees.onlineOnly')}
                </Button>
              </div>
            </div>
          </Card>

          {/* Activity List */}
          <Card className="p-6">
            <div className="space-y-4">
              {filteredLogs.length === 0 ? (
                <div className="text-center py-12">
                  <ActivityIcon className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">{t('employees.noActivityLogs')}</p>
                </div>
              ) : (
                filteredLogs.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-start gap-4 p-4 rounded-lg hover:bg-muted/50 transition-colors border border-border"
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={log.avatar} />
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {log.userName
                          .split(' ')
                          .map((n) => n[0])
                          .join('')
                          .toUpperCase()}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-foreground">{log.userName}</span>
                            <Badge className={getActivityRoleBadgeColor(log.userRole)} variant="outline">
                              {log.userRole}
                            </Badge>
                            {log.isOnline && (
                              <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
                                {t('employees.online')}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            <span className="text-foreground font-medium">{log.action}</span>
                            {t('employees.onEntity')}
                            <button
                              onClick={() => handleEntityClick(log.entityType, log.entityId)}
                              className="text-primary hover:underline font-medium inline-flex items-center gap-1"
                            >
                              {log.entityName}
                              <Eye size={12} />
                            </button>
                          </p>
                          {log.currentPage && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {t('employees.currentPage')}{log.currentPage}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Clock size={12} />
                          {formatTimestamp(log.timestamp)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      <AddEmployeeModal
        open={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={() => {
          loadEmployees();
          setIsAddModalOpen(false);
        }}
      />

      {selectedEmployee && (
        <EmployeeDetailModal
          open={isDetailModalOpen}
          onClose={() => {
            setIsDetailModalOpen(false);
            setSelectedEmployee(null);
          }}
          employee={selectedEmployee}
          onUpdate={loadEmployees}
        />
      )}
    </div>
  );
};