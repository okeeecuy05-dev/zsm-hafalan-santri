import type {
  HalaqahAdmin,
  HalaqahCreateInput,
  HalaqahUpdateInput,
  PenggunaCreateInput,
  PenggunaDibuat,
  PenggunaRead,
  PenggunaUpdateInput,
  TautanMasuk,
} from "@/types/admin";
import type {
  AnalitikUstadzResponse,
  BadgeStatus,
  ProfilSantriResponse,
} from "@/types/analytics";
import type { LoginResponse, Peran, UserMe } from "@/types/auth";
import type { DashboardUstadzResponse, Halaqah, ValidasiInput } from "@/types/dashboard";
import type {
  AutoFillResponse,
  Setoran,
  SetoranCreateInput,
  StreakResponse,
} from "@/types/setoran";

import { useAuthStore } from "@/store/auth-store";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = useAuthStore.getState().token;
  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...init?.headers,
      },
      cache: "no-store",
    });
  } catch {
    throw new ApiError(0, "Tidak dapat terhubung ke server. Periksa koneksi internet Anda.");
  }

  if (!res.ok) {
    let message = `Terjadi kesalahan (${res.status}).`;
    try {
      const body = await res.json();
      if (typeof body.detail === "string") {
        message = body.detail;
      } else if (Array.isArray(body.detail)) {
        message = body.detail
          .map((d: { msg: string }) => d.msg.replace(/^Value error, /, ""))
          .join("; ");
      }
    } catch {
      /* body bukan JSON; pakai pesan default */
    }
    // Sesi berakhir/dicabut: bersihkan agar halaman mengalihkan ke /masuk.
    if (res.status === 401 && token && path !== "/api/auth/login") {
      useAuthStore.getState().keluar();
    }
    throw new ApiError(res.status, message);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

function withQuery(path: string, params: Record<string, string | undefined>): string {
  const q = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) q.set(key, value);
  }
  const qs = q.toString();
  return qs ? `${path}?${qs}` : path;
}

const json = (body: unknown): RequestInit => ({ body: JSON.stringify(body) });

export const api = {
  // --- autentikasi (Fase 4) ---
  login: (token: string) =>
    request<LoginResponse>("/api/auth/login", { method: "POST", ...json({ token }) }),
  me: () => request<UserMe>("/api/auth/me"),

  // --- setoran (Fase 1) ---
  listSetoran: (p: { santriId: string; tanggal?: string }) =>
    request<Setoran[]>(withQuery("/api/setoran", { santri_id: p.santriId, tanggal: p.tanggal })),

  getAutoFill: (p: { santriId: string; tanggal: string }) =>
    request<AutoFillResponse>(
      withQuery("/api/setoran/auto-fill", { santri_id: p.santriId, tanggal: p.tanggal }),
    ),

  createSetoran: (body: SetoranCreateInput) =>
    request<Setoran>("/api/setoran", { method: "POST", ...json(body) }),

  deleteSetoran: (id: string) => request<void>(`/api/setoran/${id}`, { method: "DELETE" }),

  // --- streak (Fase 2) ---
  getStreak: (santriId: string) => request<StreakResponse>(`/api/streak/${santriId}`),

  // --- dasbor ustadz & validasi (Fase 3) ---
  listHalaqah: () => request<Halaqah[]>("/api/halaqah"),

  getDashboardUstadz: (p: { tanggal: string; halaqahId?: string; q?: string }) =>
    request<DashboardUstadzResponse>(
      withQuery("/api/dashboard/ustadz", { tanggal: p.tanggal, halaqah_id: p.halaqahId, q: p.q }),
    ),

  validasiSetoran: (id: string, body: ValidasiInput) =>
    request<Setoran>(`/api/setoran/${id}/validasi`, { method: "PATCH", ...json(body) }),

  // --- analitik & lencana (Fase 4) ---
  getAnalitikUstadz: (p: { halaqahId?: string; q?: string }) =>
    request<AnalitikUstadzResponse>(
      withQuery("/api/analytics/ustadz", { halaqah_id: p.halaqahId, q: p.q }),
    ),

  getProfil: (santriId: string, hari = 90) =>
    request<ProfilSantriResponse>(`/api/analytics/santri/${santriId}?hari=${hari}`),

  getBadges: (santriId: string) =>
    request<BadgeStatus[]>(`/api/analytics/santri/${santriId}/badges`),

  tandaiBadgeDilihat: (santriId: string) =>
    request<{ ditandai: number }>(`/api/analytics/santri/${santriId}/badges/dilihat`, {
      method: "POST",
    }),

  // --- admin (Fase 4) ---
  listPengguna: (p: { role?: Peran; q?: string; halaqahId?: string }) =>
    request<PenggunaRead[]>(
      withQuery("/api/admin/pengguna", { role: p.role, q: p.q, halaqah_id: p.halaqahId }),
    ),
  createPengguna: (body: PenggunaCreateInput) =>
    request<PenggunaDibuat>("/api/admin/pengguna", { method: "POST", ...json(body) }),
  updatePengguna: (id: string, body: PenggunaUpdateInput) =>
    request<PenggunaRead>(`/api/admin/pengguna/${id}`, { method: "PATCH", ...json(body) }),
  deletePengguna: (id: string) =>
    request<void>(`/api/admin/pengguna/${id}`, { method: "DELETE" }),
  gantiTautan: (id: string) =>
    request<TautanMasuk>(`/api/admin/pengguna/${id}/magic-link`, { method: "POST" }),
  cabutTautan: (id: string) =>
    request<void>(`/api/admin/pengguna/${id}/magic-link`, { method: "DELETE" }),

  listHalaqahAdmin: () => request<HalaqahAdmin[]>("/api/admin/halaqah"),
  createHalaqah: (body: HalaqahCreateInput) =>
    request<HalaqahAdmin>("/api/admin/halaqah", { method: "POST", ...json(body) }),
  updateHalaqah: (id: string, body: HalaqahUpdateInput) =>
    request<HalaqahAdmin>(`/api/admin/halaqah/${id}`, { method: "PATCH", ...json(body) }),
  deleteHalaqah: (id: string) => request<void>(`/api/admin/halaqah/${id}`, { method: "DELETE" }),
  aturTargetKelas: (id: string, targetJuz: number) =>
    request<{ diperbarui: number }>(`/api/admin/halaqah/${id}/target`, {
      method: "PATCH",
      ...json({ target_juz: targetJuz }),
    }),
};
