import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
} from '@/components/ui/command';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { financeService, studentService } from '@/services';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { CalendarIcon, Check, ChevronsUpDown } from 'lucide-react';

interface ManualPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const ManualPaymentModal: React.FC<ManualPaymentModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [students, setStudents] = useState<any[]>([]);
  
  // States for form
  const [studentId, setStudentId] = useState('');
  const [amount, setAmount] = useState(''); // Храним как строку с пробелами
  const [purpose, setPurpose] = useState('');
  const [paymentSource, setPaymentSource] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [date, setDate] = useState<Date>(new Date());
  const [notes, setNotes] = useState('');
  
  // State for Combobox (Search)
  const [openStudentSelect, setOpenStudentSelect] = useState(false);
  
  const { toast } = useToast();

  // Load students when modal opens
  React.useEffect(() => {
    if (isOpen) {
      loadStudents();
    }
  }, [isOpen]);

  const loadStudents = async () => {
    try {
      const response: any = await studentService.listStudents({ page: 1, limit: 1000 });
      setStudents(response.students || response.data || []);
    } catch (error) {
      console.error("Failed to load students", error);
    }
  };

  // --- ЛОГИКА ФОРМАТИРОВАНИЯ СУММЫ ---
  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value;

    // 1. Удаляем все пробелы, чтобы получить "чистое" число
    const rawValue = value.replace(/\s/g, '');

    // 2. Проверяем, что введено число (разрешаем цифры и одну точку)
    if (!/^\d*\.?\d*$/.test(rawValue)) return;

    // 3. Форматируем: добавляем пробел каждые 3 цифры
    // Регулярное выражение ищет границы разрядов
    const formattedValue = rawValue.replace(/\B(?=(\d{3})+(?!\d))/g, " ");

    setAmount(formattedValue);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!studentId || !amount || !purpose || !paymentSource || !paymentMethod) {
      toast({
        title: "Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);
      
      // --- ОЧИСТКА СУММЫ ПЕРЕД ОТПРАВКОЙ ---
      // Удаляем пробелы перед конвертацией в число
      const cleanAmount = parseFloat(amount.replace(/\s/g, ''));

      await financeService.createTransaction({
        student_id: studentId,
        amount: cleanAmount, 
        purpose,
        payment_source: paymentSource,
        payment_method: paymentMethod,
        date: format(date, 'yyyy-MM-dd'),
        notes,
      });

      toast({
        title: "Payment Added",
        description: "Manual payment entry has been successfully recorded.",
      });

      // Reset form
      setStudentId('');
      setAmount('');
      setPurpose('');
      setPaymentSource('');
      setPaymentMethod('');
      setDate(new Date());
      setNotes('');
      onClose();
      onSuccess?.();
    } catch (error) {
      console.error('[ManualPaymentModal] Error creating transaction:', error);
      let errorMessage = "Failed to create transaction";
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>Add Manual Payment</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Student *</Label>
              <Popover open={openStudentSelect} onOpenChange={setOpenStudentSelect}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={openStudentSelect}
                    className="w-full justify-between font-normal"
                  >
                    {studentId
                      ? (() => {
                          const selected = students.find((s) => s.id === studentId);
                          return selected ? `${selected.name} ${selected.surname}` : "Select student";
                        })()
                      : "Select student..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[350px] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search student by name..." />
                    <CommandList>
                      <CommandEmpty>No student found.</CommandEmpty>
                      <CommandGroup>
                        {students.map((student) => (
                          <CommandItem
                            key={student.id}
                            value={`${student.name} ${student.surname}`} 
                            onSelect={() => {
                              setStudentId(student.id);
                              setOpenStudentSelect(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                studentId === student.id ? "opacity-100" : "opacity-0"
                              )}
                            />
                            {student.name} {student.surname} <span className="text-muted-foreground ml-1 text-xs">(Gr. {student.grade})</span>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {/* --- Amount Field (UPDATED) --- */}
            <div className="space-y-2">
              <Label htmlFor="amount">Amount (UZS) *</Label>
              <Input
                id="amount"
                type="text" // ВАЖНО: тип text, чтобы работали пробелы
                placeholder="1 500 000"
                value={amount}
                onChange={handleAmountChange} // ВАЖНО: Новый обработчик
                autoComplete="off"
              />
            </div>

            {/* Payment Source */}
            <div className="space-y-2">
              <Label htmlFor="source">Payment Source *</Label>
              <Select value={paymentSource} onValueChange={setPaymentSource}>
                <SelectTrigger>
                  <SelectValue placeholder="Select source" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Payme">Payme</SelectItem>
                  <SelectItem value="Uzum Bank">Uzum Bank</SelectItem>
                  <SelectItem value="Company Transfer">Company Transfer</SelectItem>
                  <SelectItem value="Cash">Cash</SelectItem>
                  <SelectItem value="Manual">Manual Entry</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Payment Method */}
            <div className="space-y-2">
              <Label htmlFor="method">Payment Method *</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger>
                  <SelectValue placeholder="Select method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                  <SelectItem value="Card">Card</SelectItem>
                  <SelectItem value="E-wallet">E-wallet</SelectItem>
                  <SelectItem value="Cash">Cash</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Date */}
            <div className="space-y-2">
              <Label>Payment Date *</Label>
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
                <PopoverContent className="w-auto p-0 border" align="start" side="bottom" sideOffset={4}>
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={(newDate) => newDate && setDate(newDate)}
                    initialFocus
                    defaultMonth={date || new Date()}
                    captionLayout="dropdown"
                    fromYear={2020}
                    toYear={new Date().getFullYear()}
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Purpose */}
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="purpose">Purpose *</Label>
              <Input
                id="purpose"
                placeholder="e.g., Monthly Tuition - November"
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
              />
            </div>

            {/* Notes */}
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="notes">Additional Notes</Label>
              <Textarea
                id="notes"
                placeholder="Add any additional information or reference numbers..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 justify-end pt-4 border-t border-border">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="wist" disabled={loading}>
              {loading ? 'Adding...' : 'Add Payment'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ManualPaymentModal;