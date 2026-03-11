import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type WistGrade = 'PN' | 'N' | 'R' | `Y${number}` | string;
export type AcademicLevel = 'kindergarten' | 'primary' | 'secondary';

export interface Student {
  id: string;
  full_name: string;
  date_of_birth: string;
  gender?: 'male' | 'female' | 'other';
  phone?: string;
  email?: string;
  address?: string;
  id_passport_number?: string;
  photo_url?: string;
  status: 'active' | 'graduated' | 'suspended' | 'debt';
  enrollment_date: string;

  /**
   * В БД может быть academic_level, group.name или что-то ещё.
   * Мы нормализуем в grade (PN/N/R/Y1..Y13) и оставляем academic_level как есть.
   */
  academic_level?: string;
  grade?: WistGrade;          // ✅ нормализованный grade
  grade_num?: number;         // ✅ 0..13
  level?: AcademicLevel;      // ✅ kindergarten|primary|secondary

  notes?: string;
  created_at: string;
  updated_at: string;

  parents?: Array<{
    id: string;
    full_name: string;
    phone: string;
    relation_type: string;
  }>;

  group?: {
    id: string;
    name: string;
  } | null;
}

// ---------- Grade helpers ----------
function normalizeWistGrade(raw: any): WistGrade {
  const v = String(raw ?? '').trim().toUpperCase();
  if (!v) return '';
  if (v === 'PN' || v === 'N' || v === 'R') return v;
  if (/^Y\d{1,2}$/.test(v)) return v as WistGrade;
  return v;
}

function gradeToYearNumber(grade: WistGrade): number {
  const g = normalizeWistGrade(grade);
  if (g === 'PN' || g === 'N' || g === 'R') return 0;
  const m = /^Y(\d{1,2})$/.exec(g);
  if (!m) return 0;
  const n = Number(m[1]);
  return Number.isFinite(n) ? n : 0;
}

function gradeToLevel(grade: WistGrade): AcademicLevel {
  const y = gradeToYearNumber(grade);
  if (y === 0) return 'kindergarten';
  if (y >= 1 && y <= 9) return 'primary';
  return 'secondary';
}

/**
 * Как именно вытаскиваем grade для проекта:
 * 1) student.grade (если появится в БД)
 * 2) student.academic_level
 * 3) group.name (если у студента есть привязка к группе)
 */
function resolveStudentGrade(student: any): WistGrade {
  return normalizeWistGrade(
    student?.grade ??
    student?.academic_level ??
    student?.group?.name ??
    student?.student_groups?.[0]?.group?.name
  );
}

// ---------- useStudents ----------
export const useStudents = () => {
  const queryClient = useQueryClient();

  const { data: students = [], isLoading, error } = useQuery({
    queryKey: ['students'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('students')
        .select(`
          *,
          student_parents(
            parent:parents(id, full_name, phone),
            relation_type
          ),
          student_groups(
            group:groups(id, name)
          )
        `)
        .order('full_name');

      if (error) throw error;

      return (data || []).map((student: any): Student => {
        const group = student.student_groups?.[0]?.group || null;

        const normalized = {
          ...student,
          parents: student.student_parents?.map((sp: any) => ({
            ...sp.parent,
            relation_type: sp.relation_type
          })) || [],
          group
        } as Student;

        const grade = resolveStudentGrade({ ...normalized, group });
        const grade_num = gradeToYearNumber(grade);
        const level = gradeToLevel(grade);

        return {
          ...normalized,
          grade,
          grade_num,
          level,
        };
      });
    }
  });

  const createStudent = useMutation({
    mutationFn: async (studentData: any) => {
      const { data, error } = await supabase
        .from('students')
        .insert([studentData])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      toast.success('Student created successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create student: ${error.message}`);
    }
  });

  const updateStudent = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Student> & { id: string }) => {
      // не отправляем вычисляемые поля обратно в БД
      const { grade, grade_num, level, group, parents, ...safeUpdates } = updates as any;

      const { data, error } = await supabase
        .from('students')
        .update(safeUpdates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      toast.success('Student updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update student: ${error.message}`);
    }
  });

  const deleteStudent = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('students')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      toast.success('Student deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete student: ${error.message}`);
    }
  });

  return {
    students,
    isLoading,
    error,
    createStudent,
    updateStudent,
    deleteStudent
  };
};

// ---------- useStudent ----------
export const useStudent = (id: string) => {
  return useQuery({
    queryKey: ['student', id],
    queryFn: async () => {
      const { data: studentData, error: studentError } = await supabase
        .from('students')
        .select('*')
        .eq('id', id)
        .single();

      if (studentError) throw studentError;

      const { data: parentsData } = await supabase
        .from('student_parents')
        .select(`
          relation_type,
          is_primary_contact,
          parent:parents(*)
        `)
        .eq('student_id', id);

      const { data: groupsData } = await supabase
        .from('student_groups')
        .select(`group:groups(*)`)
        .eq('student_id', id);

      const { data: caretakersData } = await supabase
        .from('student_caretakers')
        .select(`caretaker:caretakers(*)`)
        .eq('student_id', id);

      const { data: paymentsData } = await supabase
        .from('payments')
        .select('*')
        .eq('student_id', id);

      const { data: violationsData } = await supabase
        .from('violations')
        .select('*')
        .eq('student_id', id);

      const { data: documentsData } = await supabase
        .from('student_documents')
        .select('*')
        .eq('student_id', id);

      const groups = groupsData?.map((sg: any) => sg.group).filter(Boolean) || [];
      const primaryGroup = groups[0] || null;

      const grade = resolveStudentGrade({
        ...studentData,
        group: primaryGroup
      });

      const grade_num = gradeToYearNumber(grade);
      const level = gradeToLevel(grade);

      return {
        ...studentData,
        grade,
        grade_num,
        level,
        parents: parentsData?.map((sp: any) => ({
          ...sp.parent,
          relation_type: sp.relation_type,
          is_primary_contact: sp.is_primary_contact
        })) || [],
        groups,
        group: primaryGroup,
        caretakers: caretakersData?.map((sc: any) => sc.caretaker).filter(Boolean) || [],
        payments: paymentsData || [],
        violations: violationsData || [],
        documents: documentsData || []
      };
    },
    enabled: !!id
  });
};