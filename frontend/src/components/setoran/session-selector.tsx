"use client";

import { SESI_META, URUTAN_SESI } from "@/lib/session";
import { cn } from "@/lib/utils";
import type { TipeSesi } from "@/types/setoran";

interface Props {
  value: TipeSesi;
  onChange: (value: TipeSesi) => void;
}

export function SessionSelector({ value, onChange }: Props) {
  return (
    <div role="group" aria-label="Pilih sesi" className="grid grid-cols-3 gap-2">
      {URUTAN_SESI.map((sesi) => {
        const meta = SESI_META[sesi];
        const aktif = value === sesi;
        return (
          <button
            key={sesi}
            type="button"
            aria-pressed={aktif}
            onClick={() => onChange(sesi)}
            className={cn(
              "flex flex-col items-center gap-0.5 rounded-xl border px-2 py-3 transition-colors",
              aktif
                ? "border-emerald-600 bg-emerald-600 text-white"
                : "border-slate-200 bg-white text-slate-700 active:bg-emerald-50",
            )}
          >
            <span className="text-xl" aria-hidden>
              {meta.emoji}
            </span>
            <span className="text-sm font-semibold">{meta.label}</span>
            <span className={cn("text-xs", aktif ? "text-emerald-100" : "text-slate-500")}>
              {meta.waktu}
            </span>
          </button>
        );
      })}
    </div>
  );
}
