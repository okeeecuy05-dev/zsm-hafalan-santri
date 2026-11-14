export type StatusPrediksi =
  | "tercapai"
  | "terprediksi"
  | "belum_ada_data"
  | "tidak_aktif"
  | "terlalu_jauh";

export interface AnalitikSantri {
  target_juz: number;
  hafalan_awal_ayat: number;
  ayat_terekam: number;
  total_hafal_ayat: number;
  juz_hafal: number;
  target_ayat: number;
  sisa_ayat: number;
  persen_target: number;
  avg_ayat_per_hari: number | null;
  jendela_hari: number;
  status_prediksi: StatusPrediksi;
  estimasi_khatam: string | null;
  hari_menuju_khatam: number | null;
  kecepatan_7_hari: number;
  kecepatan_pembanding: number;
  melambat: boolean;
  persen_penurunan: number | null;
  tidak_aktif_hari: number | null;
}

export interface TitikGrafik {
  tanggal: string;
  kumulatif_ayat: number;
}

export interface BadgeStatus {
  id: string;
  nama_badge: string;
  kriteria_pencapaian: string;
  juz: number;
  ambang_ayat: number;
  diperoleh: boolean;
  tanggal_didapat: string | null;
  baru: boolean;
}

export interface RingkasAnalitikSantri {
  santri_id: string;
  nama_lengkap: string;
  halaqah_id: string | null;
  nama_halaqah: string | null;
  analitik: AnalitikSantri;
}

export interface AnalitikUstadzResponse {
  tanggal: string;
  jumlah_melambat: number;
  santri: RingkasAnalitikSantri[];
}

export interface ProfilSantriResponse {
  santri_id: string;
  nama_lengkap: string;
  nama_halaqah: string | null;
  tanggal: string;
  analitik: AnalitikSantri;
  grafik: TitikGrafik[];
  badges: BadgeStatus[];
}
