import { useState, useMemo } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { format } from 'date-fns';
import { Upload, X, CalendarIcon, Check, ChevronsUpDown, Plus, Calculator, Wallet, ArrowRight } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { financeService, uploadService } from '@/services';
import { useTheme } from '@/contexts/ThemeContext';

interface AddExpenseModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

// Список предустановленных категорий
const PRESET_CATEGORIES = [
  "Office", "Pre-school Salary FS", "Pre-school bonus FS", "Primary Salary FS", 
  "Primary bonus FS", "Secondary Salary FS", "Secondary bonus FS", "Зарплата мест. учит",
  "Зарплата администрация", "Зарплата тех. Персонал", "Отпускные", "НДФЛ",
  "Социальный налог", "ИНПС", "НДС", "Налог на прибыль иностр.юр.лиц",
  "Прочие налоги", "Аренда квартир иност.", "Электроэнергия", "Газ",
  "Вода", "Мусор", "Интернет", "Услуги телефонии", "Услуги почты",
  "Бензин", "Обслуживание зданий", "Мебель", "Шкаф", "Парта",
  "Стол-стул", "Пуфик", "Компьютер", "Принтер", "Камера",
  "Стабилизатор", "Проектор", "коммутатор", "Видео регистратор",
  "Зарядное устройство Apple", "Интерактивный сенсорный дисплей",
  "Сенсорная интрактивная доска", "Сенсорная панель", "Сортировщик банкнот",
  "Утюг", "Мобильная рация", "Прочие инвент.", "Канцтовары",
  "Хозяйственные товары", "Книги", "Школьные тетради", "Спорт инвентары",
  "Музыкальные инструменты", "Игрушки", "Ковры", "Медицинские принадлежности",
  "Химические приборы", "Школьные экскурсии", "Программное обеспечение",
  "Таможенные услуги", "Обслуживание сайта школы", "Консалтинговые услуги",
  "аудиторские услуги", "Подбор персонала", "Импорт услуги", "Рекламные услуги",
  "Услуги по проведению экзаменов", "Онлайн подписки", "Онлайн тестирование",
  "Аккредитация CIS", "Дизайн проектов", "Услуга по повышение квалификации персонала",
  "Плата лицензии иност.", "Премии и подарки", "Расходы на мероприятия",
  "Вода в бутылях", "Тех. персонал", "Спец одежда", "Питание (тех. персонала)",
  "Комиссия банка", "Эхсон"
];

