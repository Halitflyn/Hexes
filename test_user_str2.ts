import { parseHexAngles, hasOverlappingEdges } from './src/utils/hexUtils';

const str = "aqaawdaddadaddadadaddadadadaddadadadadaddadadadadadadd";
const path = parseHexAngles(str);
console.log("Overlap:", hasOverlappingEdges(path));
