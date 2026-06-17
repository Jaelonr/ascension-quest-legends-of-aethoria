import { useState, useEffect, useRef } from "react";

export function useCountUp(target: number, duration = 1000, delay = 0) {
  const [value, setValue] = useState(0);
  const rafRef = useRef(0);

  useEffect(() => {
    setValue(0);
    let startTime: number | null = null;

    const delayHandle = setTimeout(() => {
      const animate = (timestamp: number) => {
        if (!startTime) startTime = timestamp;
        const progress = Math.min((timestamp - startTime) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        setValue(Math.floor(target * eased));
        if (progress < 1) {
          rafRef.current = requestAnimationFrame(animate);
        } else {
          setValue(target);
        }
      };
      rafRef.current = requestAnimationFrame(animate);
    }, delay);

    return () => {
      clearTimeout(delayHandle);
      cancelAnimationFrame(rafRef.current);
    };
  }, [target, duration, delay]);

  return value;
}
