"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api";
import type { ValidasiInput } from "@/types/dashboard";

/** Dasbor "real-time" memakai polling berkala (bukan WebSocket). */
export const DASHBOARD_REFRESH_MS = 15_000;

export interface DashboardParams {
  tanggal: string;
  halaqahId?: string;
  q?: string;
  /** true = polling otomatis (hanya masuk akal untuk tanggal hari ini). */
  live: boolean;
}

export function useHalaqahList() {
  return useQuery({
    queryKey: ["halaqah"],
    queryFn: api.listHalaqah,
    staleTime: 5 * 60_000,
  });
}

export function useDashboardUstadz(p: DashboardParams) {
  return useQuery({
    queryKey: ["dashboard", "ustadz", p.tanggal, p.halaqahId ?? "", p.q ?? ""],
    queryFn: () =>
      api.getDashboardUstadz({ tanggal: p.tanggal, halaqahId: p.halaqahId, q: p.q }),
    placeholderData: keepPreviousData,
    refetchInterval: p.live ? DASHBOARD_REFRESH_MS : false,
    refetchOnWindowFocus: true,
    staleTime: 5_000,
  });
}

export function useValidasiSetoran() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { id: string } & ValidasiInput) =>
      api.validasiSetoran(v.id, { rating: v.rating, catatan_ustadz: v.catatan_ustadz }),
    // Tidak ditunggu: tombol tidak perlu menahan "Menyimpan…" selama dasbor/analitik dimuat ulang.
    onSuccess: () => {
      for (const kunci of ["setoran", "dashboard", "analitik", "profil"]) {
        void qc.invalidateQueries({ queryKey: [kunci] });
      }
    },
  });
}
