import { useState } from 'react';
import { 
  Phone, Mail, MapPin, Calendar, Bell, Globe, 
  HelpCircle, MessageCircle, Sun, Moon, LogOut,
  GraduationCap, Users
} from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';

const mockStudent = {
  name: 'Алишер Каримов',
  phone: '+998 90 555 12 34',
  email: 'alisher.k@mail.uz',
  dob: '15.03.2009',
  address: 'ул. Навои 25, Ташкент',
  grade: '9 класс',
  group: 'Группа А',
  enrollmentDate: '01.09.2020',
  studentId: 'STU-2024-0042',
  curator: 'Иванова А.М.',
};

const mockParents = [
  { name: 'Каримов Рустам Ахмедович', relation: 'Отец', phone: '+998 90 123 45 67' },
  { name: 'Каримова Айгуль Бахтиёровна', relation: 'Мать', phone: '+998 90 234 56 78' },
];

const StudentProfile = () => {
  const { theme, toggleTheme, language, toggleLanguage } = useTheme();
  const [notifications, setNotifications] = useState(true);

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-semibold" style={{ color: 'hsl(var(--sp-text))' }}>Профиль</h1>

      {/* Student Info */}
      <div className="rounded-xl border p-4" style={{ backgroundColor: 'hsl(var(--sp-white))', borderColor: 'hsl(var(--sp-border))' }}>
        <div className="flex items-center gap-4">
          <Avatar className="w-16 h-16">
            <AvatarFallback className="font-semibold text-lg text-white"
                            style={{ background: `linear-gradient(135deg, hsl(var(--sp-yellow)), hsl(var(--sp-yellow-dark)))` }}>
              АК
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold" style={{ color: 'hsl(var(--sp-text))' }}>{mockStudent.name}</h3>
            <span className="inline-block mt-1 text-[10px] px-2 py-0.5 rounded-md font-medium"
                  style={{ backgroundColor: 'hsl(var(--sp-yellow-light))', color: 'hsl(var(--sp-yellow-dark))' }}>
              {mockStudent.studentId}
            </span>
            <div className="flex items-center gap-2 text-xs mt-1" style={{ color: 'hsl(var(--sp-text-secondary))' }}>
              <GraduationCap className="w-3 h-3" />
              <span>{mockStudent.grade} • {mockStudent.group}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Personal Info */}
      <div className="rounded-xl border p-4" style={{ backgroundColor: 'hsl(var(--sp-white))', borderColor: 'hsl(var(--sp-border))' }}>
        <h3 className="text-xs font-medium uppercase tracking-wider mb-3" style={{ color: 'hsl(var(--sp-text-secondary))' }}>Личные данные</h3>
        <div className="space-y-3">
          {[
            { icon: Phone, label: 'Телефон', value: mockStudent.phone },
            { icon: Mail, label: 'Email', value: mockStudent.email },
            { icon: Calendar, label: 'Дата рождения', value: mockStudent.dob },
            { icon: MapPin, label: 'Адрес', value: mockStudent.address },
            { icon: Calendar, label: 'Дата зачисления', value: mockStudent.enrollmentDate },
            { icon: Users, label: 'Куратор', value: mockStudent.curator },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="flex items-center gap-3">
              <Icon className="w-4 h-4 shrink-0" style={{ color: 'hsl(var(--sp-yellow-dark))' }} />
              <div>
                <p className="text-[10px]" style={{ color: 'hsl(var(--sp-text-secondary))' }}>{label}</p>
                <p className="text-sm" style={{ color: 'hsl(var(--sp-text))' }}>{value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Parents */}
      <div className="rounded-xl border p-4" style={{ backgroundColor: 'hsl(var(--sp-white))', borderColor: 'hsl(var(--sp-border))' }}>
        <h3 className="text-xs font-medium uppercase tracking-wider mb-3" style={{ color: 'hsl(var(--sp-text-secondary))' }}>Родители</h3>
        <div className="space-y-2">
          {mockParents.map((parent, i) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-xl"
                 style={{ backgroundColor: 'hsl(var(--sp-yellow-light))' }}>
              <Avatar className="w-10 h-10">
                <AvatarFallback className="text-sm font-medium"
                                style={{ backgroundColor: 'hsl(var(--sp-yellow-muted))', color: 'hsl(var(--sp-yellow-dark))' }}>
                  {parent.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="font-medium text-sm" style={{ color: 'hsl(var(--sp-text))' }}>{parent.name}</p>
                <p className="text-xs" style={{ color: 'hsl(var(--sp-text-secondary))' }}>{parent.relation} • {parent.phone}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Settings */}
      <div className="rounded-xl border p-4" style={{ backgroundColor: 'hsl(var(--sp-white))', borderColor: 'hsl(var(--sp-border))' }}>
        <h3 className="text-xs font-medium uppercase tracking-wider mb-3" style={{ color: 'hsl(var(--sp-text-secondary))' }}>Настройки</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {theme === 'dark' ? <Moon className="w-4 h-4" style={{ color: 'hsl(var(--sp-yellow-dark))' }} /> : <Sun className="w-4 h-4" style={{ color: 'hsl(var(--sp-yellow-dark))' }} />}
              <span className="text-sm" style={{ color: 'hsl(var(--sp-text))' }}>Тема</span>
            </div>
            <Switch checked={theme === 'dark'} onCheckedChange={toggleTheme} />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Globe className="w-4 h-4" style={{ color: 'hsl(var(--sp-yellow-dark))' }} />
              <span className="text-sm" style={{ color: 'hsl(var(--sp-text))' }}>Язык</span>
            </div>
            <button onClick={toggleLanguage} className="px-3 py-1 text-xs font-medium rounded-md transition-colors"
                    style={{ backgroundColor: 'hsl(var(--sp-yellow-light))', color: 'hsl(var(--sp-yellow-dark))' }}>
              {language === 'en' ? 'EN' : 'RU'}
            </button>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Bell className="w-4 h-4" style={{ color: 'hsl(var(--sp-yellow-dark))' }} />
              <span className="text-sm" style={{ color: 'hsl(var(--sp-text))' }}>Уведомления</span>
            </div>
            <Switch checked={notifications} onCheckedChange={setNotifications} />
          </div>
        </div>
      </div>

      {/* Support */}
      <div className="rounded-xl border p-4" style={{ backgroundColor: 'hsl(var(--sp-white))', borderColor: 'hsl(var(--sp-border))' }}>
        <h3 className="text-xs font-medium uppercase tracking-wider mb-3" style={{ color: 'hsl(var(--sp-text-secondary))' }}>Поддержка</h3>
        <div className="space-y-2">
          <button className="w-full flex items-center gap-3 h-11 text-sm rounded-xl border px-4 transition-colors"
                  style={{ borderColor: 'hsl(var(--sp-border))', color: 'hsl(var(--sp-text))' }}>
            <MessageCircle className="w-4 h-4" style={{ color: 'hsl(var(--sp-yellow-dark))' }} />
            Написать куратору
          </button>
          <button className="w-full flex items-center gap-3 h-11 text-sm rounded-xl border px-4 transition-colors"
                  style={{ borderColor: 'hsl(var(--sp-border))', color: 'hsl(var(--sp-text))' }}>
            <HelpCircle className="w-4 h-4" style={{ color: 'hsl(var(--sp-text-secondary))' }} />
            Частые вопросы
          </button>
        </div>
      </div>

      <button className="w-full h-11 flex items-center justify-center gap-2 text-sm rounded-xl border border-red-200 text-red-500 hover:bg-red-50 transition-colors">
        <LogOut className="w-4 h-4" />
        Выйти
      </button>
    </div>
  );
};

export default StudentProfile;
