export const VIEWBOX_SIZE = 2000; 
export const HEX_SIZE = 32; 
export const GRID_RADIUS = 40; 

export const getNodeCoords = (q: number, r: number) => {
  return {
    x: VIEWBOX_SIZE / 2 + HEX_SIZE * Math.sqrt(3) * (q + r / 2),
    y: VIEWBOX_SIZE / 2 + HEX_SIZE * (3 / 2) * r
  };
};

export const getGridNodes = () => {
  const nodes = [];
  for (let q = -GRID_RADIUS; q <= GRID_RADIUS; q++) {
    for (let r = -GRID_RADIUS; r <= GRID_RADIUS; r++) {
      if (Math.abs(q + r) <= GRID_RADIUS) {
        const coords = getNodeCoords(q, r);
        nodes.push({ q, r, ...coords, id: `${q},${r}` });
      }
    }
  }
  return nodes;
};

export const isNeighbor = (node1: any, node2: any) => {
  const dq = Math.abs(node1.q - node2.q);
  const dr = Math.abs(node1.r - node2.r);
  const ds = Math.abs((-node1.q - node1.r) - (-node2.q - node2.r));
  return Math.max(dq, dr, ds) === 1;
};

export const hasEdge = (path: string[], id1: string, id2: string) => {
  if (!path || !Array.isArray(path)) return false;
  for (let i = 0; i < path.length - 1; i++) {
    const a = path[i];
    const b = path[i+1];
    if ((a === id1 && b === id2) || (a === id2 && b === id1)) return true;
  }
  return false;
};

export const parseHexAngles = (angleString: string, startDir: number = 0) => {
  let path = ["0,0"];
  let currentQ = 0;
  let currentR = 0;
  let currentDir = startDir; 

  const dirToCoord = [ [1, 0], [0, 1], [-1, 1], [-1, 0], [0, -1], [1, -1] ];
  const letterToTurn: Record<string, number> = { 'w': 0, 'e': 1, 'd': 2, 's': 3, 'a': 4, 'q': 5 };

  currentQ += dirToCoord[currentDir][0];
  currentR += dirToCoord[currentDir][1];
  path.push(`${currentQ},${currentR}`);

  if (!angleString) return path;

  for (let char of angleString.toLowerCase()) {
    if (letterToTurn[char] !== undefined) {
      currentDir = (currentDir + letterToTurn[char]) % 6;
      currentQ += dirToCoord[currentDir][0];
      currentR += dirToCoord[currentDir][1];
      path.push(`${currentQ},${currentR}`);
    }
  }
  return path;
};

export const recenterPath = (path: string[]) => {
  if (!path || !Array.isArray(path) || path.length === 0) return [];
  let minQ=Infinity, maxQ=-Infinity, minR=Infinity, maxR=-Infinity;
  path.forEach(id => {
    if (!id || typeof id !== 'string') return;
    const [q, r] = id.split(',').map(Number);
    if(q<minQ) minQ=q; if(q>maxQ) maxQ=q;
    if(r<minR) minR=r; if(r>maxR) maxR=r;
  });
  
  if (minQ === Infinity) return path;

  const centerQ = Math.round((minQ + maxQ) / 2);
  const centerR = Math.round((minR + maxR) / 2);

  return path.map(id => {
    if (!id || typeof id !== 'string') return "0,0";
    const [q, r] = id.split(',').map(Number);
    return `${q - centerQ},${r - centerR}`;
  });
};

