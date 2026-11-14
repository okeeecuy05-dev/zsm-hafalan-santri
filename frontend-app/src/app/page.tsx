"use client";

import { AuthGuard } from "@/components/auth/auth-guard";
import { AppHeader } from "@/components/layout/app-header";
import { MobileShell } from "@/components/layout/mobile-shell";
import { BadgeCelebration } from "@/components/profil/badge-celebration";
import { ReminderBanner } from "@/components/setoran/reminder-banner";
import { SetoranForm } from "@/components/setoran/setoran-form";
import { TodayList } from "@/components/setoran/today-list";
import { StreakCard } from "@/components/streak/streak-card";
import { tanggalLokal } from "@/lib/session";
import type { UserMe } from "@/types/auth";

function BerandaSantri({ user }: { user: UserMe }) {
  const tanggal = tanggalLokal();
  return (
    <MobileShell>
      <AppHeader nama={user.nama_lengkap} />
      <main className="space-y-8 px-4 pb-24 pt-5">
        <ReminderBanner santriId={user.id} />
        <StreakCard santriId={user.id} />
        <SetoranForm santriId={user.id} tanggal={tanggal} />
        <TodayList santriId={user.id} tanggal={tanggal} />
      </main>
      <BadgeCelebration santriId={user.id} />
    </MobileShell>
  );
}

export default function HomePage() {
  return <AuthGuard roles={["santri"]}>{(user) => <BerandaSantri user={user} />}</AuthGuard>;
}
