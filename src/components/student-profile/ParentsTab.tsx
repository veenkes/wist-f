import React from 'react';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Phone, Mail, MapPin, Briefcase, CreditCard } from 'lucide-react';

interface ParentsTabProps {
  parents: any[];
}

export const ParentsTab: React.FC<ParentsTabProps> = ({ parents }) => {
  if (!parents || parents.length === 0) {
    return (
      <Card className="p-6">
        <p className="text-muted-foreground text-center">Родители не привязаны к этому ученику</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {parents.map((parent: any, index: number) => {
        // Защита от разных форматов бэкенда
        const parentName = parent.full_name || parent.name || 'Родитель';
        const initials = parentName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();

        return (
          <Card key={parent.id || index} className="p-6">
            <div className="flex flex-col md:flex-row gap-6">
              <Avatar className="w-16 h-16 shrink-0">
                <AvatarFallback className="bg-primary/10 text-primary text-lg font-bold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1 space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h4 className="text-lg font-semibold">{parentName}</h4>
                    <p className="text-sm text-muted-foreground capitalize">{parent.relation_type || parent.relationship || 'Родитель'}</p>
                  </div>
                  <div className="flex gap-2">
                    {parent.is_primary_contact && (
                      <Badge variant="outline" className="border-primary text-primary">Основной контакт</Badge>
                    )}
                    {parent.is_payer && (
                      <Badge className="bg-success/10 text-success border-success/20">
                        <CreditCard className="w-3 h-3 mr-1" />
                        Плательщик
                      </Badge>
                    )}
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg border border-border/50">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Телефон</p>
                      <p className="font-medium text-sm">{parent.phone || 'Не указан'}</p>
                    </div>
                  </div>
                  
                  {parent.email && (
                    <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg border border-border/50">
                      <Mail className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Email</p>
                        <p className="font-medium text-sm">{parent.email}</p>
                      </div>
                    </div>
                  )}
                  
                  {parent.occupation && (
                    <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg border border-border/50">
                      <Briefcase className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Место работы</p>
                        <p className="font-medium text-sm">{parent.occupation}</p>
                      </div>
                    </div>
                  )}
                  
                  {parent.address && (
                    <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg border border-border/50 md:col-span-2">
                      <MapPin className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Адрес</p>
                        <p className="font-medium text-sm">{parent.address}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
};