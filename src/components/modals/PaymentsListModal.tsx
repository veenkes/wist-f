import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Search, Filter, Download, Eye, ArrowLeft } from 'lucide-react';
import { formatCurrency } from '@/lib/format';
import { mockTransactions } from '@/data/mockData';
import PaymentDetailModal from './PaymentDetailModal';

interface PaymentsListModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PaymentsListModal: React.FC<PaymentsListModalProps> = ({ isOpen, onClose }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPayment, setSelectedPayment] = useState<string | null>(null);
  const [showPaymentDetail, setShowPaymentDetail] = useState(false);

  const filteredPayments = mockTransactions.filter(payment =>
    payment.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    payment.parentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    payment.purpose.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleViewPayment = (paymentId: string) => {
    setSelectedPayment(paymentId);
    setShowPaymentDetail(true);
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={onClose}>
                <ArrowLeft className="w-4 h-4" />
              </Button>
              Payments Management
            </DialogTitle>
          </DialogHeader>

          {/* Filters and Search */}
          <div className="flex gap-4 p-4 border-b border-border">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by student, parent, or purpose..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button variant="outline">
              <Filter className="w-4 h-4 mr-2" />
              Filters
            </Button>
            <Button variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          </div>

          {/* Payments Table */}
          <div className="flex-1 overflow-auto p-4">
            <div className="space-y-2">
              {filteredPayments.map((payment) => (
                <Card key={payment.id} className="hover:shadow-widget transition-all duration-200 cursor-pointer">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-gradient-primary rounded-lg flex items-center justify-center text-primary-foreground font-semibold">
                          {payment.studentName.charAt(0)}
                        </div>
                        <div>
                          <p className="font-semibold text-foreground">{payment.studentName}</p>
                          <p className="text-sm text-muted-foreground">{payment.parentName}</p>
                          <p className="text-sm text-muted-foreground">{payment.purpose}</p>
                        </div>
                      </div>
                      <div className="text-right space-y-1">
                        <p className="font-bold text-lg">{formatCurrency(payment.amount)}</p>
                        <p className="text-sm text-muted-foreground">{payment.date}</p>
                        <div className="flex items-center gap-2">
                          <Badge 
                            variant={payment.status === 'Paid' ? 'default' : 
                                     payment.status === 'Pending' ? 'secondary' : 'destructive'}
                            className="text-xs"
                          >
                            {payment.status}
                          </Badge>
                          <span className="text-xs text-muted-foreground">{payment.paymentMethod}</span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleViewPayment(payment.id)}
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          View
                        </Button>
                        {payment.receiptId && (
                          <Button variant="secondary" size="sm">
                            <Download className="w-4 h-4 mr-2" />
                            Receipt
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {filteredPayments.length === 0 && (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No payments found matching your search.</p>
              </div>
            )}
          </div>

          {/* Summary Footer */}
          <div className="border-t border-border p-4 bg-muted/30">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">
                Showing {filteredPayments.length} of {mockTransactions.length} payments
              </span>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Total Amount</p>
                <p className="font-bold text-lg">
                  {formatCurrency(filteredPayments.reduce((sum, p) => sum + p.amount, 0))}
                </p>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Payment Detail Modal */}
      <PaymentDetailModal
        isOpen={showPaymentDetail}
        onClose={() => setShowPaymentDetail(false)}
        paymentId={selectedPayment || undefined}
      />
    </>
  );
};

export default PaymentsListModal;