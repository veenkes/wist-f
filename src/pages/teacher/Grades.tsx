import React, { useEffect, useMemo, useState } from 'react';
import {
  Award,
  Users,
  Calendar,
  TrendingUp,
  CheckCircle,
  Save,
  BarChart3,
  ClipboardList,
  AlertTriangle,
  Target,
  Plus,
  MessageSquare,
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

import { toast } from 'sonner';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  Area,
  AreaChart,
} from 'recharts';

import { useQuery } from '@tanstack/react-query';
import { studentService } from '@/services/student.service';
import { localDB } from '@/lib/localDb';

/* ------------------------- YOUR CLASSES ------------------------- */
const CLASS_CODES = ['PN', 'N', 'R', 'Y1', 'Y2', 'Y3', 'Y4', 'Y5', 'Y6', 'Y7', 'Y8', 'Y9', 'Y10', 'Y11', 'Y12', 'Y13'] as const;
type ClassCode = typeof CLASS_CODES[number];

type GradingSystem = 'numeric' | 'letter';

/* ------------------------- GRADING RULES ------------------------- */
/**
PN/N/R/Y1..Y9  -> numeric 1-6
Y10..Y13       -> A-E (IGCSE/A-Level)
*/
const parseYear = (grade?: string): number => {
  const g = String(grade || '').toUpperCase().trim();
  if (g === 'PN' || g === 'N' || g === 'R') return 0;
  if (g.startsWith('Y')) {
    const n = parseInt(g.slice(1), 10);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
};

const getSystem = (grade?: string): GradingSystem => {
  const y = parseYear(grade);
  return y >= 10 ? 'letter' : 'numeric';
};

/* ------------------------- NUMERIC 1-6 (YOUR BREAKDOWN) ------------------------- */
const NUMERIC_GRADES = [6, 5, 4, 3, 2, 1];

const NUMERIC_LABELS: Record<number, string> = {
  1: 'Significantly Below Expectations',
  2: 'Below Expectations',
  3: 'Approaching Expectations',
  4: 'Working towards Expected Level',
  5: 'At Expected Level',
  6: 'Above Expected Level',
};

const NUMERIC_DESCRIPTIONS: Record<number, string> = {
  1: 'Not met basic requirements. Needs significant support.',
  2: 'Some progress, gaps remain. Needs guidance.',
  3: 'Some understanding, inconsistent progress.',
  4: 'Developing grasp, below expected. Regular support needed.',
  5: 'Meets expectations. Solid understanding.',
  6: 'Above expected. Shows initiative, sometimes beyond curriculum.',
};

const NUMERIC_COLORS: Record<number, string> = {
  6: 'bg-success/10 text-success border-success/30',
  5: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30',
  4: 'bg-sky-500/10 text-sky-600 border-sky-500/30',
  3: 'bg-warning/10 text-warning border-warning/30',
  2: 'bg-orange-500/10 text-orange-600 border-orange-500/30',
  1: 'bg-destructive/10 text-destructive border-destructive/30',
};

/* ------------------------- LETTER A-E ------------------------- */
const LETTER_GRADES = ['A', 'B', 'C', 'D', 'E'] as const;

const LETTER_LABELS: Record<string, string> = {
  A: 'Excellent',
  B: 'Very Good',
  C: 'Good',
  D: 'Satisfactory',
  E: 'Needs Improvement',
};

const LETTER_COLORS: Record<string, string> = {
  A: 'bg-success/10 text-success border-success/30',
  B: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30',
  C: 'bg-sky-500/10 text-sky-600 border-sky-500/30',
  D: 'bg-warning/10 text-warning border-warning/30',
  E: 'bg-destructive/10 text-destructive border-destructive/30',
};

// Averaging scale for letter
const LETTER_TO_NUM: Record<string, number> = { A: 5, B: 4, C: 3, D: 2, E: 1 };
const NUM_TO_LETTER = (avg: number): string => {
  if (avg >= 4.5) return 'A';
  if (avg >= 3.5) return 'B';
  if (avg >= 2.5) return 'C';
  if (avg >= 1.5) return 'D';
  return 'E';
};

const TERMS = ['Term 1', 'Term 2', 'Term 3', 'Term 4'];

const GRADE_TYPES = [
  { value: 'lesson', label: 'Classwork', icon: '📖' },
  { value: 'test', label: 'Test/Exam', icon: '📝' },
  { value: 'lab', label: 'Lab Work', icon: '🔬' },
  { value: 'homework', label: 'Homework', icon: '📚' },
] as const;

/* ------------------------- TYPES ------------------------- */
interface StudentRow {
  id: string;
  name: string;
  grade: string; // PN..Y13
  className?: string;
}

interface Grade {
  id: string;
  studentId: string;
  subject: string;
  term: string;
  type: string;
  value: string; // "6" or "A"
  numericValue: number; // for averaging
  date: string; // yyyy-mm-dd
  comment?: string;
}

/* ------------------------- LOCAL STORAGE (FAST) ------------------------- */
const LS = {
  grades: 'grades:v1',
  term: 'grades:term:v1', // { [studentId]: { [`${subject}-${term}`]: value } }
  year: 'grades:year:v1', // { [studentId]: { [subject]: value } }
};

function safeLoad<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}
function safeSave<T>(key: string, value: T) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

