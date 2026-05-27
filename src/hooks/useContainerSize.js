import { useEffect, useRef, useState } from "react";

/**
 * Mede o contentor via ResizeObserver (fiável em mobile/Safari para Recharts).
 * @returns {{ ref: import('react').RefObject<HTMLDivElement|null>, width: number, height: number, ready: boolean }}
 */
export function useContainerSize() {
  const ref = useRef(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;

    const update = () => {
      const { width, height } = el.getBoundingClientRect();
      setSize({
        width: Math.floor(width),
        height: Math.floor(height),
      });
    };

    update();

    const ro = new ResizeObserver(() => {
      update();
    });
    ro.observe(el);

    return () => ro.disconnect();
  }, []);

  const ready = size.width > 0 && size.height > 0;

  return { ref, width: size.width, height: size.height, ready };
}
