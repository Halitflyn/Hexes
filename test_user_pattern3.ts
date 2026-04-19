import { parseHexAngles, hasOverlappingEdges } from './src/utils/hexUtils';

function genUserPattern(divCount: number) {
    if (divCount === 1) return "d";
    if (divCount === 2) return "dd";
    if (divCount === 3) return "daddadd";
    
    let res = "dadd"; // 0, 1
    for (let i = 3; i <= divCount - 1; i++) {
        res += "ad".repeat(i) + "d";
    }
    res += "add"; // 1
    return res;
}

for (let i = 1; i <= 20; i++) {
    let p = "aqaaw" + genUserPattern(i);
    console.log(`divCount=${i}: Overlap: ${hasOverlappingEdges(parseHexAngles(p))}`);
}
