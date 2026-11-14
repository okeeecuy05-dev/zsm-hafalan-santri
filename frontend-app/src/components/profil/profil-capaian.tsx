"use client";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useProfil } from "@/hooks/use-profil";
import { formatAngka, formatBulanTahun } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { AnalitikSantri } from "@/types/analytics";

import { BadgeShowcase } from "./badge-showcase";
import { ProgressChart } from "./progress-chart";

type SudutPandang = "santri" | "ustadz";

export function ringkasPrediksi(a: AnalitikSantri): { judul: string; detail: string } {
  switch (a.status_prediksi) {
    case "terprediksi":
      return {
        judul: a.estimasi_khatam
          ? `Estimasi khatam: ${formatBulanTahun(a.estimasi_khatam)}`
          : "Estimasi khatam tersedia",
        detail: `Sekitar ${formatAngka(a.hari_menuju_khatam ?? 0)} hari lagi dengan rata-rata ${formatAngka(a.avg_ayat_per_hari ?? 0, 1)} ayat/hari (${a.jendela_hari} hari terakhir).`,
      };
    case "tercapai":
      return {
        judul: `🎉 Target ${a.target_juz} juz tercapai`,
        detail: "Alhamdulillah! Mintalah ustadz menetapkan target berikutnya.",
      };
    case "tidak_aktif":
      return {
        judul: "Belum ada kemajuan baru",
        detail: "Tidak ada Ziadah terverifikasi pada periode hitung terakhir, sehingga belum dapat diprediksi.",
      };
    case "terlalu_jauh":
      return {
        judul: "Belum dapat diprediksi",
        detail: "Kecepatan hafalan saat ini terlalu rendah untuk memperkirakan tanggal khatam.",
      };
    default:
      return {
        judul: "Belum ada prediksi",
        detail: "Prediksi muncul setelah ada Ziadah yang diverifikasi ustadz.",
      };
  }
}

function Statistik({ label, nilai }: { label: string; nilai: string }) {
  return (
    <div className="rounded-xl border bg-white p-3">
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="mt-1 text-xl font-bold tabular-nums">{nilai}</dd>
    </div>
  );
}

export function ProfilCapaian({ santriId, sudutPandang }: { santriId: string; sudutPandang: SudutPandang }) {
  const { data, isLoading, isError, error, refetch } = useProfil(santriId);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full rounded-2xl" />
        <Skeleton className="h-48 w-full rounded-2xl" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="space-y-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
        <p>{error instanceof Error ? error.message : "Gagal memuat profil."}</p>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          Coba lagi
        </Button>
      </div>
    );
  }

  const a = data.analitik;
  const prediksi = ringkasPrediksi(a);
  const sendiri = sudutPandang === "santri";

  return (
    <div className="space-y-5">
      <section className="space-y-3 rounded-2xl border bg-white p-4 shadow-sm" aria-label="Progres hafalan">
        <div>
          <h2 className="text-lg font-bold">{data.nama_lengkap}</h2>
          {data.nama_halaqah && <p className="text-sm text-slate-500">{data.nama_halaqah}</p>}
        </div>
        <div>
          <div className="mb-1 flex justify-between text-sm">
            <span>Progres target {a.target_juz} juz</span>
            <span className="font-semibold tabular-nums">{formatAngka(a.persen_target, 1)}%</span>
          </div>
          <div
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(a.persen_target)}
            aria-label="Progres target"
            className="h-3 overflow-hidden rounded-full bg-slate-100"
          >
            <div className="h-full rounded-full bg-emerald-500" style={{ width: `${Math.min(100, a.persen_target)}%` }} />
          </div>
        </div>
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Statistik label="Total hafalan" nilai={`${formatAngka(a.total_hafal_ayat)} ayat`} />
          <Statistik label="Setara" nilai={`${formatAngka(a.juz_hafal, 1)} juz`} />
          <Statistik
            label="Rata-rata/hari"
            nilai={a.avg_ayat_per_hari !== null ? `${formatAngka(a.avg_ayat_per_hari, 1)} ayat` : "—"}
          />
          <Statistik label="Sisa ayat" nilai={formatAngka(a.sisa_ayat)} />
        </dl>
      </section>

      <section className="rounded-2xl border bg-emerald-50 p-4" aria-label="Prediksi khatam">
        <p className="text-lg font-bold text-emerald-900">{prediksi.judul}</p>
        <p className="text-sm text-emerald-800">{prediksi.detail}</p>
        {a.hafalan_awal_ayat > 0 && (
          <p className="mt-1 text-xs text-emerald-700">
            Termasuk {formatAngka(a.hafalan_awal_ayat)} ayat hafalan sebelum memakai aplikasi.
          </p>
        )}
      </section>

      {a.melambat && (
        <section
          role="alert"
          className={cn("rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950")}
        >
          <p className="font-bold">⚠ {sendiri ? "Kecepatan hafalanmu menurun" : "Santri melambat"}</p>
          <p>
            {formatAngka(a.kecepatan_7_hari, 1)} ayat/hari dalam 7 hari terakhir, turun {a.persen_penurunan}% dari{" "}
            {formatAngka(a.kecepatan_pembanding, 1)} ayat/hari sebelumnya.
            {sendiri ? " Yuk semangat lagi, setoran kecil tiap hari lebih baik daripada berhenti!" : ""}
          </p>
        </section>
      )}

      <section className="space-y-2 rounded-2xl border bg-white p-4 shadow-sm" aria-label="Grafik progres">
        <h3 className="text-sm font-semibold text-slate-700">Grafik hafalan {data.grafik.length} hari terakhir</h3>
        <ProgressChart titik={data.grafik} targetAyat={a.target_ayat} />
      </section>

      <section className="space-y-2" aria-label="Lencana">
        <h3 className="text-sm font-semibold text-slate-700">Lencana capaian</h3>
        <BadgeShowcase badges={data.badges} totalAyat={a.total_hafal_ayat} />
      </section>
    </div>
  );
}
