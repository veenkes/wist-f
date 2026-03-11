import { useState } from 'react';
import { Home, Calendar, Award, ClipboardCheck, User, BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import StudentHome from './StudentHome';
import StudentSchedule from './StudentSchedule';
import StudentGrades from './StudentGrades';
import StudentAttendance from './StudentAttendance';
import StudentProfile from './StudentProfile';
import StudentLibrary from './StudentLibrary';
import StudentNotifications from './StudentNotifications';

type Tab = 'home' | 'schedule' | 'grades' | 'attendance' | 'library' | 'profile';

const StudentPortal = () => {
  const [activeTab, setActiveTab] = useState<Tab>('home');
  const [showNotifications, setShowNotifications] = useState(false);

  const tabs = [
    { id: 'home' as Tab, label: 'Главная', icon: Home },
    { id: 'schedule' as Tab, label: 'Расписание', icon: Calendar },
    { id: 'grades' as Tab, label: 'Оценки', icon: Award },
    { id: 'attendance' as Tab, label: 'Посещения', icon: ClipboardCheck },
    { id: 'library' as Tab, label: 'Библиотека', icon: BookOpen },
    { id: 'profile' as Tab, label: 'Профиль', icon: User },
  ];

  const renderContent = () => {
    if (showNotifications) {
      return <StudentNotifications onBack={() => setShowNotifications(false)} />;
    }
    switch (activeTab) {
      case 'home': return <StudentHome onOpenNotifications={() => setShowNotifications(true)} />;
      case 'schedule': return <StudentSchedule />;
      case 'grades': return <StudentGrades />;
      case 'attendance': return <StudentAttendance />;
      case 'library': return <StudentLibrary />;
      case 'profile': return <StudentProfile />;
      default: return <StudentHome onOpenNotifications={() => setShowNotifications(true)} />;
    }
  };

  return (
    <div className="student-portal min-h-screen flex flex-col max-w-[420px] mx-auto relative font-inter"
         style={{ backgroundColor: 'hsl(var(--sp-warm-white))' }}>
      <main className="flex-1 overflow-y-auto pb-20">
        {renderContent()}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 max-w-[420px] mx-auto z-50 border-t"
           style={{ 
             backgroundColor: 'hsl(var(--sp-white))', 
             borderColor: 'hsl(var(--sp-border))',
             boxShadow: '0 -2px 10px hsl(var(--sp-yellow) / 0.08)'
           }}>
        <div className="flex justify-around items-center h-16 px-0.5">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id); setShowNotifications(false); }}
                className="flex flex-col items-center justify-center w-full h-full min-w-0 py-2 transition-all duration-200 relative"
                style={{ color: isActive ? 'hsl(var(--sp-yellow-dark))' : 'hsl(var(--sp-text-secondary))' }}
              >
                <Icon className={cn("w-4.5 h-4.5 mb-0.5 transition-all duration-200", isActive && "scale-110")} style={{ width: 18, height: 18 }} />
                <span className={cn("text-[9px] leading-tight", isActive ? "font-bold" : "font-medium")}>
                  {tab.label}
                </span>
                {isActive && (
                  <div className="absolute -bottom-px left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full"
                       style={{ backgroundColor: 'hsl(var(--sp-yellow))' }} />
                )}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
};

export default StudentPortal;
