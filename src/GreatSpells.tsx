import React, { useState, useEffect } from 'react';
import { Book, Save, RotateCcw, Info, Play, Square, SkipForward, SkipBack } from 'lucide-react';
import greatSpellsData from './constants/hex_spells_Great Spells.json';
import { HexMiniature } from './components/HexMiniature';
import { findAllValidPatterns, parseHexAngles } from './utils/hexUtils';

const SPELL_START_DIRS: Record<string, number> = {
  "Summon Lightning": 3,
  "Dispel Rain": 3,
  "Summon Rain": 1,
  "Altiora": 1,
  "White Sun's Zenith": 1,
  "Craft Phial": 1,
  "Greater Teleport": 3,
  "Black Sun's Zenith": 3,
  "Summon Greater Sentinel": 3,
  "Red Sun's Zenith": 3,
  "Green Sun's Zenith": 2,
  "Flay Mind": 3
};

function GreatSpellCard({ spell, customPattern, handlePatternChange, handleReset, isCustom }: any) {
  const defaultPattern = spell.patterns[0] || '';
  const startDir = SPELL_START_DIRS[spell.name] || 0;
  
  const [combinations, setCombinations] = useState<{path: string[], angles: string, startDir: number}[]>([]);
  const [isCalculating, setIsCalculating] = useState(true);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackComboIndex, setPlaybackComboIndex] = useState(0);
  const [animatedStep, setAnimatedStep] = useState(-1);

  useEffect(() => {
    setIsCalculating(true);
    const timer = setTimeout(() => {
      const combos = findAllValidPatterns(defaultPattern, startDir);
      setCombinations(combos);
      setIsCalculating(false);
    }, 50);
    return () => clearTimeout(timer);
  }, [defaultPattern, startDir]);

  useEffect(() => {
    if (!isPlaying || combinations.length === 0) return;

    let step = 0;
    let comboIdx = playbackComboIndex;
    let timeoutId: any;

    const tick = () => {
      const currentCombo = combinations[comboIdx];
      if (step < currentCombo.path.length) {
        setAnimatedStep(step);
        step++;
        timeoutId = setTimeout(tick, 150);
      } else {
        timeoutId = setTimeout(() => {
          comboIdx = (comboIdx + 1) % combinations.length;
          setPlaybackComboIndex(comboIdx);
          step = 0;
          tick();
        }, 1000);
      }
    };

    tick();

    return () => clearTimeout(timeoutId);
  }, [isPlaying, combinations]);

  const displayPath = (isPlaying || combinations.length > 0) && combinations[playbackComboIndex]
    ? combinations[playbackComboIndex].path 
    : parseHexAngles(defaultPattern, startDir);

  const displayStep = isPlaying ? animatedStep : -1;

  return (
    <div className="bg-slate-900 rounded-xl border border-slate-800 p-5 shadow-lg">
      <div className="flex flex-col md:flex-row gap-6">
        
        <div className="w-full md:w-48 shrink-0 flex flex-col gap-3">
          <div className="aspect-square bg-slate-950 rounded-xl border border-slate-800 p-2 relative">
            <HexMiniature path={displayPath} animatedStep={displayStep} />
            {isCalculating && (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-950/50 rounded-xl">
                <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            )}
          </div>
          
          <div className="bg-slate-950 rounded-lg border border-slate-800 p-2 flex flex-col gap-2">
            <div className="text-xs text-slate-400 text-center font-medium">
              {isCalculating ? 'Обчислення...' : `Комбінацій: ${combinations.length}`}
            </div>
            
            {!isCalculating && combinations.length > 0 && (
              <>
                <div className="flex justify-center gap-1">
                  <button 
                    onClick={() => {
                      setIsPlaying(false);
                      setPlaybackComboIndex(prev => (prev - 1 + combinations.length) % combinations.length);
                      setAnimatedStep(-1);
                    }}
                    className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
                    title="Попередня комбінація"
                  >
                    <SkipBack size={16} />
                  </button>
                  
                  <button 
                    onClick={() => {
                      if (isPlaying) {
                        setIsPlaying(false);
                        setAnimatedStep(-1);
                      } else {
                        setIsPlaying(true);
                      }
                    }}
                    className={`p-1.5 rounded transition-colors ${isPlaying ? 'text-red-400 hover:bg-red-400/10' : 'text-green-400 hover:bg-green-400/10'}`}
                    title={isPlaying ? "Зупинити" : "Відтворити"}
                  >
                    {isPlaying ? <Square size={16} /> : <Play size={16} className="ml-0.5" />}
                  </button>

                  <button 
                    onClick={() => {
                      setIsPlaying(false);
                      setPlaybackComboIndex(prev => (prev + 1) % combinations.length);
                      setAnimatedStep(-1);
                    }}
                    className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
                    title="Наступна комбінація"
                  >
                    <SkipForward size={16} />
                  </button>
                </div>
                
                <div className="text-[10px] font-mono text-center text-purple-400/70 truncate px-1" title={combinations[playbackComboIndex].angles}>
                  {playbackComboIndex + 1}: {combinations[playbackComboIndex].angles}
                </div>
              </>
            )}
          </div>
        </div>

        <div className="flex-1">
          <h3 className="text-lg font-bold text-slate-200 mb-1">{spell.name}</h3>
          <div className="text-xs font-mono text-purple-400/70 mb-3">
            Стандартний патерн: {defaultPattern}
          </div>
          <p className="text-sm text-slate-400 mb-4 leading-relaxed">
            {spell.description}
          </p>
          
          <div className="bg-slate-950 p-4 rounded-lg border border-slate-800">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
              Ваш патерн для цього світу
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={customPattern}
                onChange={(e) => handlePatternChange(spell.name, e.target.value)}
                placeholder="Введіть ваш патерн (напр. qqqwww)"
                className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm font-mono text-slate-200 focus:outline-none focus:border-purple-500 transition-colors"
              />
              {isCustom && (
                <button
                  onClick={() => handleReset(spell.name)}
                  className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 rounded-lg transition-colors border border-slate-700"
                  title="Скинути до стандартного"
                >
                  <RotateCcw size={18} />
                </button>
              )}
            </div>
            <div className="mt-2 text-xs text-slate-500 flex items-start gap-1.5">
              <Info size={14} className="shrink-0 mt-0.5" />
              <span>
                Патерни складаються з літер <strong>w, e, d, s, a, q</strong>. 
                Для замкнутих фігур зазвичай існує кілька варіантів малювання.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function GreatSpells() {
  const [customPatterns, setCustomPatterns] = useState<Record<string, string>>({});

  useEffect(() => {
    const saved = localStorage.getItem('hex_custom_great_spells');
    if (saved) {
      try {
        setCustomPatterns(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse saved custom great spells', e);
      }
    }
  }, []);

  const handlePatternChange = (spellName: string, pattern: string) => {
    const updated = { ...customPatterns, [spellName]: pattern };
    setCustomPatterns(updated);
    localStorage.setItem('hex_custom_great_spells', JSON.stringify(updated));
  };

  const handleReset = (spellName: string) => {
    const updated = { ...customPatterns };
    delete updated[spellName];
    setCustomPatterns(updated);
    localStorage.setItem('hex_custom_great_spells', JSON.stringify(updated));
  };

  return (
    <div className="h-full flex flex-col pt-12">
      <div className="bg-slate-900 border-b border-slate-800 p-4 md:p-6 shrink-0">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-3">
            <Book className="text-purple-500" />
            Великі Руни (Great Spells)
          </h1>
          <p className="text-slate-400 mt-2 text-sm max-w-2xl">
            Великі руни мають однаковий малюнок для всіх, але послідовність малювання (патерн) генерується випадково для кожного світу. 
            Тут ви можете зберегти свої власні патерни для великих рун, щоб ШІ міг використовувати їх при створенні заклинань.
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="max-w-4xl mx-auto grid gap-6">
          {greatSpellsData.map((spell, idx) => {
            const customPattern = customPatterns[spell.name] || '';
            const isCustom = !!customPatterns[spell.name];

            return (
              <GreatSpellCard 
                key={idx} 
                spell={spell} 
                customPattern={customPattern} 
                handlePatternChange={handlePatternChange} 
                handleReset={handleReset} 
                isCustom={isCustom} 
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
