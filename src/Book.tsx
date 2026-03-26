import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Book, Sparkles, Upload, Download, Trash2, Share2, Plus, Image as ImageIcon, Video, Link as LinkIcon, Play, X, ChevronRight, ChevronLeft, ArrowLeft, Edit, AlertTriangle } from 'lucide-react';
import { HexMiniature } from './components/HexMiniature';
import { AnimatedHex } from './components/AnimatedHex';
import { generateId } from './utils/hexUtils';

export default function BookView() {
  const navigate = useNavigate();
  const [spells, setSpells] = useState<any[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [activeSpell, setActiveSpell] = useState<any>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentGlyphIndex, setCurrentGlyphIndex] = useState(0);
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
    if (isLoaded) localStorage.setItem('hex_casting_grimoire', JSON.stringify(spells));
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

        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
          {spells.length === 0 ? (
            <div className="text-center py-10 text-slate-500">
              <Sparkles size={48} className="mx-auto mb-4 opacity-20 text-purple-500" />
              <p>Гримуар порожній.</p>
              <p className="text-sm mt-2">Імпортуйте закляття або створіть нове у Створювачі.</p>
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
                  {(spell.patterns || []).slice(0, 4).map((p: any) => (
                    <div key={p.id} className="w-8 h-8 bg-slate-900 rounded border border-slate-800 p-0.5">
                      <HexMiniature path={p.path} fade={true} />
                    </div>
                  ))}
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
              <div className="flex gap-2">
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

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Гліфи */}
              <div className="space-y-4">
                <h3 className="text-xl font-bold text-purple-400 border-b border-slate-800 pb-2">Гліфи ({activeSpell.patterns?.length || 0})</h3>
                <div className="space-y-4">
                  {(activeSpell.patterns || []).map((p: any, i: number) => (
                    <div key={p.id} className="bg-slate-900 p-4 rounded-2xl border border-slate-800 flex gap-4 items-center">
                      <div className="w-24 h-24 bg-slate-950 rounded-xl border border-slate-800 p-2 shrink-0">
                        <HexMiniature path={p.path} fade={true} />
                      </div>
                      <div>
                        <div className="text-sm text-slate-500 mb-1">Гліф #{i + 1}</div>
                        <div className="font-bold text-slate-200 mb-2">{p.name || 'Без назви'}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Медіа */}
              {(activeSpell.imageUrl || activeSpell.videoUrl) && (
                <div className="space-y-6">
                  <h3 className="text-xl font-bold text-purple-400 border-b border-slate-800 pb-2">Медіа</h3>
                  
                  {/* Зображення */}
                  {activeSpell.imageUrl && (
                    <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 space-y-4">
                      <div className="flex items-center gap-2 text-slate-300 font-medium">
                        <ImageIcon size={18} /> Зображення
                      </div>
                      <div className="relative group rounded-xl overflow-hidden border border-slate-700">
                        <img src={activeSpell.imageUrl} alt="Spell" className="w-full h-auto object-cover" />
                      </div>
                    </div>
                  )}

                  {/* Відео */}
                  {activeSpell.videoUrl && (
                    <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 space-y-4">
                      <div className="flex items-center gap-2 text-slate-300 font-medium">
                        <Video size={18} /> Відео
                      </div>
                      <div className="space-y-2">
                        <div className="aspect-video rounded-xl overflow-hidden border border-slate-700 bg-black">
                          <iframe 
                            src={activeSpell.videoUrl.replace('watch?v=', 'embed/')} 
                            className="w-full h-full" 
                            allowFullScreen 
                            title="Spell Video"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
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
              key={`${activeSpell.id}-${currentGlyphIndex}`} 
              path={activeSpell.patterns[currentGlyphIndex]?.path || []} 
            />
          </div>

          <div className="mt-8 text-center z-10 pointer-events-none">
            <h3 className="text-xl font-bold text-slate-200 mb-2">
              {activeSpell.patterns[currentGlyphIndex]?.name || `Гліф #${currentGlyphIndex + 1}`}
            </h3>
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
              
              <div className="flex gap-2">
                {activeSpell.patterns.map((_: any, idx: number) => (
                  <div 
                    key={idx} 
                    className={`w-2.5 h-2.5 rounded-full transition-all ${idx === currentGlyphIndex ? 'bg-purple-500 scale-125' : 'bg-slate-700'}`}
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
