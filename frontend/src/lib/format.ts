function dariIso(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function formatBulanTahun(iso: string): string {
  return dariIso(iso).toLocaleDateString("id-ID", { month: "long", year: "numeric" });
}

export function formatTanggalPendek(iso: string): string {
  return dariIso(iso).toLocaleDateString("id-ID", { day: "numeric", month: "short" });
}

export function formatTanggalLengkap(iso: string): string {
  return dariIso(iso).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
}

export function formatAngka(nilai: number, desimal = 0): string {
  return nilai.toLocaleString("id-ID", {
    minimumFractionDigits: desimal,
    maximumFractionDigits: desimal,
  });
}
