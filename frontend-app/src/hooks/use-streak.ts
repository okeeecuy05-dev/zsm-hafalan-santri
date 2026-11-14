"use client";

import { useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api";

export function useStreak(santriId: string | null) {
  return useQuery({
    queryKey: ["streak", santriId ?? ""],
    queryFn: () => api.getStreak(santriId as string),
    enabled: !!santriId,
    staleTime: 60_000,
    // Pergantian hari dapat mengubah status streak; segarkan saat aplikasi dibuka kembali.
    refetchOnWindowFocus: true,
  });
}
