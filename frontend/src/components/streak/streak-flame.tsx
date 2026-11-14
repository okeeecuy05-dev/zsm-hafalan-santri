"use client";

import "./streak.css";

import { cn } from "@/lib/utils";

export type FlameState = "menyala" | "terancam" | "padam";

interface Props {
  jumlah: number;
  state: FlameState;
}

function ukuranApi(jumlah: number): string {
  if (jumlah >= 30) return "text-7xl";
  if (jumlah >= 7) return "text-6xl";
  return "text-5xl";
}

export function StreakFlame({ jumlah, state }: Props) {
  return (
    <div className="flex items-center gap-3">
      <span
        role="img"
        aria-label={`Streak ${jumlah} hari`}
        data-state={state}
        className={cn("zsm-flame", ukuranApi(jumlah))}
      >
        🔥
      </span>
      <div className="leading-none">
        {/* key memicu animasi "pop" setiap angka berubah */}
        <span key={jumlah} className="zsm-pop text-5xl font-extrabold tabular-nums text-slate-900">
          {jumlah}
        </span>
        <p className="mt-1 text-sm text-slate-500">hari berturut-turut</p>
      </div>
    </div>
  );
}
