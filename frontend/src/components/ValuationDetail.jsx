import React, { useState } from 'react';
import FinancialGrid from './FinancialGrid.jsx';
import CagrEstimator from './CagrEstimator.jsx';

export default function ValuationDetail({ stock, onBack, onSaveStock, onFetchLive }) {
  const [activeScenario, setActiveScenario] = useState("Management Case");
  const [scenarios, setScenarios] = useState(stock.scenarios || {});
  const [assumptions, setAssumptions] = useState(stock.comment || "");

  const currentPkg = scenarios[activeScenario] || {
    financials: [],
    targets: [],
    cagr_headline: 0.0,
    target_price_headline: 0.0
  };

  const handleUpdateForecast = (idx, field, val) => {
    setScenarios(prev => {
      const copy = { ...prev };
      const pkg = { ...copy[activeScenario] };
      const updatedFin = [...pkg.financials];
      updatedFin[idx] = { ...updatedFin[idx], [field === 'growth' ? 'revenue_growth' : 'opm_percent']: val };
      pkg.financials = updatedFin;
      copy[activeScenario] = pkg;
      return copy;
    });
  };

  const handleUpdatePe = (idx, pe) => {
    setScenarios(prev => {
      const copy = { ...prev };
      const pkg = { ...copy[activeScenario] };
      const updatedTargets = [...pkg.targets];
      const t = updatedTargets[idx];
      const newPrice = Math.round(t.eps * pe);
      const upside = Number((((newPrice - stock.cmp) / stock.cmp) * 100).toFixed(1));
      updatedTargets[idx] = { ...t, pe_multiple: pe, projected_price: newPrice, upside_pct: upside };
      pkg.targets = updatedTargets;
      copy[activeScenario] = pkg;
      return copy;
    });
  };

  const handleApplyAllPe = (pe) => {
    setScenarios(prev => {
      const copy = { ...prev };
      const pkg = { ...copy[activeScenario] };
      pkg.targets = pkg.targets.map(t => ({
        ...t,
        pe_multiple: pe,
        projected_price: Math.round(t.eps * pe),
        upside_pct: Number((((Math.round(t.eps * pe) - stock.cmp) / stock.cmp) * 100).toFixed(1))
      }));
      copy[activeScenario] = pkg;
      return copy;
    });
  };

  const handleSave = () => {
    const updated = { ...stock, scenarios, comment: assumptions };
    onSaveStock(updated);
  };

  return (
    <div className="min-h-screen bg-[#0B0E17] text-slate-100 flex flex-col font-sans p-6 space-y-6">
      {/* 1. TOP BREADCRUMB & ACTION BAR */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#1A2238] pb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-1.5 rounded-lg bg-[#141A2E] hover:bg-indigo-600 text-slate-300 hover:text-white transition"
            title="Return to Master Tracker"
          >
            ←
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-white">{stock.company_name}</h1>
              <span className="font-mono text-xs bg-indigo-950/70 border border-indigo-700 text-indigo-300 px-2 py-0.5 rounded font-bold">
                {stock.ticker} · NSE / BSE
              </span>
              <span className="text-xs text-slate-400">Assigned to: <strong className="text-slate-200">{stock.analyst}</strong></span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={handleSave} className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 font-semibold text-xs transition shadow flex items-center gap-1.5">
            <span>✓</span> Saved
          </button>
          <button onClick={() => onFetchLive(stock.ticker)} className="px-3.5 py-1.5 rounded-lg bg-[#141A2E] hover:bg-[#1E2746] border border-[#1F2942] text-slate-200 text-xs font-semibold transition">
            ⟳ Fetch Live
          </button>
          <button className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition">
            In Tracker
          </button>
        </div>
      </div>

      {/* 2. TOP METRIC OVERVIEW CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-[#0E1322] border border-[#1B233D] p-3.5 rounded-xl">
          <span className="text-[10px] font-mono uppercase text-slate-500 block">CURRENT PRICE</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold font-mono text-white">₹{stock.cmp?.toLocaleString('en-IN')}</span>
            <span className="text-xs font-bold text-rose-400">{stock.change_pct}%</span>
          </div>
        </div>

        <div className="bg-[#0E1322] border border-[#1B233D] p-3.5 rounded-xl">
          <span className="text-[10px] font-mono uppercase text-slate-500 block">PE RATIO</span>
          <div className="text-2xl font-bold font-mono text-white mt-1">{stock.pe_ratio || '27.8'}</div>
        </div>

        <div className="bg-[#0E1322] border border-[#1B233D] p-3.5 rounded-xl">
          <span className="text-[10px] font-mono uppercase text-slate-500 block">MARKET CAP</span>
          <div className="text-2xl font-bold font-mono text-white mt-1">₹{stock.market_cap_cr?.toLocaleString('en-IN')} Cr</div>
        </div>

        <div className="bg-[#0E1322] border border-[#1B233D] p-3.5 rounded-xl">
          <span className="text-[10px] font-mono uppercase text-slate-500 block">52W HIGH</span>
          <div className="text-2xl font-bold font-mono text-white mt-1">₹{stock.high_52w?.toLocaleString('en-IN')}</div>
        </div>
      </div>

      {/* 3. FOUR SCENARIO SUMMARY BANNER */}
      <div>
        <span className="text-[11px] font-mono text-slate-500 uppercase font-bold tracking-wider mb-2 block">MAIN CASES</span>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: "BASE CASE CAGR", key: "Base Case", color: "text-indigo-400", border: "border-indigo-500/40" },
            { label: "BULL CASE CAGR", key: "Bull Case", color: "text-emerald-400", border: "border-emerald-500/40" },
            { label: "BEAR CASE CAGR", key: "Bear Case", color: "text-rose-400", border: "border-rose-500/40" },
            { label: "MANAGEMENT CASE CAGR", key: "Management Case", color: "text-amber-400", border: "border-amber-500/40" }
          ].map(c => {
            const pkg = scenarios[c.key];
            const cagr = pkg?.cagr_headline ?? 0;
            const price = pkg?.target_price_headline ?? 0;
            const isSelected = activeScenario === c.key;

            return (
              <div
                key={c.key}
                onClick={() => setActiveScenario(c.key)}
                className={`bg-[#0E1322] border ${isSelected ? 'border-indigo-500 bg-[#121829]' : c.border} p-3.5 rounded-xl cursor-pointer transition hover:bg-[#151C2F]`}
              >
                <div className="text-[10px] font-mono uppercase text-slate-400">{c.label}</div>
                <div className={`text-2xl font-black font-mono mt-1 ${c.color}`}>
                  {cagr >= 0 ? '+' : ''}{cagr}%
                </div>
                <div className="text-[11px] font-mono text-slate-500 mt-0.5">₹{price} · FY2028</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. SCENARIO SELECTOR TABS */}
      <div className="flex bg-[#0E1322] p-1 rounded-lg border border-[#1A2238] w-fit">
        {["Base Case", "Bull Case", "Bear Case", "Management Case"].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveScenario(tab)}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition ${
              activeScenario === tab ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* 5. RESTATED & ESTIMATED FINANCIAL PROJECTIONS */}
      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="text-xs font-mono text-amber-400 uppercase font-bold tracking-wider">
            Financial Modelling — {stock.company_name} <span className="text-slate-500">({activeScenario})</span>
          </div>
          <div className="flex gap-2 text-xs">
            <button className="px-2.5 py-1 bg-[#141A2E] border border-[#1F2942] rounded text-slate-300">Copy from...</button>
            <button className="px-2.5 py-1 bg-[#141A2E] border border-[#1F2942] rounded text-slate-300">Fill with Excel</button>
          </div>
        </div>
        <FinancialGrid financials={currentPkg.financials} onUpdateForecast={handleUpdateForecast} />
      </section>

      {/* 6. CAGR MULTIPLE EXPANSION ESTIMATOR */}
      <section className="space-y-2">
        <div className="text-xs font-mono text-indigo-400 uppercase font-bold tracking-wider">
          CAGR Estimator & Valuation Targets
        </div>
        <CagrEstimator
          targets={currentPkg.targets}
          peHistory={{ min: 10.2, median: 10.8, avg: 10.8, max: 11.4 }}
          onUpdatePe={handleUpdatePe}
          onApplyAllPe={handleApplyAllPe}
        />
      </section>

      {/* 7. KEY ASSUMPTIONS TAKEN */}
      <section className="bg-[#0E1322] border border-[#1A2238] rounded-xl p-4 space-y-2">
        <div className="text-xs font-mono text-slate-300 uppercase font-bold tracking-wider">
          Key Assumptions Taken ({activeScenario})
        </div>
        <textarea
          value={assumptions}
          onChange={(e) => setAssumptions(e.target.value)}
          placeholder="Document thesis: Revenue drivers, order book visibility, margin sustainability, management commentary..."
          className="w-full bg-[#141A2E] border border-[#1F2942] rounded-lg p-3 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500 h-28 font-mono"
        />
      </section>
    </div>
  );
}
