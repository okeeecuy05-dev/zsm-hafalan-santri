"use client";

import QRCode from "qrcode";
import { useEffect, useState } from "react";
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
import type { TautanMasuk } from "@/types/admin";

export interface TautanTampil {
  nama: string;
  tautan: TautanMasuk;
}

function IsiTautan({ nama, tautan }: TautanTampil) {
  const [qr, setQr] = useState<string | null>(null);

  useEffect(() => {
    let batal = false;
    QRCode.toDataURL(tautan.magic_link, { width: 280, margin: 2 })
      .then((url) => {
        if (!batal) setQr(url);
      })
      .catch(() => {
        if (!batal) setQr(null);
      });
    return () => {
      batal = true;
    };
  }, [tautan.magic_link]);

  async function salin() {
    try {
      await navigator.clipboard.writeText(tautan.magic_link);
      toast.success("Tautan disalin.");
    } catch {
      toast.error("Tidak dapat menyalin otomatis. Pilih teks tautan lalu salin manual.");
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Tautan masuk: {nama}</DialogTitle>
        <DialogDescription>
          Kirim tautan atau tunjukkan QR ini kepada yang bersangkutan. Tautan hanya ditampilkan sekali dan
          membatalkan tautan sebelumnya.
        </DialogDescription>
      </DialogHeader>

      <div className="flex justify-center">
        {qr ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={qr} alt={`Kode QR masuk untuk ${nama}`} width={220} height={220} className="rounded-lg border" />
        ) : (
          <div className="flex size-[220px] items-center justify-center rounded-lg border text-sm text-slate-400">
            Membuat QR…
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <Input readOnly value={tautan.magic_link} aria-label="Tautan masuk" onFocus={(e) => e.currentTarget.select()} />
        <Button variant="outline" onClick={salin}>
          Salin
        </Button>
      </div>

      {qr && (
        <a
          href={qr}
          download={`qr-masuk-${nama.replace(/\s+/g, "-").toLowerCase()}.png`}
          className="text-center text-sm font-medium text-emerald-700 underline-offset-4 hover:underline"
        >
          Unduh gambar QR
        </a>
      )}
    </>
  );
}

export function TautanDialog({ tampil, onClose }: { tampil: TautanTampil | null; onClose: () => void }) {
  return (
    <Dialog open={!!tampil} onOpenChange={(buka) => !buka && onClose()}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-md">
        {tampil && <IsiTautan nama={tampil.nama} tautan={tampil.tautan} />}
      </DialogContent>
    </Dialog>
  );
}
