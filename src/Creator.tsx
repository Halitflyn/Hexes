import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Plus, Trash2, Download, Book, Sparkles, PenTool, XCircle, Check, ArrowLeft, ArrowRight, Minus, ArrowUp, ArrowDown, Upload, Share2, Wand2, Bot, Copy, Undo, RotateCw, Bookmark, Code, FileJson, GripVertical } from 'lucide-react';
import { HexCanvas } from './components/HexCanvas';
import { HexMiniature } from './components/HexMiniature';
import { generateId, parseHexAngles, recenterPath, pathToHexAngles, rotatePath } from './utils/hexUtils';
import greatSpellsData from './constants/hex_spells_Great Spells.json';
import allSpellsData from './constants/hex_spells.json';

const getGreatSpellsText = () => {
  let text = '\n\nВЕЛИКІ РУНИ (GREAT SPELLS) ДЛЯ ЦЬОГО СВІТУ:\n';
  text += greatSpellsData.map(s => `- ${s.name}: ${s.patterns[0]}`).join('\n');
  
  const savedGreatSpells = localStorage.getItem('hex_custom_great_spells');
  if (savedGreatSpells) {
    try {
      const parsed = JSON.parse(savedGreatSpells);
      const entries = Object.entries(parsed).filter(([_, val]) => val);
      if (entries.length > 0) {
        text += '\n' + entries.map(([name, pattern]) => `- ${name}: ${pattern}`).join('\n');
      }
    } catch (e) {}
  }
  return text;
};