const uid = () => `${Date.now()}_${Math.random().toString(16).slice(2)}`;
const todayISO = () => new Date().toISOString().split('T')[0];

/* ------------------------- UI HELPERS ------------------------- */
const renderGradeCell = (value: string, gradeCode?: string) => {
  const sys = getSystem(gradeCode);
  let cls = 'bg-muted';
  if (sys === 'numeric') cls = NUMERIC_COLORS[parseInt(value, 10)] || 'bg-muted';
  else cls = LETTER_COLORS[value] || 'bg-muted';

  return (
    <span className={`inline-flex items-center justify-center min-w-[28px] h-7 px-1 rounded-md text-xs font-bold border ${cls}`}>
      {value}
    </span>
  );
};

const formatAverage = (avg: number, gradeCode?: string) => {
  const sys = getSystem(gradeCode);
  if (sys === 'letter') return NUM_TO_LETTER(avg);
  return avg.toFixed(1);
};

const getAvgBadgeVariant = (avg: number, gradeCode?: string): 'default' | 'secondary' | 'destructive' => {
  const sys = getSystem(gradeCode);
  if (sys === 'numeric') return avg >= 5 ? 'default' : avg >= 3 ? 'secondary' : 'destructive';
  return avg >= 4 ? 'default' : avg >= 2.5 ? 'secondary' : 'destructive';
};

const validateGrade = (valueRaw: string, gradeCode: string) => {
  const sys = getSystem(gradeCode);
  const v = valueRaw.trim().toUpperCase();

  if (sys === 'numeric') {
    const n = parseInt(v, 10);
    if (!Number.isFinite(n) || n < 1 || n > 6) return { ok: false as const, error: 'Grade must be 1–6' };
    return { ok: true as const, normalized: String(n), numeric: n };
  }

  if (!LETTER_GRADES.includes(v as any)) return { ok: false as const, error: 'Grade must be A–E' };
  return { ok: true as const, normalized: v, numeric: LETTER_TO_NUM[v] };
};

