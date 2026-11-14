"use client";

import Link from "next/link";

import { AuthGuard } from "@/components/auth/auth-guard";
import { MobileShell } from "@/components/layout/mobile-shell";
import { BadgeCelebration } from "@/components/profil/badge-celebration";
import { ProfilCapaian } from "@/components/profil/profil-capaian";
import type { UserMe } from "@/types/auth";

function ProfilSaya({ user }: { user: UserMe }) {
  return (
    <MobileShell>
      <header className="sticky top-0 z-10 flex items-center gap-3 bg-emerald-600 px-4 py-3 text-white">
        <Link href="/" className="text-sm font-medium underline-offset-4 hover:underline">
          ← Kembali
        </Link>
        <h1 className="font-semibold">Profil & Lencana</h1>
      </header>
      <main className="px-4 pb-24 pt-5">
        <ProfilCapaian santriId={user.id} sudutPandang="santri" />
      </main>
      <BadgeCelebration santriId={user.id} />
    </MobileShell>
  );
}

export default function ProfilPage() {
  return <AuthGuard roles={["santri"]}>{(user) => <ProfilSaya user={user} />}</AuthGuard>;
}
