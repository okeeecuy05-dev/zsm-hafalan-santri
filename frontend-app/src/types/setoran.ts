export type TipeSesi = "ziadah" | "sabqi" | "murajaah";
export type StatusSetoran = "pending" | "verified";

export interface Santri {
  id: string;
  nama_lengkap: string;
  halaqah_id: string | null;
}

export interface RentangAyat {
  surah_awal: number;
  ayat_awal: number;
  surah_akhir: number;
  ayat_akhir: number;
}

export interface Setoran extends RentangAyat {
  id: string;
  santri_id: string;
  tipe_sesi: TipeSesi;
  tanggal: string;
  status: StatusSetoran;
  rating: number | null;
  catatan_ustadz: string | null;
  created_at: string;
  updated_at: string;
}

export interface SetoranCreateInput extends RentangAyat {
  santri_id: string;
  tipe_sesi: TipeSesi;
  tanggal?: string;
}

export interface AutoFillResponse {
  tersedia: boolean;
  tanggal: string;
  segmen: RentangAyat[];
}

export interface HariStreak {
  tanggal: string;
  jumlah_sesi: number;
  lengkap: boolean;
}

export interface StreakResponse {
  santri_id: string;
  tanggal: string;
  current_streak: number;
  highest_streak: number;
  hari_ini_lengkap: boolean;
  /** Streak masih berjalan (berakhir kemarin) tapi sesi hari ini belum lengkap. */
  terancam: boolean;
  sesi_hari_ini: Record<TipeSesi, boolean>;
  sesi_tersisa: TipeSesi[];
  /** 7 hari terakhir, urut dari terlama ke hari ini. */
  mingguan: HariStreak[];
}
