import { HashRouter, Routes, Route, Link } from 'react-router-dom';
import Creator from './Creator';
import Book from './Book';
import GreatSpells from './GreatSpells';
import { Book as BookIcon, PenTool, Sparkles } from 'lucide-react';

export default function App() {
  return (
    <HashRouter>
      <div className="h-screen bg-slate-950 text-slate-300 font-sans flex flex-col overflow-hidden relative">
        {/* Navigation - Fixed in top-left corner */}
        <nav className="absolute top-0 left-0 z-50 flex items-center px-4 h-12 gap-4 bg-slate-900/50 backdrop-blur-sm border-b border-r border-slate-800 rounded-br-xl">
          <div className="font-bold text-purple-400 text-sm">Hex Casting</div>
          <Link to="/book" className="flex items-center gap-1.5 hover:text-purple-300 transition-colors text-xs font-medium">
            <BookIcon size={14} />
            <span>Книга</span>
          </Link>
          <Link to="/" className="flex items-center gap-1.5 hover:text-purple-300 transition-colors text-xs font-medium">
            <PenTool size={14} />
            <span>Створювач</span>
          </Link>
          <Link to="/great-spells" className="flex items-center gap-1.5 hover:text-purple-300 transition-colors text-xs font-medium">
            <Sparkles size={14} />
            <span>Великі Руни</span>
          </Link>
        </nav>

        <div className="flex-1 overflow-hidden relative">
          <Routes>
            <Route path="/" element={<Creator />} />
            <Route path="/book" element={<Book />} />
            <Route path="/great-spells" element={<GreatSpells />} />
          </Routes>
        </div>
      </div>
    </HashRouter>
  );
}
