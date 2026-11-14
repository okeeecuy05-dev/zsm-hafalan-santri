"use client";

import "./badge-celebration.css";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useBadges, useTandaiBadgeDilihat } from "@/hooks/use-profil";

import { ikonLencana } from "./badge-showcase";

const WARNA = ["#10b981", "#f59e0b", "#3b82f6", "#ef4444", "#8b5cf6", "#ec4899"];
const KONFETI = Array.from({ length: 36 }, (_, i) => ({
  l: `${(i * 37) % 100}%`,
  t: `${(i % 9) * 0.12}s`,
  d: `${2 + (i % 5) * 0.35}s`,
  c: WARNA[i % WARNA.length],
}));

/** Pop-up selebrasi (konfeti) saat ada lencana baru yang belum pernah dilihat santri. */
export function BadgeCelebration({ santriId }: { santriId: string }) {
  const { data } = useBadges(santriId);
  const tandai = useTandaiBadgeDilihat(santriId);
  const [ditutupKunci, setDitutupKunci] = useState("");

  const baru = (data ?? []).filter((b) => b.baru);
  const kunci = baru.map((b) => b.id).join(",");
  const terbuka = baru.length > 0 && kunci !== ditutupKunci;

  function tutup() {
    setDitutupKunci(kunci);
    tandai.mutate();
  }

  return (
    <Dialog open={terbuka} onOpenChange={(buka) => !buka && tutup()}>
      <DialogContent className="relative overflow-hidden text-center sm:max-w-sm">
        <div className="zsm-confetti" aria-hidden>
          {KONFETI.map((k, i) => (
            <span key={i} style={{ "--l": k.l, "--t": k.t, "--d": k.d, "--c": k.c } as React.CSSProperties} />
          ))}
        </div>
        <DialogHeader className="items-center">
          <span className="zsm-badge-pop text-6xl" aria-hidden>
            {ikonLencana(baru[0]?.juz ?? 1)}
          </span>
          <DialogTitle>Lencana baru! 🎉</DialogTitle>
          <DialogDescription>Alhamdulillah, kamu meraih lencana:</DialogDescription>
        </DialogHeader>
        <ul className="space-y-1">
          {baru.map((b) => (
            <li key={b.id} className="text-lg font-bold text-emerald-700">
              {b.nama_badge}
            </li>
          ))}
        </ul>
        <Button className="w-full bg-emerald-600 hover:bg-emerald-700" onClick={tutup}>
          Lanjutkan
        </Button>
      </DialogContent>
    </Dialog>
  );
}
