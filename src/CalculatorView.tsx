import React from 'react';
import SpellCalculator from './components/SpellCalculator';
import { Calculator } from 'lucide-react';

export default function CalculatorView() {
  return (
    <div className="h-full bg-slate-950 p-4 md:p-8 flex flex-col overflow-hidden">
      <div className="max-w-4xl mx-auto w-full flex-1 flex flex-col overflow-hidden">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-purple-600 rounded-2xl shadow-lg shadow-purple-900/20">
            <Calculator className="text-white" size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Калькулятор та Тестер</h1>
            <p className="text-slate-500 text-sm">Генерація чисел та перевірка логіки заклять</p>
          </div>
        </div>
        
        <div className="flex-1 overflow-hidden">
          <SpellCalculator />
        </div>
      </div>
    </div>
  );
}
