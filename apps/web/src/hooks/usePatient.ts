import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getPatient, updatePatient, type Patient } from '../api/client';

export function usePatient() {
  return useQuery({ queryKey: ['patient'], queryFn: getPatient });
}

export function useUpdatePatient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Patient>) => updatePatient(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['patient'] }),
  });
}
