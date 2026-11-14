"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";
import { useKeluar } from "@/hooks/use-auth";

export function AppHeader({ nama }: { nama: string }) {
  const keluar = useKeluar();

  return (
    <header className="sticky top-0 z-10 bg-emerald-600 px-4 py-3 text-white">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs opacity-80">ZSM Hafalan Santri</p>
          <p className="truncate font-semibold leading-tight">{nama}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/profil" className="rounded-md px-2 py-1 text-sm font-medium underline-offset-4 hover:underline">
            Profil
          </Link>
          <Button variant="secondary" size="sm" onClick={keluar}>
            Keluar
          </Button>
        </div>
      </div>
    </header>
  );
}
