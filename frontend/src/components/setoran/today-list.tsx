"use client";

import { Trash2 } from "lucide-react";
import { toast } from "sonner";

import { RatingStars } from "@/components/shared/rating-stars";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useDeleteSetoran, useSetoranHariIni } from "@/hooks/use-setoran";
import { RATING_LABEL } from "@/lib/dashboard";
import { formatRentang } from "@/lib/quran-data";
import { SESI_META } from "@/lib/session";

interface Props {
  santriId: string;
  tanggal: string;
}

export function TodayList({ santriId, tanggal }: Props) {
  const { data, isLoading, isError } = useSetoranHariIni(santriId, tanggal);
  const hapus = useDeleteSetoran();

  async function handleHapus(id: string) {
    if (!window.confirm("Hapus setoran ini?")) return;
    try {
      await hapus.mutateAsync(id);
      toast.success("Setoran dihapus.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menghapus setoran.");
    }
  }

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold text-slate-600">Setoran hari ini</h2>

      {isLoading && <Skeleton className="h-16 w-full rounded-xl" />}
      {isError && <p className="text-sm text-red-700">Gagal memuat setoran hari ini.</p>}
      {data && data.length === 0 && (
        <p className="rounded-xl border border-dashed p-4 text-center text-sm text-slate-500">
          Belum ada setoran hari ini. Yuk mulai! 🔥
        </p>
      )}

      <ul className="space-y-2">
        {data?.map((s) => {
          const meta = SESI_META[s.tipe_sesi];
          const adaUlasan = s.status === "verified" && (s.rating !== null || !!s.catatan_ustadz);
          return (
            <li key={s.id} className="space-y-2 rounded-xl border p-3">
              <div className="flex items-center gap-3">
                <span className="text-xl" aria-hidden>
                  {meta.emoji}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">{meta.label}</p>
                  <p className="truncate text-sm text-slate-600">{formatRentang(s)}</p>
                </div>
                {s.status === "verified" ? (
                  <Badge className="bg-emerald-600 hover:bg-emerald-600">Terverifikasi</Badge>
                ) : (
                  <>
                    <Badge variant="secondary">Menunggu</Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Hapus setoran"
                      disabled={hapus.isPending}
                      onClick={() => handleHapus(s.id)}
                    >
                      <Trash2 className="size-4 text-slate-500" />
                    </Button>
                  </>
                )}
              </div>

              {adaUlasan && (
                <div className="space-y-1 rounded-lg bg-emerald-50 p-2 text-sm">
                  {s.rating !== null && (
                    <div className="flex items-center gap-2">
                      <RatingStars value={s.rating} />
                      <span className="text-xs font-medium text-emerald-800">{RATING_LABEL[s.rating]}</span>
                    </div>
                  )}
                  {s.catatan_ustadz && (
                    <p className="text-slate-700">
                      <span className="font-semibold">Catatan ustadz:</span> {s.catatan_ustadz}
                    </p>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
