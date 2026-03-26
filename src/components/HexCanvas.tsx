import React, { useState, useRef, useMemo } from 'react';
import { getGridNodes, getNodeCoords, isNeighbor, hasEdge, VIEWBOX_SIZE, HEX_SIZE } from '../utils/hexUtils';

export const HexCanvas = ({ 
  paths = [], 
  currentPath = [], 
  onChange, 
  onPathComplete,
  zoom 
}: { 
  paths?: string[][], 
  currentPath?: string[], 
  onChange: (p: string[]) => void, 
  onPathComplete?: () => void,
  zoom: number 
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const nodes = useMemo(() => getGridNodes(), []);
  const safeCurrentPath = Array.isArray(currentPath) ? currentPath : [];
  const safePaths = Array.isArray(paths) ? paths : [];

  const currentViewBoxSize = VIEWBOX_SIZE / (zoom / 100);
  const offset = (VIEWBOX_SIZE - currentViewBoxSize) / 2;
  const viewBoxString = `${offset} ${offset} ${currentViewBoxSize} ${currentViewBoxSize}`;
  const visualScale = 100 / zoom;

  const getPointerCoords = (e: any) => {
    const svg = svgRef.current;
    if (!svg) return null;
    let clientX = e.clientX, clientY = e.clientY;
    if (clientX === undefined && e.touches?.length > 0) {
      clientX = e.touches[0].clientX; clientY = e.touches[0].clientY;
    }
    const pt = svg.createSVGPoint();
    pt.x = clientX; pt.y = clientY;
    
    const ctm = svg.getScreenCTM();
    if (!ctm) return { x: clientX, y: clientY }; 
    
    const cursorPt = pt.matrixTransform(ctm.inverse());
    return { x: cursorPt.x, y: cursorPt.y };
  };

  const findClosestNode = (coords: any) => {
    if (!coords) return null;
    let closest = null, minDist = Infinity;
    nodes.forEach(node => {
      const dist = Math.hypot(node.x - coords.x, node.y - coords.y);
      if (dist < minDist) { minDist = dist; closest = node; }
    });
    return minDist < HEX_SIZE * 1.2 ? closest : null; 
  };

  const handlePointerDown = (e: any) => {
    e.preventDefault(); e.target.setPointerCapture(e.pointerId);
    const coords = getPointerCoords(e);
    const node = findClosestNode(coords);
    if (node) { 
      setIsDrawing(true); 
      if (safeCurrentPath.length > 0 && safeCurrentPath[safeCurrentPath.length - 1] === node.id) {
        // Continue drawing from the last node
      } else {
        onChange([node.id]); 
      }
    }
  };

  const handlePointerMove = (e: any) => {
    e.preventDefault(); 
    const coords = getPointerCoords(e);
    const node = findClosestNode(coords);
    setHoveredNodeId(node ? node.id : null);
    if (!isDrawing || !node || safeCurrentPath.length === 0) return;

    const lastNodeId = safeCurrentPath[safeCurrentPath.length - 1];
    if (node.id !== lastNodeId) {
      const lastNode = nodes.find(n => n.id === lastNodeId);
      if (lastNode && isNeighbor(lastNode, node)) {
        if (safeCurrentPath.length >= 2 && safeCurrentPath[safeCurrentPath.length - 2] === node.id) {
          onChange(safeCurrentPath.slice(0, -1)); return;
        }
        if (!hasEdge(safeCurrentPath, lastNodeId, node.id)) onChange([...safeCurrentPath, node.id]);
      }
    }
  };

  const handlePointerUp = (e: any) => {
    if (isDrawing) { 
      setIsDrawing(false); 
      e.target.releasePointerCapture(e.pointerId); 
      setHoveredNodeId(null);
      if (onPathComplete && safeCurrentPath.length > 1) {
        onPathComplete();
      }
    }
  };

  const renderPath = (path: string[], isCurrent: boolean, index: number) => {
    const pathNodes = path.map(id => nodes.find(n => n.id === id)).filter(Boolean) as any[];
    if (pathNodes.length === 0) return null;
    
    const polylinePoints = pathNodes.map(n => `${n.x},${n.y}`).join(' ');
    const strokeColor = isCurrent ? "#c084fc" : "#8b5cf6";
    const opacity = isCurrent ? 1 : 0.6;

    return (
      <g key={`path-group-${index}`} style={{ opacity }}>
        <polyline points={polylinePoints} fill="none" stroke={strokeColor} strokeWidth={12 * visualScale} strokeLinecap="round" strokeLinejoin="round" className={isCurrent ? "drop-shadow-[0_0_12px_rgba(192,132,252,0.8)] pointer-events-none" : "pointer-events-none"} />
        {pathNodes.map((node, i) => <circle key={`node-${index}-${i}`} cx={node.x} cy={node.y} r={7 * visualScale} className="fill-purple-300 pointer-events-none" />)}
        <circle cx={pathNodes[0].x} cy={pathNodes[0].y} r={12 * visualScale} strokeWidth={4 * visualScale} className="fill-white stroke-purple-600 pointer-events-none drop-shadow-[0_0_8px_rgba(255,255,255,0.9)]" />
        {pathNodes.length > 1 && <circle cx={pathNodes[pathNodes.length - 1].x} cy={pathNodes[pathNodes.length - 1].y} r={12 * visualScale} className="fill-fuchsia-300 pointer-events-none drop-shadow-[0_0_12px_rgba(217,70,239,1)]" />}
      </g>
    );
  };

  const lastNodeId = safeCurrentPath.length > 0 ? safeCurrentPath[safeCurrentPath.length - 1] : null;
  const lastNode = lastNodeId ? nodes.find(n => n.id === lastNodeId) : null;

  return (
    <div className="relative w-full h-full bg-slate-950 rounded-xl border border-slate-800 shadow-inner flex items-center justify-center overflow-hidden touch-none">
      <svg
        ref={svgRef} viewBox={viewBoxString}
        className="w-full h-full cursor-crosshair touch-none transition-all duration-200 ease-out"
        onPointerDown={handlePointerDown} onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp} onPointerCancel={handlePointerUp}
      >
        {nodes.map(node => {
          const isCurrentNeighbor = isDrawing && lastNode && isNeighbor(lastNode, node) && !hasEdge(safeCurrentPath, lastNodeId!, node.id);
          const isHovered = hoveredNodeId === node.id;
          return (
            <circle 
              key={node.id} cx={node.x} cy={node.y} 
              r={isCurrentNeighbor ? (6 * visualScale) : (isHovered ? (8 * visualScale) : (3.5 * visualScale))} 
              className={`transition-all duration-150 ${isCurrentNeighbor ? 'fill-fuchsia-400 drop-shadow-[0_0_8px_rgba(232,121,249,0.8)] animate-pulse' : isHovered ? 'fill-slate-400 stroke-purple-500' : 'fill-slate-700'}`} 
              strokeWidth={isHovered ? (2 * visualScale) : 0}
            />
          );
        })}
        
        {safePaths.map((p, i) => renderPath(p, false, i))}
        {renderPath(safeCurrentPath, true, safePaths.length)}
      </svg>
    </div>
  );
};
