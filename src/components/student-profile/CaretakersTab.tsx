import React from 'react';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Phone, MessageSquare } from 'lucide-react';

interface CaretakersTabProps {
  caretakers: any[];
}

export const CaretakersTab: React.FC<CaretakersTabProps> = ({ caretakers }) => {
  if (!caretakers || caretakers.length === 0) {
    return (
      <Card className="p-6">
        <p className="text-muted-foreground text-center">Опекуны не назначены</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {caretakers.map((caretaker: any, index: number) => (
        <Card key={index} className="p-6">
          <div className="flex items-start gap-4">
            <Avatar className="w-14 h-14">
              <AvatarFallback className="bg-secondary text-lg">
                {caretaker.full_name?.split(' ').map((n: string) => n[0]).join('') || 'O'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-semibold text-lg">{caretaker.full_name}</h4>
                  <Badge variant="outline" className="mt-1 capitalize">{caretaker.caretaker_type}</Badge>
                </div>
              </div>
              
              <div className="mt-4 flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <Phone className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Телефон</p>
                  <p className="font-medium">{caretaker.phone}</p>
                </div>
              </div>
              
              {caretaker.notes && (
                <div className="mt-3 flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                  <MessageSquare className="w-4 h-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground">Заметки</p>
                    <p className="text-sm">{caretaker.notes}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
};