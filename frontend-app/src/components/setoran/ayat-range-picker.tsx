"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SURAH_LIST } from "@/lib/quran-data";

export interface RentangState {
  surahAwal: number;
  ayatAwal: string;
  surahAkhir: number;
  ayatAkhir: string;
}

interface Props {
  value: RentangState;
  lintasSurah: boolean;
  onChange: (value: RentangState) => void;
  onLintasChange: (value: boolean) => void;
  disabled?: boolean;
}

const SELECT_CLASS =
  "h-12 w-full rounded-lg border border-input bg-background px-3 text-base shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:opacity-50";

function SurahSelect(props: {
  id: string;
  label: string;
  value: number;
  min?: number;
  disabled?: boolean;
  onChange: (nomor: number) => void;
}) {
  const { id, label, value, min = 1, disabled, onChange } = props;
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <select
        id={id}
        className={SELECT_CLASS}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
      >
        {SURAH_LIST.filter((s) => s.nomor >= min).map((s) => (
          <option key={s.nomor} value={s.nomor}>
            {s.nomor}. {s.nama}
          </option>
        ))}
      </select>
    </div>
  );
}

function AyatInput(props: {
  id: string;
  label: string;
  value: string;
  max: number;
  disabled?: boolean;
  onChange: (value: string) => void;
}) {
  const { id, label, value, max, disabled, onChange } = props;
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        inputMode="numeric"
        pattern="[0-9]*"
        autoComplete="off"
        placeholder={`1–${max}`}
        className="h-12 text-base"
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, 3))}
      />
    </div>
  );
}

export function AyatRangePicker({ value, lintasSurah, onChange, onLintasChange, disabled }: Props) {
  const surahAwal = SURAH_LIST[value.surahAwal - 1];
  const surahAkhir = SURAH_LIST[value.surahAkhir - 1];

  function ubahSurahAwal(nomor: number) {
    onChange({
      surahAwal: nomor,
      ayatAwal: "",
      surahAkhir: lintasSurah ? Math.max(value.surahAkhir, nomor) : nomor,
      ayatAkhir: "",
    });
  }

  function ubahLintas(aktif: boolean) {
    onLintasChange(aktif);
    if (!aktif) onChange({ ...value, surahAkhir: value.surahAwal, ayatAkhir: "" });
  }

  return (
    <div className="space-y-4">
      {lintasSurah ? (
        <>
          <div className="space-y-3 rounded-xl border p-3">
            <p className="text-sm font-semibold text-slate-600">Mulai dari</p>
            <SurahSelect id="surah-awal" label="Surah" value={value.surahAwal} disabled={disabled} onChange={ubahSurahAwal} />
            <AyatInput
              id="ayat-awal"
              label="Ayat"
              value={value.ayatAwal}
              max={surahAwal.jumlahAyat}
              disabled={disabled}
              onChange={(v) => onChange({ ...value, ayatAwal: v })}
            />
          </div>
          <div className="space-y-3 rounded-xl border p-3">
            <p className="text-sm font-semibold text-slate-600">Sampai</p>
            <SurahSelect
              id="surah-akhir"
              label="Surah"
              value={value.surahAkhir}
              min={value.surahAwal}
              disabled={disabled}
              onChange={(nomor) => onChange({ ...value, surahAkhir: nomor, ayatAkhir: "" })}
            />
            <AyatInput
              id="ayat-akhir"
              label="Ayat"
              value={value.ayatAkhir}
              max={surahAkhir.jumlahAyat}
              disabled={disabled}
              onChange={(v) => onChange({ ...value, ayatAkhir: v })}
            />
          </div>
        </>
      ) : (
        <>
          <SurahSelect id="surah-awal" label="Surah" value={value.surahAwal} disabled={disabled} onChange={ubahSurahAwal} />
          <div className="grid grid-cols-2 gap-3">
            <AyatInput
              id="ayat-awal"
              label="Dari ayat"
              value={value.ayatAwal}
              max={surahAwal.jumlahAyat}
              disabled={disabled}
              onChange={(v) => onChange({ ...value, ayatAwal: v })}
            />
            <AyatInput
              id="ayat-akhir"
              label="Sampai ayat"
              value={value.ayatAkhir}
              max={surahAwal.jumlahAyat}
              disabled={disabled}
              onChange={(v) => onChange({ ...value, ayatAkhir: v })}
            />
          </div>
        </>
      )}
      <button
        type="button"
        disabled={disabled}
        onClick={() => ubahLintas(!lintasSurah)}
        className="text-sm font-medium text-emerald-700 underline-offset-4 hover:underline"
      >
        {lintasSurah ? "Satu surah saja" : "Setoran lintas surah"}
      </button>
    </div>
  );
}