export default function Creator() {
  const location = useLocation();
  const navigate = useNavigate();
  const [spells, setSpells] = useState<any[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [showAiModal, setShowAiModal] = useState(false);
  const [showConfirmNew, setShowConfirmNew] = useState(false);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const [aiIntention, setAiIntention] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [manualAiCode, setManualAiCode] = useState('');
  const [savedTemplates, setSavedTemplates] = useState<Record<string, boolean>>({});
  const [userApiKey, setUserApiKey] = useState(() => localStorage.getItem('gemini_api_key') || '');

  const [activeSpell, setActiveSpell] = useState<any>({
    id: generateId(), name: '', description: '', patterns: [], createdAt: new Date().toISOString()
  });

  const [isMultiMode, setIsMultiMode] = useState(false);
  const [draftPaths, setDraftPaths] = useState<string[][]>([]);
  const [currentDraftPath, setCurrentDraftPath] = useState<string[]>([]);
  const [draftHistory, setDraftHistory] = useState<{paths: string[][], current: string[]}[]>([]);
  const [zoom, setZoom] = useState(window.innerWidth < 768 ? 250 : 100);
  const [startDir, setStartDir] = useState(0); // 0 to 5 for the 6 hex directions

  const getDefaultZoom = () => window.innerWidth < 768 ? 250 : 100;

  useEffect(() => {
    const saved = localStorage.getItem('hex_casting_grimoire');
    let localSpells = [];
    if (saved) {
      try { 
        let parsedSpells = JSON.parse(saved); 
        if (Array.isArray(parsedSpells)) {
          localSpells = parsedSpells.map(spell => {
            const safePatterns = Array.isArray(spell.patterns) ? spell.patterns.map(p => {
              if (typeof p === 'string') return { id: generateId(), name: 'Старий запис', path: [], startDir: 0 };
              if (!Array.isArray(p.path)) p.path = [];
              return p;
            }) : [];
            return { ...spell, patterns: safePatterns };
          });
        }
        setSpells(localSpells); 
      } catch (e) { console.error("Помилка читання localStorage", e); }
    }
    
    if (location.state?.editSpell) {
      setActiveSpell(location.state.editSpell);
      // Clear state so refresh doesn't keep editing
      navigate('.', { replace: true, state: {} });
    } else {
      const params = new URLSearchParams(location.search);
      const spellParam = params.get('spell');
      if (spellParam) {
        try {
          const decoded = JSON.parse(decodeURIComponent(atob(spellParam)));
          decoded.id = generateId(); // new ID to avoid collisions
          setActiveSpell(decoded);
          // Clean up URL
          navigate('.', { replace: true });
        } catch (e) {
          console.error("Failed to parse shared spell", e);
          setAlertMessage("Не вдалося завантажити закляття з посилання. Можливо, посилання пошкоджене.");
        }
      }
    }
    
    setZoom(getDefaultZoom());
    setIsLoaded(true);
  }, [location.state, navigate]);

  useEffect(() => {
    if (isLoaded) localStorage.setItem('hex_casting_grimoire', JSON.stringify(spells));
  }, [spells, isLoaded]);

  useEffect(() => {
    localStorage.setItem('gemini_api_key', userApiKey);
  }, [userApiKey]);

  const saveHistory = () => {
    setDraftHistory(prev => [...prev, { paths: draftPaths, current: currentDraftPath }]);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts if user is typing in an input or textarea
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        handleUndo();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSaveToGrimoire();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        handleAddGlyph();
      } else if (e.key === 'Delete' || e.key === 'Escape') {
        e.preventDefault();
        handleClearCanvas();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [draftPaths, currentDraftPath, draftHistory, activeSpell]);

  const handlePathChange = (newPath: string[]) => {
    saveHistory();
    setCurrentDraftPath(newPath);
  };

  const handlePathComplete = () => {
    if (currentDraftPath.length > 1) {
      saveHistory();
      if (isMultiMode) {
        setDraftPaths(prev => [...prev, currentDraftPath]);
        setCurrentDraftPath([]);
      }
    }
  };

  const handleUndo = () => {
    if (draftHistory.length > 0) {
      const previousState = draftHistory[draftHistory.length - 1];
      setDraftPaths(previousState.paths);
      setCurrentDraftPath(previousState.current);
      setDraftHistory(prev => prev.slice(0, -1));
    } else {
      setDraftPaths([]);
      setCurrentDraftPath([]);
    }
  };

  const handleDownloadDictionary = () => {
    downloadJsonStr(allSpellsData, 'hex_casting_dictionary.json');
  };

  const handleCopyNotebookLMPrompt = () => {
    const dictionaryText = allSpellsData.map(p => `- ${p.name} (${p.type}): ${p.patterns.join(', ')}`).join('\n');
    const greatSpellsText = getGreatSpellsText();

    const prompt = `Універсальний системний промпт для Hex Casting
Ти — експерт-заклинач у моді Hex Casting для Minecraft. Твоє завдання — генерувати максимально оптимізовані, робочі та елегантні закляття на основі запитів користувача.

СЛОВНИК БАЗОВИХ ГЛІФІВ:
${dictionaryText}${greatSpellsText}

ПРАВИЛА НАПИСАННЯ ЗАКЛЯТЬ (ОБОВ'ЯЗКОВО ДО ВИКОНАННЯ):
1. Математична оптимізація: НІКОЛИ не застосовуй багаторазове додавання векторів (наприклад, waaw кілька разів підряд) для обчислення дистанції чи висоти. ЗАВЖДИ використовуй множення (Multiplicative Distillation).
Приклад: Щоб отримати висоту 5 блоків, створи одиничний вектор Y (qqqqqew), напиши число 5 (aqaaq) та перемнож їх (waqaw), після чого додай до стартової координати.

2. Фізика гри (Гравітаційні блоки): Будь-який блок, що має падати (ковадло, сталактит, пісок тощо), не може бути розміщений просто в повітрі. Оптимальний алгоритм:
- Обчисли координату примарного блоку-опори (наприклад, Ціль + 6Y).
- Продублюй її (aadaa) та створи примарний блок (qqa).
- Знову продублюй координату опори (aadaa), створи вектор Y (qqqqqew) і відніми його через Subtractive Distillation (wddw), щоб отримати координату під опорою.
- Встанови атакуючий блок (eeeeede).
- Зламай примарний блок-опору (qaqqqqq).
Це дозволяє уникнути повторних обчислень висоти та використання Jester's Gambit.

3. Числа (Numerical Reflection): Числа створюються за допомогою базового патерну aqaa (для додатних) або dedd (для від'ємних), до якого додаються суфікси: w (+1), q (+5), e (+10), a (*2), d (/2). Наприклад: 5 = aqaaq (0+5), 6 = aqaaqw (0+5+1), 10 = aqaaqq або aqaae, 3 = aqaawww.

4. Оптимізація стека: Дублюй складні обчислення (наприклад, знайдену координату цілі) через Gemini Decomposition (aadaa). Але для базових сутностей (як-от сам гравець - Mind's Reflection qaq) дешевше і простіше викликати гліф повторно, ніж дублювати його і міняти місцями через Jester's Gambit (aawdd). Не ускладнюй стек без потреби.

ФОРМАТ ВІДПОВІДІ: Відповідай ВИКЛЮЧНО послідовністю патернів (літер), розділених комами і пробілами. Жодних пояснень, привітань, вступних слів чи коментарів. Лише чистий код закляття.`;
    navigator.clipboard.writeText(prompt);
    setAlertMessage('Промпт для NotebookLM (з пріоритетом словника) скопійовано!');
  };

  const handleGenerateAiSpell = async () => {
    if (!aiIntention.trim()) return;
    setIsGeneratingAi(true);
    setAiResponse('');
    try {
      const { GoogleGenAI } = await import('@google/genai');
      const apiKey = userApiKey || import.meta.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY || "dummy_key";
      const ai = new GoogleGenAI({ apiKey });
      
      const dictionaryContext = allSpellsData.map(p => `- ${p.name}: ${p.patterns.join(', ')} (${p.type})`).join('\n');
      const greatSpellsText = getGreatSpellsText();
      
      const prompt = `Універсальний системний промпт для Hex Casting
Ти — експерт-заклинач у моді Hex Casting для Minecraft. Твоє завдання — генерувати максимально оптимізовані, робочі та елегантні закляття на основі запитів користувача.

СЛОВНИК БАЗОВИХ ГЛІФІВ:
${dictionaryContext}${greatSpellsText}

ПРАВИЛА НАПИСАННЯ ЗАКЛЯТЬ (ОБОВ'ЯЗКОВО ДО ВИКОНАННЯ):
1. Математична оптимізація: НІКОЛИ не застосовуй багаторазове додавання векторів (наприклад, waaw кілька разів підряд) для обчислення дистанції чи висоти. ЗАВЖДИ використовуй множення (Multiplicative Distillation).
Приклад: Щоб отримати висоту 5 блоків, створи одиничний вектор Y (qqqqqew), напиши число 5 (aqaaq) та перемнож їх (waqaw), після чого додай до стартової координати.

2. Фізика гри (Гравітаційні блоки): Будь-який блок, що має падати (ковадло, сталактит, пісок тощо), не може бути розміщений просто в повітрі. Оптимальний алгоритм:
- Обчисли координату примарного блоку-опори (наприклад, Ціль + 6Y).
- Продублюй її (aadaa) та створи примарний блок (qqa).
- Знову продублюй координату опори (aadaa), створи вектор Y (qqqqqew) і відніми його через Subtractive Distillation (wddw), щоб отримати координату під опорою.
- Встанови атакуючий блок (eeeeede).
- Зламай примарний блок-опору (qaqqqqq).
Це дозволяє уникнути повторних обчислень висоти та використання Jester's Gambit.

3. Числа (Numerical Reflection): Числа створюються за допомогою базового патерну aqaa (для додатних) або dedd (для від'ємних), до якого додаються суфікси: w (+1), q (+5), e (+10), a (*2), d (/2). Наприклад: 5 = aqaaq (0+5), 6 = aqaaqw (0+5+1), 10 = aqaaqq або aqaae, 3 = aqaawww.

4. Оптимізація стека: Дублюй складні обчислення (наприклад, знайдену координату цілі) через Gemini Decomposition (aadaa). Але для базових сутностей (як-от сам гравець - Mind's Reflection qaq) дешевше і простіше викликати гліф повторно, ніж дублювати його і міняти місцями через Jester's Gambit (aawdd). Не ускладнюй стек без потреби.

ЗАПИТ КОРИСТУВАЧА: Напиши закляття для: ${aiIntention}

ОБОВ'ЯЗКОВО використай пошук в інтернеті, щоб знайти правильні патерни (наприклад, Mind's Reflection, Archer's Distillation, Ignite) та їхні точні послідовності кутів (angles), якщо їх немає в списку вище.

ФОРМАТ ВІДПОВІДІ: Відповідай ВИКЛЮЧНО послідовністю патернів (літер), розділених комами і пробілами. Жодних пояснень, привітань, вступних слів чи коментарів. Лише чистий код закляття.`;
      
      const response = await ai.models.generateContent({
        model: 'gemini-3.1-pro-preview',
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }]
        }
      });
      
      const text = response.text || '';
      
      // Parse the text: split by comma or space, filter out empty strings, and keep only words with qweasd
      const rawPatterns = text.toLowerCase().split(/[\s,]+/).filter(p => /^[qweasd]+$/.test(p));
      
      if (rawPatterns.length === 0) {
        throw new Error("Не вдалося розпізнати руни у відповіді ШІ: " + text);
      }

      const dict = JSON.parse(localStorage.getItem('hex_glyph_dict') || '{}');

      const generatedSpell = {
        id: generateId(),
        name: aiIntention.substring(0, 30) + (aiIntention.length > 30 ? '...' : ''),
        description: `Згенеровано ШІ за запитом: ${aiIntention}`,
        patterns: rawPatterns.map((patternStr, index) => {
          const startDir = dict[patternStr] !== undefined ? dict[patternStr] : 0;
          const knownPattern = allSpellsData.find(p => p.patterns.includes(patternStr));
          return {
            id: generateId(),
            name: knownPattern ? knownPattern.name : `Гліф ${index + 1} (${patternStr})`,
            path: recenterPath(parseHexAngles(patternStr, startDir))
          };
        }),
        createdAt: new Date().toISOString()
      };
      
      setActiveSpell(generatedSpell);
      setShowAiModal(false);
      setAiIntention('');
    } catch (error) {
      console.error("AI Generation Error:", error);
      setAiResponse("Помилка генерації. Перевірте API ключ або спробуйте інший запит.");
    } finally {
      setIsGeneratingAi(false);
    }
  };

  const handleApplyManualCode = () => {
    if (!manualAiCode.trim()) return;
    
    const rawPatterns = manualAiCode.toLowerCase().split(/[\s,]+/).filter(p => /^[qweasd]+$/.test(p));
    
    if (rawPatterns.length === 0) {
      setAlertMessage("Не вдалося розпізнати руни у введеному коді. Використовуйте лише літери q, w, e, a, s, d.");
      return;
    }

    const dict = JSON.parse(localStorage.getItem('hex_glyph_dict') || '{}');

    const newPatterns = rawPatterns.map((patternStr, index) => {
      const startDir = dict[patternStr] !== undefined ? dict[patternStr] : 0;
      const knownPattern = allSpellsData.find(p => p.patterns.includes(patternStr));
      return {
        id: generateId(),
        name: knownPattern ? knownPattern.name : `Гліф ${index + 1} (${patternStr})`,
        path: recenterPath(parseHexAngles(patternStr, startDir))
      };
    });

    setActiveSpell((prev: any) => ({
      ...prev,
      patterns: [...(prev.patterns || []), ...newPatterns]
    }));
    
    setManualAiCode('');
    setShowAiModal(false);
  };

  const handleSaveTemplate = (path: string[], patternId: string) => {
    const { angles, startDir } = pathToHexAngles(path);
    if (!angles) return;
    
    const dict = JSON.parse(localStorage.getItem('hex_glyph_dict') || '{}');
    dict[angles] = startDir;
    localStorage.setItem('hex_glyph_dict', JSON.stringify(dict));
    
    setSavedTemplates(prev => ({ ...prev, [patternId]: true }));
    setTimeout(() => {
      setSavedTemplates(prev => ({ ...prev, [patternId]: false }));
    }, 2000);
  };

  const handleShareSpell = () => {
    try {
      const spellString = JSON.stringify(activeSpell);
      const encoded = btoa(encodeURIComponent(spellString));
      const url = `${window.location.origin}${window.location.pathname}#/?spell=${encoded}`;
      navigator.clipboard.writeText(url);
      setAlertMessage('Посилання на закляття скопійовано в буфер обміну!');
    } catch (e) {
      console.error("Share error", e);
      setAlertMessage('Помилка при створенні посилання. Можливо, закляття занадто велике.');
    }
  };

  const handleAddGlyph = () => {
    const newPatterns = isMultiMode ? draftPaths.map(path => {
      const { angles } = pathToHexAngles(path);
      const knownPattern = angles ? allSpellsData.find(p => p.patterns.includes(angles)) : null;
      return {
        id: generateId(),
        name: knownPattern ? knownPattern.name : '',
        path: path,
        startDir
      };
    }) : [];
    
    if (currentDraftPath.length > 1) {
      const { angles } = pathToHexAngles(currentDraftPath);
      const knownPattern = angles ? allSpellsData.find(p => p.patterns.includes(angles)) : null;
      newPatterns.push({
        id: generateId(),
        name: knownPattern ? knownPattern.name : '',
        path: currentDraftPath,
        startDir
      });
    }

    if (newPatterns.length > 0) {
      setActiveSpell((prev: any) => ({ 
        ...prev, 
        patterns: [...(prev.patterns || []), ...newPatterns] 
      }));
      setDraftPaths([]);
      setCurrentDraftPath([]); 
      setDraftHistory([]);
    }
  };

  const handleClearCanvas = () => {
    saveHistory();
    setDraftPaths([]);
    setCurrentDraftPath([]);
  };

  const handleZoomIn = () => setZoom(z => Math.min(z + 25, 300));
  const handleZoomOut = () => setZoom(z => Math.max(z - 25, 50));

  const handleSaveToGrimoire = () => {
    const exists = spells.find(s => s.id === activeSpell.id);
    const spellToSave = { ...activeSpell, name: activeSpell.name || 'Безіменне закляття' };
    if (exists) setSpells(spells.map(s => s.id === spellToSave.id ? spellToSave : s));
    else setSpells([spellToSave, ...spells]);
    setAlertMessage('Закляття збережено до Гримуару!');
  };

  const handleStartNewSpell = () => {
    if ((activeSpell.patterns || []).length > 0) {
      setShowConfirmNew(true);
      return;
    }
    confirmStartNew();
  };

  const confirmStartNew = () => {
    setActiveSpell({
      id: generateId(),
      name: '',
      description: '',
      patterns: [],
      mediaUrls: [],
      createdAt: new Date().toISOString()
    });
    setDraftPaths([]);
    setCurrentDraftPath([]);
    setDraftHistory([]);
    setZoom(getDefaultZoom());
    setShowConfirmNew(false);
  };

  const handleRemovePattern = (patternId: string) => {
    setActiveSpell((prev: any) => ({ ...prev, patterns: (prev.patterns || []).filter((p: any) => p.id !== patternId) }));
  };

  const handleUpdatePatternName = (patternId: string, newName: string) => {
    setActiveSpell((prev: any) => ({ ...prev, patterns: (prev.patterns || []).map((p: any) => p.id === patternId ? { ...p, name: newName } : p) }));
  };

  const handleUpdatePatternDescription = (patternId: string, newDescription: string) => {
    setActiveSpell((prev: any) => ({ ...prev, patterns: (prev.patterns || []).map((p: any) => p.id === patternId ? { ...p, description: newDescription } : p) }));
  };

  const handleRotatePattern = (patternId: string) => {
    setActiveSpell((prev: any) => ({
      ...prev,
      patterns: (prev.patterns || []).map((p: any) => {
        if (p.id === patternId) {
          return { ...p, path: recenterPath(rotatePath(p.path, 1)) };
        }
        return p;
      })
    }));
  };

  const [draggedPatternIndex, setDraggedPatternIndex] = useState<number | null>(null);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedPatternIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedPatternIndex === null || draggedPatternIndex === targetIndex) return;

    const newPatterns = [...(activeSpell.patterns || [])];
    const [draggedItem] = newPatterns.splice(draggedPatternIndex, 1);
    newPatterns.splice(targetIndex, 0, draggedItem);
    
    setActiveSpell({ ...activeSpell, patterns: newPatterns });
    setDraggedPatternIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedPatternIndex(null);
  };

  const handleMovePattern = (index: number, direction: number) => {
    const newPatterns = [...(activeSpell.patterns || [])];
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= newPatterns.length) return;
    const temp = newPatterns[index];
    newPatterns[index] = newPatterns[targetIndex];
    newPatterns[targetIndex] = temp;
    setActiveSpell({ ...activeSpell, patterns: newPatterns });
  };

  const downloadJsonStr = (data: any, defaultFilename: string) => {
    try {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = defaultFilename.endsWith('.json') ? defaultFilename : `${defaultFilename}.json`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
    } catch (err) {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data, null, 2));
      const a = document.createElement('a'); a.href = dataStr; a.download = defaultFilename;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
    }
  };

  const handleDownloadSpell = (spell: any) => {
    const safeName = (spell.name || 'spell').replace(/\s+/g, '_').toLowerCase();
    downloadJsonStr(spell, `${safeName}.json`);
  };

  const handleImportJson = (e: any) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event: any) => {
      try {
        const parsed = JSON.parse(event.target.result);
        if (Array.isArray(parsed)) {
          const validSpells = parsed.filter(s => s.patterns && Array.isArray(s.patterns));
          const newSpells = validSpells.map(s => ({...s, id: generateId()}));
          setSpells(prev => [...newSpells, ...prev]);
          alert(`Імпортовано заклять: ${newSpells.length}`);
        } else if (parsed && parsed.patterns && Array.isArray(parsed.patterns)) {
          const newSpell = { ...parsed, id: generateId() };
          setActiveSpell(newSpell);
          alert(`Імпортовано: ${newSpell.name || 'Безіменне закляття'}`);
        } else alert('Невірний формат файлу. Потрібен JSON закляття або гримуару.');
      } catch (err) { console.error(err); alert('Помилка читання JSON файлу!'); }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-950 text-slate-200 no-scrollbar h-screen overflow-hidden">
      <input type="file" accept=".json" ref={fileInputRef} onChange={handleImportJson} className="hidden" />

      {/* Main Content Area - Everything scrolls together */}
      <div className="flex-1 overflow-y-auto no-scrollbar flex flex-col pt-12">
        {/* Top Section: Spell Details & Actions - Now scrollable */}
        <div className="shrink-0 bg-slate-900 border-b border-slate-800 p-4 md:p-6">
          <div className="w-full flex flex-col gap-4">
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
              <div className="flex-1 w-full min-w-0">
                <input 
                  type="text" 
                  value={activeSpell.name || ''} 
                  onChange={(e) => setActiveSpell({ ...activeSpell, name: e.target.value })} 
                  placeholder="Назва закляття..." 
                  className="w-full bg-transparent text-2xl md:text-4xl font-black text-white placeholder-slate-800 outline-none border-b border-transparent focus:border-purple-500/30 transition-all"
                />
                <textarea 
                  value={activeSpell.description || ''} 
                  onChange={(e) => setActiveSpell({ ...activeSpell, description: e.target.value })} 
                  placeholder="Опис ефекту..." 
                  className="w-full bg-transparent text-sm md:text-base text-slate-400 placeholder-slate-800 outline-none resize-none mt-2 h-12 md:h-16 custom-scrollbar"
                />
              </div>
              
              <div className="flex flex-wrap gap-2 w-full md:w-auto shrink-0 justify-end items-center">
                <div className="flex gap-1 mr-1 border-r border-slate-800 pr-2">
                  <button onClick={() => fileInputRef.current?.click()} className="p-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-slate-300 transition-colors" title="Імпортувати"><Upload size={18} /></button>
                  <button onClick={() => handleDownloadSpell(activeSpell)} className="p-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-slate-300 transition-colors" title="Експортувати"><Download size={18} /></button>
                  <button onClick={handleShareSpell} className="p-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-slate-300 transition-colors" title="Поділитися"><Share2 size={18} /></button>
                </div>
                <button 
                  onClick={handleStartNewSpell} 
                  className="px-3 py-2 bg-slate-800 hover:bg-red-900/30 hover:text-red-400 text-slate-400 rounded-xl text-xs font-bold transition-colors border border-slate-700"
                >
                  Нове
                </button>
                <button 
                  onClick={() => setShowAiModal(true)} 
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-bold transition-all flex items-center gap-2 shadow-lg shadow-indigo-900/20"
                >
                  <Bot size={16} /> ШІ
                </button>
                <button 
                  onClick={handleSaveToGrimoire} 
                  disabled={(activeSpell.patterns || []).length === 0}
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-sm font-bold transition-all disabled:opacity-50 shadow-lg shadow-purple-900/20 flex items-center gap-2"
                >
                  <Bookmark size={16} /> Зберегти
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Drawing Area */}
        <div className="shrink-0 flex flex-col border-b border-slate-800 bg-slate-950">
          <div className="p-2 md:p-3 bg-slate-900/50 border-b border-slate-800 flex justify-between items-center shrink-0 z-20">
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-[10px] md:text-xs text-slate-500 uppercase tracking-widest hidden xs:block">Малювання</h2>
              <div className="flex bg-slate-950 rounded-lg p-0.5 border border-slate-800">
                <button 
                  onClick={() => setIsMultiMode(false)} 
                  className={`px-2 py-1 rounded-md text-[9px] md:text-xs font-bold transition-all ${!isMultiMode ? 'bg-purple-600 text-white' : 'text-slate-500'}`}
                >
                  Один
                </button>
                <button 
                  onClick={() => setIsMultiMode(true)} 
                  className={`px-2 py-1 rounded-md text-[9px] md:text-xs font-bold transition-all ${isMultiMode ? 'bg-purple-600 text-white' : 'text-slate-500'}`}
                >
                  Багато
                </button>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button 
                onClick={handleZoomOut} 
                className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-all border border-slate-700"
                title="Зменшити"
              >
                <Minus size={14} />
              </button>
              <button 
                onClick={handleZoomIn} 
                className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-all border border-slate-700"
                title="Збільшити"
              >
                <Plus size={14} />
              </button>
              <div className="h-5 w-px bg-slate-800 mx-0.5"></div>
              <button 
                onClick={handleUndo} 
                disabled={currentDraftPath.length === 0 && draftPaths.length === 0 && draftHistory.length === 0}
                className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-all disabled:opacity-30 border border-slate-700"
                title="Відкотити"
              >
                <Undo size={14} />
              </button>
              <button 
                onClick={handleClearCanvas} 
                disabled={currentDraftPath.length === 0 && draftPaths.length === 0}
                className="p-1.5 bg-slate-800 hover:bg-red-900/20 text-red-400/70 rounded-lg transition-all disabled:opacity-30 border border-slate-700"
                title="Очистити"
              >
                <Trash2 size={14} />
              </button>
              <div className="h-5 w-px bg-slate-800 mx-0.5"></div>
              <button 
                onClick={handleAddGlyph} 
                disabled={currentDraftPath.length === 0 && draftPaths.length === 0}
                className="flex items-center justify-center gap-1.5 px-4 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-bold transition-all disabled:opacity-50 shadow-lg shadow-purple-900/20"
              >
                <Plus size={16} /> Додати гліф
              </button>
            </div>
          </div>
          
          <div className="relative flex items-center justify-center overflow-hidden bg-slate-950 h-[60vh] md:h-[80vh]">
            {/* Canvas Container - Responsive height */}
            <div className="w-full h-full max-h-full flex items-center justify-center p-2">
              <div className="w-full h-full max-w-full max-h-full relative touch-none">
                <HexCanvas paths={draftPaths} currentPath={currentDraftPath} onChange={handlePathChange} onPathComplete={handlePathComplete} zoom={zoom} />
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Section: Glyph List - Part of the scrollable area */}
        <div className="shrink-0 bg-slate-900 border-t border-slate-800 p-4 md:p-6">
          <div className="w-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-xs md:text-sm text-slate-500 uppercase tracking-widest flex items-center gap-2">
                <Book size={16} className="text-purple-500" />
                Список гліфів ({(activeSpell.patterns || []).length})
              </h3>
            </div>
            
            {(activeSpell.patterns || []).length === 0 ? (
              <div className="py-8 text-center border-2 border-dashed border-slate-800 rounded-xl">
                <p className="text-slate-600 text-xs md:text-sm italic">Намалюйте та додайте свій перший гліф</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {(activeSpell.patterns || []).map((p: any, i: number) => {
                  const { angles } = pathToHexAngles(p.path);
                  const isQuestionable = angles ? !allSpellsData.some(dp => dp.patterns.includes(angles)) : false;
                  
                  return (
                    <div 
                      key={p.id} 
                      draggable
                      onDragStart={(e) => handleDragStart(e, i)}
                      onDragOver={(e) => handleDragOver(e, i)}
                      onDrop={(e) => handleDrop(e, i)}
                      onDragEnd={handleDragEnd}
                      className={`bg-slate-950 p-3 rounded-xl border flex gap-3 items-center group shadow-lg relative transition-all ${draggedPatternIndex === i ? 'opacity-50 border-purple-500' : 'border-slate-800'}`}
                    >
                      <div className="cursor-grab active:cursor-grabbing text-slate-600 hover:text-slate-400 p-1 -ml-2">
                        <GripVertical size={16} />
                      </div>
                      {isQuestionable && (
                        <div className="absolute -top-1.5 -right-1.5 bg-yellow-500 text-slate-950 p-0.5 rounded-full shadow-lg z-10" title="Невідомий гліф">
                          <Sparkles size={10} fill="currentColor" />
                        </div>
                      )}
                      <div className="w-12 h-12 bg-slate-900 rounded-lg border border-slate-800 p-1 shrink-0">
                        <HexMiniature path={p.path} fade={true} />
                      </div>
                      <div className="flex-1 min-w-0 flex flex-col gap-1">
                        <input 
                          type="text" 
                          value={p.name} 
                          onChange={(e) => handleUpdatePatternName(p.id, e.target.value)}
                          placeholder="Назва..."
                          className="w-full bg-transparent text-sm font-bold text-slate-200 outline-none border-b border-transparent focus:border-purple-500 transition-all"
                        />
                        <input 
                          type="text" 
                          value={p.description || ''} 
                          onChange={(e) => handleUpdatePatternDescription(p.id, e.target.value)}
                          placeholder="Опис гліфа..."
                          className="w-full bg-transparent text-xs text-slate-400 outline-none border-b border-transparent focus:border-purple-500/50 transition-all"
                        />
                        <div className="text-[10px] font-mono text-purple-400/70 truncate" title={angles || 'Початковий вузол'}>
                          {angles || 'Початковий вузол'}
                        </div>
                      </div>
                      <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="flex gap-1">
                          <button onClick={() => handleMovePattern(i, -1)} disabled={i === 0} className="p-1 text-slate-500 hover:text-indigo-400 transition-colors disabled:opacity-30"><ArrowLeft size={14} /></button>
                          <button onClick={() => handleMovePattern(i, 1)} disabled={i === (activeSpell.patterns || []).length - 1} className="p-1 text-slate-500 hover:text-indigo-400 transition-colors disabled:opacity-30"><ArrowRight size={14} /></button>
                        </div>
                        <div className="flex gap-1">
                          <button onClick={() => handleRotatePattern(p.id)} className="p-1 text-slate-500 hover:text-indigo-400 transition-colors"><RotateCw size={14} /></button>
                          <button onClick={() => handleRemovePattern(p.id)} className="p-1 text-slate-500 hover:text-red-400 transition-colors"><Trash2 size={14} /></button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Alert Modal */}
      {alertMessage && (
        <div className="fixed inset-0 z-[70] bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl text-center">
            <p className="text-slate-200 mb-6">{alertMessage}</p>
            <button 
              onClick={() => setAlertMessage(null)}
              className="w-full py-2 bg-indigo-600 hover:bg-indigo-50 text-white rounded-xl font-bold transition-all"
            >
              Зрозуміло
            </button>
          </div>
        </div>
      )}

      {/* Confirmation Modal for New Spell */}
      {showConfirmNew && (
        <div className="fixed inset-0 z-[60] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-2">Почати нове закляття?</h3>
            <p className="text-sm text-slate-400 mb-6">
              Ви впевнені? Поточне закляття буде втрачено, якщо воно не збережене в Гримуар.
            </p>
            <div className="flex gap-3">
              <button 
                onClick={() => setShowConfirmNew(false)}
                className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-medium transition-all"
              >
                Скасувати
              </button>
              <button 
                onClick={confirmStartNew}
                className="flex-1 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold transition-all shadow-lg shadow-red-900/20"
              >
                Так, нове
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI Modal */}
      {showAiModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <Wand2 className="text-indigo-400" /> ШІ Генерація
              </h3>
              <button onClick={() => setShowAiModal(false)} className="text-slate-500 hover:text-white transition-colors">
                <XCircle size={24} />
              </button>
            </div>
            
            <div className="space-y-6">
              <div>
                <p className="text-sm text-slate-400 mb-2">
                  Опишіть закляття, і нейромережа створить його:
                </p>
                
                <textarea 
                  value={aiIntention}
                  onChange={(e) => setAiIntention(e.target.value)}
                  placeholder="Наприклад: Закляття, яке створює вогняну кулю..."
                  className="w-full h-24 bg-slate-950 border border-slate-700 rounded-xl p-3 text-slate-200 outline-none focus:border-indigo-500 resize-none mb-3"
                />
                
                <div className="flex flex-wrap gap-2">
                  <button 
                    onClick={() => {
                      const greatSpellsText = getGreatSpellsText();
                      const dictionaryText = allSpellsData.map(p => `- ${p.name} (${p.type}): ${p.patterns.join(', ')}`).join('\n');

                      const prompt = `Універсальний системний промпт для Hex Casting
Ти — експерт-заклинач у моді Hex Casting для Minecraft. Твоє завдання — генерувати максимально оптимізовані, робочі та елегантні закляття на основі запитів користувача.

СЛОВНИК БАЗОВИХ ГЛІФІВ:
${dictionaryText}${greatSpellsText}

ЗАПИТ КОРИСТУВАЧА: Напиши закляття для: ${aiIntention || '[ваша ідея]'}

ПРАВИЛА НАПИСАННЯ ЗАКЛЯТЬ (ОБОВ'ЯЗКОВО ДО ВИКОНАННЯ):
1. Математична оптимізація: НІКОЛИ не застосовуй багаторазове додавання векторів (наприклад, waaw кілька разів підряд) для обчислення дистанції чи висоти. ЗАВЖДИ використовуй множення (Multiplicative Distillation).
Приклад: Щоб отримати висоту 5 блоків, створи одиничний вектор Y (qqqqqew), напиши число 5 (aqaaq) та перемнож їх (waqaw), після чого додай до стартової координати.

2. Фізика гри (Гравітаційні блоки): Будь-який блок, що має падати (ковадло, сталактит, пісок тощо), не може бути розміщений просто в повітрі. Оптимальний алгоритм:
- Обчисли координату примарного блоку-опори (наприклад, Ціль + 6Y).
- Продублюй її (aadaa) та створи примарний блок (qqa).
- Знову продублюй координату опори (aadaa), створи вектор Y (qqqqqew) і відніми його через Subtractive Distillation (wddw), щоб отримати координату під опорою.
- Встанови атакуючий блок (eeeeede).
- Зламай примарний блок-опору (qaqqqqq).
Це дозволяє уникнути повторних обчислень висоти та використання Jester's Gambit.

3. Числа (Numerical Reflection): Числа створюються за допомогою базового патерну aqaa (для додатних) або dedd (для від'ємних), до якого додаються суфікси: w (+1), q (+5), e (+10), a (*2), d (/2). Наприклад: 5 = aqaaq (0+5), 6 = aqaaqw (0+5+1), 10 = aqaaqq або aqaae, 3 = aqaawww.

4. Оптимізація стека: Дублюй складні обчислення (наприклад, знайдену координату цілі) через Gemini Decomposition (aadaa). Але для базових сутностей (як-от сам гравець - Mind's Reflection qaq) дешевше і простіше викликати гліф повторно, ніж дублювати його і міняти місцями через Jester's Gambit (aawdd). Не ускладнюй стек без потреби.

ОБОВ'ЯЗКОВО використай пошук в інтернеті, щоб знайти правильні патерни (наприклад, Mind's Reflection, Archer's Distillation, Ignite) та їхні точні послідовності кутів (angles), якщо ти їх не знаєш.

ФОРМАТ ВІДПОВІДІ: Відповідай ВИКЛЮЧНО послідовністю патернів (літер), розділених комами і пробілами. Жодних пояснень, привітань, вступних слів чи коментарів. Лише чистий код закляття.`;
                      navigator.clipboard.writeText(prompt);
                      setAlertMessage('Промпт скопійовано! Ви можете вставити його у свій чат з ШІ.');
                    }}
                    className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-medium transition-all flex items-center justify-center gap-2 text-xs"
                  >
                    <Copy size={16} /> Копіювати промпт
                  </button>
                  <button 
                    onClick={handleGenerateAiSpell}
                    disabled={isGeneratingAi || !aiIntention.trim()}
                    className="flex-[2] py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isGeneratingAi ? (
                      <><Sparkles className="animate-spin" size={18} /> Генерую...</>
                    ) : (
                      <><Bot size={18} /> Згенерувати</>
                    )}
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2 mt-2">
                  <button 
                    onClick={handleDownloadDictionary}
                    className="py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-medium transition-all flex items-center justify-center gap-2 text-[10px]"
                  >
                    <FileJson size={14} /> Скачати словник (JSON)
                  </button>
                  <button 
                    onClick={handleCopyNotebookLMPrompt}
                    className="py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-medium transition-all flex items-center justify-center gap-2 text-[10px]"
                  >
                    <Copy size={14} /> Промпт для NotebookLM
                  </button>
                </div>
              </div>

              <div className="border-t border-slate-800 pt-6">
                <h4 className="text-sm font-bold text-slate-300 flex items-center gap-2 mb-2">
                  <Code size={16} className="text-purple-400" /> Або вставте готовий код
                </h4>
                <p className="text-xs text-slate-500 mb-3">
                  Вставте код, згенерований іншим ШІ (наприклад: qaq, wea, aq)
                </p>
                <textarea 
                  value={manualAiCode}
                  onChange={(e) => setManualAiCode(e.target.value)}
                  placeholder="qaq, aa, qaq, wa..."
                  className="w-full h-20 bg-slate-950 border border-slate-700 rounded-xl p-3 text-slate-200 outline-none focus:border-purple-500 resize-none mb-3 font-mono text-sm"
                />
                <button 
                  onClick={handleApplyManualCode}
                  disabled={!manualAiCode.trim()}
                  className="w-full py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Plus size={18} /> Додати гліфи з коду
                </button>
              </div>

              <div className="border-t border-slate-800 pt-6">
                <h4 className="text-sm font-bold text-slate-300 mb-2">
                  Налаштування API
                </h4>
                <p className="text-xs text-slate-500 mb-3">
                  Для генерації заклять використовується Gemini API. Ви можете вказати власний ключ, якщо стандартний ліміт вичерпано. <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-indigo-400 hover:underline">Отримати ключ тут</a>.
                </p>
                <input 
                  type="password"
                  value={userApiKey}
                  onChange={(e) => setUserApiKey(e.target.value)}
                  placeholder="AIzaSy..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2 text-sm text-slate-200 outline-none focus:border-indigo-500"
                />
              </div>
              
              {aiResponse && (
                <div className="p-3 bg-red-900/20 border border-red-900/50 rounded-lg text-red-400 text-sm">
                  {aiResponse}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
