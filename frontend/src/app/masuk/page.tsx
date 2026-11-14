"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";

import { QrScanner } from "@/components/auth/qr-scanner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useHydrated } from "@/hooks/use-hydrated";
import { api } from "@/lib/api";
import { ekstrakToken, HOME_PERAN } from "@/lib/auth";
import { useAuthStore } from "@/store/auth-store";

function MasukIsi() {
  const router = useRouter();
  const params = useSearchParams();
  const hydrated = useHydrated();
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const masuk = useAuthStore((s) => s.masuk);

  const [teks, setTeks] = useState("");
  const [galat, setGalat] = useState<string | null>(null);
  const [memuat, setMemuat] = useState(false);
  const [pindai, setPindai] = useState(false);
  const sudahOtomatis = useRef(false);
  const tokenUrl = params.get("token");

  const masukDenganToken = useCallback(
    async (mentah: string) => {
      const tokenBersih = ekstrakToken(mentah);
      if (!tokenBersih) {
        setGalat("Tempel tautan masuk atau kode Anda terlebih dahulu.");
        return;
      }
      setMemuat(true);
      setGalat(null);
      try {
        const res = await api.login(tokenBersih);
        masuk(res.access_token, res.user);
        router.replace(HOME_PERAN[res.user.role]);
      } catch (e) {
        setGalat(e instanceof Error ? e.message : "Gagal masuk.");
        router.replace("/masuk"); // buang token dari alamat
      } finally {
        setMemuat(false);
      }
    },
    [masuk, router],
  );

  // Magic Link: /masuk?token=... langsung mencoba masuk satu kali.
  useEffect(() => {
    if (hydrated && tokenUrl && !sudahOtomatis.current) {
      sudahOtomatis.current = true;
      void masukDenganToken(tokenUrl);
    }
  }, [hydrated, tokenUrl, masukDenganToken]);

  // Sudah masuk dan tidak sedang memakai tautan baru: langsung ke halaman perannya.
  useEffect(() => {
    if (hydrated && token && user && !tokenUrl) router.replace(HOME_PERAN[user.role]);
  }, [hydrated, token, user, tokenUrl, router]);

  const hasilPindai = useCallback(
    (hasil: string) => {
      setPindai(false);
      void masukDenganToken(hasil);
    },
    [masukDenganToken],
  );

  if (!hydrated) return <Skeleton className="mx-auto mt-16 h-64 w-full max-w-md" />;

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-5 px-5 py-10">
      <div className="space-y-1 text-center">
        <p className="text-4xl" aria-hidden>
          📖
        </p>
        <h1 className="text-2xl font-bold">ZSM Hafalan Santri</h1>
        <p className="text-sm text-slate-600">Masuk tanpa kata sandi.</p>
      </div>

      {memuat && tokenUrl ? (
        <p className="rounded-xl bg-emerald-50 p-4 text-center text-sm text-emerald-900">Memeriksa tautan masuk…</p>
      ) : (
        <div className="space-y-4 rounded-2xl border bg-white p-4 shadow-sm">
          <div className="space-y-1.5">
            <Label htmlFor="token-masuk">Tautan masuk atau kode</Label>
            <Textarea
              id="token-masuk"
              rows={3}
              placeholder="Tempel tautan dari admin di sini"
              value={teks}
              disabled={memuat}
              onChange={(e) => setTeks(e.target.value)}
            />
          </div>

          {galat && (
            <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
              {galat}
            </p>
          )}

          <Button
            className="h-12 w-full bg-emerald-600 text-base hover:bg-emerald-700"
            disabled={memuat}
            onClick={() => masukDenganToken(teks)}
          >
            {memuat ? "Memeriksa…" : "Masuk"}
          </Button>

          <Button variant="outline" className="w-full" disabled={memuat} onClick={() => setPindai((v) => !v)}>
            {pindai ? "Tutup pemindai" : "📷 Pindai kode QR"}
          </Button>

          {pindai && <QrScanner onScan={hasilPindai} />}
        </div>
      )}

      <p className="text-center text-xs text-slate-500">
        Belum punya tautan atau QR? Minta kepada admin pesantren.
      </p>
    </main>
  );
}

export default function MasukPage() {
  // useSearchParams wajib dibungkus Suspense agar build produksi Next.js berhasil.
  return (
    <Suspense fallback={<Skeleton className="mx-auto mt-16 h-64 w-full max-w-md" />}>
      <MasukIsi />
    </Suspense>
  );
}
