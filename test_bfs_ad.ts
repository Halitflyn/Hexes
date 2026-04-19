import { parseHexAngles, hasOverlappingEdges } from './src/utils/hexUtils';

function findValidSequence(divCount: number) {
    let res = "aqaaw";
    // To avoid immediate overlap, let's start with some 'ad's
    // Actually, let's just use BFS to find the shortest valid sequence
    let queue = [{ path: res, divs: 0 }];
    
    while (queue.length > 0) {
        let curr = queue.shift()!;
        if (curr.divs === divCount) return curr.path;
        
        for (let j = 0; j < 10; j++) {
            let nextPath = curr.path + "ad".repeat(j) + "d";
            if (!hasOverlappingEdges(parseHexAngles(nextPath))) {
                queue.push({ path: nextPath, divs: curr.divs + 1 });
            }
        }
    }
    return null;
}

for (let i = 1; i <= 10; i++) {
    const seq = findValidSequence(i);
    console.log(`divCount=${i}: ${seq}`);
}
