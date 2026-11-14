"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAnalitikUstadz } from "@/hooks/use-profil";
import { formatAngka, formatBulanTahun } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { RingkasAnalitikSantri } from "@/types/analytics";

function StatusBadge({ r }: { r: RingkasAnalitikSantri }) {
  const a = r.analitik;
  let teks = "Berjalan";
  let kelas = "border-emerald-200 bg-emerald-50 text-emerald-800";
  if (a.melambat) {
    teks = `⚠ Melambat${a.persen_penurunan !== null ? ` (−${a.persen_penurunan}%)` : ""}`;
    kelas = "border-red-200 bg-red-50 text-red-800";
  } else if (a.status_prediksi === "tercapai") {
    teks = "🎉 Tercapai";
    kelas = "border-amber-200 bg-amber-50 text-amber-900";
  } else if (a.status_prediksi === "belum_ada_data") {
    teks = "Belum ada data";
    kelas = "border-slate-200 bg-slate-50 text-slate-600";
  } else if (a.status_prediksi === "tidak_aktif" || a.status_prediksi === "terlalu_jauh") {
    teks = "Tidak aktif";
    kelas = "border-slate-200 bg-slate-100 text-slate-700";
  }
  return (
    <span className={cn("inline-flex whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-medium", kelas)}>
      {teks}
    </span>
  );
}

function Estimasi({ r }: { r: RingkasAnalitikSantri }) {
  const a = r.analitik;
  if (a.status_prediksi === "terprediksi" && a.estimasi_khatam) return <>{formatBulanTahun(a.estimasi_khatam)}</>;
  if (a.status_prediksi === "tercapai") return <>Tercapai</>;
  return <span className="text-slate-400">—</span>;
}

export function AnalyticsPanel({ halaqahId, q }: { halaqahId?: string; q?: string }) {
  const { data, isLoading, isError, error, refetch } = useAnalitikUstadz({ halaqahId, q });

  return (
    <section className="space-y-3" aria-label="Prediksi khatam dan peringatan">
      <div>
        <h2 className="text-lg font-bold">Prediksi Khatam & Peringatan</h2>
        <p className="text-xs text-slate-500">
          Dihitung dari Ziadah yang sudah diverifikasi. Melambat = kecepatan 7 hari terakhir turun lebih dari 50%
          dibanding 28 hari sebelumnya.
        </p>
      </div>

      {isLoading && <Skeleton className="h-40 w-full rounded-xl" />}

      {isError && !data && (
        <div className="space-y-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <p>{error instanceof Error ? error.message : "Gagal memuat analitik."}</p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Coba lagi
          </Button>
        </div>
      )}

      {data && (
        <>
          {data.jumlah_melambat > 0 && (
            <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-900">
              <p className="font-semibold">⚠ {data.jumlah_melambat} santri melambat</p>
              <ul className="mt-1 list-disc pl-5">
                {data.santri
                  .filter((s) => s.analitik.melambat)
                  .map((s) => (
                    <li key={s.santri_id}>
                      <Link href={`/ustadz/santri/${s.santri_id}`} className="font-medium underline-offset-4 hover:underline">
                        {s.nama_lengkap}
                      </Link>
                      : {formatAngka(s.analitik.kecepatan_7_hari, 1)} ayat/hari (sebelumnya{" "}
                      {formatAngka(s.analitik.kecepatan_pembanding, 1)})
                    </li>
                  ))}
              </ul>
            </div>
          )}

          {data.santri.length === 0 ? (
            <p className="rounded-xl border border-dashed p-6 text-center text-sm text-slate-500">
              Tidak ada santri yang cocok dengan filter ini.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-xl border">
              <table className="w-full min-w-[760px] text-left text-sm">
                <caption className="sr-only">Prediksi khatam per santri</caption>
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th scope="col" className="px-3 py-2.5">Santri</th>
                    <th scope="col" className="px-3 py-2.5">Progres target</th>
                    <th scope="col" className="px-3 py-2.5">Rata-rata/hari</th>
                    <th scope="col" className="px-3 py-2.5">Estimasi khatam</th>
                    <th scope="col" className="px-3 py-2.5">Status</th>
                    <th scope="col" className="px-3 py-2.5 text-right">Detail</th>
                  </tr>
                </thead>
                <tbody>
                  {data.santri.map((s) => (
                    <tr key={s.santri_id} className="border-t">
                      <th scope="row" className="px-3 py-3 font-normal">
                        <div className="font-medium text-slate-900">{s.nama_lengkap}</div>
                        {s.nama_halaqah && <div className="text-xs text-slate-500">{s.nama_halaqah}</div>}
                      </th>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-24 overflow-hidden rounded-full bg-slate-100" aria-hidden>
                            <div
                              className="h-full rounded-full bg-emerald-500"
                              style={{ width: `${Math.min(100, s.analitik.persen_target)}%` }}
                            />
                          </div>
                          <span className="tabular-nums">{formatAngka(s.analitik.persen_target, 1)}%</span>
                        </div>
                        <div className="text-xs text-slate-500">
                          {formatAngka(s.analitik.total_hafal_ayat)} ayat · target {s.analitik.target_juz} juz
                        </div>
                      </td>
                      <td className="px-3 py-3 tabular-nums">
                        {s.analitik.avg_ayat_per_hari !== null ? (
                          formatAngka(s.analitik.avg_ayat_per_hari, 1)
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <Estimasi r={s} />
                      </td>
                      <td className="px-3 py-3">
                        <StatusBadge r={s} />
                      </td>
                      <td className="px-3 py-3 text-right">
                        <Link
                          href={`/ustadz/santri/${s.santri_id}`}
                          className="text-sm font-medium text-emerald-700 underline-offset-4 hover:underline"
                        >
                          Lihat profil
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </section>
  );
}
