import type { TipeSesi } from "@/types/setoran";

export const URUTAN_SESI: TipeSesi[] = ["ziadah", "sabqi", "murajaah"];

export const SESI_META: Record<
  TipeSesi,
  { label: string; waktu: string; emoji: string }
> = {
  ziadah: { label: "Ziadah", waktu: "Pagi", emoji: "🌅" },
  sabqi: { label: "Sabqi", waktu: "Malam", emoji: "🌙" },
  murajaah: { label: "Muraja'ah", waktu: "Bebas", emoji: "🔁" },
};

/** Sesi yang paling mungkin dipilih berdasarkan jam perangkat. */
export function sesiDefault(now: Date = new Date()): TipeSesi {
  const jam = now.getHours();
  if (jam < 12) return "ziadah";
  if (jam >= 18) return "sabqi";
  return "murajaah";
}

/** Tanggal lokal perangkat dalam format YYYY-MM-DD. */
export function tanggalLokal(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
