import type { TipeSesi } from "@/types/setoran";

/** Jam lokal (0-23) mulai munculnya pengingat untuk tiap sesi. Ubah sesuai jadwal pesantren. */
export const JAM_PENGINGAT: Record<TipeSesi, number> = {
  ziadah: 9,
  murajaah: 16,
  sabqi: 20,
};

export function formatJam(jam: number): string {
  return `${String(jam).padStart(2, "0")}.00`;
}

/** Sesi yang jam pengingatnya sudah lewat tetapi belum disetor hari ini (urut sesuai jam). */
export function sesiTerlambat(sesiHariIni: Record<TipeSesi, boolean>, sekarang: Date): TipeSesi[] {
  const jam = sekarang.getHours() + sekarang.getMinutes() / 60;
  return (Object.keys(JAM_PENGINGAT) as TipeSesi[])
    .filter((sesi) => !sesiHariIni[sesi] && jam >= JAM_PENGINGAT[sesi])
    .sort((a, b) => JAM_PENGINGAT[a] - JAM_PENGINGAT[b]);
}
