import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Book, Sparkles, Upload, Download, Trash2, Share2, Plus, Image as ImageIcon, Video, Link as LinkIcon, Play, X, ChevronRight, ChevronLeft, ArrowLeft, Edit, AlertTriangle, RefreshCw, Globe, Copy } from 'lucide-react';
import { HexMiniature } from './components/HexMiniature';
import { AnimatedHex } from './components/AnimatedHex';
import { generateId, pathToHexAngles, parseNumericalReflection, parseHexAngles } from './utils/hexUtils';

export default function BookView() {
  const navigate = useNavigate();
  const [spells, setSpells] = useState<any[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [activeSpell, setActiveSpell] = useState<any>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentGlyphIndex, setCurrentGlyphIndex] = useState(0);
  const [animationKey, setAnimationKey] = useState(0);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [spellToDelete, setSpellToDelete] = useState<string | null>(null);
  const [deleteCountdown, setDeleteCountdown] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (spellToDelete && deleteCountdown > 0) {
      timer = setTimeout(() => {
        setDeleteCountdown(prev => prev - 1);
      }, 1000);
    }
    return () => clearTimeout(timer);
  }, [spellToDelete, deleteCountdown]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isPlaying && activeSpell?.patterns) {
        if (e.key === 'Enter' || e.key === 'ArrowRight' || e.key === ' ') {
          e.preventDefault();
          setCurrentGlyphIndex(prev => Math.min(prev + 1, activeSpell.patterns.length - 1));
        } else if (e.key === 'ArrowLeft') {
          e.preventDefault();
          setCurrentGlyphIndex(prev => Math.max(prev - 1, 0));
        } else if (e.key === 'Escape') {
          setIsPlaying(false);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, activeSpell]);

  const handlePlayerClick = (e: React.MouseEvent) => {
    // Ignore clicks on buttons
    if ((e.target as HTMLElement).closest('button')) return;
    
    const clickX = e.clientX;
    const screenWidth = window.innerWidth;
    if (clickX > screenWidth / 2) {
      setCurrentGlyphIndex(prev => Math.min(prev + 1, activeSpell.patterns.length - 1));
    } else {
      setCurrentGlyphIndex(prev => Math.max(prev - 1, 0));
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.touches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartX - touchEndX;
    
    // Swipe left (next)
    if (diff > 50) {
      setCurrentGlyphIndex(prev => Math.min(prev + 1, activeSpell.patterns.length - 1));
    } 
    // Swipe right (prev)
    else if (diff < -50) {
      setCurrentGlyphIndex(prev => Math.max(prev - 1, 0));
    }
    setTouchStartX(null);
  };

  useEffect(() => {
    const saved = localStorage.getItem('hex_casting_grimoire');
    if (saved) {
      try { 
        setSpells(JSON.parse(saved)); 
      } catch (e) { console.error("Помилка читання localStorage", e); }
    }
    
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem('hex_casting_grimoire', JSON.stringify(spells));
    }
  }, [spells, isLoaded]);

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
          setSpells(prev => [newSpell, ...prev]);
          alert(`Імпортовано: ${newSpell.name || 'Безіменне закляття'}`);
        } else alert('Невірний формат файлу. Потрібен JSON закляття або гримуару.');
      } catch (err) { console.error(err); alert('Помилка читання JSON файлу!'); }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleDeleteSpell = (id: string, e: any) => {
    e.stopPropagation();
    setSpellToDelete(id);
    setDeleteCountdown(3); // 3 seconds countdown
  };

  const confirmDeleteSpell = () => {
    if (spellToDelete) {
      setSpells(spells.filter(s => s.id !== spellToDelete));
      if (activeSpell?.id === spellToDelete) setActiveSpell(null);
      setSpellToDelete(null);
    }
  };

  const cancelDeleteSpell = () => {
    setSpellToDelete(null);
    setDeleteCountdown(0);
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

  const handleDownloadGrimoire = () => {
    downloadJsonStr(spells, 'my_grimoire.json');
  };

  const handleDownloadSingleSpell = () => {
    if (!activeSpell) return;
    const filename = activeSpell.name ? `${activeSpell.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.json` : 'spell.json';
    downloadJsonStr(activeSpell, filename);
  };

  const handleShareSpell = () => {
    if (!activeSpell) return;
    try {
      const spellString = JSON.stringify(activeSpell);
      const encoded = btoa(encodeURIComponent(spellString));
      const url = `${window.location.origin}${window.location.pathname}#/?spell=${encoded}`;
      navigator.clipboard.writeText(url);
      alert('Посилання на закляття скопійовано в буфер обміну!');
    } catch (e) {
      console.error("Share error", e);
      alert('Помилка при створенні посилання. Можливо, закляття занадто велике.');
    }
  };

  const handleCopyPrompt = () => {
    if (!activeSpell) return;
    
    let promptText = `Назва закляття: ${activeSpell.name}\n`;
    if (activeSpell.description) {
      promptText += `Опис: ${activeSpell.description}\n\n`;
    }
    
    promptText += `Гліфи:\n`;
    (activeSpell.patterns || []).forEach((p: any, i: number) => {
      const { angles } = pathToHexAngles(p.path);
      const isNumber = angles.startsWith('aqaa') || angles.startsWith('dedd');
      const numberVal = isNumber ? parseNumericalReflection(angles) : null;
      
      promptText += `${i + 1}. ${p.name || (isNumber ? `Число: ${numberVal}` : 'Без назви')}\n`;
      if (p.description) promptText += `   Опис: ${p.description}\n`;
      promptText += `   Кути: ${angles || 'Початковий вузол'}\n\n`;
    });
    
    navigator.clipboard.writeText(promptText);
    alert('Промпт закляття скопійовано в буфер обміну!');
  };

  return (
    <div className="flex h-full bg-slate-950 text-slate-300">
      <input type="file" accept=".json" ref={fileInputRef} onChange={handleImportJson} className="hidden" />

      {/* Ліва панель - Список заклять */}
      <div className={`${activeSpell ? 'hidden md:flex' : 'flex'} w-full md:w-1/3 border-r border-slate-800 flex-col bg-slate-900`}>
        <div className="p-4 border-b border-slate-800 flex justify-between items-center shrink-0">
          <h1 className="text-xl font-bold text-purple-300 flex items-center gap-2">
            <Book size={24} /> Гримуар
          </h1>
          <div className="flex gap-2">
            <button onClick={() => fileInputRef.current?.click()} className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 transition-colors" title="Імпортувати">
              <Upload size={18} />
            </button>
            <button onClick={handleDownloadGrimoire} disabled={spells.length === 0} className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 transition-colors disabled:opacity-50" title="Експортувати всі">
              <Download size={18} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
          {/* Власні закляття */}
          <div className="space-y-3">
            <h2 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-2">Мої закляття</h2>
            {spells.length === 0 ? (
              <div className="text-center py-6 text-slate-600 border border-dashed border-slate-800 rounded-xl">
                <p className="text-xs">Порожньо</p>
              </div>
            ) : (
              spells.map(spell => (
                <div 
                  key={spell.id} 
                  onClick={() => setActiveSpell(spell)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${activeSpell?.id === spell.id ? 'bg-purple-900/20 border-purple-500/50' : 'bg-slate-950 border-slate-800 hover:border-slate-700'}`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-slate-100 truncate pr-4">{spell.name}</h3>
                    <button onClick={(e) => handleDeleteSpell(spell.id, e)} className="text-slate-600 hover:text-red-400 p-1 rounded transition-colors" title="Видалити">
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <p className="text-xs text-slate-500 line-clamp-2 mb-3">{spell.description || 'Немає опису'}</p>
                  <div className="flex gap-1 overflow-hidden">
                    {(spell.patterns || []).slice(0, 4).map((p: any, i: number) => {
                      const path = typeof p === 'string' ? parseHexAngles(p) : p.path;
                      return (
                        <div key={typeof p === 'string' ? `${i}-${p}` : p.id} className="w-8 h-8 bg-slate-900 rounded border border-slate-800 p-0.5">
                          <HexMiniature path={path} fade={true} />
                        </div>
                      );
                    })}
                    {(spell.patterns || []).length > 4 && (
                      <div className="w-8 h-8 flex items-center justify-center bg-slate-900 rounded border border-slate-800 text-[10px] text-slate-500 font-bold">
                        +{(spell.patterns || []).length - 4}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Права панель - Перегляд закляття */}
      <div className={`${!activeSpell ? 'hidden md:block' : 'block'} flex-1 bg-slate-950 overflow-y-auto custom-scrollbar`}>
        {activeSpell ? (
          <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-6 md:space-y-8 pb-20">
            <div className="flex flex-col md:flex-row justify-between items-start gap-4">
              <div className="flex items-start gap-3">
                <button 
                  onClick={() => setActiveSpell(null)} 
                  className="md:hidden mt-1 p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 transition-colors shrink-0"
                >
                  <ArrowLeft size={20} />
                </button>
                <div>
                  <h2 className="text-3xl md:text-4xl font-bold text-white mb-2 md:mb-4">{activeSpell.name}</h2>
                  <p className="text-slate-400 text-base md:text-lg whitespace-pre-wrap">{activeSpell.description || 'Опис відсутній.'}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button 
                  onClick={handleDownloadSingleSpell}
                  className="flex items-center justify-center w-12 h-12 bg-slate-800 hover:bg-slate-700 text-white rounded-xl transition-all"
                  title="Скачати закляття (JSON)"
                >
                  <Download size={20} />
                </button>
                <button 
                  onClick={handleCopyPrompt}
                  className="flex items-center justify-center w-12 h-12 bg-slate-800 hover:bg-slate-700 text-white rounded-xl transition-all"
                  title="Копіювати промпт закляття"
                >
                  <Copy size={20} />
                </button>
                <button 
                  onClick={handleShareSpell}
                  className="flex items-center justify-center w-12 h-12 bg-slate-800 hover:bg-slate-700 text-white rounded-xl transition-all"
                  title="Поділитися посиланням"
                >
                  <Share2 size={20} />
                </button>
                <button 
                  onClick={() => navigate('/', { state: { editSpell: activeSpell } })}
                  className="flex items-center gap-2 px-4 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold transition-all"
                >
                  <Edit size={20} /> Редагувати
                </button>
                <button 
                  onClick={() => { setIsPlaying(true); setCurrentGlyphIndex(0); }}
                  disabled={!activeSpell.patterns || activeSpell.patterns.length === 0}
                  className="flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-bold transition-all shadow-[0_0_15px_rgba(168,85,247,0.4)] disabled:opacity-50"
                >
                  <Play size={20} /> Відтворити
                </button>
              </div>
            </div>

            <div className="space-y-6">
              <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                <h3 className="text-xl font-bold text-purple-400">Послідовність гліфів ({activeSpell.patterns?.length || 0})</h3>
                <span className="text-xs text-slate-500">Подвійний клік для перегляду анімації</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {(activeSpell.patterns || []).map((p: any, i: number) => {
                  const isString = typeof p === 'string';
                  const path = isString ? parseHexAngles(p) : p.path;
                  const angles = isString ? p : pathToHexAngles(p.path).angles;
                  const name = isString ? '' : p.name;

                  return (
                  <div 
                    key={isString ? `${i}-${p}` : p.id} 
                    onDoubleClick={() => { setIsPlaying(true); setCurrentGlyphIndex(i); }}
                    className="bg-slate-900 p-3 rounded-2xl border border-slate-800 flex flex-col items-center gap-2 hover:border-purple-500/50 transition-all cursor-pointer group hover:bg-slate-800/50"
                    title="Подвійний клік для перегляду"
                  >
                      <div className="w-full aspect-square bg-slate-950 rounded-xl border border-slate-800 p-2 group-hover:bg-slate-950 transition-colors">
                        <HexMiniature path={path} fade={true} />
                      </div>
                      <div className="text-center w-full">
                        <div className="text-[10px] text-slate-500">#{i + 1}</div>
                        <div className="text-xs font-bold text-slate-300 truncate w-full">{name || (angles.startsWith('aqaa') || angles.startsWith('dedd') ? `Число: ${parseNumericalReflection(angles)}` : 'Без назви')}</div>
                        <div className="text-[10px] font-mono text-purple-400/70 mt-1 truncate w-full" title={angles || 'Початковий вузол'}>
                          {angles || 'Початковий вузол'}
                        </div>
                        {(angles.startsWith('aqaa') || angles.startsWith('dedd')) && (
                          <div className="text-[10px] font-bold text-orange-400 bg-orange-900/30 border border-orange-500/30 px-1.5 py-0.5 rounded mt-1 inline-block">
                            {parseNumericalReflection(angles)}
                          </div>
                        )}
                      </div>
                    </div>
                  )})}
                </div>
              </div>
          </div>
        ) : (
          <div className="h-full hidden md:flex flex-col items-center justify-center text-slate-500">
            <Book size={64} className="mb-4 opacity-20 text-purple-500" />
            <h2 className="text-2xl font-medium">Оберіть закляття</h2>
            <p className="text-sm mt-2">Натисніть на закляття ліворуч, щоб переглянути його деталі.</p>
          </div>
        )}
      </div>

      {/* Режим відтворення (Плеєр) */}
      {isPlaying && activeSpell && (
        <div 
          className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-sm flex flex-col items-center justify-center select-none"
          onClick={handlePlayerClick}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <button 
            onClick={(e) => { e.stopPropagation(); setIsPlaying(false); }}
            className="absolute top-6 right-6 p-2 text-slate-400 hover:text-white bg-slate-900 rounded-full transition-colors z-10"
          >
            <X size={24} />
          </button>

          <div className="text-center mb-8 z-10 pointer-events-none">
            <h2 className="text-3xl font-bold text-white mb-2">{activeSpell.name}</h2>
            <p className="text-purple-400">
              Гліф {currentGlyphIndex + 1} з {activeSpell.patterns.length}
            </p>
          </div>

          <div className="w-[90vw] max-w-[500px] aspect-square bg-slate-900 rounded-3xl border border-slate-800 p-4 md:p-8 shadow-2xl relative flex items-center justify-center z-10 pointer-events-none">
            {/* Key is used to force re-render and restart animation when index changes */}
            <AnimatedHex 
              key={`${activeSpell.id}-${currentGlyphIndex}-${animationKey}`} 
              path={activeSpell.patterns[currentGlyphIndex]?.path || []} 
            />
          </div>

          <div className="mt-8 text-center z-10 pointer-events-none">
            <h3 className="text-xl font-bold text-slate-200 mb-2">
              {activeSpell.patterns[currentGlyphIndex]?.name || `Гліф #${currentGlyphIndex + 1}`}
            </h3>
            
            <div className="flex items-center gap-4 justify-center pointer-events-auto mb-6">
              <button 
                onClick={(e) => { e.stopPropagation(); setAnimationKey(prev => prev + 1); }}
                className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-all border border-slate-700"
              >
                <RefreshCw size={14} /> Повторити анімацію
              </button>
            </div>

            <p className="text-slate-500 text-sm mb-8 hidden md:block">Натисніть Enter, пробіл або клікніть по краях екрану</p>
            <p className="text-slate-500 text-sm mb-8 md:hidden">Свайпніть або тапніть по краях екрану</p>
            
            <div className="flex items-center gap-4 justify-center pointer-events-auto">
              <button 
                onClick={(e) => { e.stopPropagation(); setCurrentGlyphIndex(prev => Math.max(prev - 1, 0)); }}
                disabled={currentGlyphIndex === 0}
                className="p-3 bg-slate-800 hover:bg-slate-700 text-white rounded-full transition-colors disabled:opacity-30"
              >
                <ChevronLeft size={24} />
              </button>
              
              <div className="flex gap-3 pointer-events-auto py-2">
                {activeSpell.patterns.map((_: any, idx: number) => (
                  <button 
                    key={idx} 
                    type="button"
                    onClick={(e) => { 
                      e.stopPropagation(); 
                      setCurrentGlyphIndex(idx); 
                    }}
                    className={`w-3 h-3 rounded-full transition-all hover:bg-purple-400 cursor-pointer ${idx === currentGlyphIndex ? 'bg-purple-500 scale-125 ring-2 ring-purple-500/30 ring-offset-2 ring-offset-slate-950' : 'bg-slate-700'}`}
                    title={`Перейти до гліфа ${idx + 1}`}
                  />
                ))}
              </div>

              <button 
                onClick={(e) => { e.stopPropagation(); setCurrentGlyphIndex(prev => Math.min(prev + 1, activeSpell.patterns.length - 1)); }}
                disabled={currentGlyphIndex === activeSpell.patterns.length - 1}
                className="p-3 bg-slate-800 hover:bg-slate-700 text-white rounded-full transition-colors disabled:opacity-30"
              >
                <ChevronRight size={24} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {spellToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl max-w-sm w-full shadow-2xl flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-4">
              <AlertTriangle size={32} className="text-red-500" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Видалити закляття?</h3>
            <p className="text-slate-400 mb-6">Цю дію неможливо скасувати. Ви дійсно бажаєте видалити це закляття з Гримуару?</p>
            <div className="flex gap-3 w-full">
              <button 
                onClick={cancelDeleteSpell}
                className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-medium transition-colors"
              >
                Скасувати
              </button>
              <button 
                onClick={confirmDeleteSpell}
                disabled={deleteCountdown > 0}
                className="flex-1 py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {deleteCountdown > 0 ? `Зачекайте (${deleteCountdown})` : 'Видалити'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
