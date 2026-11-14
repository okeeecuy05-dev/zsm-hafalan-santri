"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api";

export function useProfil(santriId: string, hari = 90) {
  return useQuery({
    queryKey: ["profil", santriId, hari],
    queryFn: () => api.getProfil(santriId, hari),
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });
}

export function useBadges(santriId: string) {
  return useQuery({
    queryKey: ["badges", santriId],
    queryFn: () => api.getBadges(santriId),
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });
}

export function useTandaiBadgeDilihat(santriId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.tandaiBadgeDilihat(santriId),
    onSuccess: () =>
      Promise.all([
        qc.invalidateQueries({ queryKey: ["badges", santriId] }),
        qc.invalidateQueries({ queryKey: ["profil", santriId] }),
      ]),
  });
}

export function useAnalitikUstadz(p: { halaqahId?: string; q?: string }) {
  return useQuery({
    queryKey: ["analitik", "ustadz", p.halaqahId ?? "", p.q ?? ""],
    queryFn: () => api.getAnalitikUstadz(p),
    placeholderData: keepPreviousData,
    staleTime: 60_000,
    refetchOnWindowFocus: true,
  });
}
