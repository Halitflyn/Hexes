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

const p = gen(0.125);
const path = parseHexAngles(p);
console.log(path.slice(30, 45));
