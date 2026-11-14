import { useSyncExternalStore } from "react";

const noopSubscribe = () => () => {};

/** false saat render server/hidrasi awal, true setelah di klien. */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}
