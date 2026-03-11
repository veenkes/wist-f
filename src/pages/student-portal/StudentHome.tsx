import { 
  Bell, Clock, CheckCircle, Award, GraduationCap
} from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

const mockStudent = {
  name: 'Алишер Каримов',
  grade: '9 класс',
  group: 'Группа А',
  gpa: 4.2,
  attendancePercent: 92,
};

const mockTodayLessons = [
  { time: '08:30 – 09:15', subject: 'Математика', teacher: 'Петрова Е.С.', room: '301', status: 'done' },
  { time: '09:30 – 10:15', subject: 'Физика', teacher: 'Иванов К.Н.', room: '205', status: 'done' },
  { time: '10:30 – 11:15', subject: 'Английский', teacher: 'Джонсон М.', room: '108', status: 'current' },
  { time: '11:30 – 12:15', subject: 'История', teacher: 'Сидорова Н.В.', room: '402', status: 'upcoming' },
  { time: '13:00 – 13:45', subject: 'Информатика', teacher: 'Алиев Р.Б.', room: '310', status: 'upcoming' },
];

const mockRecentGrades = [
  { subject: 'Математика', grade: 5, date: '28 фев', type: 'Контрольная' },
  { subject: 'Физика', grade: 4, date: '27 фев', type: 'Домашняя' },
  { subject: 'Английский', grade: 3, date: '26 фев', type: 'Тест' },
];

const mockNotifications = [
  { id: 1, title: 'Домашнее задание', message: 'Математика: стр. 45, №1-10', time: '1ч' },
  { id: 2, title: 'Отмена урока', message: 'Химия 03.03 отменена', time: '3ч' },
  { id: 3, title: 'Оплата', message: 'Напоминание: оплата до 05.03', time: '1д' },
];



interface Props {
  onOpenNotifications?: () => void;
}

