import type { Peran } from "./auth";

export interface PenggunaRead {
  id: string;
  nama_lengkap: string;
  role: Peran;
  halaqah_id: string | null;
  nama_halaqah: string | null;
  target_juz: number | null;
  hafalan_awal_ayat: number | null;
  punya_tautan: boolean;
  created_at: string;
}

export interface PenggunaCreateInput {
  nama_lengkap: string;
  role: Peran;
  halaqah_id?: string | null;
  target_juz?: number;
  hafalan_awal_ayat?: number;
}

/** halaqah_id: undefined = tidak diubah, null = lepas dari halaqah. */
export interface PenggunaUpdateInput {
  nama_lengkap?: string;
  halaqah_id?: string | null;
  target_juz?: number;
  hafalan_awal_ayat?: number;
}

export interface TautanMasuk {
  token: string;
  magic_link: string;
}

export interface PenggunaDibuat {
  pengguna: PenggunaRead;
  tautan: TautanMasuk;
}

export interface HalaqahAdmin {
  id: string;
  nama_kelas: string;
  ustadz_id: string | null;
  nama_ustadz: string | null;
  jumlah_santri: number;
}

export interface HalaqahCreateInput {
  nama_kelas: string;
  ustadz_id?: string | null;
}

/** ustadz_id: undefined = tidak diubah, null = lepas ustadz. */
export interface HalaqahUpdateInput {
  nama_kelas?: string;
  ustadz_id?: string | null;
}
