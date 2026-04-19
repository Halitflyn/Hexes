import React, { useState, useEffect, useMemo } from 'react';
import { Globe, RefreshCw, Trash2, Plus, ArrowLeft, Search, BookOpen, Share2, ExternalLink, Clock, X, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { HexMiniature } from './components/HexMiniature';
import { generateId, pathToHexAngles, parseNumericalReflection, parseHexAngles } from './utils/hexUtils';
import standardSpells from './constants/hex_spells.json';

export default function LibraryView() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [externalLibraries, setExternalLibraries] = useState<any[]>([]);
  const [activeSpell, setActiveSpell] = useState<any | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'standard' | 'external'>('standard');
  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  
  // UI States for adding library
  const [showAddForm, setShowAddForm] = useState(false);
  const [newLibUrl, setNewLibUrl] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // UI States for auto-add confirmation
  const [pendingAutoAdd, setPendingAutoAdd] = useState<string | null>(null);

  useEffect(() => {
    const savedLibs = localStorage.getItem('hex_casting_external_libs');
    if (savedLibs) {
      try {
        setExternalLibraries(JSON.parse(savedLibs));
      } catch (e) { console.error("Помилка читання зовнішніх бібліотек", e); }
    }

    // Check for URL in query params
    const urlFromQuery = searchParams.get('url');
    if (urlFromQuery) {
      // Check if already exists
      const saved = localStorage.getItem('hex_casting_external_libs');
      const libs = saved ? JSON.parse(saved) : [];
      if (!libs.some((l: any) => l.url === urlFromQuery)) {
        setPendingAutoAdd(urlFromQuery);
      } else {
        setActiveTab('external');
      }
      
      // Clear the param after processing
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('url');
      setSearchParams(newParams);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('hex_casting_external_libs', JSON.stringify(externalLibraries));
  }, [externalLibraries]);

  const performAddLibrary = async (url: string, customName?: string) => {
    setIsAdding(true);
    setError(null);
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error('Не вдалося завантажити файл. Перевірте URL.');
      const data = await response.json();
      
      const spells = Array.isArray(data) ? data : (data.spells || []);
      if (spells.length === 0 && !data.name) {
        throw new Error('Файл не містить заклять або має невірний формат.');
      }

      const name = customName || data.name || 'Зовнішня бібліотека';
      
      const newLib = {
        id: generateId(),
        name,
        url,
        spells,
        lastUpdated: new Date().toISOString()
      };
      
      setExternalLibraries(prev => [...prev, newLib]);
      setActiveTab('external');
      setSuccess(`Бібліотеку "${name}" успішно додано!`);
      setShowAddForm(false);
      setNewLibUrl('');
      
      setTimeout(() => setSuccess(null), 3000);
      return true;
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Помилка завантаження. Перевірте CORS та формат JSON.');
      return false;
    } finally {
      setIsAdding(false);
    }
  };

  const handleUpdateLibrary = async (libId: string) => {
    const lib = externalLibraries.find(l => l.id === libId);
    if (!lib) return;
    
    setIsUpdating(libId);
    try {
      const response = await fetch(lib.url);
      if (!response.ok) throw new Error('Update failed');
      const data = await response.json();
      const spells = Array.isArray(data) ? data : (data.spells || []);
      
      setExternalLibraries(prev => prev.map(l => l.id === libId ? { 
        ...l, 
        spells, 
        lastUpdated: new Date().toISOString() 
      } : l));
      setSuccess(`Бібліотеку "${lib.name}" оновлено!`);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error(err);
      setError('Помилка оновлення бібліотеки.');
      setTimeout(() => setError(null), 3000);
    } finally {
      setIsUpdating(null);
    }
  };

  const handleRemoveLibrary = (libId: string) => {
    setExternalLibraries(prev => prev.filter(l => l.id !== libId));
    if (activeSpell && activeSpell.id.startsWith(libId)) {
      setActiveSpell(null);
    }
  };

  const handleShareLibrary = (lib: any) => {
    const shareUrl = `${window.location.origin}${window.location.pathname}#/library?addLib=${encodeURIComponent(lib.url)}`;
    navigator.clipboard.writeText(shareUrl);
    setSuccess('Посилання для додавання скопійовано!');
    setTimeout(() => setSuccess(null), 3000);
  };

  const filteredStandardSpells = useMemo(() => {
    if (!searchQuery) return standardSpells;
    const query = searchQuery.toLowerCase();
    return standardSpells.filter(s => 
      s.name.toLowerCase().includes(query) || 
      (s.description && s.description.toLowerCase().includes(query)) ||
      (s.patterns && s.patterns.some(p => p.toLowerCase().includes(query)))
    );
  }, [searchQuery]);

  const filteredExternalSpells = useMemo(() => {
    return externalLibraries.map(lib => ({
      ...lib,
      spells: searchQuery 
        ? lib.spells.filter((s: any) => 
            s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
            (s.description && s.description.toLowerCase().includes(searchQuery.toLowerCase()))
          )
        : lib.spells
    })).filter(lib => lib.spells.length > 0);
  }, [externalLibraries, searchQuery]);

  const formatDate = (isoString: string) => {
    if (!isoString) return 'Ніколи';
    const date = new Date(isoString);
    return date.toLocaleString('uk-UA', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="flex h-full bg-slate-950 text-slate-300 relative">
      {/* Notifications */}
      <div className="fixed top-20 right-4 z-[100] space-y-2 pointer-events-none">
        {error && (
          <div className="bg-red-900/90 border border-red-500 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-right">
            <AlertCircle size={20} className="shrink-0" />
            <span className="text-sm font-medium">{error}</span>
            <button onClick={() => setError(null)} className="pointer-events-auto ml-2 hover:bg-white/10 rounded-full p-1">
              <X size={14} />
            </button>
          </div>
        )}
        {success && (
          <div className="bg-green-900/90 border border-green-500 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-right">
            <CheckCircle2 size={20} className="shrink-0" />
            <span className="text-sm font-medium">{success}</span>
            <button onClick={() => setSuccess(null)} className="pointer-events-auto ml-2 hover:bg-white/10 rounded-full p-1">
              <X size={14} />
            </button>
          </div>
        )}
      </div>

      {/* Ліва панель - Список бібліотек */}
      <div className={`${activeSpell ? 'hidden md:flex' : 'flex'} w-full md:w-1/3 border-r border-slate-800 flex-col bg-slate-900`}>
        <div className="p-4 border-b border-slate-800 shrink-0 space-y-4">
          <div className="flex justify-between items-center">
            <h1 className="text-xl font-bold text-purple-300 flex items-center gap-2">
              <Globe size={24} /> Бібліотека
            </h1>
            <button 
              onClick={() => {
                setShowAddForm(!showAddForm);
                setActiveTab('external');
                setError(null);
              }} 
              className={`p-2 rounded-lg transition-colors ${showAddForm ? 'bg-purple-600 text-white' : 'bg-slate-800 hover:bg-slate-700 text-purple-400'}`} 
              title="Додати бібліотеку за посиланням"
            >
              <Plus size={18} />
            </button>
          </div>

          {showAddForm && (
            <div className="bg-slate-950 p-4 rounded-xl border border-purple-500/30 space-y-3 animate-in fade-in slide-in-from-top-2">
              <div className="text-xs font-bold text-purple-400 uppercase tracking-wider">Додати нову книгу</div>
              <input 
                type="text" 
                placeholder="Вставте URL до JSON файлу..." 
                value={newLibUrl}
                onChange={(e) => setNewLibUrl(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-purple-500"
              />
              <div className="flex gap-2">
                <button 
                  onClick={() => setShowAddForm(false)}
                  className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-bold transition-colors"
                >
                  Скасувати
                </button>
                <button 
                  onClick={() => performAddLibrary(newLibUrl)}
                  disabled={isAdding || !newLibUrl}
                  className="flex-1 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isAdding ? <RefreshCw size={14} className="animate-spin" /> : <Plus size={14} />}
                  Додати
                </button>
              </div>
            </div>
          )}

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
            <input 
              type="text" 
              placeholder="Пошук гліфів..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-purple-500 transition-colors"
            />
          </div>

          <div className="flex p-1 bg-slate-950 rounded-xl border border-slate-800">
            <button 
              onClick={() => setActiveTab('standard')}
              className={`flex-1 flex items-center justify-center gap-2 py-1.5 text-xs font-bold rounded-lg transition-all ${activeTab === 'standard' ? 'bg-purple-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}
            >
              <BookOpen size={14} /> Стандартна
            </button>
            <button 
              onClick={() => setActiveTab('external')}
              className={`flex-1 flex items-center justify-center gap-2 py-1.5 text-xs font-bold rounded-lg transition-all ${activeTab === 'external' ? 'bg-purple-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}
            >
              <Globe size={14} /> Зовнішні
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
          {activeTab === 'standard' ? (
            <div className="space-y-3">
              <h2 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-2">Вбудовані гліфи</h2>
              {filteredStandardSpells.length === 0 ? (
                <div className="text-center py-10 text-slate-600">Нічого не знайдено</div>
              ) : (
                filteredStandardSpells.map((spell: any, idx: number) => (
                  <div 
                    key={`std-${idx}`} 
                    onClick={() => setActiveSpell({...spell, id: `std-${idx}`})}
                    className={`p-4 rounded-xl border cursor-pointer transition-all ${activeSpell?.id === `std-${idx}` ? 'bg-purple-900/20 border-purple-500/50' : 'bg-slate-950 border-slate-800 hover:border-slate-700'}`}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <h3 className="font-bold text-slate-100 truncate pr-4">{spell.name}</h3>
                    </div>
                    <div className="text-[10px] text-purple-400 font-mono mb-2">{spell.type}</div>
                    <div className="flex gap-1 overflow-hidden">
                      {(spell.patterns || []).map((p: string, i: number) => (
                        <div key={i} className="w-8 h-8 bg-slate-900 rounded border border-slate-800 p-0.5">
                          <HexMiniature path={parseHexAngles(p)} fade={true} />
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            externalLibraries.length === 0 ? (
              <div className="text-center py-10 text-slate-500">
                <Globe size={48} className="mx-auto mb-4 opacity-20" />
                <p>У вас ще немає зовнішніх бібліотек.</p>
                <button 
                  onClick={() => setShowAddForm(true)}
                  className="mt-4 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-bold transition-all"
                >
                  Додати бібліотеку
                </button>
              </div>
            ) : (
              filteredExternalSpells.map(lib => (
                <div key={lib.id} className="space-y-3">
                  <div className="flex justify-between items-center px-2">
                    <h2 className="text-[10px] font-bold text-purple-400 uppercase tracking-widest flex items-center gap-2">
                      <Globe size={10} /> {lib.name}
                    </h2>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => handleShareLibrary(lib)} 
                        className="text-slate-500 hover:text-blue-400 transition-colors" 
                        title="Поділитися посиланням на цю бібліотеку"
                      >
                        <Share2 size={12} />
                      </button>
                      <button 
                        onClick={() => handleUpdateLibrary(lib.id)} 
                        className={`text-slate-500 hover:text-purple-400 transition-colors ${isUpdating === lib.id ? 'animate-spin' : ''}`} 
                        title="Оновити (перевірити нові закляття)"
                        disabled={isUpdating === lib.id}
                      >
                        <RefreshCw size={12} />
                      </button>
                      <button 
                        onClick={() => {
                          if (confirm(`Видалити бібліотеку "${lib.name}"?`)) {
                            handleRemoveLibrary(lib.id);
                          }
                        }} 
                        className="text-slate-500 hover:text-red-400 transition-colors" 
                        title="Видалити бібліотеку"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                  
                  <div className="px-2 flex items-center gap-1 text-[9px] text-slate-500">
                    <Clock size={10} /> Оновлено: {formatDate(lib.lastUpdated)}
                  </div>

                  <div className="space-y-3">
                    {lib.spells.map((spell: any, idx: number) => (
                      <div 
                        key={`${lib.id}-${idx}`} 
                        onClick={() => setActiveSpell({...spell, id: `${lib.id}-${idx}`, isExternal: true})}
                        className={`p-4 rounded-xl border cursor-pointer transition-all ${activeSpell?.id === `${lib.id}-${idx}` ? 'bg-purple-900/20 border-purple-500/50' : 'bg-slate-950 border-slate-800 hover:border-slate-700'}`}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="font-bold text-slate-100 truncate pr-4">{spell.name}</h3>
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
                    ))}
                  </div>
                </div>
              ))
            )
          )}
        </div>
      </div>

      {/* Права панель - Деталі закляття */}
      <div className={`${!activeSpell ? 'hidden md:block' : 'block'} flex-1 bg-slate-950 overflow-y-auto custom-scrollbar`}>
        {activeSpell ? (
          <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-6 md:space-y-8 pb-20">
            <div className="flex items-start gap-3">
              <button 
                onClick={() => setActiveSpell(null)} 
                className="md:hidden mt-1 p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 transition-colors shrink-0"
              >
                <ArrowLeft size={20} />
              </button>
              <div>
                <h2 className="text-3xl md:text-4xl font-bold text-white mb-2 md:mb-4">{activeSpell.name}</h2>
                <div className="text-sm text-purple-400 font-mono mb-4">{activeSpell.type}</div>
                <p className="text-slate-400 text-base md:text-lg whitespace-pre-wrap">{activeSpell.description || 'Опис відсутній.'}</p>
              </div>
            </div>

            <div className="space-y-6">
              <h3 className="text-xl font-bold text-purple-400 border-b border-slate-800 pb-2">Гліфи</h3>
              <div className="grid grid-cols-1 gap-4">
                {(activeSpell.patterns || []).map((p: any, i: number) => {
                  const isString = typeof p === 'string';
                  const path = isString ? parseHexAngles(p) : p.path;
                  const angles = isString ? p : pathToHexAngles(p.path).angles;
                  const name = isString ? '' : p.name;
                  const description = isString ? '' : p.description;
                  
                  return (
                  <div key={isString ? `${i}-${p}` : p.id} className="bg-slate-900 p-4 rounded-2xl border border-slate-800 flex gap-4 items-center">
                    <div className="w-24 h-24 bg-slate-950 rounded-xl border border-slate-800 p-2 shrink-0">
                      <HexMiniature path={path} fade={true} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm text-slate-500 mb-1">Гліф #{i + 1}</div>
                      <div className="font-bold text-slate-200 mb-1 truncate">
                        {name || (angles.startsWith('aqaa') || angles.startsWith('dedd') ? `Число: ${parseNumericalReflection(angles)}` : 'Без назви')}
                      </div>
                      {description && (
                        <div className="text-xs text-slate-400 mb-2 line-clamp-2" title={description}>
                          {description}
                        </div>
                      )}
                      <div className="text-xs font-mono text-purple-400 bg-purple-900/20 px-2 py-1 rounded inline-block break-all">
                        {angles || 'Початковий вузол'}
                      </div>
                      {(angles.startsWith('aqaa') || angles.startsWith('dedd')) && (
                        <div className="text-[10px] font-bold text-orange-400 bg-orange-900/30 border border-orange-500/30 px-1.5 py-0.5 rounded mt-2 inline-block ml-2">
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
          <div className="h-full flex flex-col items-center justify-center text-slate-500 p-8 text-center">
            <Globe size={64} className="mb-6 opacity-20" />
            <h2 className="text-2xl font-bold text-slate-400 mb-2">Бібліотека Гліфів</h2>
            <p className="max-w-md">
              Оберіть гліф зі списку зліва, щоб переглянути його деталі та патерн.
            </p>
          </div>
        )}
      </div>

      {/* Auto-add Confirmation Modal */}
      {pendingAutoAdd && (
        <div className="fixed inset-0 z-[200] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl max-w-md w-full shadow-2xl flex flex-col items-center text-center space-y-6">
            <div className="w-20 h-20 bg-purple-500/10 rounded-full flex items-center justify-center">
              <Globe size={40} className="text-purple-500" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-white mb-2">Додати бібліотеку?</h3>
              <p className="text-slate-400 text-sm">Виявлено посилання на зовнішню книгу гліфів. Бажаєте підключити її до своєї бібліотеки?</p>
              <div className="mt-4 p-3 bg-slate-950 rounded-xl border border-slate-800 text-[10px] font-mono text-slate-500 break-all">
                {pendingAutoAdd}
              </div>
            </div>
            <div className="flex gap-3 w-full">
              <button 
                onClick={() => setPendingAutoAdd(null)}
                className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold transition-all"
              >
                Ні, дякую
              </button>
              <button 
                onClick={async () => {
                  const url = pendingAutoAdd;
                  setPendingAutoAdd(null);
                  await performAddLibrary(url);
                }}
                className="flex-1 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-bold transition-all shadow-[0_0_20px_rgba(168,85,247,0.3)]"
              >
                Так, додати
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
