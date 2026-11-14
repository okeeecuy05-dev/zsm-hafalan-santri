import { formatAngka, formatTanggalLengkap } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { BadgeStatus } from "@/types/analytics";

export const IKON_LENCANA: Record<number, string> = {
  1: "🌱",
  5: "📖",
  10: "⭐",
  15: "🌟",
  20: "🏅",
  25: "🏆",
  30: "👑",
};

export function ikonLencana(juz: number): string {
  return IKON_LENCANA[juz] ?? "🏅";
}

export function BadgeShowcase({ badges, totalAyat }: { badges: BadgeStatus[]; totalAyat: number }) {
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4" aria-label="Etalase lencana">
      {badges.map((b) => {
        const kurang = Math.max(0, b.ambang_ayat - totalAyat);
        return (
          <li
            key={b.id}
            className={cn(
              "flex flex-col items-center gap-1 rounded-2xl border p-3 text-center",
              b.diperoleh ? "border-amber-300 bg-amber-50" : "border-slate-200 bg-slate-50 opacity-70",
            )}
          >
            <span className={cn("text-4xl", !b.diperoleh && "grayscale")} aria-hidden>
              {b.diperoleh ? ikonLencana(b.juz) : "🔒"}
            </span>
            <span className="text-sm font-semibold">{b.nama_badge}</span>
            <span className="text-xs text-slate-600">
              {b.diperoleh && b.tanggal_didapat
                ? `Diraih ${formatTanggalLengkap(b.tanggal_didapat)}`
                : `Butuh ${formatAngka(kurang)} ayat lagi`}
            </span>
            {b.baru && <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-[11px] font-medium text-white">Baru!</span>}
          </li>
        );
      })}
    </ul>
  );
}
