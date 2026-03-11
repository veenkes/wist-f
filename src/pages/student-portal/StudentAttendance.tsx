import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, CheckCircle, XCircle, Clock, FileText } from 'lucide-react';
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks, eachDayOfInterval, isSameDay } from 'date-fns';
import { ru } from 'date-fns/locale';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

const generateMockAttendance = () => {
  const records: any[] = [];
  const lessons = [
    { time: '08:30', subject: 'Математика' },
    { time: '09:30', subject: 'Физика' },
    { time: '10:30', subject: 'Английский' },
    { time: '11:30', subject: 'История' },
    { time: '13:00', subject: 'Информатика' },
  ];
  for (let i = 0; i < 30; i++) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    if (date.getDay() === 0 || date.getDay() === 6) continue;
    lessons.forEach((lesson, idx) => {
      const rand = Math.random();
      let status: 'present' | 'absent' | 'late' | 'excused';
      if (rand < 0.75) status = 'present';
      else if (rand < 0.88) status = 'late';
      else if (rand < 0.96) status = 'absent';
      else status = 'excused';
      records.push({ id: `${date.toISOString()}-${idx}`, date, time: lesson.time, subject: lesson.subject, status });
    });
  }
  return records;
};

const mockAttendance = generateMockAttendance();

const StudentAttendance = () => {
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd }).filter(d => d.getDay() !== 0 && d.getDay() !== 6);

  const weekAttendance = useMemo(() => {
    return weekDays.map(day => ({
      date: day,
      records: mockAttendance.filter(r => isSameDay(r.date, day)),
    }));
  }, [currentWeek]);

  const stats = useMemo(() => {
    const total = mockAttendance.length;
    const present = mockAttendance.filter(r => r.status === 'present').length;
    const absent = mockAttendance.filter(r => r.status === 'absent').length;
    const late = mockAttendance.filter(r => r.status === 'late').length;
    return { total, present, absent, late, percentage: Math.round((present / total) * 100) };
  }, []);

  const chartData = [
    { name: 'Был', value: stats.present, color: '#22c55e' },
    { name: 'Не был', value: stats.absent, color: '#ef4444' },
    { name: 'Опоздал', value: stats.late, color: '#f59e0b' },
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'present': return <CheckCircle className="w-4 h-4 text-emerald-500" />;
      case 'absent': return <XCircle className="w-4 h-4 text-red-500" />;
      case 'late': return <Clock className="w-4 h-4 text-amber-500" />;
      case 'excused': return <FileText className="w-4 h-4" style={{ color: 'hsl(var(--sp-yellow-dark))' }} />;
      default: return null;
    }
  };

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-semibold" style={{ color: 'hsl(var(--sp-text))' }}>Посещаемость</h1>

      {/* Week Picker */}
      <div className="rounded-xl border p-3" style={{ backgroundColor: 'hsl(var(--sp-white))', borderColor: 'hsl(var(--sp-border))' }}>
        <div className="flex items-center justify-between">
          <button className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: 'hsl(var(--sp-yellow-light))' }}
                  onClick={() => setCurrentWeek(subWeeks(currentWeek, 1))}>
            <ChevronLeft className="w-4 h-4" style={{ color: 'hsl(var(--sp-yellow-dark))' }} />
          </button>
          <div className="text-center">
            <p className="font-medium text-sm" style={{ color: 'hsl(var(--sp-text))' }}>
              {format(weekStart, 'd MMM', { locale: ru })} – {format(weekEnd, 'd MMM', { locale: ru })}
            </p>
            <button className="text-xs font-medium mt-0.5" style={{ color: 'hsl(var(--sp-yellow-dark))' }} onClick={() => setCurrentWeek(new Date())}>
              Сегодня
            </button>
          </div>
          <button className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: 'hsl(var(--sp-yellow-light))' }}
                  onClick={() => setCurrentWeek(addWeeks(currentWeek, 1))}>
            <ChevronRight className="w-4 h-4" style={{ color: 'hsl(var(--sp-yellow-dark))' }} />
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { label: 'Всего', value: stats.total, bg: 'hsl(var(--sp-yellow-light))' },
          { label: 'Был', value: stats.present, bg: '#dcfce7' },
          { label: 'Не был', value: stats.absent, bg: '#fee2e2' },
          { label: 'Опоздал', value: stats.late, bg: '#fef3c7' },
        ].map((item) => (
          <div key={item.label} className="rounded-xl p-2 text-center border" style={{ backgroundColor: item.bg, borderColor: 'hsl(var(--sp-border))' }}>
            <p className="text-lg font-bold" style={{ color: 'hsl(var(--sp-text))' }}>{item.value}</p>
            <p className="text-[10px]" style={{ color: 'hsl(var(--sp-text-secondary))' }}>{item.label}</p>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="rounded-xl border p-4" style={{ backgroundColor: 'hsl(var(--sp-white))', borderColor: 'hsl(var(--sp-border))' }}>
        <div className="flex items-center gap-4">
          <div className="w-24 h-24">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={chartData} cx="50%" cy="50%" innerRadius={25} outerRadius={40} paddingAngle={2} dataKey="value">
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex-1">
            <p className="text-3xl font-bold" style={{ color: 'hsl(var(--sp-text))' }}>{stats.percentage}%</p>
            <p className="text-xs" style={{ color: 'hsl(var(--sp-text-secondary))' }}>Общая посещаемость</p>
            <div className="flex gap-3 mt-2">
              {chartData.map((item) => (
                <div key={item.name} className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-[10px]" style={{ color: 'hsl(var(--sp-text-secondary))' }}>{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Weekly Details */}
      <div className="rounded-xl border p-4" style={{ backgroundColor: 'hsl(var(--sp-white))', borderColor: 'hsl(var(--sp-border))' }}>
        <h3 className="text-xs font-medium uppercase tracking-wider mb-3" style={{ color: 'hsl(var(--sp-text-secondary))' }}>Детали недели</h3>
        <div className="space-y-3">
          {weekAttendance.map(({ date, records }) => (
            <div key={date.toISOString()} className="pb-3 last:pb-0" style={{ borderBottom: '1px solid hsl(var(--sp-border))' }}>
              <div className="flex items-center justify-between mb-2">
                <p className="font-medium text-sm capitalize" style={{ color: 'hsl(var(--sp-text))' }}>{format(date, 'EEEE', { locale: ru })}</p>
                <p className="text-xs" style={{ color: 'hsl(var(--sp-text-secondary))' }}>{format(date, 'd MMM', { locale: ru })}</p>
              </div>
              {records.length > 0 ? (
                <div className="space-y-1.5">
                  {records.map((record) => (
                    <div key={record.id} className="flex items-center justify-between rounded-lg p-2"
                         style={{ backgroundColor: 'hsl(var(--sp-yellow-light))' }}>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(record.status)}
                        <span className="text-sm" style={{ color: 'hsl(var(--sp-text))' }}>{record.subject}</span>
                      </div>
                      <span className="text-xs" style={{ color: 'hsl(var(--sp-text-secondary))' }}>{record.time}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs italic" style={{ color: 'hsl(var(--sp-text-secondary))' }}>Нет данных</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default StudentAttendance;
