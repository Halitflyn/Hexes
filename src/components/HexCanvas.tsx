import React, { useState, useRef, useMemo, useEffect } from 'react';
import { getGridNodes, getNodeCoords, isNeighbor, hasEdge, VIEWBOX_SIZE, HEX_SIZE, getRoundedPath } from '../utils/hexUtils';
import { useSettings } from '../hooks/useSettings';

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
  const [dimensions, setDimensions] = useState({ width: 1000, height: 1000 });
  const nodes = useMemo(() => getGridNodes(), []);
  
  const { thicknessMultiplier } = useSettings();

  useEffect(() => {
    if (!svgRef.current) return;
    const observer = new ResizeObserver(entries => {
      for (let entry of entries) {
        setDimensions({
          width: entry.contentRect.width,
          height: entry.contentRect.height
        });
      }
    });
    observer.observe(svgRef.current);
    return () => observer.disconnect();
  }, []);

  const safeCurrentPath = Array.isArray(currentPath) ? currentPath : [];
  const safePaths = Array.isArray(paths) ? paths : [];

  const currentViewBoxWidth = VIEWBOX_SIZE / (zoom / 100);
  const currentViewBoxHeight = (VIEWBOX_SIZE * (dimensions.height / dimensions.width)) / (zoom / 100);
  
  const offsetX = (VIEWBOX_SIZE - currentViewBoxWidth) / 2;
  const offsetY = (VIEWBOX_SIZE - currentViewBoxHeight) / 2;
  
  const viewBoxString = `${offsetX} ${offsetY} ${currentViewBoxWidth} ${currentViewBoxHeight}`;
  const visualScale = 100 / zoom;

  // Optimization: Only render nodes within the current viewbox
  const visibleNodes = useMemo(() => {
    const margin = HEX_SIZE * 2;
    return nodes.filter(node => 
      node.x >= offsetX - margin && 
      node.x <= offsetX + currentViewBoxWidth + margin &&
      node.y >= offsetY - margin && 
      node.y <= offsetY + currentViewBoxHeight + margin
    );
  }, [nodes, offsetX, offsetY, currentViewBoxWidth, currentViewBoxHeight]);

  const getPointerCoords = (e: any) => {
    const svg = svgRef.current;
    if (!svg) return null;
    
    let clientX = e.clientX, clientY = e.clientY;
    if (clientX === undefined && e.touches?.length > 0) {
      clientX = e.touches[0].clientX; clientY = e.touches[0].clientY;
    }

    const pt = svg.createSVGPoint();
    pt.x = clientX; pt.y = clientY;
    
    // Use getScreenCTM to transform screen coordinates to SVG coordinates
    const ctm = svg.getScreenCTM();
    if (!ctm) return { x: clientX, y: clientY }; 
    
    const cursorPt = pt.matrixTransform(ctm.inverse());
    return { x: cursorPt.x, y: cursorPt.y };
  };

  const findClosestNode = (coords: any) => {
    if (!coords || !svgRef.current) return null;
    
    const svg = svgRef.current;
    const clientWidth = svg.clientWidth || 500;
    const currentViewBoxWidth = VIEWBOX_SIZE / (zoom / 100);
    const screenToSvgScale = currentViewBoxWidth / clientWidth;
    
    // Minimum 35px hit area in screen coordinates
    const minHitRadiusSvg = 35 * screenToSvgScale; 
    const hitRadius = Math.max(HEX_SIZE * 2.2, minHitRadiusSvg);

    let closest = null, minDist = Infinity;
    visibleNodes.forEach(node => {
      const dist = Math.hypot(node.x - coords.x, node.y - coords.y);
      if (dist < minDist) { minDist = dist; closest = node; }
    });
    return minDist < hitRadius ? closest : null; 
  };

  const handlePointerDown = (e: any) => {
    e.preventDefault(); e.target.setPointerCapture(e.pointerId);
    const coords = getPointerCoords(e);
    const node = findClosestNode(coords);
    if (node) { 
      // Check if node is already occupied by another path in multi-mode
      const isOccupied = safePaths.some(path => path.includes(node.id));
      if (isOccupied) return;

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

    // Check if node is already occupied by another path in multi-mode
    const isOccupied = safePaths.some(path => path.includes(node.id));
    if (isOccupied) return;

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
    
    const pathD = getRoundedPath(pathNodes, 12 * visualScale);
    const strokeColor = isCurrent ? "#c084fc" : "#8b5cf6";
    const opacity = isCurrent ? 1 : 0.6;
    
    const pathStrokeWidth = 14 * visualScale * thicknessMultiplier;

    return (
      <g key={`path-group-${index}`} style={{ opacity }}>
        <path d={pathD} fill="none" stroke={strokeColor} strokeWidth={pathStrokeWidth} strokeLinecap="round" strokeLinejoin="round" className="pointer-events-none" />
        {pathNodes.map((node, i) => <circle key={`node-${index}-${i}`} cx={node.x} cy={node.y} r={4 * visualScale * thicknessMultiplier} className="fill-purple-300 pointer-events-none" />)}
        <circle cx={pathNodes[0].x} cy={pathNodes[0].y} r={10 * visualScale * thicknessMultiplier} strokeWidth={5 * visualScale * thicknessMultiplier} className="fill-white stroke-purple-600 pointer-events-none" />
        {pathNodes.length > 1 && <circle cx={pathNodes[pathNodes.length - 1].x} cy={pathNodes[pathNodes.length - 1].y} r={10 * visualScale * thicknessMultiplier} className="fill-fuchsia-300 pointer-events-none" />}
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
        {visibleNodes.map(node => {
          const isCurrentNeighbor = isDrawing && lastNode && isNeighbor(lastNode, node) && !hasEdge(safeCurrentPath, lastNodeId!, node.id);
          const isHovered = hoveredNodeId === node.id;
          const isOccupied = safePaths.some(path => path.includes(node.id));

          return (
            <circle 
              key={node.id} cx={node.x} cy={node.y} 
              r={isCurrentNeighbor ? (5 * visualScale) : (isHovered ? (7 * visualScale) : (3 * visualScale))} 
              className={`transition-all duration-150 ${isOccupied ? 'fill-slate-800 opacity-30' : isCurrentNeighbor ? 'fill-fuchsia-400' : isHovered ? 'fill-slate-400 stroke-purple-500' : 'fill-slate-500'}`} 
              strokeWidth={isHovered ? (5 * visualScale) : 0}
            />
          );
        })}
        
        {safePaths.map((p, i) => renderPath(p, false, i))}
        {renderPath(safeCurrentPath, true, safePaths.length)}
      </svg>
    </div>
  );
};
