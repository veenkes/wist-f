import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom'; // Добавили useNavigate
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Plus, 
  Search, 
  Download, 
  Users,
  GraduationCap,
  DollarSign,
  TrendingUp,
  Filter,
  MoreVertical,
  Mail,
  Phone,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { formatCurrency, formatPhone } from '@/lib/format';
import { mockStudents } from '@/data/mockData';
import { Student } from '@/types/api.types';
import { studentService } from '@/services';
import { AddStudentModal } from '@/components/modals/AddStudentModal';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
} from '@/components/ui/pagination';
import { useTheme } from '@/contexts/ThemeContext';
import { usePageHeader } from '@/contexts/PageContext';
import { toast } from '@/hooks/use-toast';
import { StatsCard } from '@/components/StatsCard';
import * as XLSX from 'xlsx';

export function TeacherStudents() {
  const { t } = useTheme();
  const { setPageHeader } = usePageHeader();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate(); // Инициализируем навигацию
  
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = parseInt(searchParams.get('limit') || '12', 10);
  const searchQuery = searchParams.get('search') || '';
  const selectedGrade = searchParams.get('grade') || 'all';
  const selectedStatus = searchParams.get('status') || 'all';
  const selectedAcademicStatus = searchParams.get('academicStatus') || 'all';
  const activeTab = searchParams.get('tab') || 'all';
  
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [students, setStudents] = useState<Student[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 12,
    total: 0,
    totalPages: 1,
  });
  const [loading, setLoading] = useState(false);
  const [statsLoading, setStatsLoading] = useState(true);
  
  // Statistics from API
  const [stats, setStats] = useState({
    totalStudents: 0,
    activeStudents: 0,
    totalRevenue: 0,
    totalOwed: 0,
    averageAttendance: 0,
    debtCases: 0,
  });
  
  const updateSearchParams = useCallback((updates: Record<string, string | number | null>) => {
    setSearchParams(prev => {
      const newParams = new URLSearchParams(prev);
      Object.entries(updates).forEach(([key, value]) => {
        if (value === null || value === '' || value === 'all') {
          newParams.delete(key);
        } else {
          newParams.set(key, String(value));
        }
      });
      if (!('page' in updates)) {
        newParams.set('page', '1');
      }
      return newParams;
    });
  }, [setSearchParams]);

  // useEffect(() => {
  //   setPageHeader(
  //     t('students.title'),
  //     <Button onClick={() => setIsAddModalOpen(true)} size="sm" className="gap-2">
  //       <Plus className="w-4 h-4" />
  //       {t('students.addStudent')}
  //     </Button>
  //   );
  // }, [t, setPageHeader]);

  const fetchStats = useCallback(async () => {
    try {
      setStatsLoading(true);
      const statsData = await studentService.getStudentStats();
      setStats({
        totalStudents: statsData.totalStudents || 0,
        activeStudents: statsData.activeStudents || 0,
        totalRevenue: statsData.totalRevenue || 0,
        totalOwed: statsData.totalOwed || 0,
        averageAttendance: statsData.avgAttendance || 0,
        debtCases: statsData.debtCases || 0,
      });
    } catch (error) {
      console.error('Failed to load stats', error);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  const fetchStudents = useCallback(async () => {
    try {
      setLoading(true);
      const params: any = {
        page,
        limit,
      };
      
      if (searchQuery) params.search = searchQuery;
      if (selectedGrade !== 'all') params.grade = parseInt(selectedGrade, 10);
      if (selectedStatus !== 'all') params.status = selectedStatus;
      if (selectedAcademicStatus !== 'all') {
        params.academicStatus = selectedAcademicStatus === 'needs-improvement' ? 'needs_improvement' : selectedAcademicStatus;
      }
      if (activeTab !== 'all') params.status = activeTab;
      
      const studentsResponse = await studentService.listStudents(params);
      
      const mappedStudents = studentsResponse.data.map((s) => ({
        ...s,
        totalPaid: s.totalPaid ?? 0,
        attendance: s.attendance ?? 0,
        gpa: s.gpa ?? 0,
      })) as Student[];
        
      setStudents(mappedStudents);
      setPagination(studentsResponse.pagination);
    } catch (error) {
      setStudents(mockStudents.map(s => ({
        ...s,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })) as Student[]);
      toast({
        title: t('common.error'),
        description: t('errors.studentsLoadFailed'),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [page, limit, searchQuery, selectedGrade, selectedStatus, selectedAcademicStatus, activeTab, t]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  const handleFullRefresh = useCallback(() => {
    fetchStats();
    fetchStudents();
  }, [fetchStats, fetchStudents]);

  const totalStudents = stats.totalStudents;
  const activeStudents = stats.activeStudents;
  const totalRevenue = stats.totalRevenue;
  const totalOwed = stats.totalOwed;
  const averageAttendance = stats.averageAttendance;

  const filteredStudents = students;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'graduated': return 'bg-blue-500';
      case 'suspended': return 'bg-orange-500';
      case 'debt': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getAcademicStatusColor = (status: string) => {
    switch (status) {
      case 'excellent': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'good': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'average': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'needs-improvement': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const handleDeleteStudent = async (studentId: string) => {
    if (!confirm(t('students.confirmDelete'))) {
      return;
    }

    try {
      await studentService.deleteStudent(studentId);
      
      toast({
        title: t('common.success'),
        description: t('students.deleteSuccess'),
      });
      
      handleFullRefresh();
    } catch (error) {
      let errorMessage = t('students.deleteFailed');
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      toast({
        title: t('common.error'),
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const exportToExcel = () => {
    const dataToExport = filteredStudents.map(student => ({
      ID: student.id,
      Name: student.name,
      Surname: student.surname,
      Grade: student.grade,
      Class: student.className,
      Status: student.status,
      'Academic Status': student.academicStatus,
      Balance: student.balance,
      Attendance: student.attendance,
      GPA: student.gpa || 'N/A'
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    
    worksheet['!cols'] = [
      { wch: 10 }, { wch: 15 }, { wch: 15 }, { wch: 8 }, 
      { wch: 8 }, { wch: 10 }, { wch: 15 }, { wch: 12 }, 
      { wch: 10 }, { wch: 8 }
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Students");
    
    const fileName = `students_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  return (
    <div className="space-y-6">
      {/* Status Tabs */}
      <Tabs value={activeTab} onValueChange={(value) => updateSearchParams({ tab: value })}>
        <TabsList>
          <TabsTrigger value="all">{t('students.allStudents')}</TabsTrigger>
          <TabsTrigger value="active">{t('students.status.active')}</TabsTrigger>
          <TabsTrigger value="debt">{t('students.withDebt')}</TabsTrigger>
          <TabsTrigger value="suspended">{t('students.status.suspended')}</TabsTrigger>
          <TabsTrigger value="graduated">{t('students.status.graduated')}</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-4">
          {/* Filters */}
          <Card className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder={t('students.searchPlaceholder')}
                  value={searchQuery}
                  onChange={(e) => updateSearchParams({ search: e.target.value })}
                  className="pl-9"
                />
              </div>
              
              <Select value={selectedGrade} onValueChange={(value) => updateSearchParams({ grade: value })}>
                <SelectTrigger className="w-full md:w-40">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder={t('students.grade')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('common.allGrades')}</SelectItem>
                  {[1,2,3,4,5,6,7,8,9,10,11].map(grade => (
                    <SelectItem key={grade} value={grade.toString()}>{t('students.grade')} {grade}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedStatus} onValueChange={(value) => updateSearchParams({ status: value })}>
                <SelectTrigger className="w-full md:w-40">
                  <SelectValue placeholder={t('students.status')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('common.allStatus')}</SelectItem>
                  <SelectItem value="active">{t('students.status.active')}</SelectItem>
                  <SelectItem value="debt">{t('students.status.debt')}</SelectItem>
                  <SelectItem value="suspended">{t('students.status.suspended')}</SelectItem>
                  <SelectItem value="graduated">{t('students.status.graduated')}</SelectItem>
                </SelectContent>
              </Select>

              <Select value={selectedAcademicStatus} onValueChange={(value) => updateSearchParams({ academicStatus: value })}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder={t('students.academicStatus')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('common.allPerformance')}</SelectItem>
                  <SelectItem value="excellent">{t('students.academic.excellent')}</SelectItem>
                  <SelectItem value="good">{t('students.academic.good')}</SelectItem>
                  <SelectItem value="average">{t('students.academic.average')}</SelectItem>
                  <SelectItem value="needs-improvement">{t('students.academic.needsImprovement')}</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={limit.toString()} onValueChange={(value) => updateSearchParams({ limit: parseInt(value, 10) })}>
                <SelectTrigger className="w-full md:w-32">
                  <SelectValue placeholder={t('common.itemsPerPage')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="12">12</SelectItem>
                  <SelectItem value="24">24</SelectItem>
                  <SelectItem value="48">48</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>

              <Button variant="outline" onClick={exportToExcel} className="gap-2">
                <Download className="w-4 h-4" />
                Excel
              </Button>
            </div>
          </Card>

          {/* Students Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredStudents.map((student) => (
              <Card key={student.id} className="p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <Avatar className="w-16 h-16">
                    <AvatarImage src={student.avatar} />
                    <AvatarFallback className="text-lg">
                      {student.name[0]}{student.surname[0]}
                    </AvatarFallback>
                  </Avatar>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => navigate(`/student/${student.id}`)}>
                        {t('students.viewDetails')}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate(`/student/${student.id}`)}>
                        {t('students.editStudent')}
                      </DropdownMenuItem>
                      <DropdownMenuItem>{t('students.sendMessage')}</DropdownMenuItem>
                      <DropdownMenuItem 
                        className="text-red-600"
                        onClick={() => handleDeleteStudent(student.id)}
                      >
                        {t('students.delete')}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="space-y-3">
                  <div>
                    <h3 className="font-bold text-lg">
                      {student.name} {student.surname}
                    </h3>
                    <p className="text-sm text-muted-foreground">{student.className} • {t('students.gradeLabel')} {student.grade}</p>
                  </div>

                  <div className="flex gap-2">
                    <Badge className={`${getStatusColor(student.status)} text-white`}>
                      {student.status}
                    </Badge>
                    <Badge className={getAcademicStatusColor(student.academicStatus)}>
                      {student.academicStatus}
                    </Badge>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Phone className="w-4 h-4" />
                      <span>{formatPhone(student.phone)}</span>
                    </div>
                    {student.email && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Mail className="w-4 h-4" />
                        <span className="truncate">{student.email}</span>
                      </div>
                    )}
                  </div>

                  <div className="pt-3 border-t space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{t('students.attendance')}</span>
                      <span className="font-semibold">{student.attendance}%</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{t('students.gpa')}</span>
                      <span className="font-semibold">{student.gpa?.toFixed(1) || t('students.notAvailable')}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{t('students.balance')}</span>
                      <span className={`font-semibold ${student.balance < 0 ? 'text-red-500' : 'text-green-500'}`}>
                        {formatCurrency(student.balance)}
                      </span>
                    </div>
                  </div>

                  <Button 
                    variant="outline" 
                    className="w-full mt-4"
                    onClick={() => navigate(`/student/${student.id}`)}
                  >
                    {t('students.viewDetails')}
                  </Button>
                </div>
              </Card>
            ))}
          </div>

          {filteredStudents.length === 0 && !loading && (
            <Card className="p-12">
              <div className="text-center">
                <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">{t('students.noStudentsFound')}</p>
              </div>
            </Card>
          )}
          
          {/* Pagination Info & Controls */}
          {pagination.total > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6">
              <div className="text-sm text-muted-foreground">
                {t('common.showing')} {(page - 1) * limit + 1} {t('common.to')} {Math.min(page * limit, pagination.total)} {t('common.of')} {pagination.total} {t('common.results')}
              </div>
              
              {pagination.totalPages > 1 && (
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          if (page > 1) updateSearchParams({ page: page - 1 });
                        }}
                        disabled={page === 1}
                        className="gap-1"
                      >
                        <ChevronLeft className="h-4 w-4" />
                        <span className="sr-only">{t('common.previous')}</span>
                      </Button>
                    </PaginationItem>
                    
                    {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                      let pageNum: number;
                      if (pagination.totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (page <= 3) {
                        pageNum = i + 1;
                      } else if (page >= pagination.totalPages - 2) {
                        pageNum = pagination.totalPages - 4 + i;
                      } else {
                        pageNum = page - 2 + i;
                      }
                      
                      return (
                        <PaginationItem key={pageNum}>
                          <Button
                            variant={page === pageNum ? "outline" : "ghost"}
                            size="icon"
                            onClick={() => updateSearchParams({ page: pageNum })}
                            className={page === pageNum ? "font-semibold" : ""}
                          >
                            {pageNum}
                          </Button>
                        </PaginationItem>
                      );
                    })}
                    
                    {pagination.totalPages > 5 && page < pagination.totalPages - 2 && (
                      <PaginationItem>
                        <PaginationEllipsis />
                      </PaginationItem>
                    )}
                    
                    <PaginationItem>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          if (page < pagination.totalPages) updateSearchParams({ page: page + 1 });
                        }}
                        disabled={page === pagination.totalPages}
                        className="gap-1"
                      >
                        <span className="sr-only">{t('common.next')}</span>
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <AddStudentModal 
        open={isAddModalOpen} 
        onOpenChange={setIsAddModalOpen}
        onSuccess={handleFullRefresh}
      />
    </div>
  );
}