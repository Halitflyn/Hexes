import React, { useState, useMemo } from 'react';
import { Calculator, Zap, AlertCircle, CheckCircle2, Play, Trash2, HelpCircle, Info, Delete } from 'lucide-react';
import { HEX_DICTIONARY } from '../constants/hexDictionary';
import { parseNumericalReflection, parseHexAngles, hasOverlappingEdges } from '../utils/hexUtils';
import { HexMiniature } from './HexMiniature';

// Media costs in "dust" (1 dust = 100,000 media)
const PATTERN_COSTS: Record<string, number> = {
  'qaqqqqq': 0.1, // Break Block
  'eeeeede': 0.1, // Place Block
  'aww': 0.1,     // Ignite
  'qqa': 0.1,     // Conjure Block
  'ddqqd': 1.0,   // Explosion
  'qqqaw': 2.0,   // Lightning
  'waw': 0.05,    // Flight (estimated)
  'eawwae': 0.5,  // Create Lava
  'aqawq': 0.2,   // Blink
  'qqqqq': 0,     // Vector Reflection Zero
};

const TYPE_MAP: Record<string, { inputs: string[], outputs: string[] }> = {};

// Pre-parse types from dictionary
HEX_DICTIONARY.forEach(p => {
  const typeStr = p.type;
  if (!typeStr) return;
  
  const [inputsPart, outputsPart] = typeStr.split('→').map(s => s.trim());
  const inputs = inputsPart ? inputsPart.split(',').map(s => s.trim()).filter(s => s && s !== '→') : [];
  const outputs = outputsPart ? outputsPart.split(',').map(s => s.trim()).filter(s => s) : [];
  
  p.patterns.forEach(pattern => {
    TYPE_MAP[pattern] = { inputs, outputs };
  });
});

