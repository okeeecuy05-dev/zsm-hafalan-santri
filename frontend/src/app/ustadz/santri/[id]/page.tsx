"use client";

import Link from "next/link";
import { useParams } from "next/navigation";

import { AuthGuard } from "@/components/auth/auth-guard";
import { ProfilCapaian } from "@/components/profil/profil-capaian";
import { StreakCard } from "@/components/streak/streak-card";

export default function DetailSantriPage() {
  const { id } = useParams<{ id: string }>();

  return (
    <AuthGuard roles={["ustadz", "admin"]}>
      {() => (
        <div className="mx-auto min-h-dvh w-full max-w-3xl space-y-5 bg-white px-4 pb-16 pt-4 sm:px-6">
          <Link
            href="/ustadz"
            className="inline-block text-sm font-medium text-emerald-700 underline-offset-4 hover:underline"
          >
            ← Kembali ke dasbor
          </Link>
          <ProfilCapaian santriId={id} sudutPandang="ustadz" />
          <StreakCard santriId={id} />
        </div>
      )}
    </AuthGuard>
  );
}
