import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format, differenceInYears, isValid, parseISO } from 'date-fns';

interface PersonalInfoTabProps {
  student: any;
}

export const PersonalInfoTab: React.FC<PersonalInfoTabProps> = ({ student }) => {
  // Безопасный расчет возраста
  let age = '—';
  let formattedDob = 'Не указано';
  
  if (student.date_of_birth) {
    const dob = new Date(student.date_of_birth);
    if (isValid(dob)) {
      age = differenceInYears(new Date(), dob).toString();
      formattedDob = format(dob, 'dd.MM.yyyy');
    }
  }

  const genderLabel = (g: string) => {
    switch (g?.toLowerCase()) {
      case 'male': return 'Мужской';
      case 'female': return 'Женский';
      default: return g || 'Не указан';
    }
  };

  const statusLabel = (s: string) => {
    switch (s?.toLowerCase()) {
      case 'active': return 'Активный';
      case 'suspended': return 'Отстранен';
      case 'graduated': return 'Выпускник';
      case 'debt': return 'Должник';
      default: return s;
    }
  };

  // Безопасное форматирование дат создания/зачисления
  const formatSafeDate = (dateStr: string | null | undefined, dateFormat = 'dd.MM.yyyy') => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return isValid(d) ? format(d, dateFormat) : '—';
  };

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <h3 className="text-sm font-semibold mb-3">Личная информация</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="text-xs text-muted-foreground">Полное имя</label>
            <p className="font-medium text-sm">{student.full_name}</p>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Дата рождения</label>
            <p className="font-medium text-sm">{formattedDob}</p>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Возраст</label>
            <p className="font-medium text-sm">{age} {age !== '—' ? 'лет' : ''}</p>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Пол</label>
            <p className="font-medium text-sm">{genderLabel(student.gender)}</p>
          </div>
          {/* <div>
            <label className="text-xs text-muted-foreground">ID/Паспорт</label>
            <p className="font-medium text-sm">{student.id_passport_number || student.idPassport || 'Не указан'}</p>
          </div> */}
          <div>
            <label className="text-xs text-muted-foreground">Статус</label>
            <div className="mt-1">
              <Badge className={
                student.status === 'active' ? 'bg-success/10 text-success border-success/20' :
                student.status === 'suspended' ? 'bg-destructive/10 text-destructive border-destructive/20' :
                student.status === 'graduated' ? 'bg-primary/10 text-primary border-primary/20' :
                'bg-warning/10 text-warning border-warning/20'
              }>
                {statusLabel(student.status)}
              </Badge>
            </div>
          </div>
        </div>
      </Card>

      <Card className="p-5">
        <h3 className="text-sm font-semibold mb-3">Контактная информация</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-muted-foreground">Телефон</label>
            <p className="font-medium text-sm">{student.phone || 'Не указан'}</p>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Email</label>
            <p className="font-medium text-sm">{student.email || 'Не указан'}</p>
          </div>
          <div className="md:col-span-2">
            <label className="text-xs text-muted-foreground">Адрес</label>
            <p className="font-medium text-sm">{student.address || 'Не указан'}</p>
          </div>
        </div>
      </Card>

      <Card className="p-5">
        <h3 className="text-sm font-semibold mb-3">Академическая информация</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="text-xs text-muted-foreground">Класс / Группа</label>
            <p className="font-medium text-sm">{student.group || 'Не назначен'}</p>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Уровень</label>
            <p className="font-medium text-sm">{student.grade ? `Уровень ${student.grade}` : 'Не указан'}</p>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Дата зачисления</label>
            <p className="font-medium text-sm">{formatSafeDate(student.enrollment_date)}</p>
          </div>
        </div>
      </Card>

      {student.notes && (
        <Card className="p-5">
          <h3 className="text-sm font-semibold mb-3">Заметки</h3>
          <p className="text-sm text-muted-foreground">{student.notes}</p>
        </Card>
      )}

      <Card className="p-5">
        <h3 className="text-sm font-semibold mb-3">Системные данные</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-muted-foreground">Профиль создан</label>
            <p className="font-medium text-sm">{formatSafeDate(student.created_at || student.createdAt, 'dd.MM.yyyy HH:mm')}</p>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Последнее обновление</label>
            <p className="font-medium text-sm">{formatSafeDate(student.updated_at || student.updatedAt, 'dd.MM.yyyy HH:mm')}</p>
          </div>
        </div>
      </Card>
    </div>
  );
};