const StudentHome = ({ onOpenNotifications }: Props) => {
  const currentLesson = mockTodayLessons.find(l => l.status === 'current');
  const nextLesson = mockTodayLessons.find(l => l.status === 'upcoming');

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wider" style={{ color: 'hsl(var(--sp-text-secondary))' }}>
            {format(new Date(), 'EEEE', { locale: ru })}
          </p>
          <h1 className="text-xl font-semibold" style={{ color: 'hsl(var(--sp-text))' }}>
            {format(new Date(), 'd MMMM', { locale: ru })}
          </h1>
        </div>
        <button className="relative w-10 h-10 rounded-full flex items-center justify-center"
                style={{ backgroundColor: 'hsl(var(--sp-yellow-light))' }}
                onClick={onOpenNotifications}>
          <Bell className="w-5 h-5" style={{ color: 'hsl(var(--sp-yellow-dark))' }} />
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 text-white text-[10px] rounded-full flex items-center justify-center font-bold"
                style={{ backgroundColor: 'hsl(var(--sp-red))' }}>
            3
          </span>
        </button>
      </div>

      {/* Student Card */}
      <div className="rounded-2xl overflow-hidden shadow-sm"
           style={{ background: `linear-gradient(135deg, hsl(var(--sp-yellow)), hsl(var(--sp-yellow-dark)))` }}>
        <div className="p-4 flex items-center gap-3">
          <Avatar className="w-12 h-12 border-2 border-white/30">
            <AvatarFallback className="bg-white/20 text-white font-semibold text-sm">
              АК
            </AvatarFallback>
          </Avatar>
          <div>
            <h3 className="font-semibold text-white text-sm">{mockStudent.name}</h3>
            <p className="text-xs text-white/80">{mockStudent.grade} • {mockStudent.group}</p>
          </div>
          <GraduationCap className="w-8 h-8 text-white/30 ml-auto" />
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-xl p-3 text-center border" style={{ backgroundColor: 'hsl(var(--sp-white))', borderColor: 'hsl(var(--sp-border))' }}>
          <div className="w-8 h-8 rounded-lg flex items-center justify-center mx-auto mb-1"
               style={{ backgroundColor: 'hsl(var(--sp-yellow-light))' }}>
            <Award className="w-4 h-4" style={{ color: 'hsl(var(--sp-yellow-dark))' }} />
          </div>
          <p className="text-lg font-bold" style={{ color: 'hsl(var(--sp-text))' }}>{mockStudent.gpa}</p>
          <p className="text-[10px]" style={{ color: 'hsl(var(--sp-text-secondary))' }}>GPA</p>
        </div>
        <div className="rounded-xl p-3 text-center border" style={{ backgroundColor: 'hsl(var(--sp-white))', borderColor: 'hsl(var(--sp-border))' }}>
          <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center mx-auto mb-1">
            <CheckCircle className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-lg font-bold" style={{ color: 'hsl(var(--sp-text))' }}>{mockStudent.attendancePercent}%</p>
          <p className="text-[10px]" style={{ color: 'hsl(var(--sp-text-secondary))' }}>Посещаемость</p>
        </div>
      </div>

      {/* Current Lesson */}
      {currentLesson && (
        <div className="rounded-xl p-3 border-l-4" 
             style={{ backgroundColor: 'hsl(var(--sp-white))', borderLeftColor: 'hsl(var(--sp-yellow))', borderTop: '1px solid hsl(var(--sp-border))', borderRight: '1px solid hsl(var(--sp-border))', borderBottom: '1px solid hsl(var(--sp-border))' }}>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: 'hsl(var(--sp-yellow))' }} />
            <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'hsl(var(--sp-yellow-dark))' }}>Сейчас</span>
          </div>
          <p className="font-semibold text-sm" style={{ color: 'hsl(var(--sp-text))' }}>{currentLesson.subject}</p>
          <p className="text-xs" style={{ color: 'hsl(var(--sp-text-secondary))' }}>{currentLesson.time} • {currentLesson.room} • {currentLesson.teacher}</p>
        </div>
      )}

      {nextLesson && (
        <div className="rounded-xl p-3 border" style={{ backgroundColor: 'hsl(var(--sp-white))', borderColor: 'hsl(var(--sp-border))' }}>
          <div className="flex items-center gap-2 mb-1">
            <Clock className="w-3 h-3" style={{ color: 'hsl(var(--sp-text-secondary))' }} />
            <span className="text-[10px] font-medium uppercase tracking-wider" style={{ color: 'hsl(var(--sp-text-secondary))' }}>Следующий</span>
          </div>
          <p className="font-semibold text-sm" style={{ color: 'hsl(var(--sp-text))' }}>{nextLesson.subject}</p>
          <p className="text-xs" style={{ color: 'hsl(var(--sp-text-secondary))' }}>{nextLesson.time} • {nextLesson.room}</p>
        </div>
      )}

      {/* Recent Grades */}
      <div className="rounded-xl border p-4" style={{ backgroundColor: 'hsl(var(--sp-white))', borderColor: 'hsl(var(--sp-border))' }}>
        <h3 className="text-xs font-medium uppercase tracking-wider mb-3" style={{ color: 'hsl(var(--sp-text-secondary))' }}>
          Последние оценки
        </h3>
        <div className="space-y-2">
          {mockRecentGrades.map((g, i) => (
            <div key={i} className="flex items-center justify-between p-2.5 rounded-lg"
                 style={{ backgroundColor: 'hsl(var(--sp-yellow-light))' }}>
              <div>
                <p className="font-medium text-sm" style={{ color: 'hsl(var(--sp-text))' }}>{g.subject}</p>
                <p className="text-[10px]" style={{ color: 'hsl(var(--sp-text-secondary))' }}>{g.type} • {g.date}</p>
              </div>
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm ${
                g.grade >= 5 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' :
                g.grade >= 4 ? 'text-white' :
                g.grade >= 3 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' :
                'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
              }`} style={g.grade >= 4 && g.grade < 5 ? { backgroundColor: 'hsl(var(--sp-yellow))', color: 'white' } : undefined}>
                {g.grade}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Notifications */}
      <div className="rounded-xl border p-4" style={{ backgroundColor: 'hsl(var(--sp-white))', borderColor: 'hsl(var(--sp-border))' }}>
        <h3 className="text-xs font-medium uppercase tracking-wider mb-3" style={{ color: 'hsl(var(--sp-text-secondary))' }}>
          Уведомления
        </h3>
        <div className="space-y-2">
          {mockNotifications.map((n) => (
            <div key={n.id} className="flex items-center gap-3 p-2.5 rounded-lg"
                 style={{ backgroundColor: 'hsl(var(--sp-yellow-light))' }}>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                   style={{ backgroundColor: 'hsl(var(--sp-yellow-muted))' }}>
                <Bell className="w-4 h-4" style={{ color: 'hsl(var(--sp-yellow-dark))' }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate" style={{ color: 'hsl(var(--sp-text))' }}>{n.title}</p>
                <p className="text-xs truncate" style={{ color: 'hsl(var(--sp-text-secondary))' }}>{n.message}</p>
              </div>
              <span className="text-[10px] shrink-0" style={{ color: 'hsl(var(--sp-text-secondary))' }}>{n.time}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default StudentHome;
