"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api";

export const queryKeys = {
  setoran: (santriId: string, tanggal: string) => ["setoran", santriId, tanggal] as const,
  autoFill: (santriId: string, tanggal: string) => ["auto-fill", santriId, tanggal] as const,
};

/** Setoran seorang santri pada satu tanggal (dipakai halaman santri dan dialog validasi ustadz). */
export function useSetoranHariIni(santriId: string | null, tanggal: string) {
  return useQuery({
    queryKey: queryKeys.setoran(santriId ?? "", tanggal),
    queryFn: () => api.listSetoran({ santriId: santriId as string, tanggal }),
    enabled: !!santriId,
    // Agar santri melihat nilai/catatan ustadz saat aplikasi dibuka kembali.
    refetchOnWindowFocus: true,
  });
}

export function useAutoFill(santriId: string | null, tanggal: string, enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.autoFill(santriId ?? "", tanggal),
    queryFn: () => api.getAutoFill({ santriId: santriId as string, tanggal }),
    enabled: !!santriId && enabled,
  });
}

function useInvalidateSetoran() {
  const qc = useQueryClient();
  return () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: ["setoran"] }),
      qc.invalidateQueries({ queryKey: ["auto-fill"] }),
      qc.invalidateQueries({ queryKey: ["streak"] }),
    ]);
}

export function useCreateSetoran() {
  const invalidate = useInvalidateSetoran();
  return useMutation({ mutationFn: api.createSetoran, onSuccess: invalidate });
}

export function useDeleteSetoran() {
  const invalidate = useInvalidateSetoran();
  return useMutation({ mutationFn: api.deleteSetoran, onSuccess: invalidate });
}
