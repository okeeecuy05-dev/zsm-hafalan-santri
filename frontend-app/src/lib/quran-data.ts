import type { RentangAyat } from "@/types/setoran";

// [nama surah, jumlah ayat] urut nomor surah 1..114
const DATA: ReadonlyArray<readonly [string, number]> = [
  ["Al-Fatihah", 7], ["Al-Baqarah", 286], ["Ali 'Imran", 200], ["An-Nisa'", 176], ["Al-Ma'idah", 120],
  ["Al-An'am", 165], ["Al-A'raf", 206], ["Al-Anfal", 75], ["At-Taubah", 129], ["Yunus", 109],
  ["Hud", 123], ["Yusuf", 111], ["Ar-Ra'd", 43], ["Ibrahim", 52], ["Al-Hijr", 99],
  ["An-Nahl", 128], ["Al-Isra'", 111], ["Al-Kahf", 110], ["Maryam", 98], ["Taha", 135],
  ["Al-Anbiya'", 112], ["Al-Hajj", 78], ["Al-Mu'minun", 118], ["An-Nur", 64], ["Al-Furqan", 77],
  ["Asy-Syu'ara'", 227], ["An-Naml", 93], ["Al-Qasas", 88], ["Al-'Ankabut", 69], ["Ar-Rum", 60],
  ["Luqman", 34], ["As-Sajdah", 30], ["Al-Ahzab", 73], ["Saba'", 54], ["Fatir", 45],
  ["Yasin", 83], ["As-Saffat", 182], ["Sad", 88], ["Az-Zumar", 75], ["Gafir", 85],
  ["Fussilat", 54], ["Asy-Syura", 53], ["Az-Zukhruf", 89], ["Ad-Dukhan", 59], ["Al-Jasiyah", 37],
  ["Al-Ahqaf", 35], ["Muhammad", 38], ["Al-Fath", 29], ["Al-Hujurat", 18], ["Qaf", 45],
  ["Az-Zariyat", 60], ["At-Tur", 49], ["An-Najm", 62], ["Al-Qamar", 55], ["Ar-Rahman", 78],
  ["Al-Waqi'ah", 96], ["Al-Hadid", 29], ["Al-Mujadilah", 22], ["Al-Hasyr", 24], ["Al-Mumtahanah", 13],
  ["As-Saff", 14], ["Al-Jumu'ah", 11], ["Al-Munafiqun", 11], ["At-Tagabun", 18], ["At-Talaq", 12],
  ["At-Tahrim", 12], ["Al-Mulk", 30], ["Al-Qalam", 52], ["Al-Haqqah", 52], ["Al-Ma'arij", 44],
  ["Nuh", 28], ["Al-Jinn", 28], ["Al-Muzzammil", 20], ["Al-Muddassir", 56], ["Al-Qiyamah", 40],
  ["Al-Insan", 31], ["Al-Mursalat", 50], ["An-Naba'", 40], ["An-Nazi'at", 46], ["'Abasa", 42],
  ["At-Takwir", 29], ["Al-Infitar", 19], ["Al-Mutaffifin", 36], ["Al-Insyiqaq", 25], ["Al-Buruj", 22],
  ["At-Tariq", 17], ["Al-A'la", 19], ["Al-Gasyiyah", 26], ["Al-Fajr", 30], ["Al-Balad", 20],
  ["Asy-Syams", 15], ["Al-Lail", 21], ["Ad-Duha", 11], ["Al-Insyirah", 8], ["At-Tin", 8],
  ["Al-'Alaq", 19], ["Al-Qadr", 5], ["Al-Bayyinah", 8], ["Az-Zalzalah", 8], ["Al-'Adiyat", 11],
  ["Al-Qari'ah", 11], ["At-Takasur", 8], ["Al-'Asr", 3], ["Al-Humazah", 9], ["Al-Fil", 5],
  ["Quraisy", 4], ["Al-Ma'un", 7], ["Al-Kausar", 3], ["Al-Kafirun", 6], ["An-Nasr", 3],
  ["Al-Lahab", 5], ["Al-Ikhlas", 4], ["Al-Falaq", 5], ["An-Nas", 6],
];

export interface Surah {
  nomor: number;
  nama: string;
  jumlahAyat: number;
}

export const SURAH_LIST: Surah[] = DATA.map(([nama, jumlahAyat], i) => ({
  nomor: i + 1,
  nama,
  jumlahAyat,
}));

const KUMULATIF: number[] = SURAH_LIST.reduce<number[]>(
  (acc, s) => {
    acc.push(acc[acc.length - 1] + s.jumlahAyat);
    return acc;
  },
  [0],
);

function keIndeks(surah: number, ayat: number): number {
  return KUMULATIF[surah - 1] + ayat;
}

/** Cermin dari validasi_rentang di backend; mengembalikan pesan error atau null. */
export function validasiRentang(
  surahAwal: number,
  ayatAwal: number,
  surahAkhir: number,
  ayatAkhir: number,
): string | null {
  const s1 = SURAH_LIST[surahAwal - 1];
  const s2 = SURAH_LIST[surahAkhir - 1];
  if (!s1 || !s2) return "Surah tidak valid.";
  if (!ayatAwal || !ayatAkhir) return "Isi ayat awal dan ayat akhir.";
  if (ayatAwal < 1 || ayatAwal > s1.jumlahAyat)
    return `Ayat awal harus 1–${s1.jumlahAyat} (${s1.nama}).`;
  if (ayatAkhir < 1 || ayatAkhir > s2.jumlahAyat)
    return `Ayat akhir harus 1–${s2.jumlahAyat} (${s2.nama}).`;
  if (keIndeks(surahAwal, ayatAwal) > keIndeks(surahAkhir, ayatAkhir))
    return "Ayat awal tidak boleh melewati ayat akhir.";
  return null;
}

export function formatRentang(r: RentangAyat): string {
  const awal = SURAH_LIST[r.surah_awal - 1]?.nama ?? `Surah ${r.surah_awal}`;
  const akhir = SURAH_LIST[r.surah_akhir - 1]?.nama ?? `Surah ${r.surah_akhir}`;
  if (r.surah_awal === r.surah_akhir) {
    return r.ayat_awal === r.ayat_akhir
      ? `${awal}: ${r.ayat_awal}`
      : `${awal}: ${r.ayat_awal}–${r.ayat_akhir}`;
  }
  return `${awal}: ${r.ayat_awal} – ${akhir}: ${r.ayat_akhir}`;
}
