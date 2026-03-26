import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Plus, Trash2, Download, Book, Sparkles, PenTool, XCircle, Check, ArrowLeft, ArrowRight, Minus, ArrowUp, ArrowDown, Upload, Share2, Wand2, Bot, Copy, Undo, RotateCw, Bookmark, Code } from 'lucide-react';
import { HexCanvas } from './components/HexCanvas';
import { HexMiniature } from './components/HexMiniature';
import { generateId, parseHexAngles, recenterPath, pathToHexAngles, rotatePath } from './utils/hexUtils';

export default function Creator() {
  const location = useLocation();
  const navigate = useNavigate();
  const [spells, setSpells] = useState<any[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [showAiModal, setShowAiModal] = useState(false);
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
  const [zoom, setZoom] = useState(window.innerWidth < 768 ? 200 : 100);
  const [startDir, setStartDir] = useState(0); // 0 to 5 for the 6 hex directions

  const getDefaultZoom = () => window.innerWidth < 768 ? 200 : 100;

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
          alert("Не вдалося завантажити закляття з посилання. Можливо, посилання пошкоджене.");
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

  const handleGenerateAiSpell = async () => {
    if (!aiIntention.trim()) return;
    setIsGeneratingAi(true);
    setAiResponse('');
    try {
      const { GoogleGenAI } = await import('@google/genai');
      const apiKey = userApiKey || import.meta.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY || "dummy_key";
      const ai = new GoogleGenAI({ apiKey });
      
      const prompt = `Я граю в гру з магічною системою на гексагональній сітці (Hex Casting). Руни малюються послідовними відрізками. Літери керують напрямком відносно попереднього кроку: w (прямо), e (праворуч 60°), d (праворуч 120°), s (назад), a (ліворуч 120°), q (ліворуч 60°). Стартовий напрямок - Схід. 

Напиши закляття для: ${aiIntention}

ОБОВ'ЯЗКОВО використай пошук в інтернеті, щоб знайти правильні патерни (наприклад, Mind's Reflection, Archer's Distillation, Ignite) та їхні точні послідовності кутів (angles).

Твоя кінцева відповідь має містити ТІЛЬКИ послідовність рун, розділених комою або пробілом. Використовуй лише літери q, w, e, a, s, d. Ніяких інших слів, пояснень чи форматувань.

Приклад ідеальної відповіді: qaq, aa, qaq, wa, weaqa, aaqawawa`;
      
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
          return {
            id: generateId(),
            name: `Гліф ${index + 1} (${patternStr})`,
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
      alert("Не вдалося розпізнати руни у введеному коді. Використовуйте лише літери q, w, e, a, s, d.");
      return;
    }

    const dict = JSON.parse(localStorage.getItem('hex_glyph_dict') || '{}');

    const newPatterns = rawPatterns.map((patternStr, index) => {
      const startDir = dict[patternStr] !== undefined ? dict[patternStr] : 0;
      return {
        id: generateId(),
        name: `Гліф ${index + 1} (${patternStr})`,
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
      const url = `${window.location.origin}${window.location.pathname}?spell=${encoded}`;
      navigator.clipboard.writeText(url);
      alert('Посилання на закляття скопійовано в буфер обміну!');
    } catch (e) {
      console.error("Share error", e);
      alert('Помилка при створенні посилання. Можливо, закляття занадто велике.');
    }
  };

  const handleAddGlyph = () => {
    const newPatterns = isMultiMode ? draftPaths.map(path => ({
      id: generateId(),
      name: '',
      path: path,
      startDir
    })) : [];
    
    if (currentDraftPath.length > 1) {
      newPatterns.push({
        id: generateId(),
        name: '',
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
    alert('Закляття збережено до Гримуару!');
  };

  const handleStartNewSpell = () => {
    setActiveSpell({ id: generateId(), name: '', description: '', patterns: [], createdAt: new Date().toISOString() });
    setCurrentDraftPath([]); 
    setDraftHistory([]);
    setZoom(getDefaultZoom()); 
  };

  const handleRemovePattern = (patternId: string) => {
    setActiveSpell((prev: any) => ({ ...prev, patterns: (prev.patterns || []).filter((p: any) => p.id !== patternId) }));
  };

  const handleUpdatePatternName = (patternId: string, newName: string) => {
    setActiveSpell((prev: any) => ({ ...prev, patterns: (prev.patterns || []).map((p: any) => p.id === patternId ? { ...p, name: newName } : p) }));
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
    <div className="flex flex-col h-full bg-slate-950 text-slate-300">
      <input type="file" accept=".json" ref={fileInputRef} onChange={handleImportJson} className="hidden" />

      <div className="flex flex-col md:flex-row h-full overflow-hidden">
        {/* Ліва панель - Малювання */}
        <div className="flex-1 flex flex-col border-r border-slate-800">
          <div className="p-3 md:p-4 bg-slate-900 border-b border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center shrink-0 gap-3 md:gap-0">
            <h2 className="font-bold text-lg">Малювання гліфу</h2>
            <div className="flex flex-wrap gap-2 w-full md:w-auto">
              <button 
                onClick={() => {
                  setIsMultiMode(!isMultiMode);
                  setDraftPaths([]);
                  setCurrentDraftPath([]);
                  setDraftHistory([]);
                }} 
                className={`flex-1 md:flex-none px-2 py-1.5 md:px-3 md:py-1.5 rounded-lg text-xs md:text-sm font-medium transition-colors ${isMultiMode ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
                title="Перемкнути режим малювання"
              >
                {isMultiMode ? 'Кілька' : 'Один'}
              </button>
              <button 
                onClick={() => setStartDir((startDir + 1) % 6)} 
                className="flex-1 md:flex-none px-2 py-1.5 md:px-3 md:py-1.5 bg-slate-800 rounded-lg text-xs md:text-sm hover:bg-slate-700 transition-colors"
                title="Змінити початковий напрямок"
              >
                Напрямок: {['Схід', 'Пд-Сх', 'Пд-Зх', 'Захід', 'Пн-Зх', 'Пн-Сх'][startDir]}
              </button>
              <button onClick={handleStartNewSpell} className="flex-1 md:flex-none px-2 py-1.5 md:px-3 md:py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs md:text-sm transition-colors">
                Нове
              </button>
              <button onClick={() => setShowAiModal(true)} className="flex-1 md:flex-none px-2 py-1.5 md:px-3 md:py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs md:text-sm transition-colors flex items-center justify-center gap-1">
                <Bot size={14} /> ШІ
              </button>
            </div>
          </div>
          
          {/* Drawn Glyphs Bar */}
          {activeSpell.patterns && activeSpell.patterns.length > 0 && (
            <div className="bg-slate-900/50 border-b border-slate-800 p-2 flex gap-2 overflow-x-auto custom-scrollbar shrink-0">
              {activeSpell.patterns.map((p: any, i: number) => (
                <div key={p.id} className="flex flex-col items-center gap-1 shrink-0">
                  <div className="w-10 h-10 bg-slate-950 rounded border border-slate-800 p-1">
                    <HexMiniature path={p.path} />
                  </div>
                  <span className="text-[10px] text-slate-500">#{i + 1}</span>
                </div>
              ))}
            </div>
          )}

          <div className="flex-1 relative p-4 flex items-center justify-center overflow-hidden bg-slate-950">
            <div className="absolute top-6 right-6 z-10 flex flex-col gap-3">
              <button onClick={handleZoomIn} disabled={zoom >= 300} className="w-10 h-10 bg-slate-800/90 backdrop-blur border border-slate-700 rounded-full flex items-center justify-center text-slate-300 hover:bg-purple-600 hover:text-white shadow-lg active:scale-95 transition-all disabled:opacity-50"><Plus size={20} /></button>
              <div className="text-center text-xs font-mono text-slate-400 bg-slate-900/50 rounded-full py-1">{zoom}%</div>
              <button onClick={handleZoomOut} disabled={zoom <= 50} className="w-10 h-10 bg-slate-800/90 backdrop-blur border border-slate-700 rounded-full flex items-center justify-center text-slate-300 hover:bg-slate-700 hover:text-white shadow-lg active:scale-95 transition-all disabled:opacity-50"><Minus size={20} /></button>
            </div>
            <div className="w-full h-full max-w-[800px] aspect-square relative touch-none">
              <HexCanvas paths={draftPaths} currentPath={currentDraftPath} onChange={handlePathChange} onPathComplete={handlePathComplete} zoom={zoom} />
            </div>
          </div>
          
          <div className="shrink-0 bg-slate-900 border-t border-slate-800 p-3 md:p-4 flex flex-wrap gap-2 md:gap-4 justify-center items-center">
            <button onClick={handleUndo} disabled={currentDraftPath.length === 0 && draftPaths.length === 0 && draftHistory.length === 0} className="flex-1 md:flex-none flex items-center justify-center gap-1 md:gap-2 py-2 px-3 md:px-4 rounded-xl text-sm md:text-base font-medium transition-all bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-50">
              <Undo size={16} className="md:w-[18px] md:h-[18px]" /> Відкотити
            </button>
            <button onClick={handleClearCanvas} disabled={currentDraftPath.length === 0 && draftPaths.length === 0} className="flex-1 md:flex-none flex items-center justify-center gap-1 md:gap-2 py-2 px-3 md:px-4 rounded-xl text-sm md:text-base font-medium transition-all bg-slate-800 hover:bg-slate-700 text-red-400 disabled:opacity-50">
              <Trash2 size={16} className="md:w-[18px] md:h-[18px]" /> Очистити
            </button>
            <button onClick={handleAddGlyph} disabled={currentDraftPath.length === 0 && draftPaths.length === 0} className="w-full md:w-auto flex items-center justify-center gap-2 py-2 px-6 rounded-xl text-sm md:text-base font-bold transition-all bg-purple-600 hover:bg-purple-500 text-white disabled:opacity-50 shadow-[0_0_15px_rgba(168,85,247,0.4)]">
              <Plus size={18} /> {isMultiMode ? 'Додати гліфи' : 'Додати гліф'}
            </button>
          </div>
        </div>

        {/* Права панель - Деталі закляття */}
        <div className="w-full md:w-[400px] lg:w-[500px] flex flex-col bg-slate-900 overflow-y-auto custom-scrollbar">
          <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="font-bold text-xl text-purple-300">Поточне закляття</h2>
              <div className="flex gap-2">
                <button onClick={() => fileInputRef.current?.click()} className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 transition-colors" title="Імпортувати">
                  <Upload size={18} />
                </button>
                <button onClick={() => handleDownloadSpell(activeSpell)} className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 transition-colors" title="Експортувати">
                  <Download size={18} />
                </button>
                <button onClick={handleShareSpell} className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 transition-colors" title="Поділитися посиланням">
                  <Share2 size={18} />
                </button>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-purple-400 mb-1.5 uppercase tracking-wider">Назва</label>
                <input type="text" value={activeSpell.name} onChange={(e) => setActiveSpell({ ...activeSpell, name: e.target.value })} placeholder="Введіть назву..." className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-lg font-bold text-white outline-none focus:border-purple-500 transition-colors" />
              </div>
              <div>
                <label className="block text-xs font-bold text-purple-400 mb-1.5 uppercase tracking-wider">Опис</label>
                <textarea value={activeSpell.description} onChange={(e) => setActiveSpell({ ...activeSpell, description: e.target.value })} placeholder="Що робить закляття?" className="w-full h-24 bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-300 outline-none focus:border-purple-500 resize-y transition-colors" />
              </div>
              <div>
                <label className="block text-xs font-bold text-purple-400 mb-1.5 uppercase tracking-wider">URL зображення</label>
                <input type="text" value={activeSpell.imageUrl || ''} onChange={(e) => setActiveSpell({ ...activeSpell, imageUrl: e.target.value })} placeholder="https://..." className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-purple-500 transition-colors" />
              </div>
              <div>
                <label className="block text-xs font-bold text-purple-400 mb-1.5 uppercase tracking-wider">URL відео (YouTube)</label>
                <input type="text" value={activeSpell.videoUrl || ''} onChange={(e) => setActiveSpell({ ...activeSpell, videoUrl: e.target.value })} placeholder="https://youtube.com/..." className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-purple-500 transition-colors" />
              </div>
            </div>

            <div>
               <label className="text-xs font-bold text-purple-400 mb-3 uppercase tracking-wider block">Гліфи ({(activeSpell.patterns || []).length})</label>
               <div className="grid grid-cols-1 gap-3">
                  {(activeSpell.patterns || []).length === 0 && (
                    <div className="text-center py-8 text-slate-500 bg-slate-950/50 rounded-xl border border-slate-800 border-dashed">
                      Намалюйте гліф та натисніть "Додати гліф"
                    </div>
                  )}
                  {(activeSpell.patterns || []).map((p: any, i: number) => (
                    <div key={p.id} className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center gap-3">
                      <div className="flex flex-col gap-1 shrink-0">
                        <button onClick={() => handleMovePattern(i, -1)} disabled={i === 0} className="p-1 text-slate-500 hover:text-purple-400 disabled:opacity-20 transition-colors bg-slate-900 rounded"><ArrowUp size={14} /></button>
                        <button onClick={() => handleMovePattern(i, 1)} disabled={i === activeSpell.patterns.length - 1} className="p-1 text-slate-500 hover:text-purple-400 disabled:opacity-20 transition-colors bg-slate-900 rounded"><ArrowDown size={14} /></button>
                      </div>
                      <div className="w-12 h-12 bg-slate-900 rounded border border-slate-800 shrink-0 p-1"><HexMiniature path={p.path} /></div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-slate-500 block">Гліф #{i + 1}</span>
                          <span className="text-[10px] font-mono text-purple-400/60 bg-slate-900 px-1.5 py-0.5 rounded tracking-widest truncate max-w-[100px] ml-2" title={pathToHexAngles(p.path).angles}>
                            {pathToHexAngles(p.path).angles || 'пряма'}
                          </span>
                        </div>
                        <input type="text" value={p.name} onChange={(e) => handleUpdatePatternName(p.id, e.target.value)} placeholder="Назва патерну" className="w-full bg-transparent border-b border-slate-800 py-1 text-sm text-slate-200 outline-none focus:border-purple-500 truncate" />
                      </div>
                      <div className="flex flex-col gap-1 shrink-0">
                        <button 
                          onClick={() => handleSaveTemplate(p.path, p.id)} 
                          className={`p-1.5 rounded-lg transition-colors ${savedTemplates[p.id] ? 'text-green-400 bg-green-900/20' : 'text-slate-500 hover:text-yellow-400 hover:bg-slate-900'}`} 
                          title={savedTemplates[p.id] ? "Збережено!" : "Зберегти як шаблон пози"}
                        >
                          {savedTemplates[p.id] ? <Check size={16} /> : <Bookmark size={16} />}
                        </button>
                        <button onClick={() => handleRotatePattern(p.id)} className="p-1.5 text-slate-500 hover:text-indigo-400 hover:bg-slate-900 rounded-lg transition-colors" title="Повернути">
                          <RotateCw size={16} />
                        </button>
                        <button onClick={() => handleRemovePattern(p.id)} className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-slate-900 rounded-lg transition-colors" title="Видалити">
                          <XCircle size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
               </div>
            </div>

            <button onClick={handleSaveToGrimoire} className="w-full flex justify-center items-center gap-2 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-bold shadow-[0_0_15px_rgba(168,85,247,0.3)] transition-all active:scale-95">
              <Check size={20} /> Зберегти до Гримуару
            </button>
          </div>
        </div>
      </div>

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
                
                <div className="flex gap-2">
                  <button 
                    onClick={() => {
                      const prompt = `Я граю в гру з магічною системою на гексагональній сітці (Hex Casting). Руни малюються послідовними відрізками. Літери керують напрямком відносно попереднього кроку: w (прямо), e (праворуч 60°), d (праворуч 120°), s (назад), a (ліворуч 120°), q (ліворуч 60°). Стартовий напрямок - Схід.\n\nНапиши закляття для: ${aiIntention || '[ваша ідея]'}\n\nОБОВ'ЯЗКОВО використай пошук в інтернеті, щоб знайти правильні патерни (наприклад, Mind's Reflection, Archer's Distillation, Ignite) та їхні точні послідовності кутів (angles).\n\nТвоя кінцева відповідь має містити ТІЛЬКИ послідовність рун, розділених комою або пробілом. Використовуй лише літери q, w, e, a, s, d. Ніяких інших слів, пояснень чи форматувань.\n\nПриклад ідеальної відповіді: qaq, aa, qaq, wa, weaqa, aaqawawa`;
                      navigator.clipboard.writeText(prompt);
                      alert('Промпт скопійовано! Ви можете вставити його у свій чат з ШІ.');
                    }}
                    className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-medium transition-all flex items-center justify-center gap-2 text-sm"
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
