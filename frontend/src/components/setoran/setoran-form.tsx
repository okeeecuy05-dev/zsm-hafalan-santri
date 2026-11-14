"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useAutoFill, useCreateSetoran, useSetoranHariIni } from "@/hooks/use-setoran";
import { validasiRentang } from "@/lib/quran-data";
import { SESI_META, sesiDefault } from "@/lib/session";
import type { TipeSesi } from "@/types/setoran";

import { AyatRangePicker, type RentangState } from "./ayat-range-picker";
import { QuickConfirmCard } from "./quick-confirm-card";
import { SessionSelector } from "./session-selector";

interface Props {
  santriId: string;
  tanggal: string;
}

const RENTANG_AWAL: RentangState = { surahAwal: 1, ayatAwal: "", surahAkhir: 1, ayatAkhir: "" };

function pesanError(e: unknown, fallback: string): string {
  return e instanceof Error ? e.message : fallback;
}

export function SetoranForm({ santriId, tanggal }: Props) {
  const [sesi, setSesi] = useState<TipeSesi>(() => sesiDefault());
  const [rentang, setRentang] = useState<RentangState>(RENTANG_AWAL);
  const [lintas, setLintas] = useState(false);
  const [manual, setManual] = useState(false);

  const autoFill = useAutoFill(santriId, tanggal, sesi === "sabqi");
  const hariIni = useSetoranHariIni(santriId, tanggal);
  const create = useCreateSetoran();

  const segmen = autoFill.data?.segmen ?? [];
  const sudahSabqi = hariIni.data?.some((s) => s.tipe_sesi === "sabqi") ?? false;

  const tampilQuick = sesi === "sabqi" && !manual && !!autoFill.data?.tersedia && !sudahSabqi;
  const tampilSudahSabqi = sesi === "sabqi" && !manual && sudahSabqi;
  const tampilForm = !tampilQuick && !tampilSudahSabqi;

  function ubahSesi(baru: TipeSesi) {
    setSesi(baru);
    setManual(false);
  }

  async function handleKonfirmasi() {
    try {
      await Promise.all(
        segmen.map((s) => create.mutateAsync({ santri_id: santriId, tipe_sesi: "sabqi", tanggal, ...s })),
      );
      toast.success("Sabqi tersimpan 🎉");
    } catch (e) {
      toast.error(pesanError(e, "Gagal menyimpan Sabqi."));
    }
  }

  async function handleSimpan() {
    const ayatAwal = Number(rentang.ayatAwal);
    const ayatAkhir = Number(rentang.ayatAkhir);
    const error = validasiRentang(rentang.surahAwal, ayatAwal, rentang.surahAkhir, ayatAkhir);
    if (error) {
      toast.error(error);
      return;
    }
    try {
      await create.mutateAsync({
        santri_id: santriId,
        tipe_sesi: sesi,
        tanggal,
        surah_awal: rentang.surahAwal,
        ayat_awal: ayatAwal,
        surah_akhir: rentang.surahAkhir,
        ayat_akhir: ayatAkhir,
      });
      toast.success(`${SESI_META[sesi].label} tersimpan 🎉`);
      setRentang((prev) => ({ ...prev, ayatAwal: "", ayatAkhir: "" }));
      setManual(false);
    } catch (e) {
      toast.error(pesanError(e, "Gagal menyimpan setoran."));
    }
  }

  return (
    <section className="space-y-5">
      <SessionSelector value={sesi} onChange={ubahSesi} />

      {tampilQuick && (
        <QuickConfirmCard
          segmen={segmen}
          loading={create.isPending}
          onConfirm={handleKonfirmasi}
          onManual={() => setManual(true)}
        />
      )}

      {tampilSudahSabqi && (
        <div className="space-y-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
          <p className="font-semibold">Sabqi hari ini sudah tersimpan ✅</p>
          <Button variant="outline" size="sm" onClick={() => setManual(true)}>
            Tambah setoran Sabqi lain
          </Button>
        </div>
      )}

      {sesi === "sabqi" && !autoFill.isLoading && !autoFill.data?.tersedia && !sudahSabqi && (
        <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
          Belum ada Ziadah hari ini, jadi isi Sabqi secara manual.
        </p>
      )}

      {tampilForm && (
        <div className="space-y-5">
          <AyatRangePicker
            value={rentang}
            lintasSurah={lintas}
            onChange={setRentang}
            onLintasChange={setLintas}
            disabled={create.isPending}
          />
          <Button
            size="lg"
            className="h-14 w-full bg-emerald-600 text-base hover:bg-emerald-700"
            disabled={create.isPending}
            onClick={handleSimpan}
          >
            {create.isPending ? "Menyimpan…" : `Simpan ${SESI_META[sesi].label}`}
          </Button>
        </div>
      )}
    </section>
  );
}
