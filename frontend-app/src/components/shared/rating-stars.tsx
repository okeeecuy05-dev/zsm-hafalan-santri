"use client";

import { cn } from "@/lib/utils";

interface Props {
  /** 0 = belum dinilai, 1-5 = jumlah bintang. */
  value: number;
  /** Jika diberikan, bintang dapat diklik (mode input). Jika tidak, hanya tampilan. */
  onChange?: (value: number) => void;
  disabled?: boolean;
  label?: string;
}

const BINTANG = [1, 2, 3, 4, 5];

export function RatingStars({ value, onChange, disabled, label = "Kelancaran" }: Props) {
  if (!onChange) {
    return (
      <span role="img" aria-label={`${label}: ${value} dari 5 bintang`} className="inline-flex gap-0.5">
        {BINTANG.map((n) => (
          <span key={n} aria-hidden className={cn("text-lg leading-none", n <= value ? "text-amber-400" : "text-slate-300")}>
            ★
          </span>
        ))}
      </span>
    );
  }

  return (
    <div role="radiogroup" aria-label={label} className="inline-flex gap-1">
      {BINTANG.map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={`${n} bintang`}
          disabled={disabled}
          onClick={() => onChange(n)}
          className={cn(
            "rounded-md p-1 text-2xl leading-none transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:opacity-50",
            n <= value ? "text-amber-400" : "text-slate-300 hover:text-amber-200",
          )}
        >
          ★
        </button>
      ))}
    </div>
  );
}
