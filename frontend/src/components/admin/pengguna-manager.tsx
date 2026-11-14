"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useCabutTautan,
  useGantiTautan,
  useHalaqahAdmin,
  useHapusPengguna,
  usePengguna,
} from "@/hooks/use-admin";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { formatAngka } from "@/lib/format";
import type { PenggunaRead, TautanMasuk } from "@/types/admin";
import type { Peran } from "@/types/auth";

import { PenggunaFormDialog } from "./pengguna-form-dialog";

interface Props {
  mode: "santri" | "staf";
  penggunaSaatIniId: string;
  onTautan: (nama: string, tautan: TautanMasuk) => void;
}

const LABEL_PERAN: Record<Peran, string> = { santri: "Santri", ustadz: "Ustadz", admin: "Admin" };

export function PenggunaManager({ mode, penggunaSaatIniId, onTautan }: Props) {
  const [q, setQ] = useState("");
  const qTerpakai = useDebouncedValue(q.trim(), 300);
  const [form, setForm] = useState<{ open: boolean; pengguna: PenggunaRead | null; roleBaru: Peran }>({
    open: false,
    pengguna: null,
    roleBaru: "santri",
  });

  const { data, isLoading, isError, error, refetch } = usePengguna({
    role: mode === "santri" ? "santri" : undefined,
    q: qTerpakai || undefined,
  });
  const halaqah = useHalaqahAdmin();
  const hapus = useHapusPengguna();
  const ganti = useGantiTautan();
  const cabut = useCabutTautan();

  const baris = (data ?? []).filter((p) => (mode === "santri" ? p.role === "santri" : p.role !== "santri"));

  async function handleTautan(p: PenggunaRead) {
    const pesan = p.punya_tautan
      ? `Buat tautan masuk baru untuk ${p.nama_lengkap}? Tautan lama dan sesi yang sedang aktif akan berhenti berlaku.`
      : `Buat tautan masuk untuk ${p.nama_lengkap}?`;
    if (!window.confirm(pesan)) return;
    try {
      onTautan(p.nama_lengkap, await ganti.mutateAsync(p.id));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal membuat tautan.");
    }
  }

  async function handleCabut(p: PenggunaRead) {
    if (!window.confirm(`Cabut tautan masuk ${p.nama_lengkap}? Yang bersangkutan tidak bisa masuk sampai diberi tautan baru.`)) return;
    try {
      await cabut.mutateAsync(p.id);
      toast.success("Tautan dicabut.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal mencabut tautan.");
    }
  }

  async function handleHapus(p: PenggunaRead) {
    if (!window.confirm(`Hapus ${p.nama_lengkap}? Semua setoran, profil, dan lencananya ikut terhapus permanen.`)) return;
    try {
      await hapus.mutateAsync(p.id);
      toast.success(`${p.nama_lengkap} dihapus.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menghapus.");
    }
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="w-full space-y-1.5 sm:w-72">
          <Label htmlFor="admin-cari">Cari nama</Label>
          <Input
            id="admin-cari"
            type="search"
            placeholder="Ketik nama…"
            maxLength={100}
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          {mode === "santri" ? (
            <Button
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={() => setForm({ open: true, pengguna: null, roleBaru: "santri" })}
            >
              + Tambah santri
            </Button>
          ) : (
            <>
              <Button
                className="bg-emerald-600 hover:bg-emerald-700"
                onClick={() => setForm({ open: true, pengguna: null, roleBaru: "ustadz" })}
              >
                + Tambah ustadz
              </Button>
              <Button variant="outline" onClick={() => setForm({ open: true, pengguna: null, roleBaru: "admin" })}>
                + Tambah admin
              </Button>
            </>
          )}
        </div>
      </div>

      {isLoading && <Skeleton className="h-48 w-full rounded-xl" />}

      {isError && (
        <div className="space-y-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <p>{error instanceof Error ? error.message : "Gagal memuat data."}</p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Coba lagi
          </Button>
        </div>
      )}

      {data && baris.length === 0 && (
        <p className="rounded-xl border border-dashed p-6 text-center text-sm text-slate-500">
          Belum ada data yang cocok.
        </p>
      )}

      {baris.length > 0 && (
        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full min-w-[760px] text-left text-sm">
            <caption className="sr-only">Daftar {mode === "santri" ? "santri" : "ustadz dan admin"}</caption>
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th scope="col" className="px-3 py-2.5">Nama</th>
                <th scope="col" className="px-3 py-2.5">{mode === "santri" ? "Halaqah" : "Peran"}</th>
                {mode === "santri" && <th scope="col" className="px-3 py-2.5">Target & hafalan awal</th>}
                <th scope="col" className="px-3 py-2.5">Tautan masuk</th>
                <th scope="col" className="px-3 py-2.5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {baris.map((p) => {
                const diriSendiri = p.id === penggunaSaatIniId;
                return (
                  <tr key={p.id} className="border-t">
                    <th scope="row" className="px-3 py-3 font-medium text-slate-900">
                      {p.nama_lengkap}
                      {diriSendiri && <span className="ml-2 text-xs font-normal text-slate-500">(Anda)</span>}
                    </th>
                    <td className="px-3 py-3">
                      {mode === "santri" ? p.nama_halaqah ?? <span className="text-slate-400">—</span> : LABEL_PERAN[p.role]}
                    </td>
                    {mode === "santri" && (
                      <td className="px-3 py-3 tabular-nums">
                        {p.target_juz} juz · awal {formatAngka(p.hafalan_awal_ayat ?? 0)} ayat
                      </td>
                    )}
                    <td className="px-3 py-3">
                      {p.punya_tautan ? (
                        <span className="text-emerald-700">✓ Aktif</span>
                      ) : (
                        <span className="text-amber-700">Belum ada</span>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex flex-wrap justify-end gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setForm({ open: true, pengguna: p, roleBaru: p.role })}
                        >
                          Ubah
                        </Button>
                        <Button size="sm" variant="outline" disabled={diriSendiri || ganti.isPending} onClick={() => handleTautan(p)}>
                          Tautan
                        </Button>
                        {p.punya_tautan && !diriSendiri && (
                          <Button size="sm" variant="outline" disabled={cabut.isPending} onClick={() => handleCabut(p)}>
                            Cabut
                          </Button>
                        )}
                        <Button size="sm" variant="outline" disabled={diriSendiri || hapus.isPending} onClick={() => handleHapus(p)}>
                          Hapus
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <PenggunaFormDialog
        open={form.open}
        onOpenChange={(open) => setForm((f) => ({ ...f, open }))}
        pengguna={form.pengguna}
        roleBaru={form.roleBaru}
        halaqah={halaqah.data ?? []}
        onTautan={onTautan}
      />
    </section>
  );
}
