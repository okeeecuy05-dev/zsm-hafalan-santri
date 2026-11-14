"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { FilterStatus } from "@/lib/dashboard";
import { cn } from "@/lib/utils";
import type { Halaqah } from "@/types/dashboard";

const CHIPS: ReadonlyArray<{ nilai: FilterStatus; label: string }> = [
  { nilai: "semua", label: "Semua" },
  { nilai: "hijau", label: "Lengkap" },
  { nilai: "kuning", label: "Sebagian" },
  { nilai: "merah", label: "Belum setor" },
  { nilai: "validasi", label: "Perlu validasi" },
];

const SELECT_CLASS =
  "h-10 w-full rounded-lg border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500";

interface Props {
  tanggal: string;
  maxTanggal: string;
  onTanggalChange: (value: string) => void;
  q: string;
  onQChange: (value: string) => void;
  halaqah: Halaqah[];
  halaqahId: string;
  onHalaqahChange: (value: string) => void;
  filter: FilterStatus;
  onFilterChange: (value: FilterStatus) => void;
  jumlah: Record<FilterStatus, number>;
}

export function DashboardFilters(p: Props) {
  const tampilHalaqah = p.halaqah.length > 1;

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor="filter-cari">Cari santri</Label>
          <Input
            id="filter-cari"
            type="search"
            placeholder="Ketik nama santri…"
            className="h-10"
            value={p.q}
            maxLength={100}
            onChange={(e) => p.onQChange(e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="filter-tanggal">Tanggal</Label>
          <Input
            id="filter-tanggal"
            type="date"
            className="h-10"
            value={p.tanggal}
            max={p.maxTanggal}
            onChange={(e) => {
              if (e.target.value) p.onTanggalChange(e.target.value);
            }}
          />
        </div>

        {tampilHalaqah && (
          <div className="space-y-1.5">
            <Label htmlFor="filter-halaqah">Halaqah</Label>
            <select
              id="filter-halaqah"
              className={SELECT_CLASS}
              value={p.halaqahId}
              onChange={(e) => p.onHalaqahChange(e.target.value)}
            >
              <option value="">Semua halaqah</option>
              {p.halaqah.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.nama_kelas}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div role="group" aria-label="Filter status" className="flex flex-wrap gap-2">
        {CHIPS.map((c) => {
          const aktif = p.filter === c.nilai;
          return (
            <button
              key={c.nilai}
              type="button"
              aria-pressed={aktif}
              onClick={() => p.onFilterChange(c.nilai)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-sm transition-colors",
                aktif
                  ? "border-emerald-600 bg-emerald-600 text-white"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-emerald-50",
              )}
            >
              {c.label} <span className="tabular-nums opacity-80">({p.jumlah[c.nilai]})</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
