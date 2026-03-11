import React, { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Calendar, Phone, Mail, Loader2, AlertCircle,
  Edit, MapPin, User, GraduationCap
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import { format, differenceInYears } from 'date-fns';

import { studentService } from '@/services/student.service';
import { localDB } from '@/lib/localDb';

// Твои импорты табов
import { PersonalInfoTab } from '@/components/student-profile/PersonalInfoTab';
import { ParentsTab } from '@/components/student-profile/ParentsTab';
import { PaymentsTab } from '@/components/student-profile/PaymentsTab';
import { AttendanceTab } from '@/components/student-profile/AttendanceTab';
import { ViolationsTab } from '@/components/student-profile/ViolationsTab';
import { DocumentsTab } from '@/components/student-profile/DocumentsTab';
import { GradesTab } from '@/components/student-profile/GradesTab';
import { ScheduleTab } from '@/components/student-profile/ScheduleTab';
import { ReportsTab } from '@/components/student-profile/ReportsTab';

export const StudentProfile: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  // Получаем реального студента с бэка
  const { data: dbStudent, isLoading } = useQuery({
    queryKey: ['student', id],
    queryFn: () => studentService.getStudent(id!),
    enabled: !!id,
  });

  const student = useMemo(() => {
    if (!dbStudent) return null;

    // Адаптируем данные с бэка под формат профиля
    return {
      ...dbStudent,
      full_name: `${dbStudent.name} ${dbStudent.surname}`.trim(),
      date_of_birth: dbStudent.dateOfBirth || new Date().toISOString(),
      enrollment_date: dbStudent.enrollmentDate || new Date().toISOString(),
      group: `${dbStudent.grade || ''} ${dbStudent.className || ''}`.trim(),
      
      // Вытягиваем нарушения и платежи из localDB, если нужно, или оставляем пустыми, 
      // чтобы сами табы их загружали по student.id
      violations: localDB.getViolations?.().filter((v: any) => v.studentId === dbStudent.id) || [],
      payments: [], // Платежи обычно подтягиваются внутри PaymentsTab
    };
  }, [dbStudent]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Загрузка профиля...</p>
        </div>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
          <AlertCircle className="w-8 h-8 text-muted-foreground" />
        </div>
        <h2 className="text-xl font-semibold mb-2">Ученик не найден</h2>
        <p className="text-sm text-muted-foreground mb-6 max-w-sm">Возможно, он был удален или переведен в другой филиал.</p>
        <Button onClick={() => navigate(-1)} variant="outline">Вернуться назад</Button>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-success text-white border-0';
      case 'suspended': return 'bg-destructive text-white border-0';
      case 'graduated': return 'bg-primary text-white border-0';
      case 'debt': return 'bg-warning text-white border-0';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active': return 'Активный';
      case 'suspended': return 'Отстранен';
      case 'graduated': return 'Выпускник';
      case 'debt': return 'Должник';
      default: return status;
    }
  };

  let age = 0;
  try {
    age = differenceInYears(new Date(), new Date(student.date_of_birth));
  } catch(e) {}

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      {/* Back Button & Actions */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="hover:bg-muted/50">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Назад к списку
        </Button>
        <div className="flex gap-2">
          {/* <Button variant="outline" size="sm" className="focus-visible:ring-primary/30">
            <Edit className="w-4 h-4 mr-2" />
            Редактировать
          </Button> */}
        </div>
      </div>

      {/* Header Profile Card */}
      <Card className="p-6 border-none shadow-md bg-card/50">
        <div className="flex flex-col md:flex-row gap-6 items-center md:items-start">
          <Avatar className="w-28 h-28 border-4 border-background shadow-sm shrink-0">
            <AvatarImage src={student.avatar} className="object-cover" />
            <AvatarFallback className="bg-gradient-to-br from-primary to-primary/60 text-primary-foreground text-3xl font-bold">
              {student.full_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 w-full text-center md:text-left space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-foreground">{student.full_name}</h1>
                <p className="text-sm font-medium text-muted-foreground mt-1">
                  Класс: {student.group || 'Не назначен'} • ID: <span className="font-mono">{student.id}</span>
                </p>
              </div>
              {/* <Badge className={`${getStatusColor(student.status)} text-xs px-3 py-1 shadow-sm`}>
                {getStatusLabel(student.status)}
              </Badge> */}
            </div>
            
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="flex items-center gap-3 p-3 bg-muted/40 rounded-xl border border-border/50">
                <div className="p-2 bg-background rounded-lg shrink-0">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Дата рождения</p>
                  <p className="font-medium text-sm truncate">{format(new Date(student.date_of_birth), 'dd.MM.yyyy')}</p>
                  <p className="text-[10px] text-muted-foreground">{age} лет</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-muted/40 rounded-xl border border-border/50">
                <div className="p-2 bg-background rounded-lg shrink-0">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Телефон</p>
                  <p className="font-medium text-sm truncate">{student.phone || 'Не указан'}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-muted/40 rounded-xl border border-border/50">
                <div className="p-2 bg-background rounded-lg shrink-0">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Email</p>
                  <p className="font-medium text-sm truncate">{student.email || 'Не указан'}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-muted/40 rounded-xl border border-border/50">
                <div className="p-2 bg-background rounded-lg shrink-0">
                  <GraduationCap className="w-4 h-4 text-muted-foreground" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Зачислен</p>
                  <p className="font-medium text-sm truncate">{format(new Date(student.enrollment_date), 'dd.MM.yyyy')}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="personal" className="w-full">
        <TabsList className="w-full flex flex-wrap h-auto gap-1.5 p-1.5 bg-muted/30 rounded-xl">
          <TabsTrigger value="personal" className="flex-1 min-w-[80px] text-xs rounded-lg data-[state=active]:shadow-sm">Личное</TabsTrigger>
          <TabsTrigger value="parents" className="flex-1 min-w-[80px] text-xs rounded-lg data-[state=active]:shadow-sm">Родители</TabsTrigger>
          {/* <TabsTrigger value="payments" className="flex-1 min-w-[80px] text-xs rounded-lg data-[state=active]:shadow-sm">Оплата</TabsTrigger> */}
          <TabsTrigger value="grades" className="flex-1 min-w-[80px] text-xs rounded-lg data-[state=active]:shadow-sm">Оценки</TabsTrigger>
          <TabsTrigger value="attendance" className="flex-1 min-w-[80px] text-xs rounded-lg data-[state=active]:shadow-sm">Посещаемость</TabsTrigger>
          <TabsTrigger value="schedule" className="flex-1 min-w-[80px] text-xs rounded-lg data-[state=active]:shadow-sm">Расписание</TabsTrigger>
          <TabsTrigger value="incidents" className="flex-1 min-w-[80px] text-xs rounded-lg data-[state=active]:shadow-sm">Нарушения</TabsTrigger>
          <TabsTrigger value="reports" className="flex-1 min-w-[80px] text-xs rounded-lg data-[state=active]:shadow-sm">Отчеты</TabsTrigger>
          {/* <TabsTrigger value="documents" className="flex-1 min-w-[80px] text-xs rounded-lg data-[state=active]:shadow-sm">Документы</TabsTrigger> */}
        </TabsList>

        <div className="mt-6">
          <TabsContent value="personal" className="outline-none">
            <PersonalInfoTab student={student} />
          </TabsContent>

          <TabsContent value="parents" className="outline-none">
            <ParentsTab parents={student.parents || []} />
          </TabsContent>

          {/* <TabsContent value="payments" className="outline-none">
            <PaymentsTab payments={student.payments || []} />
          </TabsContent> */}

          <TabsContent value="grades" className="outline-none">
            <GradesTab studentId={student.id} />
          </TabsContent>

          <TabsContent value="attendance" className="outline-none">
            <AttendanceTab studentId={student.id} />
          </TabsContent>

          <TabsContent value="schedule" className="outline-none">
            <ScheduleTab studentId={student.id} />
          </TabsContent>

          <TabsContent value="incidents" className="outline-none">
            <ViolationsTab violations={student.violations || []} />
          </TabsContent>

          <TabsContent value="reports" className="outline-none">
            <ReportsTab studentId={student.id} studentName={student.full_name} />
          </TabsContent>

          {/* <TabsContent value="documents" className="outline-none">
            <DocumentsTab documents={student.documents || []} />
          </TabsContent> */}
        </div>
      </Tabs>
    </div>
  );
};

export default StudentProfile;