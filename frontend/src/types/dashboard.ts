import type { TipeSesi } from "./setoran";

export type StatusSesi = "belum" | "menunggu" | "terverifikasi";
export type Indikator = "hijau" | "kuning" | "merah";

export interface SelSesi {
  status: StatusSesi;
  jumlah_setoran: number;
}

export type MatriksSesi = Record<TipeSesi, SelSesi>;

export interface BarisSantri {
  santri_id: string;
  nama_lengkap: string;
  halaqah_id: string | null;
  nama_halaqah: string | null;
  peringkat: number;
  sesi: MatriksSesi;
  jumlah_sesi: number;
  menunggu_validasi: number;
  indikator: Indikator;
}

export interface RingkasanDashboard {
  total_santri: number;
  hijau: number;
  kuning: number;
  merah: number;
  menunggu_validasi: number;
}

export interface DashboardUstadzResponse {
  tanggal: string;
  ringkasan: RingkasanDashboard;
  santri: BarisSantri[];
}

export interface Ustadz {
  id: string;
  nama_lengkap: string;
  halaqah_id: string | null;
}

export interface Halaqah {
  id: string;
  nama_kelas: string;
  ustadz_id: string | null;
}

export interface ValidasiInput {
  rating: number;
  catatan_ustadz: string | null;
}
