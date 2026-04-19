import { parseHexAngles, hasOverlappingEdges } from './src/utils/hexUtils';

function genStraight(divCount: number) {
    let res = "aqaaw";
    for (let i = 1; i <= divCount; i++) {
        // To avoid overlap, we just move East using `ad da`
        // Wait, every `d` changes the direction by 2.
        // So we need to move in a way that doesn't overlap.
        // Let's just use a very fast growing spiral.
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
