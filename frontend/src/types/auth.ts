export type Peran = "santri" | "ustadz" | "admin";

export interface UserMe {
  id: string;
  nama_lengkap: string;
  role: Peran;
  halaqah_id: string | null;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  expires_at: string;
  user: UserMe;
}
