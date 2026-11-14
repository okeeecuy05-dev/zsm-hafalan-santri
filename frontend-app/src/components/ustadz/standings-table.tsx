"use client";

import { Button } from "@/components/ui/button";
import { INDIKATOR_META, STATUS_SESI_META } from "@/lib/dashboard";
import { SESI_META, URUTAN_SESI } from "@/lib/session";
import { cn } from "@/lib/utils";
import type { BarisSantri, SelSesi } from "@/types/dashboard";

function SelBadge({ sel }: { sel: SelSesi }) {
  const meta = STATUS_SESI_META[sel.status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium",
        meta.kelas,
      )}
    >
      <span aria-hidden>{meta.ikon}</span>
      {meta.label}
      {sel.jumlah_setoran > 1 && <span className="tabular-nums">×{sel.jumlah_setoran}</span>}
    </span>
  );
}

interface Props {
  baris: BarisSantri[];
  onBuka: (baris: BarisSantri) => void;
}

export function StandingsTable({ baris, onBuka }: Props) {
  if (baris.length === 0) {
    return (
      <p className="rounded-xl border border-dashed p-6 text-center text-sm text-slate-500">
        Tidak ada santri yang cocok dengan filter ini.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border">
      <table className="w-full min-w-[720px] text-left text-sm">
        <caption className="sr-only">Klasemen setoran harian santri</caption>
        <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th scope="col" className="w-12 px-3 py-2.5">
              #
            </th>
            <th scope="col" className="px-3 py-2.5">
              Santri
            </th>
            {URUTAN_SESI.map((sesi) => (
              <th key={sesi} scope="col" className="px-3 py-2.5">
                {SESI_META[sesi].label}
              </th>
            ))}
            <th scope="col" className="px-3 py-2.5">
              Status
            </th>
            <th scope="col" className="px-3 py-2.5 text-right">
              Aksi
            </th>
          </tr>
        </thead>
        <tbody>
          {baris.map((b) => {
            const ind = INDIKATOR_META[b.indikator];
            const perluValidasi = b.menunggu_validasi > 0;
            return (
              <tr key={b.santri_id} className="border-t">
                <td className="px-3 py-3 font-semibold tabular-nums text-slate-500">{b.peringkat}</td>
                <th scope="row" className="px-3 py-3 font-normal">
                  <div className="font-medium text-slate-900">{b.nama_lengkap}</div>
                  {b.nama_halaqah && <div className="text-xs text-slate-500">{b.nama_halaqah}</div>}
                </th>
                {URUTAN_SESI.map((sesi) => (
                  <td key={sesi} className="px-3 py-3">
                    <SelBadge sel={b.sesi[sesi]} />
                  </td>
                ))}
                <td className="px-3 py-3">
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-medium",
                      ind.badge,
                    )}
                  >
                    <span aria-hidden className={cn("size-2 rounded-full", ind.dot)} />
                    {ind.label}
                  </span>
                </td>
                <td className="px-3 py-3 text-right">
                  {b.jumlah_sesi === 0 ? (
                    <span className="text-slate-400" aria-label="Belum ada setoran">
                      —
                    </span>
                  ) : (
                    <Button
                      size="sm"
                      variant={perluValidasi ? "default" : "outline"}
                      className={perluValidasi ? "bg-emerald-600 hover:bg-emerald-700" : undefined}
                      onClick={() => onBuka(b)}
                    >
                      {perluValidasi ? `Validasi (${b.menunggu_validasi})` : "Lihat"}
                    </Button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
