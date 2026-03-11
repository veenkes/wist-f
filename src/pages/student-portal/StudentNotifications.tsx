import { useState } from 'react';
import { Bell, ArrowLeft, CheckCheck, CreditCard, Calendar, BookOpen, AlertTriangle, Megaphone } from 'lucide-react';

interface Notification {
  id: number;
  type: 'homework' | 'payment' | 'event' | 'grade' | 'cancel' | 'announcement';
  title: string;
  message: string;
  time: string;
  read: boolean;
}

const mockNotifications: Notification[] = [
  { id: 1, type: 'homework', title: 'Домашнее задание', message: 'Математика: стр. 45, №1-10. Срок сдачи — завтра.', time: '1ч назад', read: false },
  { id: 2, type: 'cancel', title: 'Отмена урока', message: 'Химия 03.03 отменена. Замена не предусмотрена.', time: '3ч назад', read: false },
  { id: 3, type: 'payment', title: 'Напоминание об оплате', message: 'Оплата за обучение до 05.03. Сумма: 2 500 000 сум.', time: '1д назад', read: false },
  { id: 4, type: 'grade', title: 'Новая оценка', message: 'Физика: 4 за домашнюю работу от 27.02.', time: '1д назад', read: true },
  { id: 5, type: 'event', title: 'Мероприятие', message: 'Школьный концерт 10 марта в 16:00 в актовом зале.', time: '2д назад', read: true },
  { id: 6, type: 'announcement', title: 'Объявление', message: 'С 06.03 форма одежды — летняя. Подробности у классного руководителя.', time: '3д назад', read: true },
  { id: 7, type: 'homework', title: 'Домашнее задание', message: 'История: подготовить доклад о Второй мировой войне.', time: '3д назад', read: true },
  { id: 8, type: 'grade', title: 'Новая оценка', message: 'Английский: 3 за тест от 26.02.', time: '4д назад', read: true },
];

const typeConfig: Record<string, { icon: typeof Bell; bgClass: string; iconColor: string }> = {
  homework: { icon: BookOpen, bgClass: 'bg-blue-50 dark:bg-blue-900/20', iconColor: 'text-blue-500' },
  payment: { icon: CreditCard, bgClass: 'bg-red-50 dark:bg-red-900/20', iconColor: 'text-red-500' },
  event: { icon: Calendar, bgClass: 'bg-purple-50 dark:bg-purple-900/20', iconColor: 'text-purple-500' },
  grade: { icon: BookOpen, bgClass: 'bg-emerald-50 dark:bg-emerald-900/20', iconColor: 'text-emerald-500' },
  cancel: { icon: AlertTriangle, bgClass: 'bg-amber-50 dark:bg-amber-900/20', iconColor: 'text-amber-500' },
  announcement: { icon: Megaphone, bgClass: 'bg-indigo-50 dark:bg-indigo-900/20', iconColor: 'text-indigo-500' },
};

interface Props {
  onBack: () => void;
}

const StudentNotifications = ({ onBack }: Props) => {
  const [notifications, setNotifications] = useState(mockNotifications);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const unreadCount = notifications.filter(n => !n.read).length;
  const filtered = filter === 'unread' ? notifications.filter(n => !n.read) : notifications;

  const markAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const toggleRead = (id: number) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: !n.read } : n));
  };

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={onBack}
                  className="w-9 h-9 rounded-xl flex items-center justify-center border"
                  style={{ backgroundColor: 'hsl(var(--sp-white))', borderColor: 'hsl(var(--sp-border))' }}>
            <ArrowLeft className="w-4 h-4" style={{ color: 'hsl(var(--sp-text))' }} />
          </button>
          <div>
            <h1 className="text-lg font-semibold" style={{ color: 'hsl(var(--sp-text))' }}>Уведомления</h1>
            {unreadCount > 0 && (
              <p className="text-xs" style={{ color: 'hsl(var(--sp-text-secondary))' }}>
                {unreadCount} непрочитанных
              </p>
            )}
          </div>
        </div>
        {unreadCount > 0 && (
          <button onClick={markAllRead}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium"
                  style={{ backgroundColor: 'hsl(var(--sp-yellow-light))', color: 'hsl(var(--sp-yellow-dark))' }}>
            <CheckCheck className="w-3.5 h-3.5" />
            Прочитать все
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2">
        {(['all', 'unread'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
                  className="px-4 py-1.5 rounded-full text-xs font-medium transition-all"
                  style={filter === f
                    ? { backgroundColor: 'hsl(var(--sp-yellow))', color: 'white' }
                    : { backgroundColor: 'hsl(var(--sp-yellow-light))', color: 'hsl(var(--sp-text-secondary))' }
                  }>
            {f === 'all' ? `Все (${notifications.length})` : `Новые (${unreadCount})`}
          </button>
        ))}
      </div>

      {/* Notification List */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3"
                 style={{ backgroundColor: 'hsl(var(--sp-yellow-light))' }}>
              <Bell className="w-7 h-7" style={{ color: 'hsl(var(--sp-yellow-muted))' }} />
            </div>
            <p className="text-sm font-medium" style={{ color: 'hsl(var(--sp-text))' }}>Нет уведомлений</p>
            <p className="text-xs mt-1" style={{ color: 'hsl(var(--sp-text-secondary))' }}>
              Все уведомления прочитаны
            </p>
          </div>
        ) : (
          filtered.map(n => {
            const cfg = typeConfig[n.type] || typeConfig.announcement;
            const Icon = cfg.icon;
            return (
              <button key={n.id} onClick={() => toggleRead(n.id)}
                      className="w-full flex items-start gap-3 p-3 rounded-xl border text-left transition-all active:scale-[0.98]"
                      style={{
                        backgroundColor: n.read ? 'hsl(var(--sp-white))' : 'hsl(var(--sp-yellow-light))',
                        borderColor: n.read ? 'hsl(var(--sp-border))' : 'hsl(var(--sp-yellow) / 0.3)',
                      }}>
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${cfg.bgClass}`}>
                  <Icon className={`w-4 h-4 ${cfg.iconColor}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium text-sm truncate" style={{ color: 'hsl(var(--sp-text))' }}>
                      {n.title}
                    </p>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-[10px]" style={{ color: 'hsl(var(--sp-text-secondary))' }}>{n.time}</span>
                      {!n.read && (
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: 'hsl(var(--sp-yellow))' }} />
                      )}
                    </div>
                  </div>
                  <p className="text-xs mt-0.5 line-clamp-2" style={{ color: 'hsl(var(--sp-text-secondary))' }}>
                    {n.message}
                  </p>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};

export default StudentNotifications;
