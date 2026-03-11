import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Group {
  id: string;
  name: string;
  grade_level: number | null;
  academic_year: string | null;
  student_count: number | null;
  curator_id: string | null;
  created_at: string | null;
  updated_at: string | null;
  curator?: {
    id: string;
    full_name: string;
    email: string;
    avatar_url: string | null;
  };
}

export const useGroups = () => {
  const { data: groups, isLoading, error } = useQuery({
    queryKey: ['groups'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('groups')
        .select(`
          *,
          curator:employees!groups_curator_id_fkey(
            id,
            full_name,
            email,
            avatar_url
          )
        `)
        .order('grade_level', { ascending: true });

      if (error) throw error;
      return data as Group[];
    },
  });

  return { groups: groups || [], isLoading, error };
};

export const useGroupStudents = (groupId: string | null) => {
  const { data: students, isLoading, error } = useQuery({
    queryKey: ['group-students', groupId],
    queryFn: async () => {
      if (!groupId) return [];

      const { data, error } = await supabase
        .from('student_groups')
        .select(`
          student_id,
          students!inner(
            id,
            full_name,
            status,
            academic_level,
            photo_url,
            enrollment_date
          )
        `)
        .eq('group_id', groupId)
        .is('left_at', null);

      if (error) throw error;
      return data?.map(item => item.students) || [];
    },
    enabled: !!groupId,
  });

  return { students: students || [], isLoading, error };
};
