import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { format, addMonths } from 'date-fns';
// Импортируем локали для дат
import { ru, enUS, uz } from 'date-fns/locale';
import { Upload, X, Plus, Trash2, Loader2, CalendarIcon, Calculator, ArrowRight, Wallet } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { toast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { studentService, uploadService } from '@/services';
import { ApiClientError } from '@/lib/api-client';
import { useTheme } from '@/contexts/ThemeContext';
import { formatCurrency } from '@/lib/format';

interface Parent {
  name: string;
  email: string;
  phone: string;
  relationship: 'Mother' | 'Father' | 'Guardian';
}

interface AddStudentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function AddStudentModal({ open, onOpenChange, onSuccess }: AddStudentModalProps) {
  const { t, language } = useTheme(); // Получаем language из контекста

  // Определяем локаль для календаря и форматирования дат
  const dateLocale = language === 'ru' ? ru : language === 'uz' ? uz : enUS;

  // Basic Info
  const [name, setName] = useState('');
  const [surname, setSurname] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState<Date>();
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [idPassport, setIdPassport] = useState('');

  // Academic
  const [grade, setGrade] = useState('');
  const [className, setClassName] = useState('');
  const [enrollmentDate, setEnrollmentDate] = useState<Date>();
  const [notes, setNotes] = useState('');

  // Finance (New)
  const [contractAmount, setContractAmount] = useState('');
  const [contractPeriod, setContractPeriod] = useState('3');
  const [initialPay, setInitialPay] = useState('');
  const [startDate, setStartDate] = useState<Date>();

  // Parents & Files
  const [parents, setParents] = useState<Parent[]>([{
    name: '',
    email: '',
    phone: '',
    relationship: 'Mother'
  }]);
  const [documents, setDocuments] = useState<File[]>([]);
  const [photo, setPhoto] = useState<File | null>(null);

  const [loading, setLoading] = useState(false);

  // Авто-заполнение даты старта
  useEffect(() => {
    if (enrollmentDate && !startDate) {
      setStartDate(enrollmentDate);
    }
  }, [enrollmentDate]);

  // --- ЛОГИКА РАСЧЕТА СТАТИСТИКИ ---
  const calculateFinancePreview = () => {
    const amount = parseFloat(contractAmount) || 0;
    const pay = parseFloat(initialPay) || 0;
    const period = parseInt(contractPeriod) || 3;
    const start = startDate || new Date();

    const balance = pay - amount;
    const nextPayDate = addMonths(start, period);
    const status = balance < 0 ? 'debt' : 'active';

    return {
      amount,
      pay,
      balance,
      status,
      period,
      start,
      nextPayDate
    };
  };

  const financeStats = calculateFinancePreview();
  // ----------------------------------

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setPhoto(e.target.files[0]);
    }
  };

  const handleDocumentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setDocuments([...documents, ...newFiles]);
    }
  };

  const removeDocument = (index: number) => {
    setDocuments(documents.filter((_, i) => i !== index));
  };

  const addParent = () => {
    setParents([...parents, {
      name: '',
      email: '',
      phone: '',
      relationship: 'Mother'
    }]);
  };

  const removeParent = (index: number) => {
    if (parents.length > 1) {
      setParents(parents.filter((_, i) => i !== index));
    }
  };

  const updateParent = (index: number, field: keyof Parent, value: string) => {
    const updated = [...parents];
    updated[index] = { ...updated[index], [field]: value };
    setParents(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name || !surname || !dateOfBirth || !phone || !grade || !className || !enrollmentDate) {
      toast({
        title: t('common.error'),
        description: t('students.fillRequiredFields'),
        variant: "destructive",
      });
      return;
    }

    if (!contractAmount || !startDate) {
      toast({
        title: t('common.error'),
        description: t('students.fillFinanceData'), // Используем перевод
        variant: "destructive",
      });
      return;
    }

    const hasValidParent = parents.some(p => p.name && p.email && p.phone);
    if (!hasValidParent) {
      toast({
        title: t('common.error'),
        description: t('students.addParentRequired'),
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      let avatarUrl = '';

      if (photo && uploadService) {
        try {
          const uploadResult = await uploadService.uploadFile(photo);
          avatarUrl = uploadResult.url;
        } catch (e) {
          console.error("Upload failed", e);
        }
      }

      const formattedEnrollmentDate = format(enrollmentDate, 'yyyy-MM-dd');
      const formattedStartDate = format(startDate, 'yyyy-MM-dd');

      await studentService.createStudent({
        name,
        surname,
        grade: grade,
        className,
        dateOfBirth: format(dateOfBirth, 'yyyy-MM-dd'),
        phone,
        email,
        address,
        idPassport,
        enrollmentDate: formattedEnrollmentDate,

        // Финансовые поля
        contractAmount: parseFloat(contractAmount) || 0,
        contractPeriod: parseInt(contractPeriod) || 3,
        initialPay: parseFloat(initialPay) || 0,
        startDate: formattedStartDate,

        avatar: avatarUrl,
        parents: parents
          .filter(p => p.name && p.email && p.phone)
          .map(p => ({
            name: p.name,
            email: p.email,
            phone: p.phone,
            relationship: p.relationship,
          })),
      });

      toast({
        title: t('common.success'),
        description: t('students.studentAdded'),
      });

      resetForm();
      onOpenChange(false);

      if (onSuccess) onSuccess();
    } catch (error) {
      let errorMessage = t('students.addStudentFailed');
      if (error instanceof ApiClientError) {
        errorMessage = error.message;
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }

      toast({
        title: t('common.error'),
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setName('');
    setSurname('');
    setDateOfBirth(undefined);
    setPhone('');
    setEmail('');
    setAddress('');
    setIdPassport('');
    setGrade('');
    setClassName('');
    setEnrollmentDate(undefined);
    setContractAmount('');
    setInitialPay('');
    setContractPeriod('3');
    setStartDate(undefined);
    setNotes('');
    setParents([{ name: '', email: '', phone: '', relationship: 'Mother' }]);
    setDocuments([]);
    setPhoto(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('students.addNewStudent')}</DialogTitle>
          <DialogDescription>
            {t('students.addStudentDescription')}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          <Tabs defaultValue="personal" className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="personal">{t('students.tabs.personal')}</TabsTrigger>
              <TabsTrigger value="academic">{t('students.tabs.academic')}</TabsTrigger>
              {/* Используем перевод */}
              <TabsTrigger value="finance">{t('payments.title') || 'Finance'}</TabsTrigger>
              <TabsTrigger value="parents">{t('students.tabs.parents')}</TabsTrigger>
              <TabsTrigger value="documents">{t('students.tabs.documents')}</TabsTrigger>
            </TabsList>

            {/* Вкладка: Личные данные */}
            <TabsContent value="personal" className="space-y-4">
              <div className="space-y-2">
                <Label>{t('students.photo')}</Label>
                <div className="flex items-center gap-4">
                  {photo ? (
                    <div className="w-24 h-24 rounded-lg overflow-hidden bg-muted">
                      <img
                        src={URL.createObjectURL(photo)}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="w-24 h-24 rounded-lg bg-muted flex items-center justify-center">
                      <Upload className="w-8 h-8 text-muted-foreground" />
                    </div>
                  )}
                  <div>
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoChange}
                      className="hidden"
                      id="photo-upload"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => document.getElementById('photo-upload')?.click()}
                    >
                      {t('students.choosePhoto')}
                    </Button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">{t('students.firstName')} *</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={t('students.enterFirstName')}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="surname">{t('students.lastName')} *</Label>
                  <Input
                    id="surname"
                    value={surname}
                    onChange={(e) => setSurname(e.target.value)}
                    placeholder={t('students.enterLastName')}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t('students.dateOfBirth')} *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !dateOfBirth && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dateOfBirth ? format(dateOfBirth, "PPP", { locale: dateLocale }) : <span>{t('students.pickDate')}</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 border" align="start" side="bottom" sideOffset={4}>
                      <Calendar
                        mode="single"
                        selected={dateOfBirth}
                        onSelect={setDateOfBirth}
                        initialFocus
                        defaultMonth={dateOfBirth || new Date()}
                        captionLayout="dropdown"
                        fromYear={1990}
                        toYear={new Date().getFullYear()}
                        locale={dateLocale}
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="idPassport">{t('students.idPassport')}</Label>
                  <Input
                    id="idPassport"
                    value={idPassport}
                    onChange={(e) => setIdPassport(e.target.value)}
                    placeholder={t('students.enterIdPassport')}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">{t('students.phoneNumber')} *</Label>
                  <Input
                    id="phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder={t('students.phonePlaceholder')}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">{t('students.email')}</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t('students.emailPlaceholder')}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">{t('students.address')}</Label>
                <Textarea
                  id="address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder={t('students.enterAddress')}
                  rows={2}
                />
              </div>
            </TabsContent>

            {/* Вкладка: Учеба */}
            <TabsContent value="academic" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="grade">{t('students.gradeLabel')} *</Label>
                  <Select value={grade} onValueChange={setGrade}>
                    <SelectTrigger id="grade">
                      <SelectValue placeholder={t('students.selectGrade')} />
                    </SelectTrigger>
                    <SelectContent>
                      {[
                        "PN", "N", "R",
                        "Y1", "Y2", "Y3", "Y4", "Y5", "Y6",
                        "Y7", "Y8", "Y9", "Y10", "Y11", "Y12", "Y13"
                      ].map((g) => (
                        <SelectItem key={g} value={g}>
                          {g}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="className">{t('students.classSection')} *</Label>
                  <Input
                    id="className"
                    value={className}
                    onChange={(e) => setClassName(e.target.value)}
                    placeholder={t('students.classPlaceholder')}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t('students.enrollmentDate')} *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !enrollmentDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {enrollmentDate ? format(enrollmentDate, "PPP", { locale: dateLocale }) : <span>{t('students.pickDate')}</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 border" align="start" side="bottom" sideOffset={4}>
                      <Calendar
                        mode="single"
                        selected={enrollmentDate}
                        onSelect={setEnrollmentDate}
                        initialFocus
                        defaultMonth={enrollmentDate || new Date()}
                        captionLayout="dropdown"
                        fromYear={2020}
                        toYear={new Date().getFullYear()}
                        locale={dateLocale}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">{t('students.notes')}</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={t('students.notesPlaceholder')}
                  rows={4}
                />
              </div>
            </TabsContent>

            {/* Вкладка: Финансы (Переведено) */}
            <TabsContent value="finance" className="space-y-4">
              <div className="grid grid-cols-2 gap-6">
                {/* Левая колонка: Ввод данных */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="contractAmount">{t('students.contractAmount')} *</Label>
                    <div className="relative">
                      <Calculator className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="contractAmount"
                        type="number"
                        value={contractAmount}
                        onChange={(e) => setContractAmount(e.target.value)}
                        placeholder="15000000"
                        className="pl-9 text-lg font-medium"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="contractPeriod">{t('students.paymentPeriod')}</Label>
                    <Select value={contractPeriod} onValueChange={setContractPeriod}>
                      <SelectTrigger id="contractPeriod">
                        <SelectValue placeholder={t('students.selectPeriod')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">{t('students.periods.monthly')}</SelectItem>
                        <SelectItem value="3">{t('students.periods.quarterly')}</SelectItem>
                        <SelectItem value="6">{t('students.periods.halfYear')}</SelectItem>
                        <SelectItem value="9">{t('students.periods.academicYear')}</SelectItem>
                        <SelectItem value="12">{t('students.periods.yearly')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>{t('students.startDate')} *</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !startDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {startDate ? format(startDate, "PPP", { locale: dateLocale }) : <span>{t('students.pickDate')}</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 border" align="start" side="bottom" sideOffset={4}>
                        <Calendar
                          mode="single"
                          selected={startDate}
                          onSelect={setStartDate}
                          initialFocus
                          defaultMonth={startDate || new Date()}
                          locale={dateLocale}
                        />
                      </PopoverContent>
                    </Popover>
                    <p className="text-xs text-muted-foreground">
                      {t('students.startDateDescription')}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="initialPay">{t('students.initialPayment')}</Label>
                    <Input
                      id="initialPay"
                      type="number"
                      value={initialPay}
                      onChange={(e) => setInitialPay(e.target.value)}
                      placeholder="0"
                    />
                  </div>
                </div>

                {/* Правая колонка: Детальная статистика */}
                <Card className="p-5 bg-muted/40 border-dashed h-fit">
                  <h3 className="font-semibold text-sm uppercase text-muted-foreground mb-4 flex items-center gap-2">
                    <Wallet className="w-4 h-4" />
                    {t('students.financePreview')}
                  </h3>

                  <div className="space-y-4">
                    {/* Баланс */}
                    <div className="space-y-1">
                      <div className="text-sm text-muted-foreground">{t('students.balanceForecast')}</div>
                      <div className={cn(
                        "text-3xl font-bold tracking-tight",
                        financeStats.balance < 0 ? "text-red-600" : "text-green-600"
                      )}>
                        {formatCurrency(financeStats.balance)}
                      </div>
                      <div className={cn(
                        "text-xs font-medium inline-flex items-center px-2 py-0.5 rounded-full",
                        financeStats.status === 'debt' ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"
                      )}>
                        {financeStats.status === 'debt' ?
                          (language === 'en' ? 'DEBT' : language === 'uz' ? 'QARZ' : 'ДОЛГ') :
                          (language === 'en' ? 'ACTIVE' : language === 'uz' ? 'FAOL' : 'АКТИВЕН')}
                      </div>
                    </div>

                    <Separator />

                    {/* Период */}
                    <div className="grid grid-cols-1 gap-3 text-sm">
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">{t('students.currentPeriod')}:</span>
                        <div className="flex items-center gap-2 font-medium">
                          <span>{format(financeStats.start, 'dd.MM.yyyy')}</span>
                          <ArrowRight className="w-3 h-3 text-muted-foreground" />
                          <span>{format(financeStats.nextPayDate, 'dd.MM.yyyy')}</span>
                        </div>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">{t('students.nextPaymentDate')}:</span>
                        <span className="font-bold text-primary">
                          {format(financeStats.nextPayDate, 'dd MMMM yyyy', { locale: dateLocale })}
                        </span>
                      </div>

                      <div className="text-xs text-muted-foreground mt-2 bg-background p-2 rounded border">
                        ⚠️ {t('students.financeWarning', {
                          amount: formatCurrency(financeStats.amount),
                          date: format(financeStats.nextPayDate, 'dd.MM.yyyy')
                        })}
                      </div>
                    </div>
                  </div>
                </Card>
              </div>
            </TabsContent>

            {/* Вкладка: Родители */}
            <TabsContent value="parents" className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>{t('students.parentGuardian')} *</Label>
                <Button type="button" variant="outline" size="sm" onClick={addParent}>
                  <Plus className="w-4 h-4 mr-2" />
                  {t('students.addParent')}
                </Button>
              </div>

              {parents.map((parent, index) => (
                <Card key={index} className="p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold">{t('students.parentNumber', { number: index + 1 })}</h4>
                    {parents.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeParent(index)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>{t('students.fullName')}</Label>
                      <Input
                        value={parent.name}
                        onChange={(e) => updateParent(index, 'name', e.target.value)}
                        placeholder={t('students.enterFullName')}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>{t('students.relationship')}</Label>
                      <Select
                        value={parent.relationship}
                        onValueChange={(v) => updateParent(index, 'relationship', v)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Mother">{t('students.relationship.mother')}</SelectItem>
                          <SelectItem value="Father">{t('students.relationship.father')}</SelectItem>
                          <SelectItem value="Guardian">{t('students.relationship.guardian')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>{t('students.phone')}</Label>
                      <Input
                        value={parent.phone}
                        onChange={(e) => updateParent(index, 'phone', e.target.value)}
                        placeholder={t('students.phonePlaceholder')}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>{t('students.email')}</Label>
                      <Input
                        type="email"
                        value={parent.email}
                        onChange={(e) => updateParent(index, 'email', e.target.value)}
                        placeholder={t('students.emailPlaceholder')}
                      />
                    </div>
                  </div>
                </Card>
              ))}
            </TabsContent>

            {/* Вкладка: Документы */}
            <TabsContent value="documents" className="space-y-4">
              <div className="space-y-2">
                <Label>{t('students.attachDocuments')}</Label>
                <div className="border-2 border-dashed rounded-lg p-6 text-center">
                  <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground mb-2">
                    {t('students.uploadDocuments')}
                  </p>
                  <Input
                    type="file"
                    multiple
                    onChange={handleDocumentChange}
                    className="hidden"
                    id="document-upload"
                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => document.getElementById('document-upload')?.click()}
                  >
                    {t('students.chooseFiles')}
                  </Button>
                </div>

                {documents.length > 0 && (
                  <div className="space-y-2 mt-4">
                    <Label>{t('students.uploadedDocuments', { count: documents.length })}</Label>
                    {documents.map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 bg-muted rounded"
                      >
                        <span className="text-sm truncate flex-1">{file.name}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeDocument(index)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>

          <Separator />

          {/* Submit Buttons */}
          <div className="flex gap-3 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {loading ? t('students.adding') : t('students.addStudent')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}