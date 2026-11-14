"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api";
import type {
  HalaqahCreateInput,
  HalaqahUpdateInput,
  PenggunaCreateInput,
  PenggunaUpdateInput,
} from "@/types/admin";
import type { Peran } from "@/types/auth";

export function usePengguna(p: { role?: Peran; q?: string }) {
  return useQuery({
    queryKey: ["admin", "pengguna", p.role ?? "", p.q ?? ""],
    queryFn: () => api.listPengguna(p),
  });
}

export function useHalaqahAdmin() {
  return useQuery({ queryKey: ["admin", "halaqah"], queryFn: api.listHalaqahAdmin });
}

function useRefreshAdmin() {
  const qc = useQueryClient();
  // Perubahan admin memengaruhi dasbor, analitik, dan profil ustadz/santri.
  return () =>
    Promise.all(
      ["admin", "dashboard", "analitik", "profil", "badges", "halaqah"].map((k) =>
        qc.invalidateQueries({ queryKey: [k] }),
      ),
    );
}

export function useBuatPengguna() {
  const refresh = useRefreshAdmin();
  return useMutation({
    mutationFn: (b: PenggunaCreateInput) => api.createPengguna(b),
    onSuccess: refresh,
  });
}

export function useUbahPengguna() {
  const refresh = useRefreshAdmin();
  return useMutation({
    mutationFn: (v: { id: string; body: PenggunaUpdateInput }) => api.updatePengguna(v.id, v.body),
    onSuccess: refresh,
  });
}

export function useHapusPengguna() {
  const refresh = useRefreshAdmin();
  return useMutation({ mutationFn: (id: string) => api.deletePengguna(id), onSuccess: refresh });
}

export function useGantiTautan() {
  const refresh = useRefreshAdmin();
  return useMutation({ mutationFn: (id: string) => api.gantiTautan(id), onSuccess: refresh });
}

export function useCabutTautan() {
  const refresh = useRefreshAdmin();
  return useMutation({ mutationFn: (id: string) => api.cabutTautan(id), onSuccess: refresh });
}

export function useBuatHalaqah() {
  const refresh = useRefreshAdmin();
  return useMutation({ mutationFn: (b: HalaqahCreateInput) => api.createHalaqah(b), onSuccess: refresh });
}

export function useUbahHalaqah() {
  const refresh = useRefreshAdmin();
  return useMutation({
    mutationFn: (v: { id: string; body: HalaqahUpdateInput }) => api.updateHalaqah(v.id, v.body),
    onSuccess: refresh,
  });
}

export function useHapusHalaqah() {
  const refresh = useRefreshAdmin();
  return useMutation({ mutationFn: (id: string) => api.deleteHalaqah(id), onSuccess: refresh });
}

export function useAturTargetKelas() {
  const refresh = useRefreshAdmin();
  return useMutation({
    mutationFn: (v: { id: string; targetJuz: number }) => api.aturTargetKelas(v.id, v.targetJuz),
    onSuccess: refresh,
  });
}
