import { cn } from "@/lib/utils";
import type { RingkasanDashboard } from "@/types/dashboard";

const KARTU: ReadonlyArray<{
  kunci: keyof RingkasanDashboard;
  label: string;
  dot?: string;
  angka: string;
}> = [
  { kunci: "total_santri", label: "Total santri", angka: "text-slate-900" },
  { kunci: "hijau", label: "Lengkap", dot: "bg-emerald-500", angka: "text-emerald-700" },
  { kunci: "kuning", label: "Sebagian", dot: "bg-amber-400", angka: "text-amber-700" },
  { kunci: "merah", label: "Belum setor", dot: "bg-red-500", angka: "text-red-700" },
  { kunci: "menunggu_validasi", label: "Menunggu validasi", angka: "text-slate-900" },
];

export function SummaryCards({ ringkasan }: { ringkasan: RingkasanDashboard }) {
  return (
    <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {KARTU.map((k) => (
        <div key={k.kunci} className="rounded-xl border bg-white p-3">
          <dt className="flex items-center gap-1.5 text-xs text-slate-500">
            {k.dot && <span aria-hidden className={cn("size-2.5 rounded-full", k.dot)} />}
            {k.label}
          </dt>
          <dd className={cn("mt-1 text-2xl font-bold tabular-nums", k.angka)}>{ringkasan[k.kunci]}</dd>
        </div>
      ))}
    </dl>
  );
}
