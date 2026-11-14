"use client";

import { AuthGuard } from "@/components/auth/auth-guard";
import { UstadzDashboard } from "@/components/ustadz/ustadz-dashboard";

export default function UstadzPage() {
  return (
    <AuthGuard roles={["ustadz", "admin"]}>
      {(user) => (
        <div className="mx-auto min-h-dvh w-full max-w-6xl bg-white px-4 pb-16 sm:px-6">
          <UstadzDashboard user={user} />
        </div>
      )}
    </AuthGuard>
  );
}
