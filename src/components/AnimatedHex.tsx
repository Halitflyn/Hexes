import React, { useMemo, useId } from 'react';
import { getNodeCoords, VIEWBOX_SIZE } from '../utils/hexUtils';

export const AnimatedHex: React.FC<{ path?: string[], className?: string }> = ({ path = [], className = "" }) => {
  const maskId = useId();
  const pathNodes = useMemo(() => {
    return path.map(id => {
      if (!id || typeof id !== 'string') return null;
      const [q, r] = id.split(',').map(Number);
      if (isNaN(q) || isNaN(r)) return null;
      return { id, q, r, ...getNodeCoords(q, r) };
    }).filter(Boolean) as any[];
  }, [path]);

  const totalLength = useMemo(() => {
    let len = 0;
    for (let i = 0; i < pathNodes.length - 1; i++) {
      const dx = pathNodes[i+1].x - pathNodes[i].x;
      const dy = pathNodes[i+1].y - pathNodes[i].y;
      len += Math.sqrt(dx*dx + dy*dy);
    }
    return len;
  }, [pathNodes]);

  let minX = VIEWBOX_SIZE, minY = VIEWBOX_SIZE, maxX = 0, maxY = 0;
  pathNodes.forEach(n => {
    if (n.x < minX) minX = n.x; if (n.x > maxX) maxX = n.x;
    if (n.y < minY) minY = n.y; if (n.y > maxY) maxY = n.y;
  });

  const padding = 40;
  const vBox = pathNodes.length > 0 
    ? `${minX - padding} ${minY - padding} ${maxX - minX + padding * 2} ${maxY - minY + padding * 2}`
    : `0 0 ${VIEWBOX_SIZE} ${VIEWBOX_SIZE}`;

  const strokeWidth = Math.max(4, (maxX - minX) / 15);

  return (
    <svg viewBox={vBox} className={`w-full h-full ${className}`}>
      <defs>
        <mask id={`draw-mask-${maskId}`}>
          <polyline 
            points={pathNodes.map(n => `${n.x},${n.y}`).join(' ')} 
            fill="none" 
            stroke="white" 
            strokeWidth={strokeWidth * 2} 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            className="animated-path" 
          />
        </mask>
      </defs>
      <style>{`
        @keyframes drawHex {
          from { stroke-dashoffset: ${totalLength}; }
          to { stroke-dashoffset: 0; }
        }
        .animated-path {
          stroke-dasharray: ${totalLength};
          stroke-dashoffset: ${totalLength};
          animation: drawHex 1.5s ease-in-out forwards;
        }
        @keyframes fadeIn {
          to { opacity: 1; }
        }
      `}</style>
      {pathNodes.length > 0 && (
        <g mask={`url(#draw-mask-${maskId})`}>
          {pathNodes.slice(0, -1).map((n, i) => {
            const next = pathNodes[i+1];
            // Opacity goes from 1.0 at start to 0.2 at end
            const opacity = pathNodes.length > 2 ? 1 - (i / (pathNodes.length - 2)) * 0.8 : 1;
            return (
              <line 
                key={i}
                x1={n.x} y1={n.y} x2={next.x} y2={next.y}
                stroke="#c084fc"
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity={opacity}
                className="drop-shadow-[0_0_12px_rgba(192,132,252,0.8)]"
              />
            );
          })}
          <circle cx={pathNodes[0].x} cy={pathNodes[0].y} r={strokeWidth * 1.5} className="fill-white drop-shadow-[0_0_8px_rgba(255,255,255,0.9)]" />
          {pathNodes.length > 1 && (
            <circle 
              cx={pathNodes[pathNodes.length - 1].x} 
              cy={pathNodes[pathNodes.length - 1].y} 
              r={strokeWidth * 1.5} 
              className="fill-fuchsia-300 drop-shadow-[0_0_12px_rgba(217,70,239,1)]" 
              style={{ opacity: 0, animation: 'fadeIn 0.2s ease-in forwards 1.4s' }}
            />
          )}
        </g>
      )}
    </svg>
  );
};
