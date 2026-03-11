import { useState, useEffect } from 'react';

/**
 * Returns current device pixel ratio (>= 1).
 * Used to scale canvas so that logical size appears roughly the same physical size on different PPI.
 */
export function useDevicePixelRatio(): number {
  const [dpr, setDpr] = useState(() => Math.max(1, window.devicePixelRatio || 1));

  useEffect(() => {
    const update = () => setDpr((v) => {
      const next = Math.max(1, window.devicePixelRatio || 1);
      return next !== v ? next : v;
    });
    update();
    window.matchMedia('(resolution: 1dppx)').addEventListener('change', update);
    window.addEventListener('resize', update);
    return () => {
      window.matchMedia('(resolution: 1dppx)').removeEventListener('change', update);
      window.removeEventListener('resize', update);
    };
  }, []);

  return dpr;
}
