import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DollarSign, TrendingUp, TrendingDown, CreditCard } from 'lucide-react';
import { format, isValid } from 'date-fns';

interface PaymentsTabProps {
  payments: any[];
}

export const PaymentsTab: React.FC<PaymentsTabProps> = ({ payments }) => {
  const totalPaid = payments?.filter(p => p.status === 'paid').reduce((sum, p) => sum + p.amount, 0) || 0;
  const totalPending = payments?.filter(p => p.status === 'pending').reduce((sum, p) => sum + p.amount, 0) || 0;
  const totalOverdue = payments?.filter(p => p.status === 'overdue').reduce((sum, p) => sum + p.amount, 0) || 0;
  const totalDebt = totalPending + totalOverdue;

  return (
    <div className="space-y-6">
      {/* Balance Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-success/10 rounded-lg">
              <TrendingUp className="w-5 h-5 text-success" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Paid</p>
              <p className="text-xl font-bold text-success">{totalPaid.toLocaleString()} UZS</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-warning/10 rounded-lg">
              <DollarSign className="w-5 h-5 text-warning" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Pending</p>
              <p className="text-xl font-bold text-warning">{totalPending.toLocaleString()} UZS</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-destructive/10 rounded-lg">
              <TrendingDown className="w-5 h-5 text-destructive" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Debt</p>
              <p className="text-xl font-bold text-destructive">{totalDebt.toLocaleString()} UZS</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Payment History */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Payment History</h3>
        {payments && payments.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Date</th>
                  <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Amount</th>
                  <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Method</th>
                  <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Status</th>
                  <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Notes</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment: any) => (
                  <tr key={payment.id} className="border-b last:border-0 hover:bg-muted/50">
                    <td className="py-3 px-2">
                      {payment.payment_date && isValid(new Date(payment.payment_date))
                        ? format(new Date(payment.payment_date), 'dd.MM.yyyy')
                        : payment.due_date && isValid(new Date(payment.due_date))
                          ? <span className="text-muted-foreground">Due: {format(new Date(payment.due_date), 'dd.MM.yyyy')}</span>
                          : <span className="text-muted-foreground">—</span>
                      }
                    </td>
                    <td className="py-3 px-2 font-medium">{payment.amount.toLocaleString()} UZS</td>
                    <td className="py-3 px-2">
                      <div className="flex items-center gap-2">
                        <CreditCard className="w-4 h-4 text-muted-foreground" />
                        <span className="capitalize">{payment.payment_method || 'N/A'}</span>
                      </div>
                    </td>
                    <td className="py-3 px-2">
                      <Badge className={
                        payment.status === 'paid' ? 'bg-success/10 text-success border-success/20' :
                        payment.status === 'pending' ? 'bg-warning/10 text-warning border-warning/20' :
                        payment.status === 'overdue' ? 'bg-destructive/10 text-destructive border-destructive/20' :
                        'bg-muted'
                      }>
                        {payment.status === 'paid' ? 'Paid ✔' : 
                         payment.status === 'pending' ? 'Pending' : 
                         payment.status === 'overdue' ? 'Overdue ❌' : payment.status}
                      </Badge>
                    </td>
                    <td className="py-3 px-2 text-sm text-muted-foreground">{payment.notes || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-muted-foreground text-center py-8">No payment records found</p>
        )}
      </Card>
    </div>
  );
};
