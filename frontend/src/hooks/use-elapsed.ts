import { useEffect, useState } from "react";

/** Whole seconds since `active` became true; resets each time it turns on. */
export function useElapsed(active = true) {
  const [s, setS] = useState(0);
  useEffect(() => {
    if (!active) return;
    setS(0);
    const t0 = Date.now();
    const id = setInterval(() => setS(Math.floor((Date.now() - t0) / 1000)), 1000);
    return () => clearInterval(id);
  }, [active]);
  return s;
}
