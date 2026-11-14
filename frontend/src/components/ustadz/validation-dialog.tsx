"use client";

import { useState } from "react";
import { toast } from "sonner";

import { RatingStars } from "@/components/shared/rating-stars";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useValidasiSetoran } from "@/hooks/use-dashboard";
import { useSetoranHariIni } from "@/hooks/use-setoran";
import { RATING_LABEL, formatTanggalPanjang } from "@/lib/dashboard";
import { formatRentang } from "@/lib/quran-data";
import { SESI_META, URUTAN_SESI } from "@/lib/session";
import type { BarisSantri } from "@/types/dashboard";
import type { Setoran } from "@/types/setoran";

function ReviewItem({ setoran }: { setoran: Setoran }) {
  const [rating, setRating] = useState(setoran.rating ?? 0);
  const [catatan, setCatatan] = useState(setoran.catatan_ustadz ?? "");
  const validasi = useValidasiSetoran();
  const meta = SESI_META[setoran.tipe_sesi];
  const terverifikasi = setoran.status === "verified";

  async function simpan() {
    if (rating < 1) {
      toast.error("Pilih nilai kelancaran (1–5 bintang) terlebih dahulu.");
      return;
    }
    const teks = catatan.trim();
    try {
      await validasi.mutateAsync({
        id: setoran.id,
        rating,
        catatan_ustadz: teks === "" ? null : teks,
      });
      toast.success(`${meta.label} terverifikasi ✅`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menyimpan validasi.");
    }
  }

  return (
    <li className="space-y-3 rounded-xl border p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold">
            <span aria-hidden>{meta.emoji}</span> {meta.label}
          </p>
          <p className="text-sm text-slate-600">{formatRentang(setoran)}</p>
        </div>
        {terverifikasi ? (
          <Badge className="bg-emerald-600 hover:bg-emerald-600">Terverifikasi</Badge>
        ) : (
          <Badge variant="secondary">Menunggu</Badge>
        )}
      </div>

      <div className="space-y-1">
        <p className="text-xs font-medium text-slate-600">Kelancaran</p>
        <div className="flex flex-wrap items-center gap-2">
          <RatingStars value={rating} onChange={setRating} disabled={validasi.isPending} />
          <span className="text-xs text-slate-500">
            {rating > 0 ? RATING_LABEL[rating] : "Belum dinilai"}
          </span>
        </div>
      </div>

      <div className="space-y-1">
        <Label htmlFor={`catatan-${setoran.id}`} className="text-xs text-slate-600">
          Catatan tajwid untuk santri (opsional)
        </Label>
        <Textarea
          id={`catatan-${setoran.id}`}
          rows={2}
          maxLength={1000}
          placeholder="Mis. perbaiki mad pada ayat 25"
          value={catatan}
          disabled={validasi.isPending}
          onChange={(e) => setCatatan(e.target.value)}
        />
      </div>

      <Button
        className="w-full bg-emerald-600 hover:bg-emerald-700"
        disabled={validasi.isPending}
        onClick={simpan}
      >
        {validasi.isPending
          ? "Menyimpan…"
          : terverifikasi
            ? "Perbarui validasi"
            : "✅ Tandai Terverifikasi"}
      </Button>
    </li>
  );
}

function DialogBody({ santri, tanggal }: { santri: BarisSantri; tanggal: string }) {
  const { data, isLoading, isError, refetch } = useSetoranHariIni(santri.santri_id, tanggal);

  const urut = data
    ? [...data].sort(
        (a, b) =>
          URUTAN_SESI.indexOf(a.tipe_sesi) - URUTAN_SESI.indexOf(b.tipe_sesi) ||
          a.created_at.localeCompare(b.created_at),
      )
    : [];

  return (
    <>
      <DialogHeader>
        <DialogTitle>{santri.nama_lengkap}</DialogTitle>
        <DialogDescription>
          Setoran {formatTanggalPanjang(tanggal)}. Beri nilai lalu tandai terverifikasi.
        </DialogDescription>
      </DialogHeader>

      {isLoading && <Skeleton className="h-40 w-full rounded-xl" />}

      {isError && (
        <div className="space-y-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          <p>Gagal memuat setoran santri.</p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Coba lagi
          </Button>
        </div>
      )}

      {data && urut.length === 0 && (
        <p className="rounded-xl border border-dashed p-4 text-center text-sm text-slate-500">
          Tidak ada setoran pada tanggal ini.
        </p>
      )}

      <ul className="space-y-3">
        {urut.map((s) => (
          <ReviewItem key={s.id} setoran={s} />
        ))}
      </ul>
    </>
  );
}

interface Props {
  santri: BarisSantri | null;
  open: boolean;
  tanggal: string;
  onOpenChange: (open: boolean) => void;
}

export function ValidationDialog({ santri, open, tanggal, onOpenChange }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        {santri && <DialogBody santri={santri} tanggal={tanggal} />}
      </DialogContent>
    </Dialog>
  );
}
