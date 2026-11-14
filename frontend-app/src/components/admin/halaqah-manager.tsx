"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useAturTargetKelas,
  useBuatHalaqah,
  useHalaqahAdmin,
  useHapusHalaqah,
  usePengguna,
  useUbahHalaqah,
} from "@/hooks/use-admin";
import type { HalaqahAdmin } from "@/types/admin";

const SELECT_CLASS =
  "h-10 w-full rounded-lg border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500";

function FormHalaqah({ halaqah, onSelesai }: { halaqah: HalaqahAdmin | null; onSelesai: () => void }) {
  const [nama, setNama] = useState(halaqah?.nama_kelas ?? "");
  const [ustadzId, setUstadzId] = useState(halaqah?.ustadz_id ?? "");
  const ustadz = usePengguna({ role: "ustadz" });
  const buat = useBuatHalaqah();
  const ubah = useUbahHalaqah();
  const sibuk = buat.isPending || ubah.isPending;

  async function simpan() {
    const namaBersih = nama.trim();
    if (!namaBersih) {
      toast.error("Nama halaqah wajib diisi.");
      return;
    }
    try {
      if (halaqah) {
        await ubah.mutateAsync({ id: halaqah.id, body: { nama_kelas: namaBersih, ustadz_id: ustadzId || null } });
      } else {
        await buat.mutateAsync({ nama_kelas: namaBersih, ustadz_id: ustadzId || null });
      }
      toast.success("Halaqah disimpan.");
      onSelesai();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menyimpan halaqah.");
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>{halaqah ? "Ubah halaqah" : "Tambah halaqah"}</DialogTitle>
        <DialogDescription>Ustadz yang ditugaskan dapat melihat dan memvalidasi santri halaqah ini.</DialogDescription>
      </DialogHeader>
      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="halaqah-nama">Nama halaqah / kelas</Label>
          <Input id="halaqah-nama" value={nama} maxLength={100} disabled={sibuk} onChange={(e) => setNama(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="halaqah-ustadz">Ustadz pengampu</Label>
          <select
            id="halaqah-ustadz"
            className={SELECT_CLASS}
            value={ustadzId}
            disabled={sibuk}
            onChange={(e) => setUstadzId(e.target.value)}
          >
            <option value="">Belum ditugaskan</option>
            {(ustadz.data ?? []).map((u) => (
              <option key={u.id} value={u.id}>
                {u.nama_lengkap}
              </option>
            ))}
          </select>
        </div>
      </div>
      <Button className="w-full bg-emerald-600 hover:bg-emerald-700" disabled={sibuk} onClick={simpan}>
        {sibuk ? "Menyimpan…" : "Simpan"}
      </Button>
    </>
  );
}

function FormTarget({ halaqah, onSelesai }: { halaqah: HalaqahAdmin; onSelesai: () => void }) {
  const [target, setTarget] = useState("30");
  const atur = useAturTargetKelas();

  async function simpan() {
    const nilai = Number(target);
    if (!Number.isInteger(nilai) || nilai < 1 || nilai > 30) {
      toast.error("Target juz harus bilangan bulat 1–30.");
      return;
    }
    try {
      const hasil = await atur.mutateAsync({ id: halaqah.id, targetJuz: nilai });
      toast.success(`Target ${nilai} juz diterapkan ke ${hasil.diperbarui} santri.`);
      onSelesai();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal mengatur target.");
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Atur target juz: {halaqah.nama_kelas}</DialogTitle>
        <DialogDescription>
          Berlaku untuk seluruh {halaqah.jumlah_santri} santri di halaqah ini dan menimpa target masing-masing.
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-1.5">
        <Label htmlFor="target-kelas">Target juz (1–30)</Label>
        <Input
          id="target-kelas"
          inputMode="numeric"
          value={target}
          disabled={atur.isPending}
          onChange={(e) => setTarget(e.target.value.replace(/\D/g, "").slice(0, 2))}
        />
      </div>
      <Button className="w-full bg-emerald-600 hover:bg-emerald-700" disabled={atur.isPending} onClick={simpan}>
        {atur.isPending ? "Menerapkan…" : "Terapkan ke semua santri"}
      </Button>
    </>
  );
}

type Dialogs =
  | { jenis: "form"; halaqah: HalaqahAdmin | null }
  | { jenis: "target"; halaqah: HalaqahAdmin }
  | null;

export function HalaqahManager() {
  const { data, isLoading, isError, error, refetch } = useHalaqahAdmin();
  const hapus = useHapusHalaqah();
  const [dialog, setDialog] = useState<Dialogs>(null);

  async function handleHapus(h: HalaqahAdmin) {
    if (!window.confirm(`Hapus halaqah ${h.nama_kelas}? ${h.jumlah_santri} santrinya menjadi tanpa halaqah.`)) return;
    try {
      await hapus.mutateAsync(h.id);
      toast.success("Halaqah dihapus.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menghapus halaqah.");
    }
  }

  return (
    <section className="space-y-4">
      <div className="flex justify-end">
        <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => setDialog({ jenis: "form", halaqah: null })}>
          + Tambah halaqah
        </Button>
      </div>

      {isLoading && <Skeleton className="h-40 w-full rounded-xl" />}
      {isError && (
        <div className="space-y-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <p>{error instanceof Error ? error.message : "Gagal memuat halaqah."}</p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Coba lagi
          </Button>
        </div>
      )}
      {data && data.length === 0 && (
        <p className="rounded-xl border border-dashed p-6 text-center text-sm text-slate-500">Belum ada halaqah.</p>
      )}

      {data && data.length > 0 && (
        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full min-w-[640px] text-left text-sm">
            <caption className="sr-only">Daftar halaqah</caption>
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th scope="col" className="px-3 py-2.5">Halaqah</th>
                <th scope="col" className="px-3 py-2.5">Ustadz</th>
                <th scope="col" className="px-3 py-2.5">Santri</th>
                <th scope="col" className="px-3 py-2.5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {data.map((h) => (
                <tr key={h.id} className="border-t">
                  <th scope="row" className="px-3 py-3 font-medium text-slate-900">{h.nama_kelas}</th>
                  <td className="px-3 py-3">{h.nama_ustadz ?? <span className="text-amber-700">Belum ditugaskan</span>}</td>
                  <td className="px-3 py-3 tabular-nums">{h.jumlah_santri}</td>
                  <td className="px-3 py-3">
                    <div className="flex flex-wrap justify-end gap-1.5">
                      <Button size="sm" variant="outline" onClick={() => setDialog({ jenis: "form", halaqah: h })}>
                        Ubah
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setDialog({ jenis: "target", halaqah: h })}>
                        Target juz
                      </Button>
                      <Button size="sm" variant="outline" disabled={hapus.isPending} onClick={() => handleHapus(h)}>
                        Hapus
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={dialog !== null} onOpenChange={(buka) => !buka && setDialog(null)}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-md">
          {dialog?.jenis === "form" && <FormHalaqah halaqah={dialog.halaqah} onSelesai={() => setDialog(null)} />}
          {dialog?.jenis === "target" && <FormTarget halaqah={dialog.halaqah} onSelesai={() => setDialog(null)} />}
        </DialogContent>
      </Dialog>
    </section>
  );
}
