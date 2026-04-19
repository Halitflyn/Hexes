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
      // Translate away from the integer zig-zag to avoid spiral intersection
      res += "w".repeat(divCount + 2);
      // Generate the outward spiral for division with w to prevent overlap
      for (let i = 1; i <= divCount; i++) {
        res += "w".repeat(i) + "d";
      }
    }
    return res;
}

console.log("0.0625:", gen(0.0625));
console.log("3.5:", gen(3.5));
