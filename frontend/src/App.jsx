import React, { useState } from 'react';
import FinancialGrid from './components/FinancialGrid.jsx';
import CagrEstimator from './components/CagrEstimator.jsx';

const INITIAL_FINANCIALS = [
  { fy_label: 'MAR 2021', is_estimate: false, revenue: 118, revenue_growth: 15.7, expenses: 113, operating_profit: 4, opm_percent: 3.4, pat: 2, eps: 1.0 },
  { fy_label: 'MAR 2022', is_estimate: false, revenue: 149, revenue_growth: 26.3, expenses: 138, operating_profit: 10, opm_percent: 6.7, pat: 6, eps: 3.0 },
  { fy_label: 'MAR 2023', is_estimate: false, revenue: 188, revenue_growth: 26.2, expenses: 172, operating_profit: 16, opm_percent: 8.5, pat: 9, eps: 4.5 },
  { fy_label: 'MAR 2024', is_estimate: false, revenue: 332, revenue_growth: 76.6, expenses: 277, operating_profit: 55, opm_percent: 16.6, pat: 38, eps: 19.3 },
  { fy_label: 'MAR 2025', is_estimate: false, revenue: 427, revenue_growth: 28.6, expenses: 344, operating_profit: 83, opm_percent: 19.4, pat: 55, eps: 27.7 },
  { fy_label: 'MAR 2026', is_estimate: false, revenue: 521, revenue_growth: 22.0, expenses: 429, operating_profit: 92, opm_percent: 17.7, pat: 69, eps: 35.0 },
  { fy_label: 'MAR 2027 ESTIMATE', is_estimate: true, revenue: 703, revenue_growth: 35.0, expenses: 569, operating_profit: 134, opm_percent: 19.0, pat: 95, eps: 48.2 },
  { fy_label: 'MAR 2028 ESTIMATE', is_estimate: true, revenue: 914, revenue_growth: 30.0, expenses: 736, operating_profit: 178, opm_percent: 19.5, pat: 127, eps: 64.5 }
];

const INITIAL_TARGETS = [
  { fy_label: 'FY2027', eps: 48.2, pe_multiple: 28, projected_price: 1350, upside_pct: 38.8, cagr_pct: 105.8, holding_days: 166 },
  { fy_label: 'FY2028', eps: 64.5, pe_multiple: 28, projected_price: 1806, upside_pct: 85.8, cagr_pct: 53.0, holding_days: 532 }
];

export default function App() {
  const [financials, setFinancials] = useState(INITIAL_FINANCIALS);
  const [targets, setTargets] = useState(INITIAL_TARGETS);
  const [activeTab, setActiveTab] = useState('Management Case');

  const handleUpdateForecast = (idx, field, value) => {
    setFinancials(prev => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], [field === 'growth' ? 'revenue_growth' : 'opm_percent']: value };
      return copy;
    });
  };

  const handleUpdatePe = (idx, pe) => {
    setTargets(prev => {
      const copy = [...prev];
      const target = copy[idx];
      const newPrice = Math.round(target.eps * pe);
      const upside = Number((((newPrice - 972) / 972) * 100).toFixed(1));
      copy[idx] = { ...target, pe_multiple: pe, projected_price: newPrice, upside_pct: upside };
      return copy;
    });
  };

  const handleApplyAllPe = (pe) => {
    setTargets(prev => prev.map(t => ({
      ...t,
      pe_multiple: pe,
      projected_price: Math.round(t.eps * pe),
      upside_pct: Number((((Math.round(t.eps * pe) - 972) / 972) * 100).toFixed(1))
    })));
  };

  return (
    <div className="min-h-screen bg-[#0B0E17] text-slate-100 p-4 font-sans">
      <header className="border-b border-[#1A2238] bg-[#0E1322] px-4 py-2.5 rounded-lg flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="font-bold text-base text-indigo-400">Valuation Tool</span>
          <span className="text-xs text-slate-500 font-mono">| Danish Power Ltd (DANISH)</span>
        </div>
        <div className="flex gap-2">
          {['Base Case', 'Bull Case', 'Bear Case', 'Management Case'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1 rounded text-xs font-semibold ${
                activeTab === tab ? 'bg-indigo-600 text-white' : 'bg-[#141A2E] text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </header>

      <main className="space-y-4">
        <section>
          <div className="text-xs font-mono text-amber-400 mb-1 uppercase font-bold tracking-wider">{activeTab} Financial Projections</div>
          <FinancialGrid financials={financials} onUpdateForecast={handleUpdateForecast} />
        </section>

        <section>
          <div className="text-xs font-mono text-indigo-400 mb-1 uppercase font-bold tracking-wider">CAGR & Target Price Multiples</div>
          <CagrEstimator
            targets={targets}
            peHistory={{ min: 10.2, median: 10.8, avg: 10.8, max: 11.4 }}
            onUpdatePe={handleUpdatePe}
            onApplyAllPe={handleApplyAllPe}
          />
        </section>
      </main>
    </div>
  );
}
