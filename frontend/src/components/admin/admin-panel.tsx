"use client";

import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { useKeluar } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import type { UserMe } from "@/types/auth";

import { HalaqahManager } from "./halaqah-manager";
import { PenggunaManager } from "./pengguna-manager";
import { TautanDialog, type TautanTampil } from "./tautan-dialog";

type Tab = "santri" | "staf" | "halaqah";

const TABS: ReadonlyArray<{ nilai: Tab; label: string }> = [
  { nilai: "santri", label: "Santri" },
  { nilai: "staf", label: "Ustadz & Admin" },
  { nilai: "halaqah", label: "Halaqah (Kelas)" },
];

export function AdminPanel({ user }: { user: UserMe }) {
  const keluar = useKeluar();
  const [tab, setTab] = useState<Tab>("santri");
  const [tautan, setTautan] = useState<TautanTampil | null>(null);

  return (
    <div className="space-y-5 pt-4">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b pb-4">
        <div>
          <p className="text-xs text-slate-500">Panel Admin</p>
          <h1 className="text-xl font-bold">{user.nama_lengkap}</h1>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/ustadz" className="text-sm font-medium text-emerald-700 underline-offset-4 hover:underline">
            Dasbor ustadz
          </Link>
          <Button variant="secondary" size="sm" onClick={keluar}>
            Keluar
          </Button>
        </div>
      </header>

      <div role="tablist" aria-label="Kelola data" className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.nilai}
            role="tab"
            type="button"
            aria-selected={tab === t.nilai}
            onClick={() => setTab(t.nilai)}
            className={cn(
              "rounded-full border px-4 py-2 text-sm font-medium transition-colors",
              tab === t.nilai
                ? "border-emerald-600 bg-emerald-600 text-white"
                : "border-slate-200 bg-white text-slate-700 hover:bg-emerald-50",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div role="tabpanel">
        {tab === "halaqah" ? (
          <HalaqahManager />
        ) : (
          <PenggunaManager
            key={tab}
            mode={tab}
            penggunaSaatIniId={user.id}
            onTautan={(nama, t) => setTautan({ nama, tautan: t })}
          />
        )}
      </div>

      <TautanDialog tampil={tautan} onClose={() => setTautan(null)} />
    </div>
  );
}
