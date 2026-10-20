'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { Blackout, PublicTalent, QuoteDecision, Session, SessionRole, TalentPage, TalentQuery } from '@repo/schemas';
import { api, ApiError } from './client';
import { qk } from './keys';
import { REAL_API } from './constants';

export const useSession = (initial?: Session) =>
  useQuery({ queryKey: qk.session, queryFn: api.session.get, initialData: initial, staleTime: Infinity });

export function useSetSession() {
  const qc = useQueryClient();
  return useMutation({
    // Real API: there's no role switch — GUEST signs out, anything else re-reads the session the
    // server just set (e.g. after an enquiry signs the customer in). Mock: the demo role switch.
    mutationFn: (role: SessionRole) => (!REAL_API ? api.session.set(role) : role === 'GUEST' ? api.session.logout() : api.session.get()),
    onSuccess: (s) => {
      qc.setQueryData(qk.session, s);
      qc.removeQueries({ queryKey: ['me'] });
      qc.removeQueries({ queryKey: ['portal'] });
    },
  });
}

/** Real API sign-in: text a code, then verify it (creates a customer account on first use). */
export const useRequestCode = () => useMutation({ mutationFn: (phone: string) => api.session.requestCode(phone) });

export function useVerifyCode() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ phone, code, name }: { phone: string; code: string; name?: string }) => api.session.verify(phone, code, name),
    onSuccess: (s) => {
      qc.setQueryData(qk.session, s);
      qc.removeQueries({ queryKey: ['me'] });
      qc.removeQueries({ queryKey: ['portal'] });
    },
  });
}

export const useTalents = (q: TalentQuery, initialData?: TalentPage) =>
  useQuery({
    queryKey: qk.talents(q),
    queryFn: () => api.talents.list(q),
    initialData,
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  });

export const useFeatured = (initialData?: PublicTalent[]) =>
  useQuery({ queryKey: ['talents', 'featured'], queryFn: api.talents.featured, initialData, staleTime: 300_000 });

/** Favourites — only fetched for customers. */
export function useFavourites(enabled: boolean) {
  return useQuery({ queryKey: qk.favourites, queryFn: api.favourites.list, enabled, staleTime: 30_000 });
}

/** Optimistic favourite toggle with rollback + toast. */
export function useToggleFavourite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ talent, on }: { talent: PublicTalent; on: boolean }) => api.favourites.set(talent.slug, on),
    onMutate: async ({ talent, on }) => {
      await qc.cancelQueries({ queryKey: qk.favourites });
      const prev = qc.getQueryData<PublicTalent[]>(qk.favourites);
      qc.setQueryData<PublicTalent[]>(qk.favourites, (old = []) =>
        on ? [...old.filter((t) => t.slug !== talent.slug), talent] : old.filter((t) => t.slug !== talent.slug),
      );
      return { prev };
    },
    onError: (e, _v, ctx) => {
      qc.setQueryData(qk.favourites, ctx?.prev);
      toast.error(e instanceof ApiError ? e.message : 'Couldn’t update favourites.');
    },
    onSuccess: (_d, { talent, on }) => {
      toast.success(on ? `${talent.name} saved to favourites` : `Removed ${talent.name}`, {
        action: { label: 'View', onClick: () => window.location.assign('/account/favourites') },
      });
    },
    onSettled: () => qc.invalidateQueries({ queryKey: qk.favourites }),
  });
}

export const useDashboard = () => useQuery({ queryKey: qk.dashboard, queryFn: api.bookings.dashboard });
export const useBooking = (ref: string) => useQuery({ queryKey: qk.booking(ref), queryFn: () => api.bookings.byRef(ref) });

export function useDecideQuote(ref: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ quoteId, decision }: { quoteId: string; decision: QuoteDecision }) => api.bookings.decideQuote(ref, quoteId, decision),
    onSuccess: (b) => {
      qc.setQueryData(qk.booking(ref), b);
      void qc.invalidateQueries({ queryKey: qk.dashboard });
    },
  });
}

export const usePayIntent = (ref: string) =>
  useMutation({ mutationFn: (milestoneId: string) => api.bookings.payIntent(ref, milestoneId) });

export const useRequestOtp = () => useMutation({ mutationFn: (phone: string) => api.enquiries.requestOtp(phone) });
export const useSubmitEnquiry = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.enquiries.submit,
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.dashboard }),
  });
};

export const usePortalProfile = () => useQuery({ queryKey: qk.portal, queryFn: api.portal.profile });
export const usePortalBookings = () => useQuery({ queryKey: qk.portalBookings, queryFn: api.portal.bookings });
export const usePayouts = () => useQuery({ queryKey: qk.payouts, queryFn: api.portal.payouts });
export const useBlackouts = () => useQuery({ queryKey: qk.blackouts, queryFn: api.portal.blackouts });

export function useToggleBlackout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ date, on }: { date: string; on: boolean }) => api.portal.setBlackout(date, on),
    onMutate: async ({ date, on }) => {
      await qc.cancelQueries({ queryKey: qk.blackouts });
      const prev = qc.getQueryData<Blackout[]>(qk.blackouts);
      qc.setQueryData<Blackout[]>(qk.blackouts, (old = []) =>
        on ? [...old, { date, reason: null }].sort((a, b) => a.date.localeCompare(b.date)) : old.filter((b) => b.date !== date),
      );
      return { prev };
    },
    onError: (e, _v, ctx) => {
      qc.setQueryData(qk.blackouts, ctx?.prev);
      toast.error(e instanceof ApiError ? e.message : 'Couldn’t update that date.');
    },
    onSuccess: (data) => qc.setQueryData(qk.blackouts, data),
  });
}
