"use client";

import { RefreshCw } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useKeluar } from "@/hooks/use-auth";
import { DASHBOARD_REFRESH_MS, useDashboardUstadz, useHalaqahList } from "@/hooks/use-dashboard";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { cocokFilter, formatTanggalPanjang, type FilterStatus } from "@/lib/dashboard";
import { tanggalLokal } from "@/lib/session";
import { cn } from "@/lib/utils";
import type { UserMe } from "@/types/auth";
import type { BarisSantri } from "@/types/dashboard";

import { AnalyticsPanel } from "./analytics-panel";
import { DashboardFilters } from "./dashboard-filters";
import { StandingsTable } from "./standings-table";
import { SummaryCards } from "./summary-cards";
import { ValidationDialog } from "./validation-dialog";

const SEMUA_FILTER: FilterStatus[] = ["semua", "hijau", "kuning", "merah", "validasi"];

export function UstadzDashboard({ user }: { user: UserMe }) {
  const keluar = useKeluar();
  const hariIni = tanggalLokal();

  const [tanggal, setTanggal] = useState(hariIni);
  const [q, setQ] = useState("");
  const [halaqahId, setHalaqahId] = useState("");
  const [filter, setFilter] = useState<FilterStatus>("semua");
  const [dialog, setDialog] = useState<{ santri: BarisSantri | null; open: boolean }>({
    santri: null,
    open: false,
  });

  const qTerpakai = useDebouncedValue(q.trim(), 300);
  const live = tanggal === hariIni;

  const daftarHalaqah = useHalaqahList();
  const dashboard = useDashboardUstadz({
    tanggal,
    halaqahId: halaqahId || undefined,
    q: qTerpakai || undefined,
    live,
  });

  const semuaBaris = dashboard.data?.santri ?? [];
  const barisTampil = semuaBaris.filter((b) => cocokFilter(b, filter));
  const jumlah = Object.fromEntries(
    SEMUA_FILTER.map((f) => [f, semuaBaris.filter((b) => cocokFilter(b, f)).length]),
  ) as Record<FilterStatus, number>;

  const terakhirDiperbarui = dashboard.dataUpdatedAt
    ? new Date(dashboard.dataUpdatedAt).toLocaleTimeString("id-ID")
    : "—";

  return (
    <div className="space-y-6 pt-4">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b pb-4">
        <div>
          <p className="text-xs text-slate-500">{user.role === "admin" ? "Dasbor (admin)" : "Dasbor Ustadz"}</p>
          <h1 className="text-xl font-bold">{user.nama_lengkap}</h1>
          <p className="text-sm text-slate-600">{formatTanggalPanjang(tanggal)}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={dashboard.isFetching}
            onClick={() => dashboard.refetch()}
          >
            <RefreshCw className={cn("mr-1.5 size-4", dashboard.isFetching && "animate-spin")} />
            Segarkan
          </Button>
          {user.role === "admin" && (
            <Link
              href="/admin"
              className="text-sm font-medium text-emerald-700 underline-offset-4 hover:underline"
            >
              Panel admin
            </Link>
          )}
          <Button variant="secondary" size="sm" onClick={keluar}>
            Keluar
          </Button>
        </div>
      </header>

      <p className="text-xs text-slate-500">
        {live
          ? `Diperbarui otomatis tiap ${DASHBOARD_REFRESH_MS / 1000} detik`
          : "Tanggal lampau: tidak diperbarui otomatis"}{" "}
        · Terakhir: {terakhirDiperbarui}
      </p>

      {dashboard.isLoading && (
        <div className="space-y-4">
          <Skeleton className="h-20 w-full rounded-xl" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      )}

      {dashboard.isError && !dashboard.data && (
        <div className="space-y-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <p>
            {dashboard.error instanceof Error ? dashboard.error.message : "Gagal memuat dasbor."}
          </p>
          <Button variant="outline" size="sm" onClick={() => dashboard.refetch()}>
            Coba lagi
          </Button>
        </div>
      )}

      {dashboard.isError && dashboard.data && (
        <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
          Gagal memperbarui data. Menampilkan data terakhir yang berhasil dimuat.
        </p>
      )}

      {dashboard.data && (
        <>
          <SummaryCards ringkasan={dashboard.data.ringkasan} />
          <DashboardFilters
            tanggal={tanggal}
            maxTanggal={hariIni}
            onTanggalChange={setTanggal}
            q={q}
            onQChange={setQ}
            halaqah={daftarHalaqah.data ?? []}
            halaqahId={halaqahId}
            onHalaqahChange={setHalaqahId}
            filter={filter}
            onFilterChange={setFilter}
            jumlah={jumlah}
          />
          <StandingsTable
            baris={barisTampil}
            onBuka={(santri) => setDialog({ santri, open: true })}
          />
        </>
      )}

      <AnalyticsPanel halaqahId={halaqahId || undefined} q={qTerpakai || undefined} />

      <ValidationDialog
        santri={dialog.santri}
        open={dialog.open}
        tanggal={tanggal}
        onOpenChange={(open) => setDialog((d) => ({ ...d, open }))}
      />
    </div>
  );
}
