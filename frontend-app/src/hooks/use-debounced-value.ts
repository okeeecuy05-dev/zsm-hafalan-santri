import { useEffect, useState } from "react";

/** Menunda pembaruan nilai (mis. kolom pencarian) agar tidak memanggil API di setiap ketikan. */
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
