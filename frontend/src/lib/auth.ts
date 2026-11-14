import type { Peran } from "@/types/auth";

/** Halaman utama tiap peran. Semuanya diizinkan untuk perannya, sehingga pengalihan tidak pernah berputar. */
export const HOME_PERAN: Record<Peran, string> = {
  santri: "/",
  ustadz: "/ustadz",
  admin: "/admin",
};

/** Mengambil token dari tautan lengkap, potongan "?token=...", atau token mentah. */
export function ekstrakToken(masukan: string): string {
  const teks = masukan.trim();
  if (!teks) return "";
  try {
    const dariUrl = new URL(teks).searchParams.get("token");
    if (dariUrl) return dariUrl.trim();
  } catch {
    /* bukan URL lengkap */
  }
  const cocok = teks.match(/(?:^|[?&])token=([^&\s#]+)/);
  if (cocok) return decodeURIComponent(cocok[1]);
  return teks;
}
