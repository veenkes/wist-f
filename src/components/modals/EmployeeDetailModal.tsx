import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { Mail, Phone, DollarSign, Calendar, Ban, CheckCircle, Trash2, Edit, Save, X } from 'lucide-react';
import { format } from 'date-fns';
import { formatPhone, formatCurrency } from '@/lib/format';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { employeeService } from '@/services';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface EmployeeDetailModalProps {
  open: boolean;
  onClose: () => void;
  employee: any;
  onUpdate: () => void;
}

const EmployeeDetailModal: React.FC<EmployeeDetailModalProps> = ({
  open,
  onClose,
  employee,
  onUpdate,
}) => {
  const { t } = useTheme();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  
  // Check if this is the current user
  const isCurrentUser = user?.id === employee.id || user?.email === employee.email;
  const [editedData, setEditedData] = useState({
    fullName: employee.full_name || '',
    email: employee.email || '',
    phone: employee.phone || '',
    salary: employee.salary || '',
    // API uses English values
    paymentSchedule: employee.payment_schedule || 'Monthly',
    role: employee.role || '',
    status: employee.status || 'Active',
    telegramChatId: employee.telegram_chat_id || employee.telegramChatId || '',
  });

  // Update editedData when employee changes or modal opens
  useEffect(() => {
    if (open && employee) {
      // Normalize status to match Select values (Active, Inactive, On Leave)
      const normalizeStatus = (status: string) => {
        if (!status) return 'Active';
        const statusLower = status.toLowerCase();
        if (statusLower === 'active') return 'Active';
        if (statusLower === 'inactive') return 'Inactive';
        if (statusLower === 'on leave' || statusLower === 'onleave') return 'On Leave';
        return status; // Keep original if unknown
      };

      // Normalize payment schedule to match Select values (Monthly, Weekly, Bi-weekly)
      const normalizePaymentSchedule = (schedule: string) => {
        if (!schedule) return 'Monthly';
        const scheduleLower = schedule.toLowerCase();
        if (scheduleLower === 'monthly') return 'Monthly';
        if (scheduleLower === 'weekly') return 'Weekly';
        if (scheduleLower === 'bi-weekly' || scheduleLower === 'biweekly') return 'Bi-weekly';
        return schedule; // Keep original if unknown
      };

      // Normalize role to match Select values (Admin, Accountant, Teacher, Support, Manager, CEO)
      const normalizeRole = (role: string) => {
        if (!role) return '';
        const roleLower = role.toLowerCase();
        if (roleLower === 'admin') return 'Admin';
        if (roleLower === 'accountant') return 'Accountant';
        if (roleLower === 'teacher') return 'Teacher';
        if (roleLower === 'support') return 'Support';
        if (roleLower === 'manager') return 'Manager';
        if (roleLower === 'ceo') return 'CEO';
        return role; // Keep original if unknown
      };

      setEditedData({
        fullName: employee.full_name || '',
        email: employee.email || '',
        phone: employee.phone || '',
        salary: employee.salary || '',
        paymentSchedule: normalizePaymentSchedule(employee.payment_schedule || 'Monthly'),
        role: normalizeRole(employee.role || ''),
        status: normalizeStatus(employee.status || 'Active'),
        telegramChatId: employee.telegram_chat_id || employee.telegramChatId || '',
      });
      setIsEditing(false);
    }
  }, [open, employee]);

  const handleSave = async () => {
    setLoading(true);
    try {
      await employeeService.updateEmployee(employee.id, {
        fullName: editedData.fullName,
        email: editedData.email,
        phone: editedData.phone || undefined,
        salary: editedData.salary ? parseFloat(editedData.salary.toString()) : undefined,
        paymentSchedule: editedData.paymentSchedule,
        role: editedData.role,
        status: editedData.status,
        telegramChatId: editedData.telegramChatId?.trim() || undefined,
      });

      toast({
        title: t('common.success'),
        description: t('employee.dataUpdated'),
      });

      setIsEditing(false);
      onUpdate();
    } catch (error: any) {
      toast({
        title: t('common.error'),
        description: error.message || t('toast.error.updateFailed'),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setLoading(true);
    try {
      await employeeService.deleteEmployee(employee.id);

      toast({
        title: t('common.success'),
        description: t('employee.deleted'),
      });

      setShowDeleteDialog(false);
      onClose();
      onUpdate();
    } catch (error: any) {
      toast({
        title: t('common.error'),
        description: error.message || t('toast.error.deleteFailed'),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('modal.employeeDetails')}</DialogTitle>
        </DialogHeader>

        <div className="space-y-8">
          {/* Header - Clean and Spacious */}
          <div className="flex items-start gap-6 pb-6 border-b">
            <Avatar className="h-24 w-24 ring-2 ring-border">
              <AvatarImage src={employee.avatar_url || undefined} />
              <AvatarFallback className="text-2xl bg-gradient-to-br from-primary/20 to-primary/5">
                {employee.full_name
                  .split(' ')
                  .map((n: string) => n[0])
                  .join('')
                  .toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-3">
              {isEditing ? (
                <Input
                  value={editedData.fullName}
                  onChange={(e) => setEditedData({ ...editedData, fullName: e.target.value })}
                  className="text-2xl font-semibold h-auto py-2 border-0 border-b rounded-none focus-visible:ring-0 focus-visible:border-primary"
                  placeholder={t('employees.fullNamePlaceholder')}
                />
              ) : (
                <h2 className="text-2xl font-semibold text-foreground">{employee.full_name}</h2>
              )}
              
              <div className="flex items-center gap-3">
                {isEditing ? (
                  <Select
                    value={editedData.role}
                    onValueChange={(value) => setEditedData({ ...editedData, role: value })}
                  >
                    <SelectTrigger className="w-[160px] h-9 border-muted">
                      <SelectValue placeholder={t('employees.selectRole')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Admin">{t('employees.roles.admin')}</SelectItem>
                      <SelectItem value="Accountant">{t('employees.roles.accountant')}</SelectItem>
                      <SelectItem value="Teacher">{t('employees.roles.teacher')}</SelectItem>
                      <SelectItem value="Support">{t('employees.roles.support')}</SelectItem>
                      <SelectItem value="Manager">{t('employees.roles.manager')}</SelectItem>
                      <SelectItem value="CEO">{t('employees.roles.ceo')}</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <span className="text-sm text-muted-foreground font-medium">{employee.role}</span>
                )}
                
                <span className="text-muted-foreground">•</span>
                
                {isEditing ? (
                  <Select
                    value={editedData.status}
                    onValueChange={(value) => setEditedData({ ...editedData, status: value })}
                  >
                    <SelectTrigger className="w-[140px] h-9 border-muted">
                      <SelectValue placeholder={t('employees.selectStatus')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Active">{t('employees.status.active')}</SelectItem>
                      <SelectItem value="Inactive">{t('employees.status.inactive')}</SelectItem>
                      <SelectItem value="On Leave">{t('employees.status.inactive')}</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <span className={`text-sm font-medium ${
                    employee.status === 'Active' ? 'text-green-600' : 'text-muted-foreground'
                  }`}>
                    {employee.status}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Contact & Financial Info - Clean Grid */}
          <div className="grid grid-cols-2 gap-x-12 gap-y-6">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">{t('employees.emailLabel')}</Label>
              {isEditing ? (
                <Input
                  type="email"
                  value={editedData.email}
                  onChange={(e) => setEditedData({ ...editedData, email: e.target.value })}
                  className="h-9"
                />
              ) : (
                <p className="text-sm font-medium">{employee.email}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">{t('form.phone')}</Label>
              {isEditing ? (
                <Input
                  value={editedData.phone}
                  onChange={(e) => setEditedData({ ...editedData, phone: e.target.value })}
                  className="h-9"
                />
              ) : (
                <p className="text-sm font-medium">{employee.phone ? formatPhone(employee.phone) : t('common.notSpecified')}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">{t('employees.salary')}</Label>
              {isEditing ? (
                <Input
                  type="number"
                  value={editedData.salary}
                  onChange={(e) => setEditedData({ ...editedData, salary: e.target.value })}
                  className="h-9"
                />
              ) : (
                <p className="text-sm font-medium">
                  {employee.salary ? formatCurrency(employee.salary) : t('common.notSpecified')}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">{t('employees.paymentSchedule')}</Label>
              {isEditing ? (
                <Select
                  value={editedData.paymentSchedule}
                  onValueChange={(value) => setEditedData({ ...editedData, paymentSchedule: value })}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder={t('employees.selectSchedule')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Weekly">{t('employees.paymentSchedule.weekly')}</SelectItem>
                    <SelectItem value="Bi-weekly">{t('employees.paymentSchedule.biWeekly')}</SelectItem>
                    <SelectItem value="Monthly">{t('employees.paymentSchedule.monthly')}</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-sm font-medium capitalize">{employee.payment_schedule || t('common.notSpecified')}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">{t('employees.telegramChatIdLabel')}</Label>
              {isEditing ? (
                <Input
                  value={editedData.telegramChatId}
                  onChange={(e) => setEditedData({ ...editedData, telegramChatId: e.target.value })}
                  className="h-9"
                  placeholder={t('employees.telegramPlaceholder')}
                />
              ) : (
                <p className="text-sm font-medium">{employee.telegram_chat_id || employee.telegramChatId || t('common.notSpecified')}</p>
              )}
            </div>

            {employee.created_at && (
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">{t('employees.createdAt')}</Label>
                <p className="text-sm font-medium">
                  {format(new Date(employee.created_at), 'PPpp')}
                </p>
              </div>
            )}

            {employee.last_active && employee.last_active !== '0001-01-01T00:00:00Z' && (
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">{t('employees.lastActive')}</Label>
                <p className="text-sm font-medium">
                  {format(new Date(employee.last_active), 'PPpp')}
                </p>
              </div>
            )}
          </div>

          {/* Action Buttons - Clean and Minimal */}
          <div className="flex items-center justify-between pt-6 border-t mt-8">
            {!isEditing ? (
              <>
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => {
                    if (isCurrentUser) {
                      toast({
                        title: t('employees.cannotDelete'),
                        description: t('employees.cannotDeleteSelf'),
                        variant: "destructive",
                      });
                      return;
                    }
                    setShowDeleteDialog(true);
                  }}
                  disabled={loading || isCurrentUser}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  {isCurrentUser ? t('employees.cannotDeleteSelfBtn') : t('employees.deleteEmployee')}
                </Button>
                <Button onClick={() => setIsEditing(true)} size="sm">
                  <Edit className="h-4 w-4 mr-2" />
                  {t('employees.editDetails')}
                </Button>
              </>
            ) : (
              <>
                <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)} disabled={loading}>
                  {t('common.cancel')}
                </Button>
                <Button onClick={handleSave} disabled={loading} size="sm">
                  {loading ? t('employees.saving') : t('employees.saveChanges')}
                </Button>
              </>
            )}
          </div>
        </div>
      </DialogContent>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('employees.deleteEmployeeTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('employees.deleteEmployeeConfirm', { name: employee.full_name })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={loading}>
              {loading ? t('employees.deleting') : t('employees.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
};

export default EmployeeDetailModal;
