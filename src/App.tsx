import { HashRouter, Routes, Route, Link, useSearchParams, useNavigate } from 'react-router-dom';
import React, { useEffect, useState } from 'react';
import Creator from './Creator';
import Book from './Book';
import GreatSpells from './GreatSpells';
import CalculatorView from './CalculatorView';
import LibraryView from './LibraryView';
import { Book as BookIcon, PenTool, Sparkles, Calculator, Globe, Settings, X } from 'lucide-react';
import { useSettings } from './hooks/useSettings';

function QueryParamHandler() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const addLibUrl = searchParams.get('addLib');
    if (addLibUrl) {
      // Redirect to library with the URL to add
      navigate(`/library?url=${encodeURIComponent(addLibUrl)}`, { replace: true });
    }
  }, [searchParams, navigate]);

  return null;
}

function SettingsModal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const { thicknessMultiplier, updateThickness } = useSettings();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl max-w-sm w-full shadow-2xl space-y-6">
        <div className="flex justify-between items-center border-b border-slate-800 pb-4">
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <Settings size={20} className="text-purple-400" />
            Налаштування
          </h3>
          <button onClick={onClose} className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 transition-colors">
            <X size={20} />
          </button>
        </div>
        
        <div className="space-y-4">
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm font-medium text-slate-300">Товщина ліній (гліфів)</label>
              <span className="text-xs font-mono text-purple-400 bg-slate-950 px-2 py-0.5 rounded">
                x{thicknessMultiplier.toFixed(1)}
              </span>
            </div>
            <input 
              type="range" 
              min="0.1" 
              max="3.0" 
              step="0.1" 
              value={thicknessMultiplier}
              onChange={(e) => updateThickness(parseFloat(e.target.value))}
              className="w-full accent-purple-500 bg-slate-800 h-2 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500 mt-1">
              <span>Тонкі</span>
              <span>Стандартні</span>
              <span>Товсті</span>
            </div>
          </div>
        </div>

        <button 
          onClick={onClose}
          className="w-full py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-bold transition-all"
        >
          Зберегти
        </button>
      </div>
    </div>
  );
}

export default function App() {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  return (
    <HashRouter>
      <QueryParamHandler />
      <div className="h-[100dvh] bg-slate-950 text-slate-300 font-sans flex flex-col overflow-hidden relative">
        {/* Navigation - Responsive layout */}
        <nav className="shrink-0 z-50 flex items-center px-4 h-14 md:h-12 gap-3 md:gap-4 bg-slate-900/80 backdrop-blur-md border-b border-slate-800 overflow-x-auto no-scrollbar justify-between">
          <div className="flex items-center gap-3 md:gap-4">
            <Link to="/book" className="flex items-center gap-1.5 hover:text-purple-300 transition-colors text-[10px] md:text-xs font-medium whitespace-nowrap px-2 py-1 bg-slate-800/50 rounded-lg md:bg-transparent">
              <BookIcon size={14} />
              <span className="hidden sm:inline">Книга</span>
            </Link>
            <Link to="/" className="flex items-center gap-1.5 hover:text-purple-300 transition-colors text-[10px] md:text-xs font-medium whitespace-nowrap px-2 py-1 bg-slate-800/50 rounded-lg md:bg-transparent">
              <PenTool size={14} />
              <span className="hidden sm:inline">Створювач</span>
            </Link>
            <Link to="/great-spells" className="flex items-center gap-1.5 hover:text-purple-300 transition-colors text-[10px] md:text-xs font-medium whitespace-nowrap px-2 py-1 bg-slate-800/50 rounded-lg md:bg-transparent">
              <Sparkles size={14} />
              <span className="hidden sm:inline">Великі Руни</span>
            </Link>
            <Link to="/calculator" className="flex items-center gap-1.5 hover:text-purple-300 transition-colors text-[10px] md:text-xs font-medium whitespace-nowrap px-2 py-1 bg-slate-800/50 rounded-lg md:bg-transparent">
              <Calculator size={14} />
              <span className="hidden sm:inline">Калькулятор</span>
            </Link>
            <Link to="/library" className="flex items-center gap-1.5 hover:text-purple-300 transition-colors text-[10px] md:text-xs font-medium whitespace-nowrap px-2 py-1 bg-slate-800/50 rounded-lg md:bg-transparent">
              <Globe size={14} />
              <span className="hidden sm:inline">Бібліотека</span>
            </Link>
          </div>
          
          <button 
            onClick={() => setIsSettingsOpen(true)}
            className="flex items-center gap-1.5 hover:text-purple-300 transition-colors text-[10px] md:text-xs font-medium whitespace-nowrap px-2 py-1 bg-slate-800/50 rounded-lg md:bg-transparent"
            title="Налаштування"
          >
            <Settings size={14} />
          </button>
        </nav>

        <div className="flex-1 overflow-hidden relative">
          <Routes>
            <Route path="/" element={<Creator />} />
            <Route path="/book" element={<Book />} />
            <Route path="/great-spells" element={<GreatSpells />} />
            <Route path="/calculator" element={<CalculatorView />} />
            <Route path="/library" element={<LibraryView />} />
          </Routes>
        </div>
      </div>
      
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </HashRouter>
  );
}
