import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Teacher {
  id: string;
  user_id: string | null;
  full_name: string;
  preferred_name: string | null;
  staff_id: string | null;
  photo_url: string | null;
  gender: string | null;
  date_of_birth: string | null;
  nationality: string | null;
  passport_number: string | null;
  email: string;
  phone: string | null;
  address_line1: string | null;
  address_line2: string | null;
  address_line3: string | null;
  city: string | null;
  country: string | null;
  postal_code: string | null;
  status: string;
  employment_type: string | null;
  role: string | null;
  department: string | null;
  hiring_date: string | null;
  end_date: string | null;
  subject_specialization: string[] | null;
  certification_level: string | null;
  sen_expertise: boolean | null;
  previous_schools: string[] | null;
  house_division: string | null;
  school_division: string | null;
  teaching_load: string | null;
  tutor_group: string | null;
  assigned_classes: string[] | null;
  assigned_year_groups: string[] | null;
  home_room: string | null;
  staff_category: string | null;
  documents: any[] | null;
  notes: string | null;
  training_records: any[] | null;
  performance_records: any[] | null;
  created_at: string;
  updated_at: string;
}

export function useTeachers() {
  const queryClient = useQueryClient();

  const { data: teachers = [], isLoading, error } = useQuery({
    queryKey: ['teachers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('teachers')
        .select('*')
        .order('full_name');
      
      if (error) throw error;
      return data as Teacher[];
    },
  });

  const addTeacher = useMutation({
    mutationFn: async (teacher: Omit<Teacher, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('teachers')
        .insert(teacher)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teachers'] });
    },
  });

  const updateTeacher = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Teacher> & { id: string }) => {
      const { data, error } = await supabase
        .from('teachers')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teachers'] });
    },
  });

  const deleteTeacher = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('teachers')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teachers'] });
    },
  });

  return {
    teachers,
    isLoading,
    error,
    addTeacher,
    updateTeacher,
    deleteTeacher,
  };
}

export function useTeacher(id: string | null) {
  return useQuery({
    queryKey: ['teacher', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('teachers')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data as Teacher;
    },
    enabled: !!id,
  });
}
