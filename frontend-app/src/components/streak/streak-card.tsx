"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { useStreak } from "@/hooks/use-streak";
import { SESI_META, URUTAN_SESI } from "@/lib/session";
import { cn } from "@/lib/utils";
import type { HariStreak, StreakResponse } from "@/types/setoran";

import { StreakFlame, type FlameState } from "./streak-flame";

function labelHari(tanggal: string): string {
  const [y, m, d] = tanggal.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("id-ID", { weekday: "short" });
}

function keadaanApi(data: StreakResponse): FlameState {
  if (data.current_streak === 0) return "padam";
  return data.terancam ? "terancam" : "menyala";
}

function pesanStatus(data: StreakResponse): { teks: string; kelas: string } {
  const sisa = data.sesi_tersisa.map((s) => SESI_META[s].label).join(" & ");
  if (data.hari_ini_lengkap) {
    return {
      teks: "ZSM hari ini lengkap! Sampai jumpa besok 🎉",
      kelas: "bg-emerald-50 text-emerald-800",
    };
  }
  if (data.terancam) {
    return {
      teks: `Selesaikan ${sisa} hari ini agar streak ${data.current_streak} hari tidak putus.`,
      kelas: "bg-amber-50 text-amber-900",
    };
  }
  return {
    teks: `Lengkapi ${sisa || "ketiga sesi"} hari ini untuk memulai streak baru.`,
    kelas: "bg-slate-100 text-slate-700",
  };
}

function HariBulat({ hari, hariIni }: { hari: HariStreak; hariIni: boolean }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-xs text-slate-500">{labelHari(hari.tanggal)}</span>
      <span
        aria-label={`${labelHari(hari.tanggal)}: ${hari.jumlah_sesi} dari 3 sesi`}
        className={cn(
          "flex size-9 items-center justify-center rounded-full text-sm font-semibold",
          hari.lengkap
            ? "bg-emerald-500 text-white"
            : hari.jumlah_sesi > 0
              ? "bg-amber-100 text-amber-800"
              : "bg-slate-100 text-slate-400",
          hariIni && "ring-2 ring-emerald-600 ring-offset-2",
        )}
      >
        {hari.lengkap ? "✓" : hari.jumlah_sesi > 0 ? hari.jumlah_sesi : ""}
      </span>
    </div>
  );
}

export function StreakCard({ santriId }: { santriId: string }) {
  const { data, isLoading, isError } = useStreak(santriId);

  if (isLoading) return <Skeleton className="h-64 w-full rounded-2xl" />;

  if (isError || !data) {
    return (
      <p className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
        Streak belum dapat dimuat. Setoran tetap bisa diisi seperti biasa.
      </p>
    );
  }

  const status = pesanStatus(data);

  return (
    <section aria-label="ZSM Streak" className="space-y-4 rounded-2xl border bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <StreakFlame jumlah={data.current_streak} state={keadaanApi(data)} />
        <div className="text-right">
          <p className="text-xs text-slate-500">Rekor</p>
          <p className="text-lg font-bold tabular-nums">🏆 {data.highest_streak}</p>
        </div>
      </div>

      <p className={cn("rounded-xl px-3 py-2 text-sm", status.kelas)}>{status.teks}</p>

      <ul className="grid grid-cols-3 gap-2" aria-label="Sesi hari ini">
        {URUTAN_SESI.map((sesi) => {
          const selesai = data.sesi_hari_ini[sesi];
          const meta = SESI_META[sesi];
          return (
            <li
              key={sesi}
              className={cn(
                "flex flex-col items-center rounded-xl border px-2 py-2 text-center",
                selesai ? "border-emerald-300 bg-emerald-50" : "border-slate-200 bg-white",
              )}
            >
              <span className="text-lg" aria-hidden>
                {selesai ? "✅" : meta.emoji}
              </span>
              <span className="text-xs font-semibold">{meta.label}</span>
              <span className={cn("text-[11px]", selesai ? "text-emerald-700" : "text-slate-400")}>
                {selesai ? "Selesai" : "Belum"}
              </span>
            </li>
          );
        })}
      </ul>

      <div className="flex justify-between" aria-label="7 hari terakhir">
        {data.mingguan.map((hari, i) => (
          <HariBulat key={hari.tanggal} hari={hari} hariIni={i === data.mingguan.length - 1} />
        ))}
      </div>
    </section>
  );
}
