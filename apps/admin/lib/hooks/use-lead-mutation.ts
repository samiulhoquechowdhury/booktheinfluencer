'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ApiError } from '@/lib/api/client';
import type { Workspace } from '@/lib/types';

export const errMsg = (e: unknown) => (e instanceof ApiError ? e.message : 'Something went wrong. Try again.');

/** A change to one lead: adopt the returned workspace (or refetch) and refresh the pipeline views. */
export function useLeadMutation<T>(id: string, fn: (v: T) => Promise<Workspace | unknown>, success: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: (data) => {
      if (data && typeof data === 'object' && 'bookings' in data) qc.setQueryData(['lead', id], data);
      else void qc.invalidateQueries({ queryKey: ['lead', id] });
      void qc.invalidateQueries({ queryKey: ['board'] });
      void qc.invalidateQueries({ queryKey: ['leads'] });
      toast.success(success);
    },
    onError: (e) => toast.error(errMsg(e)),
  });
}
