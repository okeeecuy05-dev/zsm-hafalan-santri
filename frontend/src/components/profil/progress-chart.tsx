import { formatAngka, formatTanggalPendek } from "@/lib/format";
import type { TitikGrafik } from "@/types/analytics";

interface Props {
  titik: TitikGrafik[];
  targetAyat: number;
}

const W = 600;
const H = 220;
const KIRI = 52;
const KANAN = 16;
const ATAS = 16;
const BAWAH = 30;

/** Grafik garis total hafalan kumulatif. Sumbu Y diperbesar ke rentang data agar kemajuan terlihat. */
export function ProgressChart({ titik, targetAyat }: Props) {
  if (titik.length < 2) return null;

  const nilai = titik.map((t) => t.kumulatif_ayat);
  const min = Math.min(...nilai);
  const max = Math.max(...nilai);
  const pad = Math.max(5, (max - min) * 0.15);
  const yMin = Math.max(0, min - pad);
  const yMax = max + pad;

  const x = (i: number) => KIRI + (i / (titik.length - 1)) * (W - KIRI - KANAN);
  const y = (v: number) => ATAS + (1 - (v - yMin) / (yMax - yMin)) * (H - ATAS - BAWAH);

  const garis = titik
    .map((t, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(t.kumulatif_ayat).toFixed(1)}`)
    .join(" ");
  const area = `${garis} L${x(titik.length - 1).toFixed(1)},${y(yMin).toFixed(1)} L${x(0).toFixed(1)},${y(yMin).toFixed(1)} Z`;
  const tick = [yMin, (yMin + yMax) / 2, yMax];
  const targetTampil = targetAyat > yMin && targetAyat < yMax;
  const awal = titik[0];
  const akhir = titik[titik.length - 1];

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full"
      role="img"
      aria-label={`Grafik hafalan ${titik.length} hari terakhir: dari ${formatAngka(awal.kumulatif_ayat)} ke ${formatAngka(akhir.kumulatif_ayat)} ayat`}
    >
      {tick.map((v) => (
        <g key={v}>
          <line x1={KIRI} x2={W - KANAN} y1={y(v)} y2={y(v)} className="stroke-slate-200" strokeWidth={1} />
          <text x={KIRI - 6} y={y(v) + 4} textAnchor="end" className="fill-slate-500" fontSize={11}>
            {formatAngka(Math.round(v))}
          </text>
        </g>
      ))}

      <path d={area} className="fill-emerald-100" />
      <path d={garis} className="fill-none stroke-emerald-600" strokeWidth={2.5} strokeLinejoin="round" />
      <circle cx={x(titik.length - 1)} cy={y(akhir.kumulatif_ayat)} r={4} className="fill-emerald-600" />

      {targetTampil && (
        <g>
          <line
            x1={KIRI}
            x2={W - KANAN}
            y1={y(targetAyat)}
            y2={y(targetAyat)}
            className="stroke-amber-500"
            strokeWidth={1.5}
            strokeDasharray="6 4"
          />
          <text x={W - KANAN} y={y(targetAyat) - 5} textAnchor="end" className="fill-amber-700" fontSize={11}>
            Target {formatAngka(targetAyat)} ayat
          </text>
        </g>
      )}

      <text x={KIRI} y={H - 8} className="fill-slate-500" fontSize={11}>
        {formatTanggalPendek(awal.tanggal)}
      </text>
      <text x={W - KANAN} y={H - 8} textAnchor="end" className="fill-slate-500" fontSize={11}>
        {formatTanggalPendek(akhir.tanggal)}
      </text>
    </svg>
  );
}
