"use client";

import jsQR from "jsqr";
import { useEffect, useRef, useState } from "react";

interface Props {
  onScan: (teks: string) => void;
}

/** Pemindai QR memakai kamera belakang. Membutuhkan HTTPS (atau localhost) dan izin kamera. */
export function QrScanner({ onScan }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const onScanRef = useRef(onScan);
  const [pesan, setPesan] = useState<string | null>(null);

  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  useEffect(() => {
    let aktif = true;
    let stream: MediaStream | null = null;
    let frame = 0;

    const hentikan = () => stream?.getTracks().forEach((t) => t.stop());

    async function mulai() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setPesan("Kamera tidak tersedia di sini (butuh HTTPS). Tempel tautan secara manual.");
        return;
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      } catch {
        setPesan("Izin kamera ditolak atau kamera tidak ditemukan. Tempel tautan secara manual.");
        return;
      }
      const video = videoRef.current;
      if (!aktif || !video) {
        hentikan();
        return;
      }
      video.srcObject = stream;
      try {
        await video.play();
      } catch {
        /* pemutaran otomatis diblokir; frame tetap dibaca saat siap */
      }

      const tick = () => {
        if (!aktif) return;
        const canvas = canvasRef.current;
        if (canvas && video.readyState >= 2 && video.videoWidth > 0) {
          const skala = Math.min(1, 480 / video.videoWidth);
          canvas.width = Math.floor(video.videoWidth * skala);
          canvas.height = Math.floor(video.videoHeight * skala);
          const ctx = canvas.getContext("2d", { willReadFrequently: true });
          if (ctx) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const gambar = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const hasil = jsQR(gambar.data, gambar.width, gambar.height, {
              inversionAttempts: "dontInvert",
            });
            if (hasil?.data) {
              aktif = false;
              hentikan();
              onScanRef.current(hasil.data);
              return;
            }
          }
        }
        frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
    }

    void mulai();
    return () => {
      aktif = false;
      cancelAnimationFrame(frame);
      hentikan();
    };
  }, []);

  return (
    <div className="space-y-2">
      {pesan ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">{pesan}</p>
      ) : (
        <div className="overflow-hidden rounded-xl border bg-black">
          <video ref={videoRef} playsInline muted className="aspect-square w-full object-cover" />
        </div>
      )}
      <canvas ref={canvasRef} className="hidden" />
      {!pesan && <p className="text-center text-xs text-slate-500">Arahkan kamera ke kode QR dari kartu/admin.</p>}
    </div>
  );
}
