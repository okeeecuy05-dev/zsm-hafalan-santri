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
import { useBuatPengguna, useUbahPengguna } from "@/hooks/use-admin";
import type { HalaqahAdmin, PenggunaRead, TautanMasuk } from "@/types/admin";
import type { Peran } from "@/types/auth";

const NAMA_PERAN: Record<Peran, string> = { santri: "santri", ustadz: "ustadz", admin: "admin" };
const SELECT_CLASS =
  "h-10 w-full rounded-lg border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500";

interface IsiProps {
  pengguna: PenggunaRead | null;
  roleBaru: Peran;
  halaqah: HalaqahAdmin[];
  onSelesai: () => void;
  onTautan: (nama: string, tautan: TautanMasuk) => void;
}

function Isi({ pengguna, roleBaru, halaqah, onSelesai, onTautan }: IsiProps) {
  const ubah = pengguna !== null;
  const role = pengguna?.role ?? roleBaru;
  const santri = role === "santri";

  const [nama, setNama] = useState(pengguna?.nama_lengkap ?? "");
  const [halaqahId, setHalaqahId] = useState(pengguna?.halaqah_id ?? "");
  const [targetJuz, setTargetJuz] = useState(String(pengguna?.target_juz ?? 30));
  const [awal, setAwal] = useState(String(pengguna?.hafalan_awal_ayat ?? 0));

  const buat = useBuatPengguna();
  const ubahMut = useUbahPengguna();
  const sibuk = buat.isPending || ubahMut.isPending;

  async function simpan() {
    const namaBersih = nama.trim();
    if (!namaBersih) {
      toast.error("Nama lengkap wajib diisi.");
      return;
    }
    const target = Number(targetJuz);
    const hafalAwal = Number(awal);
    if (santri) {
      if (!Number.isInteger(target) || target < 1 || target > 30) {
        toast.error("Target juz harus bilangan bulat 1–30.");
        return;
      }
      if (!Number.isInteger(hafalAwal) || hafalAwal < 0 || hafalAwal > 6236) {
        toast.error("Hafalan awal harus bilangan bulat 0–6236 ayat.");
        return;
      }
    }

    try {
      if (ubah) {
        await ubahMut.mutateAsync({
          id: pengguna.id,
          body: santri
            ? {
                nama_lengkap: namaBersih,
                halaqah_id: halaqahId || null,
                target_juz: target,
                hafalan_awal_ayat: hafalAwal,
              }
            : { nama_lengkap: namaBersih },
        });
        toast.success("Perubahan disimpan.");
        onSelesai();
      } else {
        const hasil = await buat.mutateAsync({
          nama_lengkap: namaBersih,
          role,
          ...(santri
            ? { halaqah_id: halaqahId || null, target_juz: target, hafalan_awal_ayat: hafalAwal }
            : {}),
        });
        toast.success(`${namaBersih} ditambahkan.`);
        onSelesai();
        onTautan(namaBersih, hasil.tautan);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menyimpan.");
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>{ubah ? `Ubah ${NAMA_PERAN[role]}` : `Tambah ${NAMA_PERAN[role]}`}</DialogTitle>
        <DialogDescription>
          {ubah
            ? "Perubahan target atau hafalan awal langsung menghitung ulang prediksi dan lencana."
            : "Setelah disimpan, tautan masuk (Magic Link & QR) akan ditampilkan."}
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="pengguna-nama">Nama lengkap</Label>
          <Input
            id="pengguna-nama"
            value={nama}
            maxLength={150}
            disabled={sibuk}
            onChange={(e) => setNama(e.target.value)}
          />
        </div>

        {santri && (
          <>
            <div className="space-y-1.5">
              <Label htmlFor="pengguna-halaqah">Halaqah</Label>
              <select
                id="pengguna-halaqah"
                className={SELECT_CLASS}
                value={halaqahId}
                disabled={sibuk}
                onChange={(e) => setHalaqahId(e.target.value)}
              >
                <option value="">Tanpa halaqah</option>
                {halaqah.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.nama_kelas}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="pengguna-target">Target juz (1–30)</Label>
                <Input
                  id="pengguna-target"
                  inputMode="numeric"
                  value={targetJuz}
                  disabled={sibuk}
                  onChange={(e) => setTargetJuz(e.target.value.replace(/\D/g, "").slice(0, 2))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pengguna-awal">Hafalan awal (ayat)</Label>
                <Input
                  id="pengguna-awal"
                  inputMode="numeric"
                  value={awal}
                  disabled={sibuk}
                  onChange={(e) => setAwal(e.target.value.replace(/\D/g, "").slice(0, 4))}
                />
              </div>
            </div>
            <p className="text-xs text-slate-500">
              Hafalan awal = jumlah ayat yang sudah dihafal sebelum memakai aplikasi (0 jika mulai dari awal).
            </p>
          </>
        )}
      </div>

      <Button className="w-full bg-emerald-600 hover:bg-emerald-700" disabled={sibuk} onClick={simpan}>
        {sibuk ? "Menyimpan…" : ubah ? "Simpan perubahan" : "Tambahkan"}
      </Button>
    </>
  );
}

interface Props extends Omit<IsiProps, "onSelesai"> {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PenggunaFormDialog({ open, onOpenChange, ...isi }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-md">
        <Isi {...isi} onSelesai={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}
