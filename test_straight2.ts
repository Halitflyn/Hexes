import { parseHexAngles, hasOverlappingEdges } from './src/utils/hexUtils';

function genStraight(divCount: number) {
    let res = "aqaaw";
    res += "ad".repeat(divCount + 2);
    for (let i = 1; i <= divCount; i++) {
        res += "ad".repeat(i * 2) + "d";
    }
    return res;
}

for(let i=1; i<=20; i++) {
    let p = genStraight(i);
    if(hasOverlappingEdges(parseHexAngles(p))) {
        console.log("Overlap at 1/2^" + i);
    }
}
console.log("Done testing genStraight");