export const pathToHexAngles = (path: string[]) => {
  if (!path || path.length < 2) return { angles: "", startDir: 0 };
  const getDir = (q1: number, r1: number, q2: number, r2: number) => {
    const dq = q2 - q1;
    const dr = r2 - r1;
    if (dq === 1 && dr === 0) return 0; // East
    if (dq === 0 && dr === 1) return 1; // South East
    if (dq === -1 && dr === 1) return 2; // South West
    if (dq === -1 && dr === 0) return 3; // West
    if (dq === 0 && dr === -1) return 4; // North West
    if (dq === 1 && dr === -1) return 5; // North East
    return null; 
  };

  let result = "";
  let prevDir = null;
  let startDir = 0;

  for (let i = 0; i < path.length - 1; i++) {
    const [q1, r1] = path[i].split(',').map(Number);
    const [q2, r2] = path[i+1].split(',').map(Number);
    const currentDir = getDir(q1, r1, q2, r2);
    
    if (currentDir === null) return { angles: "", startDir: 0 };

    if (i === 0) {
      startDir = currentDir;
    } else if (prevDir !== null) {
      const turn = (currentDir - prevDir + 6) % 6;
      const turnChar = { 0:'w', 1:'e', 2:'d', 3:'s', 4:'a', 5:'q' }[turn as keyof typeof turnChar];
      result += turnChar;
    }
    prevDir = currentDir;
  }
  return { angles: result, startDir };
};

export const rotatePath = (path: string[], turns: number = 1) => {
  if (!path || !Array.isArray(path) || path.length === 0) return [];
  
  let currentPath = [...path];
  const normalizedTurns = ((turns % 6) + 6) % 6;
  
  for (let t = 0; t < normalizedTurns; t++) {
    currentPath = currentPath.map(id => {
      const [q, r] = id.split(',').map(Number);
      const newQ = -r;
      const newR = q + r;
      return `${newQ},${newR}`;
    });
  }
  
  return currentPath;
};

export const generateId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
};

export const findAllValidPatterns = (basePattern: string, startDir: number = 0) => {
  const path = parseHexAngles(basePattern, startDir);
  if (path.length < 2) return [];

  // Extract all edges
  const edges = new Set<string>();
  const nodes = new Set<string>();
  
  for (let i = 0; i < path.length - 1; i++) {
    const a = path[i];
    const b = path[i+1];
    nodes.add(a);
    nodes.add(b);
    const edge = [a, b].sort().join('|');
    edges.add(edge);
  }

  const totalEdges = edges.size;
  const results: { path: string[], angles: string, startDir: number }[] = [];
  
  // Always include the original path as the first result
  const originalAngles = pathToHexAngles(path);
  if (originalAngles.angles !== "" || path.length === 2) {
    results.push({ path: [...path], angles: originalAngles.angles, startDir: originalAngles.startDir });
  }
  
  // Build adjacency list for faster DFS
  const adj: Record<string, string[]> = {};
  nodes.forEach(n => adj[n] = []);
  edges.forEach(e => {
    const [a, b] = e.split('|');
    adj[a].push(b);
    adj[b].push(a);
  });

  let iterations = 0;
  const MAX_ITERATIONS = 50000; // Prevent browser freeze
  const MAX_RESULTS = 50;

  const dfs = (currentNode: string, visitedEdges: Set<string>, currentPath: string[]) => {
    if (results.length >= MAX_RESULTS || iterations > MAX_ITERATIONS) return;
    iterations++;

    if (visitedEdges.size === totalEdges) {
      const { angles, startDir } = pathToHexAngles(currentPath);
      // Only add if we successfully parsed it
      if (angles !== "" || currentPath.length === 2) {
        results.push({ path: [...currentPath], angles, startDir });
      }
      return;
    }

    for (const neighbor of adj[currentNode]) {
      const edge = [currentNode, neighbor].sort().join('|');
      if (!visitedEdges.has(edge)) {
        visitedEdges.add(edge);
        currentPath.push(neighbor);
        dfs(neighbor, visitedEdges, currentPath);
        currentPath.pop();
        visitedEdges.delete(edge);
      }
    }
  };

  // Start DFS from every node
  for (const startNode of nodes) {
    if (results.length >= MAX_RESULTS || iterations > MAX_ITERATIONS) break;
    dfs(startNode, new Set<string>(), [startNode]);
  }

  // Deduplicate by angles + startDir (just in case, though they should be unique paths)
  const uniqueResults = [];
  const seen = new Set<string>();
  for (const res of results) {
    const key = `${res.angles}-${res.startDir}`;
    if (!seen.has(key)) {
      seen.add(key);
      uniqueResults.push(res);
    }
  }

  return uniqueResults;
};
