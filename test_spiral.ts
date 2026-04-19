import { parseHexAngles, hasOverlappingEdges } from './src/utils/hexUtils';

function genSpiral(divCount: number) {
    let res = "aqaaw"; // start facing some direction
    for (let i = 1; i <= divCount; i++) {
        res += "ad".repeat(i) + "d";
    }
    return res;
}

for(let i=1; i<=20; i++) {
    let p = genSpiral(i);
    if(hasOverlappingEdges(parseHexAngles(p))) {
        console.log("Overlap at 1/2^" + i);
    }
}
console.log("Done testing genSpiral");
