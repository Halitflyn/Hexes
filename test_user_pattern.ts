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

for (let i = 1; i <= 20; i++) {
    let p = "aqaaw" + genUserPattern(i);
    if (hasOverlappingEdges(parseHexAngles(p))) {
        console.log("Overlap at divCount", i);
    }
}
console.log("Done testing genUserPattern");
