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
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { formatCurrency } from '@/lib/format';
import type { Student } from '@/types/api.types';
import { financeService } from '@/services';
import type { Transaction } from '@/types/api.types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { studentService } from '@/services';
import { toast } from '@/hooks/use-toast';
import { useTheme } from '@/contexts/ThemeContext';
import { 
  Download, 
  Mail, 
  TrendingUp,
  Clock,
  DollarSign,
  FileText,
  Plus,
  Trash2,
  Loader2,
  Search,
  Phone,
  UserCheck,
  UserPlus
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import type { Parent } from '@/types/api.types';

interface StudentDetailModalProps {
  student: Student;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdateSuccess?: () => void;
}

interface ExtendedParent extends Parent {
  isExisting?: boolean;
}

export function StudentDetailModal({ 
  student, 
  open, 
  onOpenChange,
  onUpdateSuccess 
}: StudentDetailModalProps) {
  const { t } = useTheme();
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  
  // Данные студента
  const [editedStudent, setEditedStudent] = useState(student);
  const [editedParents, setEditedParents] = useState<ExtendedParent[]>([]);
  const [studentTransactions, setStudentTransactions] = useState<Transaction[]>([]);

  // Состояние поиска родителя
  const [searchPhone, setSearchPhone] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [foundParent, setFoundParent] = useState<ExtendedParent | null>(null);
  const [newParentMode, setNewParentMode] = useState(false);
  const [newParentData, setNewParentData] = useState({ name: '', email: '', relationship: 'Mother' });

  useEffect(() => {
    if (open && student?.id) {
      setLoadingData(true);
      studentService.getStudent(student.id)
        .then((freshStudent) => {
          const extendedStudent: Student = {
            ...freshStudent,
            totalPaid: freshStudent.totalPaid ?? 0,
            attendance: freshStudent.attendance ?? 0,
            gpa: freshStudent.gpa,
            documents: freshStudent.documents ?? [],
            notes: freshStudent.notes,
          };
          setEditedStudent(extendedStudent);
          
          const mappedParents = (freshStudent.parents || []).map(p => ({
              ...p,
              isExisting: true
          }));
          setEditedParents(mappedParents);
        })
        .catch((error) => {
          console.error('Failed to load student details:', error);
          toast({
            title: t('common.error'),
            description: t('errors.studentLoadFailed'),
            variant: "destructive",
          });
        })
        .finally(() => {
          setLoadingData(false);
        });
    }
  }, [open, student?.id, t]);

  useEffect(() => {
    if (open && editedStudent?.id) {
      setLoadingTransactions(true);
      financeService.listTransactions({ 
        student_id: editedStudent.id,
        page: 1,
        limit: 10 
      })
        .then((response) => {
          setStudentTransactions(response.data || []);
        })
        .catch((error) => {
          console.error('Failed to load student transactions:', error);
          setStudentTransactions([]);
        })
        .finally(() => {
          setLoadingTransactions(false);
        });
    }
  }, [open, editedStudent?.id]);

  // --- ЛОГИКА РОДИТЕЛЕЙ ---

  const handleSearchParent = async () => {
    if (searchPhone.length < 9) {
        toast({ title: t('common.error'), description: t('students.enterValidPhone'), variant: "destructive" });
        return;
    }
    setIsSearching(true);
    setFoundParent(null);
    setNewParentMode(false);
    try {
        const parent = await studentService.searchParent(searchPhone);
        setFoundParent({
            id: parent.id,
            name: parent.name,
            email: parent.email || '',
            phone: parent.phone,
            relationship: 'Mother',
            isExisting: true
        });
    } catch (e) {
        setNewParentMode(true);
    } finally {
        setIsSearching(false);
    }
  };

  const handleAddFoundParent = () => {
      if (!foundParent) return;
      setEditedParents([...editedParents, { ...foundParent, relationship: newParentData.relationship }]);
      setFoundParent(null);
      setSearchPhone('');
  };

  const handleAddNewParent = () => {
      if (!newParentData.name) return;
      setEditedParents([...editedParents, {
          name: newParentData.name,
          email: newParentData.email,
          phone: searchPhone,
          relationship: newParentData.relationship,
          isExisting: false
      }]);
      setNewParentMode(false);
      setSearchPhone('');
      setNewParentData({ name: '', email: '', relationship: 'Mother' });
  };

  const removeParent = (index: number) => {
    setEditedParents(editedParents.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const parentsPayload = editedParents.map(p => ({
          id: p.id,
          name: p.name,
          email: p.email,
          phone: p.phone,
          relationship: p.relationship
        }));

      await studentService.updateStudent(editedStudent.id, {
        ...editedStudent,
        parents: parentsPayload, 
      });

      toast({
        title: t('common.success'),
        description: t('students.updateSuccess'),
      });

      if (onUpdateSuccess) onUpdateSuccess();
      onOpenChange(false);
    } catch (error) {
      toast({
        title: t('common.error'),
        description: t('students.updateFailed'),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
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

  const recentPayments = studentTransactions.slice(0, 5);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
            <DialogTitle>{t('students.profile')}</DialogTitle>
            <DialogDescription>{t('students.profileDescription')}</DialogDescription>
        </DialogHeader>

        {loadingData ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
        <div className="space-y-6 mt-4">
          {/* Header Section */}
          <Card className="p-6">
            <div className="flex items-start gap-6">
              <Avatar className="w-24 h-24">
                <AvatarImage src={editedStudent.avatar} />
                <AvatarFallback className="text-2xl">
                  {editedStudent.name[0]}{editedStudent.surname[0]}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-2xl font-bold">
                      {editedStudent.name} {editedStudent.surname}
                    </h2>
                    <p className="text-muted-foreground mt-1">
                      {editedStudent.className} • {t('students.gradeLabel')} {editedStudent.grade} • ID: {editedStudent.id}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Select
                      value={editedStudent.status}
                      onValueChange={(value) => setEditedStudent({...editedStudent, status: value as any})}
                    >
                      <SelectTrigger className="w-[140px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">{t('students.status.active')}</SelectItem>
                        <SelectItem value="graduated">{t('students.status.graduated')}</SelectItem>
                        <SelectItem value="suspended">{t('students.status.suspended')}</SelectItem>
                        <SelectItem value="debt">{t('students.status.debt')}</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select
                      value={editedStudent.academicStatus}
                      onValueChange={(value) => setEditedStudent({...editedStudent, academicStatus: value as any})}
                    >
                      <SelectTrigger className="w-[180px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="excellent">{t('students.academic.excellent')}</SelectItem>
                        <SelectItem value="good">{t('students.academic.good')}</SelectItem>
                        <SelectItem value="average">{t('students.academic.average')}</SelectItem>
                        <SelectItem value="needs-improvement">{t('students.academic.needsImprovement')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 mt-6">
                  <Card className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <TrendingUp className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">{t('students.gpa')}</p>
                        <p className="text-xl font-bold">{editedStudent.gpa?.toFixed(2) || t('students.notAvailable')}</p>
                      </div>
                    </div>
                  </Card>

                  <Card className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Clock className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">{t('students.attendance')}</p>
                        <p className="text-xl font-bold">{editedStudent.attendance}%</p>
                      </div>
                    </div>
                  </Card>

                  <Card className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <DollarSign className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">{t('students.balance')}</p>
                        <p className={`text-xl font-bold ${editedStudent.balance < 0 ? 'text-red-500' : 'text-green-500'}`}>
                          {formatCurrency(editedStudent.balance)}
                        </p>
                      </div>
                    </div>
                  </Card>
                </div>
              </div>
            </div>
          </Card>

          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="overview">{t('students.tabs.overview')}</TabsTrigger>
              <TabsTrigger value="academic">{t('students.tabs.academic')}</TabsTrigger>
              <TabsTrigger value="payments">{t('students.tabs.payments')}</TabsTrigger>
              <TabsTrigger value="parents">{t('students.tabs.parents')} ({editedParents.length})</TabsTrigger>
              <TabsTrigger value="documents">{t('students.tabs.documents')}</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              <Card className="p-6">
                <h3 className="font-semibold text-lg mb-4">{t('students.personalInformation')}</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t('students.firstName')}</Label>
                    <Input value={editedStudent.name} onChange={(e) => setEditedStudent({...editedStudent, name: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label>{t('students.lastName')}</Label>
                    <Input value={editedStudent.surname} onChange={(e) => setEditedStudent({...editedStudent, surname: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label>{t('students.phone')}</Label>
                    <Input value={editedStudent.phone} onChange={(e) => setEditedStudent({...editedStudent, phone: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label>{t('students.email')}</Label>
                    <Input type="email" value={editedStudent.email || ''} onChange={(e) => setEditedStudent({...editedStudent, email: e.target.value})} />
                  </div>
                  <div className="space-y-2 col-span-2">
                    <Label>{t('students.address')}</Label>
                    <Input value={editedStudent.address || ''} onChange={(e) => setEditedStudent({...editedStudent, address: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label>{t('students.dateOfBirth')}</Label>
                    <Input type="date" value={editedStudent.dateOfBirth} onChange={(e) => setEditedStudent({...editedStudent, dateOfBirth: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label>{t('students.idPassport')}</Label>
                    <Input value={editedStudent.idPassport || ''} onChange={(e) => setEditedStudent({...editedStudent, idPassport: e.target.value})} />
                  </div>
                </div>
              </Card>
              <Card className="p-6">
                <h3 className="font-semibold text-lg mb-2">{t('students.notes')}</h3>
                <Textarea value={editedStudent.notes || ''} onChange={(e) => setEditedStudent({...editedStudent, notes: e.target.value})} rows={4} />
              </Card>
            </TabsContent>

            <TabsContent value="academic" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Card className="p-6">
                  <h3 className="font-semibold text-lg mb-4">{t('students.performanceMetrics')}</h3>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between mb-2">
                        <span className="text-sm">{t('students.gpa')}</span>
                        <span className="font-semibold">{editedStudent.gpa?.toFixed(2)}/5.0</span>
                      </div>
                      <Progress value={(editedStudent.gpa || 0) * 20} />
                    </div>
                    <div>
                      <div className="flex justify-between mb-2">
                        <span className="text-sm">{t('students.attendance')}</span>
                        <span className="font-semibold">{editedStudent.attendance}%</span>
                      </div>
                      <Progress value={editedStudent.attendance} />
                    </div>
                  </div>
                </Card>
                <Card className="p-6">
                  <h3 className="font-semibold text-lg mb-4">{t('students.academicDetails')}</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between"><span className="text-muted-foreground">{t('students.class')}</span><span className="font-semibold">{editedStudent.grade} "{editedStudent.className}"</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">{t('students.enrollmentDate')}</span><span className="font-semibold">{editedStudent.enrollmentDate}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">{t('students.status')}</span><Badge className={getAcademicStatusColor(editedStudent.academicStatus)}>{editedStudent.academicStatus}</Badge></div>
                  </div>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="payments" className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <Card className="p-4"><p className="text-sm text-muted-foreground">{t('students.paid')}</p><p className="text-2xl font-bold text-green-500">{formatCurrency(editedStudent.totalPaid)}</p></Card>
                <Card className="p-4"><p className="text-sm text-muted-foreground">{t('students.toPay')}</p><p className="text-2xl font-bold text-red-500">{formatCurrency(editedStudent.totalOwed)}</p></Card>
                <Card className="p-4"><p className="text-sm text-muted-foreground">{t('students.balance')}</p><p className={`text-2xl font-bold ${editedStudent.balance < 0 ? 'text-red-500' : 'text-green-500'}`}>{formatCurrency(editedStudent.balance)}</p></Card>
              </div>
              <Card className="p-6">
                <h3 className="font-semibold text-lg mb-4">{t('students.paymentHistory')}</h3>
                {loadingTransactions ? <Loader2 className="animate-spin mx-auto" /> : (
                  <div className="space-y-3">
                    {recentPayments.map((payment) => (
                      <div key={payment.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                        <div><p className="font-medium text-sm">{payment.purpose}</p><p className="text-xs text-muted-foreground">{new Date(payment.date).toLocaleDateString()}</p></div>
                        <div className="text-right"><p className="font-semibold text-sm">{formatCurrency(payment.amount)}</p><Badge variant="outline">{payment.status}</Badge></div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </TabsContent>

            {/* Вкладка Родители */}
            <TabsContent value="parents" className="space-y-6">
              {/* Список текущих родителей */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {editedParents.map((p, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-card border rounded-lg shadow-sm group">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10 bg-primary/10 text-primary border border-primary/20">
                        <AvatarFallback>{p.name[0]}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-sm leading-none mb-1">{p.name}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Badge variant="secondary" className="h-5 px-1.5 font-normal text-[10px]">{t(`students.relationship.${p.relationship.toLowerCase()}`) || p.relationship}</Badge>
                          <span>{p.phone}</span>
                        </div>
                      </div>
                    </div>
                    <Button type="button" variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive transition-opacity" onClick={() => removeParent(idx)}>
                      <Trash2 className="w-4 h-4"/>
                    </Button>
                  </div>
                ))}
              </div>

              {/* Поиск и добавление */}
              <div className="space-y-3">
                <Label>{t('students.linkParent')}</Label>
                <Card className="p-4 bg-muted/30 border-muted">
                  <div className="flex gap-3 mb-4">
                    <div className="relative flex-1">
                      <Phone className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground"/>
                      <Input 
                        className="pl-9" 
                        placeholder="+998..." 
                        value={searchPhone} 
                        onChange={e => setSearchPhone(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleSearchParent())} 
                      />
                    </div>
                    <Button type="button" onClick={handleSearchParent} disabled={isSearching || !searchPhone}>
                      {isSearching ? <Loader2 className="animate-spin w-4 h-4"/> : <Search className="w-4 h-4 mr-2"/>} {t('students.find')}
                    </Button>
                  </div>

                  {foundParent && (
                    <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-900 rounded-lg p-4 animate-in zoom-in-95 flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-700"><UserCheck className="w-5 h-5"/></div>
                        <div>
                          <p className="font-bold text-green-900 dark:text-green-300">{foundParent.name}</p>
                          <p className="text-xs text-green-700 dark:text-green-400">{foundParent.phone}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Select value={newParentData.relationship} onValueChange={v => setNewParentData({...newParentData, relationship: v})}>
                          <SelectTrigger className="w-[120px] bg-white"><SelectValue/></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Mother">{t('students.relationship.mother')}</SelectItem>
                            <SelectItem value="Father">{t('students.relationship.father')}</SelectItem>
                            <SelectItem value="Guardian">{t('students.relationship.guardian')}</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={handleAddFoundParent}><Plus className="w-4 h-4 mr-1"/> {t('students.link')}</Button>
                      </div>
                    </div>
                  )}

                  {newParentMode && (
                    <div className="bg-background rounded-lg border p-4 shadow-sm animate-in fade-in slide-in-from-top-2 space-y-3">
                      <div className="flex items-center gap-2 text-sm font-medium text-orange-600"><UserPlus className="w-4 h-4"/> {t('students.newProfile')}:</div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1"><Label>{t('students.fullName')}</Label><Input value={newParentData.name} onChange={e => setNewParentData({...newParentData, name: e.target.value})} placeholder={t('students.fullNamePlaceholder')}/></div>
                        <div className="space-y-1"><Label>{t('students.relationship')}</Label>
                          <Select value={newParentData.relationship} onValueChange={v => setNewParentData({...newParentData, relationship: v})}>
                            <SelectTrigger><SelectValue/></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Mother">{t('students.relationship.mother')}</SelectItem>
                              <SelectItem value="Father">{t('students.relationship.father')}</SelectItem>
                              <SelectItem value="Guardian">{t('students.relationship.guardian')}</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1 col-span-2"><Label>{t('students.email')}</Label><Input value={newParentData.email} onChange={e => setNewParentData({...newParentData, email: e.target.value})} placeholder={t('students.emailPlaceholder')}/></div>
                      </div>
                      <Button type="button" className="w-full" onClick={handleAddNewParent}>{t('students.createAndLink')}</Button>
                    </div>
                  )}
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="documents" className="space-y-4">
              <Card className="p-6">
                <h3 className="font-semibold text-lg mb-4">{t('students.attachedDocuments')}</h3>
                <div className="space-y-2">
                  {editedStudent.documents?.map((doc, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <div className="flex items-center gap-3"><FileText className="w-5 h-5 text-muted-foreground" /><span>{doc}</span></div>
                      <Button variant="ghost" size="sm"><Download className="w-4 h-4" /></Button>
                    </div>
                  ))}
                </div>
              </Card>
            </TabsContent>
          </Tabs>

          <Separator />
          <div className="flex gap-3 justify-end pb-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>{t('common.close')}</Button>
            <Button onClick={handleSave} disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} {t('common.save')}
            </Button>
          </div>
        </div>
        )}
      </DialogContent>
    </Dialog>
  );
}