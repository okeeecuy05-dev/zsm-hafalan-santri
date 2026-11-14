"use client";

import { Button } from "@/components/ui/button";
import { formatRentang } from "@/lib/quran-data";
import type { RentangAyat } from "@/types/setoran";

interface Props {
  segmen: RentangAyat[];
  loading: boolean;
  onConfirm: () => void;
  onManual: () => void;
}

export function QuickConfirmCard({ segmen, loading, onConfirm, onManual }: Props) {
  return (
    <div className="space-y-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
      <div>
        <p className="text-sm font-semibold text-emerald-800">Sabqi malam ini (dari Ziadah pagi)</p>
        <ul className="mt-2 space-y-1">
          {segmen.map((s, i) => (
            <li key={i} className="text-lg font-semibold text-emerald-950">
              {formatRentang(s)}
            </li>
          ))}
        </ul>
      </div>
      <Button
        size="lg"
        className="h-14 w-full bg-emerald-600 text-base hover:bg-emerald-700"
        disabled={loading}
        onClick={onConfirm}
      >
        {loading ? "Menyimpan…" : "✅ Konfirmasi Sabqi"}
      </Button>
      <Button variant="ghost" className="w-full" disabled={loading} onClick={onManual}>
        Ubah manual
      </Button>
    </div>
  );
}
