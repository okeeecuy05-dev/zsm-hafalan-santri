"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

import { api } from "@/lib/api";
import { useAuthStore } from "@/store/auth-store";

/** Memvalidasi sesi ke server (peran terbaru). 401 membersihkan sesi lewat lapisan API. */
export function useMe() {
  const token = useAuthStore((s) => s.token);
  return useQuery({
    queryKey: ["me", token ?? ""],
    queryFn: api.me,
    enabled: !!token,
    retry: false,
    staleTime: 5 * 60_000,
  });
}

export function useKeluar() {
  const router = useRouter();
  const keluar = useAuthStore((s) => s.keluar);
  return () => {
    keluar();
    router.replace("/masuk");
  };
}
