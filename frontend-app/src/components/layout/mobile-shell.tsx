import type { ReactNode } from "react";

/** Pembungkus halaman santri: lebar ponsel di tengah layar. */
export function MobileShell({ children }: { children: ReactNode }) {
  return <div className="mx-auto min-h-dvh w-full max-w-md bg-white shadow-sm">{children}</div>;
}
