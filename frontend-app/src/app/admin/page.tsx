"use client";

import { AdminPanel } from "@/components/admin/admin-panel";
import { AuthGuard } from "@/components/auth/auth-guard";

export default function AdminPage() {
  return (
    <AuthGuard roles={["admin"]}>
      {(user) => (
        <div className="mx-auto min-h-dvh w-full max-w-6xl bg-white px-4 pb-16 sm:px-6">
          <AdminPanel user={user} />
        </div>
      )}
    </AuthGuard>
  );
}
