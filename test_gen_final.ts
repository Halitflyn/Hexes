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
      if (divCount === 1) res += "d";
      else if (divCount === 2) res += "dd";
      else if (divCount === 3) res += "daddadd";
      else {
          res += "dadd"; // 0, 1
          for (let i = 3; i <= divCount - 1; i++) {
              res += "ad".repeat(i) + "d";
          }
          res += "add"; // 1
      }
    }
    return res;
}

let hasOverlap = false;
for (let i = 1; i <= 20; i++) {
    let val = 100 + 1 / Math.pow(2, i);
    let p = gen(val);
    if (hasOverlappingEdges(parseHexAngles(p))) {
        console.log(`Overlap at 100 + 1/2^${i}`);
        hasOverlap = true;
    }
}
if (!hasOverlap) console.log("No overlaps found for 100 + 1/2^i!");
