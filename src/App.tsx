import { HashRouter, Routes, Route, Link } from 'react-router-dom';
import Creator from './Creator';
import Book from './Book';
import { Book as BookIcon, PenTool } from 'lucide-react';

export default function App() {
  return (
    <HashRouter>
      <div className="min-h-screen bg-slate-950 text-slate-300 font-sans flex flex-col">
        <nav className="h-14 bg-slate-900 border-b border-slate-800 flex items-center px-4 gap-4 shrink-0">
          <div className="font-bold text-purple-400 mr-4">Hex Casting</div>
          <Link to="/book" className="flex items-center gap-2 hover:text-purple-300 transition-colors">
            <BookIcon size={18} />
            <span>Книга</span>
          </Link>
          <Link to="/" className="flex items-center gap-2 hover:text-purple-300 transition-colors">
            <PenTool size={18} />
            <span>Створювач</span>
          </Link>
        </nav>
        <div className="flex-1 overflow-hidden relative">
          <Routes>
            <Route path="/" element={<Creator />} />
            <Route path="/book" element={<Book />} />
          </Routes>
        </div>
      </div>
    </HashRouter>
  );
}
