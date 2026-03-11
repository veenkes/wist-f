import React, { useState } from 'react';
import { Search, Users, Phone, Mail, MapPin, User, Briefcase, Eye, Edit } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useParents } from '@/hooks/useParents';
import { toast } from 'sonner';

export const ParentsList: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  
  // Получаем реальных родителей из базы
  const { parents, isLoading } = useParents();

  // Фильтрация
  const filteredParents = parents.filter(parent =>
    parent.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    parent.children?.some(child => child.name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleViewProfile = (parentId: string) => {
    toast.info(`Просмотр профиля родителя ${parentId}`);
  };

  const handleEdit = (parentId: string) => {
    toast.info(`Редактирование родителя ${parentId}`);
  };

  const handleContact = (phone: string) => {
    window.open(`tel:${phone.replace(/\s/g, '')}`);
  };

  const handleEmail = (email: string) => {
    window.open(`mailto:${email}`);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            Список родителей
          </h1>
          <p className="text-muted-foreground mt-1">
            Полный справочник родителей и опекунов ({parents.length})
          </p>
        </div>
        {/* <Button onClick={() => setShowAddModal(true)}>
          <User className="w-4 h-4 mr-2" />
          Добавить родителя
        </Button> */}
      </div>

      {/* Search */}
      <Card className="p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Поиск по имени родителя или ребёнка..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </Card>

      {/* Parents Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filteredParents.map((parent) => (
          <Card key={parent.id} className="p-6 hover:shadow-lg transition-all">
            <div className="flex items-start gap-4">
              <Avatar className="w-16 h-16">
                <AvatarFallback className="bg-gradient-primary text-primary-foreground text-lg">
                  {parent.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-lg">{parent.full_name}</h3>
                {parent.occupation && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground capitalize">
                    <Briefcase className="w-3 h-3" />
                    <span>{parent.occupation}</span>
                  </div>
                )}
              </div>
              <div className="flex gap-1">
                {/* <Button variant="ghost" size="icon" onClick={() => handleViewProfile(parent.id)}>
                  <Eye className="w-4 h-4" />
                </Button> */}
                {/* <Button variant="ghost" size="icon" onClick={() => handleEdit(parent.id)}>
                  <Edit className="w-4 h-4" />
                </Button> */}
              </div>
            </div>

            <div className="mt-4 space-y-3">
              <div className="space-y-2">
                <div 
                  className="flex items-center gap-2 text-sm cursor-pointer hover:text-primary transition-colors"
                  onClick={() => handleContact(parent.phone)}
                >
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  <span className="text-foreground">{parent.phone}</span>
                </div>
                <div 
                  className="flex items-center gap-2 text-sm cursor-pointer hover:text-primary transition-colors"
                  onClick={() => parent.email && handleEmail(parent.email)}
                >
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <span className="text-foreground">{parent.email || 'Нет email'}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                  <span className="text-foreground line-clamp-1" title={parent.address}>{parent.address || 'Адрес не указан'}</span>
                </div>
              </div>
              <div className="pt-3 border-t">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-muted-foreground">
                    Дети ({parent.children?.length || 0}):
                  </span>
                </div>
                <div className="space-y-2">
                  {parent.children && parent.children.length > 0 ? (
                    parent.children.map((child) => (
                      <a href={`/student/${child.id}`}
                        key={child.id} 
                        className="flex items-center justify-between p-2 bg-muted/50 rounded-lg hover:bg-muted transition-colors cursor-pointer"
                      >
                        <div>
                          <p className="font-medium text-sm">{child.name}</p>
                          <p className="text-xs text-muted-foreground">{child.group}</p>
                        </div>
                        <Badge variant="outline" className="text-xs">Профиль</Badge>
                      </a>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">Нет привязанных детей</p>
                  )}
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {!isLoading && filteredParents.length === 0 && (
        <Card className="p-12 text-center">
          <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
          <h3 className="text-lg font-semibold mb-2">Родители не найдены</h3>
          <p className="text-muted-foreground">Попробуйте изменить поисковый запрос</p>
        </Card>
      )}
    </div>
  );
};

export default ParentsList;