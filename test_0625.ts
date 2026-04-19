import { parseHexAngles, hasOverlappingEdges } from './src/utils/hexUtils';

function gen(n: number) {
    if (n === 0) return "aqaa";
    let isNeg = n < 0;
    let m = Math.abs(n);
    let divCount = 0;
    while (!Number.isInteger(m) && divCount < 100) {
      m *= 2;
      divCount++;
    }
    let res = isNeg ? "dedd" : "aqaa";
    if (m > 0) {
      const count15 = Math.floor(m / 15);
      res += "eq".repeat(count15);
      let rem = m % 15;
      if (rem >= 10) { res += "e"; rem -= 10; } 
      else if (rem >= 5) { res += "q"; rem -= 5; }
      res += "w".repeat(rem);
    }
    if (divCount > 0) {
      res += "ad".repeat(divCount + 2);
      for (let i = 1; i <= divCount; i++) {
        res += "ad".repeat(i * 2) + "d";
      }
    }
    return res;
}

const p = gen(0.0625);
console.log("0.0625:", p);
const path = parseHexAngles(p);
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
