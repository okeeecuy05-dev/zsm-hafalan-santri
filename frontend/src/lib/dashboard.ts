import type { BarisSantri, Indikator, StatusSesi } from "@/types/dashboard";

export type FilterStatus = "semua" | Indikator | "validasi";

export const INDIKATOR_META: Record<Indikator, { label: string; dot: string; badge: string }> = {
  hijau: {
    label: "Lengkap",
    dot: "bg-emerald-500",
    badge: "border-emerald-200 bg-emerald-50 text-emerald-800",
  },
  kuning: {
    label: "Sebagian",
    dot: "bg-amber-400",
    badge: "border-amber-200 bg-amber-50 text-amber-900",
  },
  merah: {
    label: "Belum setor",
    dot: "bg-red-500",
    badge: "border-red-200 bg-red-50 text-red-800",
  },
};

export const STATUS_SESI_META: Record<StatusSesi, { ikon: string; label: string; kelas: string }> = {
  belum: { ikon: "—", label: "Belum", kelas: "bg-slate-100 text-slate-400" },
  menunggu: { ikon: "⏳", label: "Menunggu", kelas: "bg-amber-100 text-amber-900" },
  terverifikasi: { ikon: "✓", label: "Terverifikasi", kelas: "bg-emerald-100 text-emerald-800" },
};

export const RATING_LABEL: Record<number, string> = {
  1: "Perlu diulang",
  2: "Kurang lancar",
  3: "Cukup",
  4: "Lancar",
  5: "Mutqin",
};

export function cocokFilter(baris: BarisSantri, filter: FilterStatus): boolean {
  if (filter === "semua") return true;
  if (filter === "validasi") return baris.menunggu_validasi > 0;
  return baris.indikator === filter;
}

export function formatTanggalPanjang(tanggal: string): string {
  const [y, m, d] = tanggal.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
