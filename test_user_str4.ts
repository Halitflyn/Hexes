import { parseHexAngles, hasOverlappingEdges } from './src/utils/hexUtils';

const userStr = "aqaawdaddadadaddadadadaddadadadadaddadadadadadaddadd";
console.log("User string overlap:", hasOverlappingEdges(parseHexAngles(userStr)));
