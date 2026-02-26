import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Calendar as CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';

interface DateRangePickerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDateRangeSelect: (startDate: Date, endDate: Date | null) => void;
}

export const DateRangePickerModal: React.FC<DateRangePickerModalProps> = ({
  open,
  onOpenChange,
  onDateRangeSelect,
}) => {
  const [startDate, setStartDate] = useState<Date | undefined>(new Date());
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [mode, setMode] = useState<'single' | 'range'>('single');

  const handleApply = () => {
    if (startDate) {
      onDateRangeSelect(startDate, endDate || null);
      onOpenChange(false);
    }
  };

  const handleReset = () => {
    const today = new Date();
    setStartDate(today);
    setEndDate(undefined);
    setMode('single');
    onDateRangeSelect(today, null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarIcon className="w-5 h-5" />
            Dashboard Date Settings
          </DialogTitle>
          <DialogDescription>
            Select a specific date or date range to filter dashboard data
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Mode Selector */}
          <div className="flex gap-2">
            <Button
              variant={mode === 'single' ? 'default' : 'outline'}
              onClick={() => setMode('single')}
              className="flex-1"
            >
              Single Date
            </Button>
            <Button
              variant={mode === 'range' ? 'default' : 'outline'}
              onClick={() => setMode('range')}
              className="flex-1"
            >
              Date Range
            </Button>
          </div>

          {/* Calendar(s) */}
          <div className="flex gap-4 justify-center flex-wrap">
            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground text-center">
                {mode === 'single' ? 'Select Date' : 'Start Date'}
              </p>
              <Calendar
                mode="single"
                selected={startDate}
                onSelect={setStartDate}
                defaultMonth={startDate || new Date()}
                captionLayout="dropdown"
                fromYear={2020}
                toYear={new Date().getFullYear() + 1}
              />
            </div>

            {mode === 'range' && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground text-center">End Date</p>
                <Calendar
                  mode="single"
                  selected={endDate}
                  onSelect={setEndDate}
                  defaultMonth={endDate || startDate || new Date()}
                  captionLayout="dropdown"
                  fromYear={2020}
                  toYear={new Date().getFullYear() + 1}
                  disabled={(date) => startDate ? date < startDate : false}
                />
              </div>
            )}
          </div>

          {/* Selected Range Display */}
          {startDate && (
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Selected Period:</p>
              <p className="font-medium text-foreground">
                {format(startDate, 'PPP')}
                {mode === 'range' && endDate && ` - ${format(endDate, 'PPP')}`}
                {mode === 'range' && !endDate && ' - (select end date)'}
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleReset} className="flex-1">
              Reset to Today
            </Button>
            <Button onClick={handleApply} className="flex-1" disabled={!startDate}>
              Apply Filter
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
