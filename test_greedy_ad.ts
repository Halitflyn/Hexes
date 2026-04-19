import { parseHexAngles, hasOverlappingEdges } from './src/utils/hexUtils';

function findValidSequence(divCount: number) {
    // We need to apply 'd' divCount times.
    // Each 'd' can be preceded by some number of 'ad's.
    // Let's do a simple greedy search.
    let res = "aqaaw";
    for (let i = 0; i < divCount; i++) {
        let found = false;
        for (let j = 0; j < 20; j++) {
            let testRes = res + "ad".repeat(j) + "d";
            if (!hasOverlappingEdges(parseHexAngles(testRes))) {
                res = testRes;
                found = true;
                break;
            }
        }
        if (!found) {
            console.log("Could not find valid extension at step", i);
            return null;
        }
    }
    return res;
}

for (let i = 1; i <= 20; i++) {
    const seq = findValidSequence(i);
    if (seq) {
        console.log(`divCount=${i}: ${seq}`);
    }
}
