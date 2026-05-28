import React, { useMemo } from 'react';

interface SparklineProps {
  keyword: string;
}

export function Sparkline({ keyword }: SparklineProps) {
  const points = useMemo(() => {
    let hash = 0;
    for (let i = 0; i < keyword.length; i++) {
      hash = Math.imul(31, hash) + keyword.charCodeAt(i) | 0;
    }
    
    let s = hash;
    const genRandom = () => {
      s = Math.sin(s) * 10000;
      return s - Math.floor(s);
    };

    const count = 10;
    const yValues = [50];
    for (let i = 1; i < count; i++) {
      const change = (genRandom() * 40) - 15; // bias slightly upwards (-15 to 25)
      let nextY = yValues[i - 1] - change; // inverse y since svg is top-down
      // clamp to 5-95
      nextY = Math.max(5, Math.min(95, nextY));
      yValues.push(nextY);
    }

    const xStep = 100 / (count - 1);
    const coords = yValues.map((y, i) => `${i * xStep},${y}`).join(' L ');
    
    // In SVG, Y=0 is top. So if last Y < first Y, it trended UP.
    const isUp = yValues[yValues.length - 1] < yValues[0];
    
    return {
      path: `M ${coords}`,
      colorClass: isUp ? "text-[#34C759] dark:text-[#30D158]" : "text-[#FF3B30] dark:text-[#FF453A]"
    };
  }, [keyword]);

  return (
    <svg 
      viewBox="0 0 100 100" 
      preserveAspectRatio="none" 
      className="w-[45px] h-4 opacity-70 ml-2"
    >
      <path
        d={points.path}
        fill="none"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={points.colorClass}
      />
    </svg>
  );
}
