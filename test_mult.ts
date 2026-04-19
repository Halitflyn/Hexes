import { parseHexAngles, hasOverlappingEdges } from './src/utils/hexUtils';

function genTest(multiplier: number, offset: number) {
    let hasOverlap = false;
    for(let i=1; i<=20; i++) {
        let res = "aqaaw";
        for (let j = 1; j <= i; j++) {
            res += "ad".repeat(j * multiplier + offset) + "d";
        }
        if(hasOverlappingEdges(parseHexAngles(res))) {
            hasOverlap = true;
            break;
        }
    }
    return !hasOverlap;
}

console.log("mult=1, offset=0:", genTest(1, 0));
console.log("mult=1, offset=1:", genTest(1, 1));
console.log("mult=1, offset=2:", genTest(1, 2));
console.log("mult=1, offset=3:", genTest(1, 3));
console.log("mult=2, offset=0:", genTest(2, 0));
console.log("mult=2, offset=-1:", genTest(2, -1));
