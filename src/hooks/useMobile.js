import { useState, useEffect } from "react";

export function useMobile() {
  const [mobile, setMobile] = useState(() =>
    typeof window !== "undefined"
      ? window.matchMedia("(max-width: 880px)").matches
      : false
  );
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 880px)");
    const handler = e => setMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return mobile;
}
