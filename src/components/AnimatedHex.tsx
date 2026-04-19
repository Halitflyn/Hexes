import React, { useMemo, useId } from 'react';
import { motion } from 'motion/react';
import { getNodeCoords, VIEWBOX_SIZE, getRoundedSegmentPath, getRoundedPath } from '../utils/hexUtils';

export const AnimatedHex: React.FC<{ path?: string[], className?: string, key?: any }> = ({ path = [], className = "" }) => {
  const maskId = useId();
  const pathNodes = useMemo(() => {
    const nodes = path.map(id => {
      if (!id || typeof id !== 'string') return null;
      const [q, r] = id.split(',').map(Number);
      if (isNaN(q) || isNaN(r)) return null;
      return { id, q, r, ...getNodeCoords(q, r) };
    }).filter(Boolean) as any[];
    return nodes;
  }, [path]);

  let minX = VIEWBOX_SIZE, minY = VIEWBOX_SIZE, maxX = 0, maxY = 0;
  pathNodes.forEach(n => {
    if (n.x < minX) minX = n.x; if (n.x > maxX) maxX = n.x;
    if (n.y < minY) minY = n.y; if (n.y > maxY) maxY = n.y;
  });

  const padding = 40;
  const vBox = pathNodes.length > 0 
    ? `${minX - padding} ${minY - padding} ${maxX - minX + padding * 2} ${maxY - minY + padding * 2}`
    : `0 0 ${VIEWBOX_SIZE} ${VIEWBOX_SIZE}`;

  const strokeWidth = 5; 
  const edgeCount = Math.max(1, pathNodes.length - 1);
  const segmentDuration = 0.2; // Duration per edge
  const totalDuration = edgeCount * segmentDuration;

  const fullPathD = useMemo(() => getRoundedPath(pathNodes, 8), [pathNodes]);

  return (
    <svg viewBox={vBox} className={`w-full h-full ${className}`}>
      <defs>
        <mask id={`draw-mask-${maskId}`}>
          {pathNodes.slice(0, -1).map((_, i) => (
            <motion.path 
              key={i}
              d={getRoundedSegmentPath(pathNodes, i, 8)}
              fill="none" 
              stroke="white" 
              strokeWidth={strokeWidth * 2.5} 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ 
                duration: segmentDuration, 
                delay: i * segmentDuration,
                ease: "linear" 
              }}
            />
          ))}
        </mask>
      </defs>
      {pathNodes.length > 0 && (
        <g mask={`url(#draw-mask-${maskId})`}>
          {pathNodes.slice(0, -1).map((n, i) => {
            const opacity = pathNodes.length > 2 ? 1 - (i / (pathNodes.length - 2)) * 0.8 : 1;
            const segmentD = getRoundedSegmentPath(pathNodes, i, 8);
            return (
              <path 
                key={i}
                d={segmentD}
                fill="none"
                stroke="#c084fc"
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity={opacity}
                className="drop-shadow-[0_0_12px_rgba(192,132,252,0.8)]"
              />
            );
          })}
          <circle cx={pathNodes[0].x} cy={pathNodes[0].y} r={strokeWidth * 1.2} className="fill-white drop-shadow-[0_0_8px_rgba(255,255,255,0.9)]" />
          {pathNodes.length > 1 && (
            <motion.circle 
              cx={pathNodes[pathNodes.length - 1].x} 
              cy={pathNodes[pathNodes.length - 1].y} 
              r={strokeWidth * 1.2} 
              className="fill-fuchsia-300 drop-shadow-[0_0_12px_rgba(217,70,239,1)]" 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: totalDuration - 0.1, duration: 0.2 }}
            />
          )}
        </g>
      )}
    </svg>
  );
};
