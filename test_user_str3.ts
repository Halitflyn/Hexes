import { parseHexAngles, hasOverlappingEdges } from './src/utils/hexUtils';

const str = "aqaawdaddadaddadadaddadadadaddadadadadaddadadadadadadd";
const path = parseHexAngles(str);
const edges = new Set<string>();
for (let i = 0; i < path.length - 1; i++) {
  const a = path[i];
  const b = path[i+1];
  const edge1 = `${a}-${b}`;
  const edge2 = `${b}-${a}`;
  if (edges.has(edge1) || edges.has(edge2)) {
    console.log("Overlap at edge:", edge1, "index:", i);
    break;
  }
  edges.add(edge1);
  edges.add(edge2);
}
