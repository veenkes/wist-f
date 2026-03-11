import { useState, useEffect } from 'react';
import { studentService } from '@/services/student.service';
import { toast } from 'sonner';

export interface ParentChild {
  id: string;
  name: string;
  group: string;
}

export interface UIParent {
  id: string;
  full_name: string;
  phone: string;
  email: string;
  address: string;
  occupation: string;
  children: ParentChild[];
}

export const useParents = () => {
  const [parents, setParents] = useState<UIParent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchParents = async () => {
    setIsLoading(true);
    try {
      // Запрашиваем студентов с большим лимитом, чтобы вытащить всех родителей
      const response = await studentService.listStudents({ limit: 1000 });
      
      const parentsMap = new Map<string, UIParent>();

      response.data.forEach((student) => {
        student.parents?.forEach((p) => {
          // Используем ID, если есть, иначе номер телефона как уникальный ключ
          const parentKey = p.id || p.phone; 
          
          if (!parentKey) return;

          if (!parentsMap.has(parentKey)) {
            parentsMap.set(parentKey, {
              id: p.id || parentKey,
              full_name: p.name,
              phone: p.phone,
              email: p.email || '',
              address: student.address || '', // Берем адрес ученика
              occupation: p.relationship || 'Родитель/Опекун', // Ставим статус из relationship
              children: []
            });
          }
          
          const parentRecord = parentsMap.get(parentKey)!;
          
          // Добавляем ребенка, если его еще нет в списке у этого родителя
          if (!parentRecord.children.some(c => c.id === student.id)) {
            parentRecord.children.push({
              id: student.id,
              name: `${student.name} ${student.surname}`,
              group: `${student.grade} ${student.className}`.trim()
            });
          }
        });
      });

      setParents(Array.from(parentsMap.values()));
    } catch (error) {
      console.error('Error fetching parents:', error);
      toast.error('Не удалось загрузить список родителей');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchParents();
  }, []);

  return { parents, isLoading, refetch: fetchParents };
};