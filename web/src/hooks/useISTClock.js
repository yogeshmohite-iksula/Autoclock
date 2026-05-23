// useISTClock — 1-second IST clock for the status-line chrome on P01/P02.
// Returns { hm: "HH:MM", s: "SS" } in Asia/Kolkata. Stops ticking on unmount.

import { useEffect, useState } from 'react';

const HM_FMT = new Intl.DateTimeFormat('en-IN', {
  timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: false,
});
const S_FMT = new Intl.DateTimeFormat('en-IN', {
  timeZone: 'Asia/Kolkata', second: '2-digit',
});

export function useISTClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return { hm: HM_FMT.format(now), s: S_FMT.format(now) };
}