export default function SpellCalculator() {
  const [activeTab, setActiveTab] = useState<'numbers' | 'tester'>('numbers');
  
  // Number Calculator State
  const [calcInput, setCalcInput] = useState<string>('');
  
  // Tester State
  const [testCode, setTestCode] = useState<string>('');
  const [testResult, setTestResult] = useState<{ success: boolean, message: string, stack: string[], errorIndex?: number } | null>(null);

  const generateAdvancedNumericalReflection = (n: number): string => {
    if (n === 0) return "aqaa";

    let isNeg = n < 0;
    let m = Math.abs(n);
    
    let divCount = 0;
    // Limit to 10 divisions (1/1024 precision) to keep strings manageable and avoid overlaps
    while (!Number.isInteger(m) && divCount < 10) {
      m *= 2;
      divCount++;
      if (Math.abs(m - Math.round(m)) < 0.000001) {
        m = Math.round(m);
        break;
      }
    }
    
    m = Math.round(m);
    
    let res = isNeg ? "dedd" : "aqaa";
    
    // Binary-like construction for the integer part to avoid ewewew overlaps
    if (m > 0) {
      let ops: string[] = [];
      let tempM = m;
      while (tempM > 15) {
        if (tempM % 2 === 0) {
          tempM /= 2;
          ops.push("a");
        } else {
          tempM -= 1;
          ops.push("w");
        }
      }
      
      // Base value (0-15)
      let rem = tempM;
      if (rem >= 10) { res += "e"; rem -= 10; }
      if (rem >= 5) { res += "q"; rem -= 5; }
      res += "w".repeat(rem);
      
      // Apply binary operations in reverse
      for (let i = ops.length - 1; i >= 0; i--) {
        res += ops[i];
        // Add a safety shift every 2 'a's to avoid triangles
        if (ops[i] === 'a' && i > 0 && ops[i-1] === 'a') {
          res += "ad"; 
        }
      }
    }
    
    if (divCount > 0) {
      // Use the user's specific non-overlapping pattern.
      let remDiv = divCount;
      if (remDiv >= 2) {
        res += "dadd";
        remDiv -= 2;
        
        let k = 2;
        while (remDiv > 0) {
          res += "ad".repeat(k) + "add";
          k++;
          remDiv--;
        }
      } else {
        res += "d";
      }
    }
    
    return res;
  };

  // Numerical Reflection Generator
  const generateNumericalReflection = (n: number) => {
    return generateAdvancedNumericalReflection(n);
  };

  const mathToRPN = (expression: string): string | null => {
    const tokens = expression.match(/\d+\.?\d*|[\+\-\*\/\(\)]/g);
    if (!tokens) return null;

    const precedence: Record<string, number> = { '+': 1, '-': 1, '*': 2, '/': 2 };
    const output: string[] = [];
    const operators: string[] = [];

    for (const token of tokens) {
      if (!isNaN(Number(token))) {
        output.push(generateAdvancedNumericalReflection(Number(token)));
      } else if (token === '(') {
        operators.push(token);
      } else if (token === ')') {
        while (operators.length > 0 && operators[operators.length - 1] !== '(') {
          const op = operators.pop()!;
          output.push(op === '+' ? 'waaw' : op === '-' ? 'wddw' : op === '*' ? 'waqaw' : 'wdedw');
        }
        operators.pop(); // Remove '('
      } else if (precedence[token]) {
        while (
          operators.length > 0 &&
          precedence[operators[operators.length - 1]] >= precedence[token]
        ) {
          const op = operators.pop()!;
          output.push(op === '+' ? 'waaw' : op === '-' ? 'wddw' : op === '*' ? 'waqaw' : 'wdedw');
        }
        operators.push(token);
      }
    }

    while (operators.length > 0) {
      const op = operators.pop()!;
      if (op === '(' || op === ')') return null; // Mismatched parentheses
      output.push(op === '+' ? 'waaw' : op === '-' ? 'wddw' : op === '*' ? 'waqaw' : 'wdedw');
    }

    return output.join(', ');
  };

  const calcResult = useMemo(() => {
    if (!calcInput.trim()) return null;

    // Try parsing as prompt first
    const parsedNum = parseNumericalReflection(calcInput.trim());
    if (parsedNum !== null) {
      return { type: 'prompt_to_num', value: parsedNum, prompt: calcInput.trim() };
    }

    // Try evaluating as math expression
    try {
      const sanitized = calcInput.replace(/[^0-9+\-*/.,() ]/g, '').replace(',', '.');
      if (!sanitized) return null;
      
      // eslint-disable-next-line no-new-func
      const result = new Function(`return ${sanitized}`)();
      if (typeof result === 'number' && !isNaN(result) && isFinite(result)) {
        // If it's a simple number, just return its reflection
        if (!/[\+\-\*\/]/.test(sanitized)) {
          const prompt = generateNumericalReflection(result);
          return { type: 'num_to_prompt', value: result, prompt };
        }
        
        // If it's an expression, generate the RPN sequence
        const rpnPrompt = mathToRPN(sanitized);
        if (rpnPrompt) {
          return { type: 'num_to_prompt', value: result, prompt: rpnPrompt };
        }
      }
    } catch (e) {
      // Invalid math expression
    }

    return null;
  }, [calcInput]);

  const handleCalcBtn = (char: string) => {
    setCalcInput(prev => prev + char);
  };

  const handleCalcClear = () => {
    setCalcInput('');
  };

  const handleCalcBackspace = () => {
    setCalcInput(prev => prev.slice(0, -1));
  };

  // Spell Tester Logic
  const runTest = () => {
    const patterns = testCode.split(/[\s,]+/).filter(s => s.trim());
    let stack: string[] = [];
    
    for (let i = 0; i < patterns.length; i++) {
      const p = patterns[i];
      
      // Handle numbers
      const numVal = parseNumericalReflection(p);
      if (numVal !== null) {
        stack.push(`number (${numVal})`);
        continue;
      }

      const typeInfo = TYPE_MAP[p];
      if (!typeInfo) {
        setTestResult({
          success: false,
          message: `Невідомий гліф: ${p}`,
          stack,
          errorIndex: i
        });
        return;
      }

      // Check inputs
      const { inputs, outputs } = typeInfo;
      if (inputs.length > 0 && inputs[0] !== 'any' && inputs[0] !== 'many') {
        if (stack.length < inputs.length) {
          setTestResult({
            success: false,
            message: `Помилка у гліфі #${i+1} (${p}): Очікувалося ${inputs.length} елементів у стеку, знайдено ${stack.length}`,
            stack,
            errorIndex: i
          });
          return;
        }
        
        // Basic type checking (very simplified)
        for (let j = 0; j < inputs.length; j++) {
          const expected = inputs[inputs.length - 1 - j].toLowerCase();
          const actual = stack[stack.length - 1 - j].toLowerCase();
          
          if (expected !== 'any' && expected !== 'num|vec' && !actual.includes(expected)) {
             // Special case for num|vec
             if (expected === 'num|vec' && (actual.includes('number') || actual.includes('vector'))) {
               continue;
             }
             
             setTestResult({
               success: false,
               message: `Помилка типу у гліфі #${i+1} (${p}): Очікувався ${expected}, але знайдено ${actual}`,
               stack,
               errorIndex: i
             });
             return;
          }
        }
      }

      // Apply effect
      if (inputs[0] !== 'many') {
        stack = stack.slice(0, stack.length - (inputs[0] === 'any' ? 1 : inputs.length));
      }
      
      outputs.forEach(out => {
        if (out !== 'many') stack.push(out);
      });
    }

    setTestResult({
      success: true,
      message: "Закляття валідне! Стек виглядає логічно.",
      stack
    });
  };

  const calculateMedia = (code: string) => {
    const patterns = code.split(/[\s,]+/).filter(s => s.trim());
    let totalDust = 0;
    patterns.forEach(p => {
      totalDust += PATTERN_COSTS[p] || 0;
    });
    return totalDust;
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden flex flex-col h-full shadow-2xl">
      <div className="flex border-b border-slate-800 bg-slate-900/50">
        <button 
          onClick={() => setActiveTab('numbers')}
          className={`flex-1 py-4 flex items-center justify-center gap-2 font-bold transition-all ${activeTab === 'numbers' ? 'text-purple-400 bg-purple-400/5 border-b-2 border-purple-500' : 'text-slate-500 hover:text-slate-300'}`}
        >
          <Calculator size={18} /> Числовий Калькулятор
        </button>
        <button 
          onClick={() => setActiveTab('tester')}
          className={`flex-1 py-4 flex items-center justify-center gap-2 font-bold transition-all ${activeTab === 'tester' ? 'text-indigo-400 bg-indigo-400/5 border-b-2 border-indigo-500' : 'text-slate-500 hover:text-slate-300'}`}
        >
          <Zap size={18} /> Тестер Заклять
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
        {activeTab === 'numbers' ? (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2 uppercase tracking-wider">Введіть вираз або промпт</label>
              <div className="relative">
                <input 
                  type="text" 
                  value={calcInput}
                  onChange={(e) => setCalcInput(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-xl font-mono text-white outline-none focus:border-purple-500 transition-all pr-12"
                  placeholder="Наприклад: 1 + 5 або aqaaq"
                />
                <button 
                  onClick={handleCalcBackspace}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                >
                  <Delete size={20} />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-2">
              {['7', '8', '9', '/'].map(char => (
                <button key={char} onClick={() => handleCalcBtn(char)} className="p-3 bg-slate-800 hover:bg-slate-700 rounded-lg text-xl font-mono text-white transition-colors">{char}</button>
              ))}
              {['4', '5', '6', '*'].map(char => (
                <button key={char} onClick={() => handleCalcBtn(char)} className="p-3 bg-slate-800 hover:bg-slate-700 rounded-lg text-xl font-mono text-white transition-colors">{char}</button>
              ))}
              {['1', '2', '3', '-'].map(char => (
                <button key={char} onClick={() => handleCalcBtn(char)} className="p-3 bg-slate-800 hover:bg-slate-700 rounded-lg text-xl font-mono text-white transition-colors">{char}</button>
              ))}
              {['C', '0', '.', '+'].map(char => (
                <button key={char} onClick={char === 'C' ? handleCalcClear : () => handleCalcBtn(char)} className={`p-3 rounded-lg text-xl font-mono text-white transition-colors ${char === 'C' ? 'bg-red-900/50 hover:bg-red-800/50 text-red-300' : 'bg-slate-800 hover:bg-slate-700'}`}>{char}</button>
              ))}
            </div>

            {calcResult && (
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Результат</span>
                  <button 
                    onClick={() => navigator.clipboard.writeText(calcResult.type === 'num_to_prompt' ? calcResult.prompt : calcResult.value.toString())}
                    className="text-[10px] text-purple-400 hover:underline uppercase font-bold"
                  >
                    Копіювати
                  </button>
                </div>
                
                {calcResult.type === 'num_to_prompt' ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <div className="text-3xl font-bold text-white">{calcResult.value}</div>
                      <div className="text-slate-500">=</div>
                      <div className="flex-1 p-3 bg-purple-900/10 border border-purple-500/20 rounded-xl font-mono text-sm text-purple-300 break-all">
                        {calcResult.prompt}
                      </div>
                    </div>
                    {/* Miniature view */}
                    {!calcResult.prompt.includes(',') && (
                      <div className="flex flex-col items-center gap-2">
                        <div className={`w-32 h-32 bg-slate-900 rounded-xl border p-2 ${hasOverlappingEdges(parseHexAngles(calcResult.prompt)) ? 'border-red-500/50' : 'border-slate-800'}`}>
                          <HexMiniature path={parseHexAngles(calcResult.prompt)} fade={true} />
                        </div>
                        {hasOverlappingEdges(parseHexAngles(calcResult.prompt)) && (
                          <div className="flex items-center gap-1.5 text-xs text-red-400 bg-red-900/20 px-3 py-1.5 rounded-lg border border-red-500/20">
                            <AlertCircle size={14} />
                            <span>Помилка: ребра накладаються</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <div className="flex-1 p-3 bg-purple-900/10 border border-purple-500/20 rounded-xl font-mono text-sm text-purple-300 break-all">
                        {calcResult.prompt}
                      </div>
                      <div className="text-slate-500">=</div>
                      <div className="text-3xl font-bold text-white">{calcResult.value}</div>
                    </div>
                    <div className="flex flex-col items-center gap-2">
                      <div className={`w-32 h-32 bg-slate-900 rounded-xl border p-2 ${hasOverlappingEdges(parseHexAngles(calcResult.prompt)) ? 'border-red-500/50' : 'border-slate-800'}`}>
                        <HexMiniature path={parseHexAngles(calcResult.prompt)} fade={true} />
                      </div>
                      {hasOverlappingEdges(parseHexAngles(calcResult.prompt)) && (
                        <div className="flex items-center gap-1.5 text-xs text-red-400 bg-red-900/20 px-3 py-1.5 rounded-lg border border-red-500/20">
                          <AlertCircle size={14} />
                          <span>Помилка: ребра накладаються</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            <div className="space-y-2">
              <div className="flex justify-between items-end">
                <label className="block text-sm font-medium text-slate-400 uppercase tracking-wider">Код закляття для тесту</label>
                <div className="text-[10px] text-slate-500 font-mono">
                  Медіа: <span className="text-indigo-400 font-bold">{(calculateMedia(testCode) * 100000).toLocaleString()}</span> ({(calculateMedia(testCode)).toFixed(2)} dust)
                </div>
              </div>
              <textarea 
                value={testCode}
                onChange={(e) => setTestCode(e.target.value)}
                placeholder="qaq, aa, wa, weaqa, aqaaq, waqaw, qqa..."
                className="w-full h-32 bg-slate-950 border border-slate-700 rounded-xl p-4 font-mono text-sm text-slate-200 outline-none focus:border-indigo-500 resize-none transition-all"
              />
            </div>

            <button 
              onClick={runTest}
              className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold transition-all shadow-lg shadow-indigo-900/20 flex items-center justify-center gap-2"
            >
              <Play size={18} /> Запустити симуляцію
            </button>

            {testResult && (
              <div className={`rounded-2xl border p-6 space-y-4 ${testResult.success ? 'bg-emerald-900/10 border-emerald-500/30' : 'bg-red-900/10 border-red-500/30'}`}>
                <div className="flex items-center gap-3">
                  {testResult.success ? <CheckCircle2 className="text-emerald-500" /> : <AlertCircle className="text-red-500" />}
                  <span className={`font-bold ${testResult.success ? 'text-emerald-400' : 'text-red-400'}`}>
                    {testResult.success ? 'Успіх!' : 'Помилка валідації'}
                  </span>
                </div>
                <p className="text-sm text-slate-300 leading-relaxed">{testResult.message}</p>
                
                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Стан стеку після виконання:</span>
                  <div className="flex flex-wrap gap-2">
                    {testResult.stack.length === 0 ? (
                      <span className="text-xs text-slate-600 italic">Стек порожній</span>
                    ) : (
                      testResult.stack.map((item, i) => (
                        <div key={i} className="px-3 py-1 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-indigo-300">
                          {item}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      
      <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center gap-3 text-[10px] text-slate-500 uppercase font-bold tracking-widest">
        <HelpCircle size={14} />
        <span>Підказка: Використовуйте коми або пробіли для розділення гліфів</span>
      </div>
    </div>
  );
}
