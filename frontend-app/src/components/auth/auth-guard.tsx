"use client";

import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useMe } from "@/hooks/use-auth";
import { useHydrated } from "@/hooks/use-hydrated";
import { HOME_PERAN } from "@/lib/auth";
import { useAuthStore } from "@/store/auth-store";
import type { Peran, UserMe } from "@/types/auth";

interface Props {
  roles: Peran[];
  children: (user: UserMe) => ReactNode;
}

function Memuat() {
  return (
    <div className="mx-auto max-w-md space-y-4 p-6" aria-busy="true">
      <Skeleton className="h-10 w-48" />
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-32 w-full" />
    </div>
  );
}

/**
 * Pelindung halaman: belum masuk -> /masuk; peran tidak sesuai -> halaman utama perannya.
 * Peran divalidasi ke server (GET /api/auth/me), bukan hanya dari data tersimpan di perangkat.
 */
export function AuthGuard({ roles, children }: Props) {
  const hydrated = useHydrated();
  const token = useAuthStore((s) => s.token);
  const router = useRouter();
  const me = useMe();

  const user = me.data;
  const diizinkan = !!user && roles.includes(user.role);

  useEffect(() => {
    if (!hydrated) return;
    if (!token) {
      router.replace("/masuk");
    } else if (user && !diizinkan) {
      router.replace(HOME_PERAN[user.role]);
    }
  }, [hydrated, token, user, diizinkan, router]);

  if (!hydrated || !token) return <Memuat />;

  if (me.isError) {
    return (
      <div className="mx-auto max-w-md space-y-3 p-6">
        <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {me.error instanceof Error ? me.error.message : "Gagal memeriksa sesi."}
        </p>
        <Button variant="outline" onClick={() => me.refetch()}>
          Coba lagi
        </Button>
      </div>
    );
  }

  if (!user || !diizinkan) return <Memuat />;
  return <>{children(user)}</>;
}
