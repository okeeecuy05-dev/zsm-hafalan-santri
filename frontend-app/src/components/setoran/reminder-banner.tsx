"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { useStreak } from "@/hooks/use-streak";
import { formatJam, JAM_PENGINGAT, sesiTerlambat } from "@/lib/reminder";
import { SESI_META, tanggalLokal } from "@/lib/session";

interface Props {
  santriId: string;
  /** Hanya untuk pengujian: waktu tetap menggantikan jam perangkat. */
  sekarangTetap?: Date;
}

type IzinNotifikasi = NotificationPermission | "tidak-didukung";

function bacaIzin(): IzinNotifikasi {
  return typeof window !== "undefined" && "Notification" in window
    ? Notification.permission
    : "tidak-didukung";
}

/**
 * Pengingat setoran: banner di dalam aplikasi + notifikasi browser (selama aplikasi terbuka).
 * Notifikasi saat aplikasi tertutup membutuhkan Web Push (service worker + server), belum termasuk.
 */
export function ReminderBanner({ santriId, sekarangTetap }: Props) {
  const { data } = useStreak(santriId);
  const [jam, setJam] = useState(() => new Date());
  const [izin, setIzin] = useState<IzinNotifikasi>("tidak-didukung");

  useEffect(() => {
    if (sekarangTetap) return;
    const timer = setInterval(() => setJam(new Date()), 60_000);
    return () => clearInterval(timer);
  }, [sekarangTetap]);

  useEffect(() => {
    setIzin(bacaIzin());
  }, []);

  const sekarang = sekarangTetap ?? jam;
  const terlambat = data ? sesiTerlambat(data.sesi_hari_ini, sekarang) : [];
  const kunciTerlambat = terlambat.join(",");

  useEffect(() => {
    if (izin !== "granted" || terlambat.length === 0) return;
    for (const sesi of terlambat) {
      const kunci = `zsm-notif-${tanggalLokal(sekarang)}-${sesi}`;
      try {
        if (localStorage.getItem(kunci)) continue;
        new Notification("ZSM Hafalan", { body: `${SESI_META[sesi].label} hari ini belum disetor.` });
        localStorage.setItem(kunci, "1");
      } catch {
        /* sebagian browser seluler tidak mendukung konstruktor Notification */
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [izin, kunciTerlambat]);

  if (!data || terlambat.length === 0) return null;

  async function aktifkan() {
    if (!("Notification" in window)) return;
    setIzin(await Notification.requestPermission());
  }

  return (
    <div role="status" className="space-y-2 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
      <p className="font-semibold">⏰ Pengingat setoran</p>
      <ul className="list-disc pl-5">
        {terlambat.map((sesi) => (
          <li key={sesi}>
            {SESI_META[sesi].label} belum disetor (sejak {formatJam(JAM_PENGINGAT[sesi])})
          </li>
        ))}
      </ul>
      {izin === "default" && (
        <Button variant="outline" size="sm" onClick={aktifkan}>
          Aktifkan notifikasi pengingat
        </Button>
      )}
    </div>
  );
}
