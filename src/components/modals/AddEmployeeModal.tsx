import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { employeeService } from '@/services';
import { ApiClientError } from '@/lib/api-client';
import { toast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';

interface AddEmployeeModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const AddEmployeeModal: React.FC<AddEmployeeModalProps> = ({ open, onClose, onSuccess }) => {
  const { t } = useTheme();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    password: '',
    role: 'Admin',
    salary: '',
    payment_schedule: 'monthly',
    status: 'active',
    telegram_chat_id: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.full_name.trim()) {
      newErrors.full_name = t('employees.fullNameRequired');
    }

    if (!formData.email.trim()) {
      newErrors.email = t('employees.emailRequired');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = t('errors.invalidEmailFormat');
    }

    if (formData.phone && !/^\+?[0-9]{10,15}$/.test(formData.phone.replace(/\s/g, ''))) {
      newErrors.phone = t('employees.invalidPhoneFormat');
    }

    if (!formData.password || formData.password.length < 6) {
      newErrors.password = t('employees.passwordMinLength');
    }

    if (formData.salary && parseFloat(formData.salary) < 0) {
      newErrors.salary = t('employees.salaryNonNegative');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast({
        title: t('employees.validationError'),
        description: t('employees.fixFormErrors'),
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      // Create employee using backend API
      await employeeService.createEmployee({
        fullName: formData.full_name,
        email: formData.email,
        password: formData.password,
        role: formData.role,
        phone: formData.phone,
        salary: formData.salary ? parseFloat(formData.salary) : 0,
        // API expects English values
        paymentSchedule: formData.payment_schedule === 'monthly' ? 'Monthly' : 
                        formData.payment_schedule === 'weekly' ? 'Weekly' : 'Bi-weekly',
        status: formData.status === 'active' ? 'Active' : 
                formData.status === 'inactive' ? 'Inactive' : 'Active',
        telegramChatId: formData.telegram_chat_id.trim() || undefined,
      });

      toast({
        title: t('common.success'),
        description: t('employees.employeeCreated'),
      });

      // Reset form
      setFormData({
        full_name: '',
        email: '',
        phone: '',
        password: '',
        role: 'Admin',
        salary: '',
        payment_schedule: 'monthly',
        status: 'active',
        telegram_chat_id: '',
      });

      onSuccess();
      onClose();
    } catch (error: any) {
      
      let errorMessage = t('employees.addEmployeeFailed');
      if (error instanceof ApiClientError) {
        errorMessage = error.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: t('employees.error'),
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('employees.addNewEmployee')}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="full_name">{t('employees.fullNameLabel')} *</Label>
              <Input
                id="full_name"
                value={formData.full_name}
                onChange={(e) => {
                  setFormData({ ...formData, full_name: e.target.value });
                  if (errors.full_name) setErrors({ ...errors, full_name: '' });
                }}
                className={errors.full_name ? 'border-red-500' : ''}
                required
              />
              {errors.full_name && (
                <p className="text-sm text-red-500">{errors.full_name}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">{t('employees.emailLabel')} *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => {
                  setFormData({ ...formData, email: e.target.value });
                  if (errors.email) setErrors({ ...errors, email: '' });
                }}
                className={errors.email ? 'border-red-500' : ''}
                required
              />
              {errors.email && (
                <p className="text-sm text-red-500">{errors.email}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">{t('employees.phoneLabel')}</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => {
                  setFormData({ ...formData, phone: e.target.value });
                  if (errors.phone) setErrors({ ...errors, phone: '' });
                }}
                className={errors.phone ? 'border-red-500' : ''}
                placeholder={t('employees.phonePlaceholder')}
              />
              {errors.phone && (
                <p className="text-sm text-red-500">{errors.phone}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">{t('employees.passwordLabel')} *</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => {
                  setFormData({ ...formData, password: e.target.value });
                  if (errors.password) setErrors({ ...errors, password: '' });
                }}
                className={errors.password ? 'border-red-500' : ''}
                required
                minLength={6}
              />
              {errors.password && (
                <p className="text-sm text-red-500">{errors.password}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">{t('employees.roleLabel')} *</Label>
              <Select
                value={formData.role}
                onValueChange={(value: any) => setFormData({ ...formData, role: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('employees.selectRole')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CEO">{t('employees.roles.ceo')}</SelectItem>
                  <SelectItem value="Admin">{t('employees.roles.admin')}</SelectItem>
                  <SelectItem value="Accountant">{t('employees.roles.accountant')}</SelectItem>
                  <SelectItem value="Teacher">{t('employees.roles.teacher')}</SelectItem>
                  <SelectItem value="Support">{t('employees.roles.support')}</SelectItem>
                  <SelectItem value="Manager">{t('employees.roles.manager')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="salary">{t('employees.salaryLabel')}</Label>
              <Input
                id="salary"
                type="number"
                step="0.01"
                min="0"
                value={formData.salary}
                onChange={(e) => {
                  setFormData({ ...formData, salary: e.target.value });
                  if (errors.salary) setErrors({ ...errors, salary: '' });
                }}
                className={errors.salary ? 'border-red-500' : ''}
              />
              {errors.salary && (
                <p className="text-sm text-red-500">{errors.salary}</p>
              )}
            </div>

            <div className="space-y-2 col-span-2">
              <Label htmlFor="payment_schedule">{t('employees.paymentScheduleLabel')}</Label>
              <Select
                value={formData.payment_schedule}
                onValueChange={(value) => setFormData({ ...formData, payment_schedule: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('employees.selectSchedule')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">{t('employees.paymentSchedule.weekly')}</SelectItem>
                  <SelectItem value="bi-weekly">{t('employees.paymentSchedule.biWeekly')}</SelectItem>
                  <SelectItem value="monthly">{t('employees.paymentSchedule.monthly')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 col-span-2">
              <Label htmlFor="status">{t('employees.statusLabel')}</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData({ ...formData, status: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('employees.selectStatus')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">{t('employees.status.active')}</SelectItem>
                  <SelectItem value="inactive">{t('employees.status.inactive')}</SelectItem>
                  <SelectItem value="suspended">{t('employees.status.suspended')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 col-span-2">
              <Label htmlFor="telegram_chat_id">{t('employees.telegramChatIdLabel')}</Label>
              <Input
                id="telegram_chat_id"
                value={formData.telegram_chat_id}
                onChange={(e) => {
                  setFormData({ ...formData, telegram_chat_id: e.target.value });
                }}
                placeholder={t('employees.telegramPlaceholder')}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('employees.addEmployee')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddEmployeeModal;