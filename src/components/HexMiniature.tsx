import React, { useMemo } from 'react';
import { getNodeCoords, VIEWBOX_SIZE, getRoundedPath, getRoundedSegmentPath } from '../utils/hexUtils';
import { useSettings } from '../hooks/useSettings';

export const HexMiniature = ({ path = [], className = "", fade = false, animatedStep = -1 }: { path: string[], className?: string, fade?: boolean, animatedStep?: number }) => {
  const { thicknessMultiplier } = useSettings();
  const safePath = Array.isArray(path) ? path : [];
  
  const pathNodes = useMemo(() => {
    return safePath.map(id => {
      if (!id || typeof id !== 'string') return null;
      const [q, r] = id.split(',').map(Number);
      if (isNaN(q) || isNaN(r)) return null;
      return { id, q, r, ...getNodeCoords(q, r) };
    }).filter(Boolean) as any[];
  }, [safePath]);

  let minX = VIEWBOX_SIZE, minY = VIEWBOX_SIZE, maxX = 0, maxY = 0;
  pathNodes.forEach(n => {
    if (n.x < minX) minX = n.x; if (n.x > maxX) maxX = n.x;
    if (n.y < minY) minY = n.y; if (n.y > maxY) maxY = n.y;
  });

  const padding = 30;
  const vBox = pathNodes.length > 0 
    ? `${minX - padding} ${minY - padding} ${maxX - minX + padding * 2} ${maxY - minY + padding * 2}`
    : `0 0 ${VIEWBOX_SIZE} ${VIEWBOX_SIZE}`;

  const strokeWidth = 5 * thicknessMultiplier; // Adjusted stroke width relative to hex grid
  
  const visibleNodes = animatedStep >= 0 ? pathNodes.slice(0, animatedStep + 1) : pathNodes;
  const fullPathD = useMemo(() => getRoundedPath(visibleNodes, 8), [visibleNodes]);

  return (
    <svg viewBox={vBox} className={`w-full h-full ${className}`}>
      {visibleNodes.length > 0 && (
        <>
          {fade ? (
            visibleNodes.map((node, i) => {
              if (i === visibleNodes.length - 1) return null;
              const opacity = 1 - (i / (visibleNodes.length - 1)) * 0.8; // Fades from 1 to 0.2
              const segmentD = getRoundedSegmentPath(visibleNodes, i, 8);
              return (
                <path
                  key={`line-${i}`}
                  d={segmentD}
                  fill="none"
                  stroke="#c084fc"
                  strokeOpacity={opacity}
                  strokeWidth={strokeWidth}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              );
            })
          ) : (
            <path 
              d={fullPathD}
              fill="none" 
              stroke="#c084fc" 
              strokeWidth={strokeWidth} 
              strokeLinecap="round" 
              strokeLinejoin="round" 
            />
          )}
          <circle cx={visibleNodes[0].x} cy={visibleNodes[0].y} r={strokeWidth * 1.2} className="fill-green-400" stroke="#000" strokeWidth="1" />
          {visibleNodes.length > 1 && (
            <circle cx={visibleNodes[visibleNodes.length - 1].x} cy={visibleNodes[visibleNodes.length - 1].y} r={strokeWidth * 1.2} className="fill-red-400" stroke="#000" strokeWidth="1" />
          )}
        </>
      )}
    </svg>
  );
};
