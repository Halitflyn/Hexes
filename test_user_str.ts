import { parseHexAngles, hasOverlappingEdges } from './src/utils/hexUtils';

const str = "aqaawdaddadadaddadadadaddadadadadaddadadadadadaddadd";
const path = parseHexAngles(str);
console.log("Overlap:", hasOverlappingEdges(path));
