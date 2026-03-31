import React, { useMemo } from 'react';
import { getNodeCoords, VIEWBOX_SIZE } from '../utils/hexUtils';

export const HexMiniature = ({ path = [], className = "", fade = false }: { path: string[], className?: string, fade?: boolean }) => {
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

  const strokeWidth = Math.max(2, (maxX - minX) / 20);

  return (
    <svg viewBox={vBox} className={`w-full h-full ${className}`}>
      {pathNodes.length > 0 && (
        <>
          {fade ? (
            pathNodes.map((node, i) => {
              if (i === pathNodes.length - 1) return null;
              const nextNode = pathNodes[i + 1];
              const opacity = 1 - (i / (pathNodes.length - 1)) * 0.8; // Fades from 1 to 0.2
              return (
                <line
                  key={`line-${i}`}
                  x1={node.x}
                  y1={node.y}
                  x2={nextNode.x}
                  y2={nextNode.y}
                  stroke="#c084fc"
                  strokeOpacity={opacity}
                  strokeWidth={strokeWidth}
                  strokeLinecap="round"
                />
              );
            })
          ) : (
            <polyline 
              points={pathNodes.map(n => `${n.x},${n.y}`).join(' ')} 
              fill="none" 
              stroke="#c084fc" 
              strokeWidth={strokeWidth} 
              strokeLinecap="round" 
              strokeLinejoin="round" 
            />
          )}
          <circle cx={pathNodes[0].x} cy={pathNodes[0].y} r={Math.max(2, (maxX - minX) / 40)} className="fill-white" />
        </>
      )}
    </svg>
  );
};
