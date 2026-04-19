import { parseHexAngles, hasOverlappingEdges } from './src/utils/hexUtils';

function genUserPattern(divCount: number) {
    if (divCount === 1) return "d";
    if (divCount === 2) return "dd";
    
    let res = "d";
    for (let i = 1; i <= divCount - 2; i++) {
        res += "ad".repeat(i) + "d";
    }
    res += "add";
    return res;
}

for (let i = 1; i <= 5; i++) {
    let p = "aqaaw" + genUserPattern(i);
    console.log(`divCount=${i}: ${p} - Overlap: ${hasOverlappingEdges(parseHexAngles(p))}`);
}
