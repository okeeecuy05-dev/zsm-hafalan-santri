import { create } from "zustand";
import { persist } from "zustand/middleware";

import type { UserMe } from "@/types/auth";

interface AuthState {
  token: string | null;
  user: UserMe | null;
  masuk: (token: string, user: UserMe) => void;
  keluar: () => void;
}

// Token disimpan di perangkat (localStorage) agar sesi bertahan setelah aplikasi ditutup.
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      masuk: (token, user) => set({ token, user }),
      keluar: () => set({ token: null, user: null }),
    }),
    { name: "zsm-auth" },
  ),
);