export function AddExpenseModal({ open, onOpenChange, onSuccess }: AddExpenseModalProps) {
  const { t } = useTheme();
  const [loading, setLoading] = useState(false);
  const [openCombobox, setOpenCombobox] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  
  const [category, setCategory] = useState('');
  const [payee, setPayee] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [date, setDate] = useState<Date>();
  const [description, setDescription] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);

  // Логика фильтрации списка категорий
  const filteredCategories = useMemo(() => {
    return PRESET_CATEGORIES.filter(cat => 
      cat.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery]);

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value;
    const rawValue = value.replace(/\s/g, '');
    if (!/^\d*\.?\d*$/.test(rawValue)) return;
    const formattedValue = rawValue.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
    setAmount(formattedValue);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setAttachments([...attachments, ...newFiles]);
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!category || !payee || !amount || !paymentMethod || !date) {
      toast({
        title: t('common.error'),
        description: t('errors.allFieldsRequired'),
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);
      const receiptUrls: string[] = [];
      if (attachments.length > 0) {
        for (const file of attachments) {
          const uploadResult = await uploadService.uploadFile(file);
          receiptUrls.push(uploadResult.url);
        }
      }

      const cleanAmount = parseFloat(amount.replace(/\s/g, ''));

      await financeService.createExpense({
        category: category as any,
        amount: cleanAmount,
        payee,
        paymentMethod: paymentMethod as any,
        date: format(date, 'yyyy-MM-dd'),
        description,
        attachments: receiptUrls.length > 0 ? receiptUrls : undefined,
      });

      toast({
        title: t('common.success'),
        description: t('expenses.expenseAdded'),
      });

      resetForm();
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      toast({
        title: t('common.error'),
        description: t('errors.expenseCreateFailed'),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setCategory('');
    setPayee('');
    setAmount('');
    setPaymentMethod('');
    setDate(undefined);
    setDescription('');
    setAttachments([]);
    setSearchQuery("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Expense</DialogTitle>
          <DialogDescription>
            Enter the details of the expense and attach receipts or invoices
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          {/* Категория с поиском и возможностью добавления своей */}
          <div className="space-y-2 flex flex-col">
            <Label htmlFor="category">Category *</Label>
            <Popover open={openCombobox} onOpenChange={setOpenCombobox}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={openCombobox}
                  className="w-full justify-between font-normal"
                >
                  {category ? category : "Select or type a category..."}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                <Command>
                  <CommandInput 
                    placeholder="Search category..." 
                    value={searchQuery}
                    onValueChange={setSearchQuery}
                  />
                  <CommandList>
                    <CommandEmpty className="p-0">
                      {searchQuery && (
                        <div className="p-1">
                          <Button
                            type="button"
                            variant="ghost"
                            className="w-full justify-start text-primary hover:text-primary hover:bg-primary/10"
                            onClick={() => {
                              setCategory(searchQuery);
                              setOpenCombobox(false);
                              setSearchQuery("");
                            }}
                          >
                            <Plus className="mr-2 h-4 w-4" />
                            Add "{searchQuery}"
                          </Button>
                        </div>
                      )}
                    </CommandEmpty>
                    <CommandGroup>
                      {filteredCategories.map((cat) => (
                        <CommandItem
                          key={cat}
                          value={cat}
                          onSelect={(currentValue) => {
                            setCategory(currentValue);
                            setOpenCombobox(false);
                            setSearchQuery("");
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              category === cat ? "opacity-100" : "opacity-0"
                            )}
                          />
                          {cat}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* Payee */}
          <div className="space-y-2">
            <Label htmlFor="payee">Payee / Vendor *</Label>
            <Input
              id="payee"
              placeholder="Enter payee name"
              value={payee}
              onChange={(e) => setPayee(e.target.value)}
            />
          </div>

          {/* Amount */}
          <div className="space-y-2">
            <Label htmlFor="amount">Amount (UZS) *</Label>
            <div className="relative">
              <Calculator className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                id="amount"
                type="text"
                placeholder="1 500 000"
                value={amount}
                onChange={handleAmountChange}
                autoComplete="off"
                className="pl-9"
              />
            </div>
          </div>

          {/* Способ оплаты и Дата */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="payment-method">Payment Method *</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger id="payment-method">
                  <SelectValue placeholder="Select method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Cash">Cash</SelectItem>
                  <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                  <SelectItem value="Card">Card</SelectItem>
                  <SelectItem value="Check">Check</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Expense Date *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 border" align="start">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                    initialFocus
                    fromYear={2020}
                    toYear={new Date().getFullYear()}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Описание */}
          <div className="space-y-2">
            <Label htmlFor="description">Description / Notes</Label>
            <Textarea
              id="description"
              placeholder="Enter details..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          {/* Вложения */}
          <div className="space-y-2">
            <Label>Receipts / Invoices</Label>
            <div className="border-2 border-dashed rounded-lg p-6 text-center">
              <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground mb-2">
                Click to browse files
              </p>
              <Input
                type="file"
                multiple
                onChange={handleFileChange}
                className="hidden"
                id="file-upload"
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => document.getElementById('file-upload')?.click()}
              >
                Choose Files
              </Button>
            </div>
            {attachments.length > 0 && (
              <div className="space-y-2 mt-4">
                {attachments.map((file, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-muted rounded">
                    <span className="text-sm truncate flex-1">{file.name}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeAttachment(index)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Кнопки управления */}
          <div className="flex gap-3 justify-end pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Adding...' : 'Add Expense'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}