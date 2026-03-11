import { useState } from 'react';
import { TrendingUp, TrendingDown, Minus, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

type Period = 'q1' | 'q2' | 'q3' | 'q4' | 'all';

const mockSubjectGrades = [
  { subject: 'Математика', grades: [5, 4, 5, 5, 3, 4, 5], avg: 4.4, trend: 'up' as const },
  { subject: 'Физика', grades: [4, 4, 3, 4, 5, 4], avg: 4.0, trend: 'same' as const },
  { subject: 'Английский', grades: [3, 4, 3, 4, 3, 3], avg: 3.3, trend: 'down' as const },
  { subject: 'Русский язык', grades: [4, 5, 4, 4, 5, 5], avg: 4.5, trend: 'up' as const },
  { subject: 'История', grades: [5, 5, 4, 5, 5], avg: 4.8, trend: 'up' as const },
  { subject: 'Химия', grades: [3, 3, 4, 3, 4], avg: 3.4, trend: 'same' as const },
  { subject: 'Информатика', grades: [5, 5, 5, 4, 5], avg: 4.8, trend: 'up' as const },
  { subject: 'Биология', grades: [4, 4, 3, 4, 4], avg: 3.8, trend: 'down' as const },
];

const overallGPA = (mockSubjectGrades.reduce((s, g) => s + g.avg, 0) / mockSubjectGrades.length).toFixed(1);

const StudentGrades = () => {
  const [selectedPeriod, setSelectedPeriod] = useState<Period>('q3');
  const [expandedSubject, setExpandedSubject] = useState<string | null>(null);

  const periods: { id: Period; label: string }[] = [
    { id: 'q1', label: '1 чет.' },
    { id: 'q2', label: '2 чет.' },
    { id: 'q3', label: '3 чет.' },
    { id: 'q4', label: '4 чет.' },
    { id: 'all', label: 'Год' },
  ];

  const getGradeColor = (grade: number) => {
    if (grade >= 5) return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300';
    if (grade >= 4) return 'text-white';
    if (grade >= 3) return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300';
    return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300';
  };

  const getGradeStyle = (grade: number) => {
    if (grade >= 4 && grade < 5) return { backgroundColor: 'hsl(var(--sp-yellow))', color: 'white' };
    return undefined;
  };

  const getAvgColor = (avg: number) => {
    if (avg >= 4.5) return 'text-emerald-600';
    if (avg >= 3.5) return '';
    if (avg >= 2.5) return 'text-amber-600';
    return 'text-red-600';
  };

  const getAvgStyle = (avg: number) => {
    if (avg >= 3.5 && avg < 4.5) return { color: 'hsl(var(--sp-yellow-dark))' };
    return undefined;
  };

  const TrendIcon = ({ trend }: { trend: 'up' | 'down' | 'same' }) => {
    if (trend === 'up') return <TrendingUp className="w-3 h-3 text-emerald-500" />;
    if (trend === 'down') return <TrendingDown className="w-3 h-3 text-red-500" />;
    return <Minus className="w-3 h-3" style={{ color: 'hsl(var(--sp-text-secondary))' }} />;
  };

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-semibold" style={{ color: 'hsl(var(--sp-text))' }}>Оценки</h1>

      {/* Period Selector */}
      <div className="flex gap-1 p-1 rounded-xl" style={{ backgroundColor: 'hsl(var(--sp-yellow-light))' }}>
        {periods.map((p) => (
          <button
            key={p.id}
            onClick={() => setSelectedPeriod(p.id)}
            className="flex-1 py-2 text-xs font-medium rounded-lg transition-all"
            style={
              selectedPeriod === p.id
                ? { backgroundColor: 'hsl(var(--sp-yellow))', color: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }
                : { color: 'hsl(var(--sp-text-secondary))' }
            }
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* GPA Card */}
      <div className="rounded-xl border p-4 text-center" style={{ backgroundColor: 'hsl(var(--sp-white))', borderColor: 'hsl(var(--sp-border))' }}>
        <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: 'hsl(var(--sp-text-secondary))' }}>Средний балл</p>
        <p className={cn("text-4xl font-bold", getAvgColor(parseFloat(overallGPA)))} style={getAvgStyle(parseFloat(overallGPA))}>{overallGPA}</p>
        <p className="text-xs mt-1" style={{ color: 'hsl(var(--sp-text-secondary))' }}>{mockSubjectGrades.length} предметов</p>
      </div>

      {/* Subject Grades */}
      <div className="space-y-2">
        {mockSubjectGrades.map((subj) => (
          <div key={subj.subject} className="rounded-xl border overflow-hidden" style={{ backgroundColor: 'hsl(var(--sp-white))', borderColor: 'hsl(var(--sp-border))' }}>
            <button
              onClick={() => setExpandedSubject(expandedSubject === subj.subject ? null : subj.subject)}
              className="w-full p-3 flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm", getGradeColor(Math.round(subj.avg)))}
                     style={getGradeStyle(Math.round(subj.avg))}>
                  {subj.avg.toFixed(1)}
                </div>
                <div className="text-left">
                  <p className="font-medium text-sm" style={{ color: 'hsl(var(--sp-text))' }}>{subj.subject}</p>
                  <div className="flex items-center gap-1">
                    <TrendIcon trend={subj.trend} />
                    <span className="text-[10px]" style={{ color: 'hsl(var(--sp-text-secondary))' }}>{subj.grades.length} оценок</span>
                  </div>
                </div>
              </div>
              <ChevronRight className={cn("w-4 h-4 transition-transform", expandedSubject === subj.subject && "rotate-90")} 
                            style={{ color: 'hsl(var(--sp-text-secondary))' }} />
            </button>

            {expandedSubject === subj.subject && (
              <div className="px-3 pb-3 pt-2" style={{ borderTop: '1px solid hsl(var(--sp-border))' }}>
                <div className="flex flex-wrap gap-1.5">
                  {subj.grades.map((grade, i) => (
                    <div key={i} className={cn("w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs", getGradeColor(grade))}
                         style={getGradeStyle(grade)}>
                      {grade}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default StudentGrades;