/* ------------------------- ADD GRADE MODAL ------------------------- */
const AddGradeModal: React.FC<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  student: StudentRow;
  subject: string;
  term: string;
  onSubmit: (payload: { value: string; numericValue: number; type: string; comment: string }) => void;
}> = ({ open, onOpenChange, student, subject, term, onSubmit }) => {
  const system = getSystem(student.grade);

  const [selectedGrade, setSelectedGrade] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState('lesson');
  const [comment, setComment] = useState('');

  useEffect(() => {
    if (!open) return;
    setSelectedGrade(null);
    setSelectedType('lesson');
    setComment('');
  }, [open]);

  const handleSubmit = () => {
    if (!selectedGrade) return toast.error('Please select a grade');

    const check = validateGrade(selectedGrade, student.grade);
    if (!check.ok) return toast.error(check.error);

    onSubmit({
      value: check.normalized,
      numericValue: check.numeric,
      type: selectedType,
      comment,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-warning/20 flex items-center justify-center">
              <Plus className="w-4 h-4 text-warning" />
            </div>
            New Grade
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          <div className="bg-muted/50 rounded-xl p-3 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Student</span>
              <span className="text-sm font-semibold">{student.name}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Class</span>
              <span className="text-sm font-medium">{String(student.grade).toUpperCase()}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Subject</span>
              <span className="text-sm font-medium">{subject}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Term</span>
              <span className="text-sm">{term}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">System</span>
              <Badge variant="outline" className="text-[10px]">
                {system === 'numeric' ? 'Numeric (1–6)' : 'IGCSE/A-Level (A–E)'}
              </Badge>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Grade</Label>

            {system === 'numeric' ? (
              <div className="grid grid-cols-6 gap-2">
                {NUMERIC_GRADES.map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setSelectedGrade(String(g))}
                    className={`flex flex-col items-center gap-1 p-2.5 rounded-xl border-2 transition-all cursor-pointer ${
                      selectedGrade === String(g)
                        ? `${NUMERIC_COLORS[g]} ring-2 ring-offset-2 ring-current scale-105`
                        : `border-border ${NUMERIC_COLORS[g]}`
                    }`}
                    title={NUMERIC_DESCRIPTIONS[g]}
                  >
                    <span className="text-xl font-bold">{g}</span>
                    <span className="text-[8px] font-medium leading-tight text-center">
                      {NUMERIC_LABELS[g].slice(0, 12)}
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-5 gap-2">
                {LETTER_GRADES.map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setSelectedGrade(g)}
                    className={`flex flex-col items-center gap-1 p-2.5 rounded-xl border-2 transition-all cursor-pointer ${
                      selectedGrade === g
                        ? `${LETTER_COLORS[g]} ring-2 ring-offset-2 ring-current scale-105`
                        : `border-border ${LETTER_COLORS[g]}`
                    }`}
                  >
                    <span className="text-lg font-bold">{g}</span>
                    <span className="text-[8px] font-medium leading-tight text-center">{LETTER_LABELS[g]}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Type</Label>
            <div className="grid grid-cols-2 gap-2">
              {GRADE_TYPES.map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => setSelectedType(type.value)}
                  className={`flex items-center gap-2 p-2.5 rounded-lg border text-sm transition-all cursor-pointer ${
                    selectedType === type.value
                      ? 'border-primary bg-primary/10 text-primary font-medium'
                      : 'border-border hover:border-muted-foreground/30 text-muted-foreground'
                  }`}
                >
                  <span>{type.icon}</span>
                  <span>{type.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <MessageSquare className="w-3 h-3 inline mr-1" />
              Comment (optional)
            </Label>
            <Textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Add a comment..." rows={2} className="resize-none" />
          </div>

          <Button
            onClick={handleSubmit}
            disabled={!selectedGrade}
            className="w-full bg-warning hover:bg-warning/90 text-warning-foreground font-semibold h-11"
          >
            <Plus className="w-4 h-4 mr-2" />
            Submit Grade {selectedGrade || ''}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

/* ------------------------- MAIN PAGE ------------------------- */

export const Grades: React.FC = () => {
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [selectedTerm, setSelectedTerm] = useState<string>('Term 1');
  const [selectedStudentId, setSelectedStudentId] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<string>('journal');

  const [grades, setGrades] = useState<Grade[]>([]);
  const [termGrades, setTermGrades] = useState<Record<string, Record<string, string>>>({});
  const [yearGrades, setYearGrades] = useState<Record<string, Record<string, string>>>({});

  const [editingCell, setEditingCell] = useState<{ studentId: string; column: 'term' | 'year' } | null>(null);
  const [editValue, setEditValue] = useState('');

  const [addModal, setAddModal] = useState<{ open: boolean; studentId: string } | null>(null);

  // real students
  const { data: realStudentsData } = useQuery({
    queryKey: ['students-list'],
    queryFn: () => studentService.listStudents({ limit: 2000 }),
    staleTime: 5 * 60 * 1000,
  });

  const students: StudentRow[] = useMemo(() => {
    const list = realStudentsData?.data || [];
    return list.map((s: any) => ({
      id: String(s.id),
      name: `${s.name ?? ''} ${s.surname ?? ''}`.trim() || s.full_name || 'Student',
      grade: String(s.grade || '').toUpperCase() || 'Y1',
      className: s.className ?? s.class_name,
    }));
  }, [realStudentsData]);

  // real subjects from lessons localDB
  const subjects = useMemo(() => {
    const lessons = (localDB.getLessons?.() || []) as any[];
    const set = new Set<string>();
    lessons.forEach((l) => {
      const subj = String(l.subject || '').trim();
      if (subj) set.add(subj);
    });
    const arr = Array.from(set);
    return arr.length ? arr.sort() : ['Mathematics', 'English', 'Physics', 'Chemistry', 'History', 'Biology', 'Geography', 'Literature'];
  }, []);

  // init selectedSubject
  useEffect(() => {
    if (!selectedSubject && subjects.length) setSelectedSubject(subjects[0]);
  }, [subjects, selectedSubject]);

  // load local state
  useEffect(() => {
    setGrades(safeLoad<Grade[]>(LS.grades, []));
    setTermGrades(safeLoad<Record<string, Record<string, string>>>(LS.term, {}));
    setYearGrades(safeLoad<Record<string, Record<string, string>>>(LS.year, {}));
  }, []);

  // filtered students
  const filteredStudents = useMemo(() => {
    let list = students;

    if (selectedClass !== 'all') {
      list = list.filter((s) => String(s.grade).toUpperCase() === String(selectedClass).toUpperCase());
    }
    if (selectedStudentId !== 'all') {
      list = list.filter((s) => s.id === selectedStudentId);
    }
    return list;
  }, [students, selectedClass, selectedStudentId]);

  // grades for current view
  const studentGradesFiltered = useMemo(() => {
    return grades.filter((g) => {
      if (g.subject !== selectedSubject) return false;
      if (g.term !== selectedTerm) return false;

      if (selectedStudentId !== 'all' && g.studentId !== selectedStudentId) return false;

      if (selectedClass !== 'all') {
        const st = students.find((s) => s.id === g.studentId);
        if (!st) return false;
        if (String(st.grade).toUpperCase() !== String(selectedClass).toUpperCase()) return false;
      }

      return true;
    });
  }, [grades, selectedSubject, selectedTerm, selectedStudentId, selectedClass, students]);

  const getStudentGradesByType = (studentId: string, type: string) =>
    studentGradesFiltered.filter((g) => g.studentId === studentId && g.type === type);

  const getStudentAverage = (studentId: string) => {
    const sg = studentGradesFiltered.filter((g) => g.studentId === studentId);
    if (!sg.length) return 0;
    return +(sg.reduce((sum, g) => sum + g.numericValue, 0) / sg.length).toFixed(2);
  };

  // dominant system for charts
  const currentSystem: GradingSystem = useMemo(() => {
    const systems = filteredStudents.map((s) => getSystem(s.grade));
    const letters = systems.filter((x) => x === 'letter').length;
    return letters > systems.length / 2 ? 'letter' : 'numeric';
  }, [filteredStudents]);

  const addGrade = (student: StudentRow, payload: { value: string; numericValue: number; type: string; comment: string }) => {
    const newGrade: Grade = {
      id: uid(),
      studentId: student.id,
      subject: selectedSubject,
      term: selectedTerm,
      type: payload.type,
      value: payload.value,
      numericValue: payload.numericValue,
      date: todayISO(),
      comment: payload.comment?.trim() || undefined,
    };

    setGrades((prev) => {
      const next = [...prev, newGrade];
      safeSave(LS.grades, next);
      return next;
    });

    toast.success(`Grade ${newGrade.value} submitted`);
  };

  const handleSetTermGrade = (studentId: string) => {
    const st = students.find((s) => s.id === studentId);
    if (!st) return;

    const res = validateGrade(editValue, st.grade);
    if (!res.ok) return toast.error(res.error);

    const key = `${selectedSubject}-${selectedTerm}`;
    setTermGrades((prev) => {
      const next = { ...prev, [studentId]: { ...(prev[studentId] || {}), [key]: res.normalized } };
      safeSave(LS.term, next);
      return next;
    });

    setEditingCell(null);
    setEditValue('');
    toast.success(`Term grade ${res.normalized} submitted`);
  };

  const handleSetYearGrade = (studentId: string) => {
    const st = students.find((s) => s.id === studentId);
    if (!st) return;

    const res = validateGrade(editValue, st.grade);
    if (!res.ok) return toast.error(res.error);

    setYearGrades((prev) => {
      const next = { ...prev, [studentId]: { ...(prev[studentId] || {}), [selectedSubject]: res.normalized } };
      safeSave(LS.year, next);
      return next;
    });

    setEditingCell(null);
    setEditValue('');
    toast.success(`Year grade ${res.normalized} submitted`);
  };

  const gradeDistribution = useMemo(() => {
    if (currentSystem === 'numeric') {
      const counts: Record<number, number> = { 6: 0, 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
      studentGradesFiltered.forEach((g) => {
        const n = parseInt(g.value, 10);
        if (counts[n] !== undefined) counts[n]++;
      });
      return [
        { name: '6 (Above Expected)', value: counts[6], color: 'hsl(var(--success))' },
        { name: '5 (Expected)', value: counts[5], color: 'hsl(142 71% 55%)' },
        { name: '4 (Working towards)', value: counts[4], color: 'hsl(199 89% 48%)' },
        { name: '3 (Approaching)', value: counts[3], color: 'hsl(var(--warning))' },
        { name: '2 (Below)', value: counts[2], color: 'hsl(24 94% 50%)' },
        { name: '1 (Significantly Below)', value: counts[1], color: 'hsl(var(--destructive))' },
      ].filter((d) => d.value > 0);
    }

    const counts: Record<string, number> = { A: 0, B: 0, C: 0, D: 0, E: 0 };
    studentGradesFiltered.forEach((g) => {
      const v = g.value.toUpperCase();
      if (counts[v] !== undefined) counts[v]++;
    });
    const colors = ['hsl(var(--success))', 'hsl(142 71% 55%)', 'hsl(199 89% 48%)', 'hsl(var(--warning))', 'hsl(var(--destructive))'];
    return LETTER_GRADES.map((l, i) => ({ name: `${l} (${LETTER_LABELS[l]})`, value: counts[l], color: colors[i] })).filter((d) => d.value > 0);
  }, [studentGradesFiltered, currentSystem]);

  const subjectAverages = useMemo(() => {
    return subjects.map((subject) => {
      const subGrades = grades.filter((g) => {
        if (g.subject !== subject) return false;
        if (g.term !== selectedTerm) return false;

        if (selectedStudentId !== 'all' && g.studentId !== selectedStudentId) return false;

        if (selectedClass !== 'all') {
          const st = students.find((s) => s.id === g.studentId);
          if (!st) return false;
          if (String(st.grade).toUpperCase() !== String(selectedClass).toUpperCase()) return false;
        }

        return true;
      });

      const avg = subGrades.length ? +(subGrades.reduce((s, g) => s + g.numericValue, 0) / subGrades.length).toFixed(2) : 0;
      return { subject: subject.slice(0, 10), average: avg, fullName: subject };
    });
  }, [grades, selectedTerm, selectedClass, selectedStudentId, students, subjects]);

  const termTrend = useMemo(() => {
    return TERMS.map((t) => {
      const tGrades = grades.filter((g) => {
        if (g.term !== t) return false;

        if (selectedStudentId !== 'all' && g.studentId !== selectedStudentId) return false;

        if (selectedClass !== 'all') {
          const st = students.find((s) => s.id === g.studentId);
          if (!st) return false;
          if (String(st.grade).toUpperCase() !== String(selectedClass).toUpperCase()) return false;
        }

        return true;
      });

      const avg = tGrades.length ? +(tGrades.reduce((s, g) => s + g.numericValue, 0) / tGrades.length).toFixed(2) : 0;
      return { term: t.replace('Term ', 'T'), avg, fullName: t };
    });
  }, [grades, selectedClass, selectedStudentId, students]);

  const dashboardStats = useMemo(() => {
    const relevantGrades = grades.filter((g) => {
      if (g.term !== selectedTerm) return false;

      if (selectedStudentId !== 'all' && g.studentId !== selectedStudentId) return false;

      if (selectedClass !== 'all') {
        const st = students.find((s) => s.id === g.studentId);
        if (!st) return false;
        if (String(st.grade).toUpperCase() !== String(selectedClass).toUpperCase()) return false;
      }
      return true;
    });

    const totalGrades = relevantGrades.length;
    const avg = totalGrades ? +(relevantGrades.reduce((s, g) => s + g.numericValue, 0) / totalGrades).toFixed(2) : 0;

    const studentsInScope = filteredStudents;

    const excellentStudents = studentsInScope.filter((s) => {
      const sg = relevantGrades.filter((g) => g.studentId === s.id);
      const sAvg = sg.length ? sg.reduce((sum, g) => sum + g.numericValue, 0) / sg.length : 0;
      const sys = getSystem(s.grade);
      return sg.length > 0 && (sys === 'numeric' ? sAvg >= 5 : sAvg >= 4);
    }).length;

    const atRisk = studentsInScope.filter((s) => {
      const sg = relevantGrades.filter((g) => g.studentId === s.id);
      const sAvg = sg.length ? sg.reduce((sum, g) => sum + g.numericValue, 0) / sg.length : 0;
      const sys = getSystem(s.grade);
      return sg.length > 0 && (sys === 'numeric' ? sAvg < 3 : sAvg < 2.5);
    }).length;

    return { totalGrades, avg, excellentStudents, atRisk, studentsCount: studentsInScope.length };
  }, [grades, selectedTerm, selectedClass, selectedStudentId, filteredStudents, students]);

  const selectedStudentData = useMemo(() => {
    if (selectedStudentId === 'all') return null;
    const student = students.find((s) => s.id === selectedStudentId);
    if (!student) return null;

    const studentAllGrades = grades.filter((g) => g.studentId === selectedStudentId);
    const bySubject: Record<string, Grade[]> = {};
    studentAllGrades.forEach((g) => {
      if (!bySubject[g.subject]) bySubject[g.subject] = [];
      bySubject[g.subject].push(g);
    });

    return { student, bySubject };
  }, [selectedStudentId, students, grades]);

  const currentStudentForModal = useMemo(() => {
    if (!addModal) return null;
    return students.find((s) => s.id === addModal.studentId) || null;
  }, [addModal, students]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Award className="w-6 h-6 text-primary" />
            Grades
          </h1>
          <p className="text-sm text-muted-foreground">Local academic journal (no backend) — real students + lessons</p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <Card className="border-l-4 border-l-primary">
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Average</p>
                  <p className="text-2xl font-bold mt-0.5">{dashboardStats.avg}</p>
                </div>
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${dashboardStats.avg >= 4 ? 'bg-success/10' : dashboardStats.avg >= 3 ? 'bg-warning/10' : 'bg-destructive/10'}`}>
                  <TrendingUp className={`w-4 h-4 ${dashboardStats.avg >= 4 ? 'text-success' : dashboardStats.avg >= 3 ? 'text-warning' : 'text-destructive'}`} />
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">{dashboardStats.totalGrades} grades</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-success">
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Top Performers</p>
                  <p className="text-2xl font-bold text-success mt-0.5">{dashboardStats.excellentStudents}</p>
                </div>
                <div className="w-9 h-9 rounded-lg bg-success/10 flex items-center justify-center">
                  <Award className="w-4 h-4 text-success" />
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">of {dashboardStats.studentsCount} students</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-destructive">
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">At Risk</p>
                  <p className="text-2xl font-bold text-destructive mt-0.5">{dashboardStats.atRisk}</p>
                </div>
                <div className="w-9 h-9 rounded-lg bg-destructive/10 flex items-center justify-center">
                  <AlertTriangle className="w-4 h-4 text-destructive" />
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">below minimum</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-warning col-span-2">
            <CardContent className="p-3">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-muted-foreground font-medium">Term Trend</p>
                <Target className="w-3.5 h-3.5 text-muted-foreground" />
              </div>
              <ResponsiveContainer width="100%" height={60}>
                <AreaChart data={termTrend}>
                  <defs>
                    <linearGradient id="avgGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="term" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, currentSystem === 'numeric' ? 6 : 5]} hide />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: '6px', fontSize: '11px' }}
                    labelFormatter={(_, payload) => payload[0]?.payload?.fullName || ''}
                    formatter={(value: number) => [value.toFixed(2), 'Average']}
                  />
                  <Area type="monotone" dataKey="avg" stroke="hsl(var(--primary))" fill="url(#avgGradient)" strokeWidth={2} dot={{ r: 3, fill: 'hsl(var(--primary))' }} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="journal" className="text-xs"><ClipboardList className="w-3.5 h-3.5 mr-1" />Journal</TabsTrigger>
          <TabsTrigger value="term" className="text-xs"><Calendar className="w-3.5 h-3.5 mr-1" />Terms</TabsTrigger>
          <TabsTrigger value="year" className="text-xs"><Award className="w-3.5 h-3.5 mr-1" />Year</TabsTrigger>
          <TabsTrigger value="analytics" className="text-xs"><BarChart3 className="w-3.5 h-3.5 mr-1" />Analytics</TabsTrigger>
        </TabsList>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 mt-4">
          <Select value={selectedClass} onValueChange={setSelectedClass}>
            <SelectTrigger className="w-[150px] h-9"><SelectValue placeholder="Class" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Classes</SelectItem>
              {CLASS_CODES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>

          <Select value={selectedSubject} onValueChange={setSelectedSubject}>
            <SelectTrigger className="w-[180px] h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              {subjects.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>

          <Select value={selectedTerm} onValueChange={setSelectedTerm}>
            <SelectTrigger className="w-[140px] h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              {TERMS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>

          <Select value={selectedStudentId} onValueChange={setSelectedStudentId}>
            <SelectTrigger className="w-[220px] h-9"><SelectValue placeholder="All Students" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Students</SelectItem>
              {students
                .filter((s) => selectedClass === 'all' || String(s.grade).toUpperCase() === String(selectedClass).toUpperCase())
                .map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* JOURNAL TAB */}
        <TabsContent value="journal">
          {selectedStudentData ? (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="w-4 h-4 text-primary" />
                  {selectedStudentData.student.name} — {String(selectedStudentData.student.grade).toUpperCase()}
                  <Badge variant="outline" className="text-[10px] ml-2">
                    {getSystem(selectedStudentData.student.grade) === 'numeric' ? '1–6' : 'A–E'}
                  </Badge>
                </CardTitle>
                <Button
                  onClick={() => setAddModal({ open: true, studentId: selectedStudentData.student.id })}
                  className="bg-warning hover:bg-warning/90 text-warning-foreground h-9 gap-1.5"
                >
                  <Plus className="w-4 h-4" />Grade
                </Button>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="text-left p-3 font-semibold">Subject</th>
                        <th className="text-center p-3 font-semibold">Grades</th>
                        <th className="text-center p-3 font-semibold">Average</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(selectedStudentData.bySubject).map(([subject, subGrades]) => {
                        const termG = subGrades.filter((g) => g.term === selectedTerm);
                        const avg = termG.length ? termG.reduce((s, g) => s + g.numericValue, 0) / termG.length : 0;
                        return (
                          <tr key={subject} className="border-b hover:bg-muted/30">
                            <td className="p-3 font-medium">{subject}</td>
                            <td className="p-3 text-center">
                              <div className="flex flex-wrap gap-1 justify-center">
                                {termG.map((g, i) => <span key={i}>{renderGradeCell(g.value, selectedStudentData.student.grade)}</span>)}
                              </div>
                            </td>
                            <td className="p-3 text-center font-bold">{formatAverage(avg, selectedStudentData.student.grade)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="text-left p-3 font-semibold sticky left-0 bg-muted/50 z-10">Student</th>
                        <th className="text-center p-2 font-semibold text-xs">System</th>
                        <th className="text-center p-2 font-semibold text-xs">Classwork</th>
                        <th className="text-center p-2 font-semibold text-xs">Tests</th>
                        <th className="text-center p-2 font-semibold text-xs">Lab</th>
                        <th className="text-center p-2 font-semibold text-xs">HW</th>
                        <th className="text-center p-2 font-semibold text-xs">Avg</th>
                        <th className="text-center p-2 font-semibold text-xs w-16">Add</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredStudents.map((student) => {
                        const system = getSystem(student.grade);
                        const lessonGrades = getStudentGradesByType(student.id, 'lesson');
                        const testGrades = getStudentGradesByType(student.id, 'test');
                        const labGrades = getStudentGradesByType(student.id, 'lab');
                        const hwGrades = getStudentGradesByType(student.id, 'homework');
                        const avg = getStudentAverage(student.id);

                        return (
                          <tr key={student.id} className="border-b hover:bg-muted/30">
                            <td className="p-3 font-medium sticky left-0 bg-background z-10">
                              <div>
                                <div className="text-sm">{student.name}</div>
                                <div className="text-xs text-muted-foreground">{String(student.grade).toUpperCase()}</div>
                              </div>
                            </td>

                            <td className="p-2 text-center">
                              <Badge variant="outline" className="text-[9px]">{system === 'numeric' ? '1–6' : 'A–E'}</Badge>
                            </td>

                            <td className="p-2 text-center">
                              <div className="flex flex-wrap gap-0.5 justify-center">
                                {lessonGrades.map((g, i) => <span key={i}>{renderGradeCell(g.value, student.grade)}</span>)}
                              </div>
                            </td>

                            <td className="p-2 text-center">
                              <div className="flex flex-wrap gap-0.5 justify-center">
                                {testGrades.map((g, i) => <span key={i}>{renderGradeCell(g.value, student.grade)}</span>)}
                              </div>
                            </td>

                            <td className="p-2 text-center">
                              <div className="flex flex-wrap gap-0.5 justify-center">
                                {labGrades.length ? labGrades.map((g, i) => <span key={i}>{renderGradeCell(g.value, student.grade)}</span>) : <span className="text-xs text-muted-foreground">—</span>}
                              </div>
                            </td>

                            <td className="p-2 text-center">
                              <div className="flex flex-wrap gap-0.5 justify-center">
                                {hwGrades.length ? hwGrades.map((g, i) => <span key={i}>{renderGradeCell(g.value, student.grade)}</span>) : <span className="text-xs text-muted-foreground">—</span>}
                              </div>
                            </td>

                            <td className="p-2 text-center">
                              <Badge variant={getAvgBadgeVariant(avg, student.grade)} className="text-xs">{formatAverage(avg, student.grade)}</Badge>
                            </td>

                            <td className="p-2 text-center">
                              <Button
                                size="sm"
                                className="h-8 w-8 p-0 bg-warning hover:bg-warning/80 text-warning-foreground rounded-lg shadow-sm"
                                onClick={() => setAddModal({ open: true, studentId: student.id })}
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* TERM TAB */}
        <TabsContent value="term">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="w-4 h-4 text-primary" />
                Term Grades — {selectedSubject} — {selectedTerm}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left p-3 font-semibold">Student</th>
                      <th className="text-center p-3 font-semibold">System</th>
                      <th className="text-center p-3 font-semibold">Average</th>
                      <th className="text-center p-3 font-semibold">Count</th>
                      <th className="text-center p-3 font-semibold">Term Grade</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStudents.map((student) => {
                      const avg = getStudentAverage(student.id);
                      const count = studentGradesFiltered.filter((g) => g.studentId === student.id).length;
                      const key = `${selectedSubject}-${selectedTerm}`;
                      const tGrade = termGrades[student.id]?.[key];

                      return (
                        <tr key={student.id} className="border-b hover:bg-muted/30">
                          <td className="p-3 font-medium">
                            <div className="text-sm">{student.name}</div>
                            <div className="text-xs text-muted-foreground">{String(student.grade).toUpperCase()}</div>
                          </td>
                          <td className="p-3 text-center">
                            <Badge variant="outline" className="text-[9px]">{getSystem(student.grade) === 'numeric' ? '1–6' : 'A–E'}</Badge>
                          </td>
                          <td className="p-3 text-center">{formatAverage(avg, student.grade)}</td>
                          <td className="p-3 text-center">{count}</td>
                          <td className="p-3 text-center">
                            {editingCell?.studentId === student.id && editingCell?.column === 'term' ? (
                              <div className="flex items-center gap-1 justify-center">
                                <Input
                                  value={editValue}
                                  onChange={(e) => setEditValue(e.target.value)}
                                  className="w-16 h-7 text-center text-xs"
                                  autoFocus
                                  placeholder={getSystem(student.grade) === 'numeric' ? '1-6' : 'A-E'}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleSetTermGrade(student.id);
                                    if (e.key === 'Escape') { setEditingCell(null); setEditValue(''); }
                                  }}
                                />
                                <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => handleSetTermGrade(student.id)}>
                                  <Save className="h-3 w-3" />
                                </Button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2 justify-center">
                                {tGrade ? renderGradeCell(tGrade, student.grade) : <span className="text-xs text-muted-foreground">—</span>}
                                <Button
                                  size="sm"
                                  className="h-7 w-7 p-0 bg-warning hover:bg-warning/80 text-warning-foreground rounded-lg"
                                  onClick={() => { setEditingCell({ studentId: student.id, column: 'term' }); setEditValue(tGrade || ''); }}
                                >
                                  <Plus className="h-3 w-3" />
                                </Button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* YEAR TAB */}
        <TabsContent value="year">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Award className="w-4 h-4 text-primary" />
                Year Grades — {selectedSubject}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left p-3 font-semibold">Student</th>
                      {TERMS.map((t) => <th key={t} className="text-center p-3 font-semibold text-xs">{t}</th>)}
                      <th className="text-center p-3 font-semibold">Year</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStudents.map((student) => {
                      const yGrade = yearGrades[student.id]?.[selectedSubject];

                      return (
                        <tr key={student.id} className="border-b hover:bg-muted/30">
                          <td className="p-3 font-medium">
                            <div className="text-sm">{student.name}</div>
                            <div className="text-xs text-muted-foreground">{String(student.grade).toUpperCase()}</div>
                          </td>

                          {TERMS.map((t) => {
                            const tg = termGrades[student.id]?.[`${selectedSubject}-${t}`];
                            return (
                              <td key={t} className="p-3 text-center">
                                {tg ? renderGradeCell(tg, student.grade) : <span className="text-xs text-muted-foreground">—</span>}
                              </td>
                            );
                          })}

                          <td className="p-3 text-center">
                            {editingCell?.studentId === student.id && editingCell?.column === 'year' ? (
                              <div className="flex items-center gap-1 justify-center">
                                <Input
                                  value={editValue}
                                  onChange={(e) => setEditValue(e.target.value)}
                                  className="w-16 h-7 text-center text-xs"
                                  autoFocus
                                  placeholder={getSystem(student.grade) === 'numeric' ? '1-6' : 'A-E'}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleSetYearGrade(student.id);
                                    if (e.key === 'Escape') { setEditingCell(null); setEditValue(''); }
                                  }}
                                />
                                <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => handleSetYearGrade(student.id)}>
                                  <Save className="h-3 w-3" />
                                </Button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2 justify-center">
                                {yGrade ? renderGradeCell(yGrade, student.grade) : <span className="text-xs text-muted-foreground">—</span>}
                                <Button
                                  size="sm"
                                  className="h-7 w-7 p-0 bg-warning hover:bg-warning/80 text-warning-foreground rounded-lg"
                                  onClick={() => { setEditingCell({ studentId: student.id, column: 'year' }); setEditValue(yGrade || ''); }}
                                >
                                  <Plus className="h-3 w-3" />
                                </Button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ANALYTICS TAB */}
        <TabsContent value="analytics">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle className="text-base">Grade Distribution — {selectedSubject}</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie data={gradeDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80}
                      label={({ name, value }) => `${name}: ${value}`}>
                      {gradeDistribution.map((entry, index) => <Cell key={index} fill={entry.color} />)}
                    </Pie>
                    <Tooltip /><Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Average by Subject</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={subjectAverages}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="subject" tick={{ fontSize: 11 }} />
                    <YAxis domain={[0, currentSystem === 'numeric' ? 6 : 5]} tick={{ fontSize: 11 }} />
                    <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: '6px', fontSize: '12px' }}
                      labelFormatter={(_, payload) => payload[0]?.payload?.fullName || ''} />
                    <Bar dataKey="average" name="Average" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {addModal && currentStudentForModal && (
        <AddGradeModal
          open={addModal.open}
          onOpenChange={(open) => { if (!open) setAddModal(null); }}
          student={currentStudentForModal}
          subject={selectedSubject}
          term={selectedTerm}
          onSubmit={(payload) => addGrade(currentStudentForModal, payload)}
        />
      )}
    </div>
  );
};

export default Grades;