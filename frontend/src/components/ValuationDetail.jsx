import React, { useState, useMemo } from 'react';
import FinancialGrid from './FinancialGrid.jsx';
import CagrEstimator from './CagrEstimator.jsx';
import SensitivityMatrix from './SensitivityMatrix.jsx';

const API_BASE = import.meta.env.VITE_API_URL || "https://valuation-scenario-api.onrender.com";

export default function ValuationDetail({ stock, onBack, onSaveStock, onFetchLive }) {
  const [activeScenario, setActiveScenario] = useState("Management Case");
  const [scenarios, setScenarios] = useState(stock.scenarios || {});
  const [assumptions, setAssumptions] = useState(stock.comment || "");
  const [isFetching, setIsFetching] = useState(false);
  const [showSensitivity, setShowSensitivity] = useState(false);
  const [copyModalOpen, setCopyModalOpen] = useState(false);

  const currentPkg = scenarios[activeScenario] || {
    financials: [],
    targets: [],
    cagr_headline: 0.0,
    target_price_headline: 0.0
  };

  // Instant reactive pro-forma calculation engine
  const handleUpdateForecast = (idx, field, val) => {
    setScenarios(prev => {
      const copy = { ...prev };
      const pkg = { ...copy[activeScenario] };
      const updatedFin = pkg.financials.map(f => ({ ...f }));
      
      updatedFin[idx][field === 'growth' ? 'revenue_growth' : 'opm_percent'] = val;

      // Cascade pro-forma statement recalculation from modified index forward
      for (let i = 1; i < updatedFin.length; i++) {
        if (updatedFin[i].is_estimate) {
          const prevRow = updatedFin[i - 1];
          const g = updatedFin[i].revenue_growth ?? 15.0;
          const opm = updatedFin[i].opm_percent ?? 18.0;

          const rev = prevRow.revenue * (1.0 + (g / 100.0));
          const op = rev * (opm / 100.0);
          const exp = rev - op;
          const pbt = op + (updatedFin[i].other_income || 0) - (updatedFin[i].interest_expense || 0) - (updatedFin[i].depreciation || 0);
          const pat = pbt * (1.0 - ((updatedFin[i].tax_percent || 25.17) / 100.0));
          const eps = (stock.shares_cr && stock.shares_cr > 0) ? (pat / stock.shares_cr) : (pat / (prevRow.shares_cr || 1.0));

          updatedFin[i].revenue = Number(rev.toFixed(1));
          updatedFin[i].operating_profit = Number(op.toFixed(1));
          updatedFin[i].expenses = Number(exp.toFixed(1));
          updatedFin[i].pbt = Number(pbt.toFixed(1));
          updatedFin[i].pat = Number(pat.toFixed(1));
          updatedFin[i].eps = Number(eps.toFixed(2));
        }
      }

      // Update valuation targets and CAGRs
      const estimates = updatedFin.filter(f => f.is_estimate);
      const updatedTargets = pkg.targets.map((t, tIdx) => {
        const estRow = estimates[tIdx];
        const newEps = estRow ? estRow.eps : t.eps;
        const newPrice = Number((newEps * t.pe_multiple).toFixed(1));
        const upside = stock.cmp > 0 ? Number((((newPrice - stock.cmp) / stock.cmp) * 100).toFixed(1)) : 0;
        
        let newCagr = t.cagr_pct;
        if (t.target_date && stock.cmp > 0 && newPrice > 0) {
          const targetDt = new Date(t.target_date);
          const nowDt = new Date();
          const days = Math.max(1, Math.round((targetDt - nowDt) / (1000 * 60 * 60 * 24)));
          const years = days / 365.25;
          newCagr = Number(((((newPrice / stock.cmp) ** (1.0 / years)) - 1.0) * 100).toFixed(1));
        }

        return {
          ...t,
          eps: newEps,
          projected_price: newPrice,
          upside_pct: upside,
          cagr_pct: newCagr
        };
      });

      const headline = updatedTargets[updatedTargets.length - 1];
      pkg.financials = updatedFin;
      pkg.targets = updatedTargets;
      pkg.cagr_headline = headline ? headline.cagr_pct : 0.0;
      pkg.target_price_headline = headline ? headline.projected_price : 0.0;

      copy[activeScenario] = pkg;
      return copy;
    });
  };

  // Interactive Terminal PE Multiple update
  const handleUpdatePe = (idx, pe) => {
    setScenarios(prev => {
      const copy = { ...prev };
      const pkg = { ...copy[activeScenario] };
      const updatedTargets = pkg.targets.map(t => ({ ...t }));
      const t = updatedTargets[idx];
      const newPrice = Number((t.eps * pe).toFixed(1));
      const upside = stock.cmp > 0 ? Number((((newPrice - stock.cmp) / stock.cmp) * 100).toFixed(1)) : 0;
      
      let newCagr = t.cagr_pct;
      if (t.target_date && stock.cmp > 0 && newPrice > 0) {
        const targetDt = new Date(t.target_date);
        const nowDt = new Date();
        const days = Math.max(1, Math.round((targetDt - nowDt) / (1000 * 60 * 60 * 24)));
        const years = days / 365.25;
        newCagr = Number(((((newPrice / stock.cmp) ** (1.0 / years)) - 1.0) * 100).toFixed(1));
      }

      updatedTargets[idx] = { ...t, pe_multiple: pe, projected_price: newPrice, upside_pct: upside, cagr_pct: newCagr };
      pkg.targets = updatedTargets;
      pkg.cagr_headline = updatedTargets[updatedTargets.length - 1]?.cagr_pct ?? 0.0;
      pkg.target_price_headline = updatedTargets[updatedTargets.length - 1]?.projected_price ?? 0.0;
      copy[activeScenario] = pkg;
      return copy;
    });
  };

  const handleApplyAllPe = (pe) => {
    setScenarios(prev => {
      const copy = { ...prev };
      const pkg = { ...copy[activeScenario] };
      const updatedTargets = pkg.targets.map(t => {
        const newPrice = Number((t.eps * pe).toFixed(1));
        const upside = stock.cmp > 0 ? Number((((newPrice - stock.cmp) / stock.cmp) * 100).toFixed(1)) : 0;
        let newCagr = t.cagr_pct;
        if (t.target_date && stock.cmp > 0 && newPrice > 0) {
          const targetDt = new Date(t.target_date);
          const nowDt = new Date();
          const days = Math.max(1, Math.round((targetDt - nowDt) / (1000 * 60 * 60 * 24)));
          const years = days / 365.25;
          newCagr = Number(((((newPrice / stock.cmp) ** (1.0 / years)) - 1.0) * 100).toFixed(1));
        }
        return { ...t, pe_multiple: pe, projected_price: newPrice, upside_pct: upside, cagr_pct: newCagr };
      });
      pkg.targets = updatedTargets;
      pkg.cagr_headline = updatedTargets[updatedTargets.length - 1]?.cagr_pct ?? 0.0;
      pkg.target_price_headline = updatedTargets[updatedTargets.length - 1]?.projected_price ?? 0.0;
      copy[activeScenario] = pkg;
      return copy;
    });
  };

  const handleCopyFrom = (sourceCase) => {
    if (scenarios[sourceCase]) {
      setScenarios(prev => ({
        ...prev,
        [activeScenario]: JSON.parse(JSON.stringify(prev[sourceCase]))
      }));
    }
    setCopyModalOpen(false);
  };

  const handleLiveFetch = async () => {
    setIsFetching(true);
    await onFetchLive(stock.ticker);
    setIsFetching(false);
  };

  const handleSave = () => {
    const updated = { ...stock, scenarios, comment: assumptions };
    onSaveStock(updated);
  };

  const latestTarget = currentPkg.targets[currentPkg.targets.length - 1];

  return (
    <div className="min-h-screen bg-[#0B0E17] text-slate-100 flex flex-col font-sans p-6 space-y-6">
      {/* 1. Header Bar */}
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
          <button
            onClick={() => setShowSensitivity(!showSensitivity)}
            className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition ${
              showSensitivity ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-[#141A2E] border-[#1F2942] text-slate-300 hover:text-white'
            }`}
          >
            📊 {showSensitivity ? 'Hide 2D Sensitivity' : '2D Sensitivity Matrix'}
          </button>
          <button onClick={handleSave} className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 font-semibold text-xs transition shadow flex items-center gap-1.5">
            <span>✓</span> Saved
          </button>
          <button
            onClick={handleLiveFetch}
            disabled={isFetching}
            className="px-3.5 py-1.5 rounded-lg bg-[#141A2E] hover:bg-[#1E2746] border border-[#1F2942] text-slate-200 text-xs font-semibold transition flex items-center gap-1.5"
          >
            <span className={isFetching ? 'animate-spin' : ''}>⟳</span>
            {isFetching ? 'Fetching Live...' : 'Fetch Live'}
          </button>
          <button className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition">
            In Tracker
          </button>
        </div>
      </div>

      {/* 2. Top Metric Cards (Cleaned 52W High) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-[#0E1322] border border-[#1B233D] p-3.5 rounded-xl">
          <span className="text-[10px] font-mono uppercase text-slate-500 block">CURRENT PRICE</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold font-mono text-white">₹{stock.cmp?.toLocaleString('en-IN')}</span>
            <span className={`text-xs font-bold ${stock.change_pct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {stock.change_pct >= 0 ? '+' : ''}{stock.change_pct}%
            </span>
          </div>
        </div>

        <div className="bg-[#0E1322] border border-[#1B233D] p-3.5 rounded-xl">
          <span className="text-[10px] font-mono uppercase text-slate-500 block">PE RATIO</span>
          <div className="text-2xl font-bold font-mono text-white mt-1">{stock.pe_ratio || '24.2'}</div>
        </div>

        <div className="bg-[#0E1322] border border-[#1B233D] p-3.5 rounded-xl">
          <span className="text-[10px] font-mono uppercase text-slate-500 block">MARKET CAP</span>
          <div className="text-2xl font-bold font-mono text-white mt-1">₹{stock.market_cap_cr?.toLocaleString('en-IN')} Cr</div>
        </div>

        <div className="bg-[#0E1322] border border-[#1B233D] p-3.5 rounded-xl">
          <span className="text-[10px] font-mono uppercase text-slate-500 block">52W HIGH</span>
          <div className="text-2xl font-bold font-mono text-white mt-1">
            ₹{stock.high_52w?.toLocaleString('en-IN')}
          </div>
        </div>
      </div>

      {/* 3. Main Cases Cards */}
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
            const targetYear = pkg?.targets?.[pkg.targets.length - 1]?.fy_label || "TARGET";

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
                <div className="text-[11px] font-mono text-slate-500 mt-0.5">₹{price} · {targetYear}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. Scenario Selection Strip */}
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

      {/* 5. Sensitivity Matrix Drawer */}
      {showSensitivity && (
        <SensitivityMatrix
          baseEps={latestTarget?.eps || 20.0}
          cmp={stock.cmp}
          peMedian={stock.pe_history?.median || 24.0}
          apiBase={API_BASE}
          ticker={stock.ticker}
        />
      )}

      {/* 6. Pro-Forma Modeling Grid */}
      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="text-xs font-mono text-amber-400 uppercase font-bold tracking-wider">
            Financial Modelling — {stock.company_name} <span className="text-slate-500">({activeScenario})</span>
          </div>
          <div className="flex gap-2 text-xs">
            <button
              onClick={() => setCopyModalOpen(true)}
              className="px-2.5 py-1 bg-[#141A2E] border border-[#1F2942] rounded text-slate-300 hover:text-white transition"
            >
              Copy from...
            </button>
          </div>
        </div>
        <FinancialGrid financials={currentPkg.financials} onUpdateForecast={handleUpdateForecast} />
      </section>

      {/* 7. CAGR Estimator */}
      <section className="space-y-2">
        <div className="text-xs font-mono text-indigo-400 uppercase font-bold tracking-wider">
          CAGR Estimator & Valuation Targets
        </div>
        <CagrEstimator
          targets={currentPkg.targets}
          peHistory={stock.pe_history}
          onUpdatePe={handleUpdatePe}
          onApplyAllPe={handleApplyAllPe}
        />
      </section>

      {/* 8. Assumptions Memo */}
      <section className="bg-[#0E1322] border border-[#1A2238] rounded-xl p-4 space-y-2">
        <div className="text-xs font-mono text-slate-300 uppercase font-bold tracking-wider">
          Key Assumptions Taken ({activeScenario})
        </div>
        <textarea
          value={assumptions}
          onChange={(e) => setAssumptions(e.target.value)}
          placeholder="Document thesis: Revenue drivers, order book backlog, margin sustainability, management guidance..."
          className="w-full bg-[#141A2E] border border-[#1F2942] rounded-lg p-3 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500 h-28 font-mono"
        />
      </section>

      {/* Copy From Modal */}
      {copyModalOpen && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#0E1322] border border-[#1F2942] rounded-xl p-5 max-w-sm w-full space-y-3 font-mono text-xs">
            <h3 className="font-bold text-slate-100 text-sm">Copy Assumptions to {activeScenario}</h3>
            <p className="text-slate-400 text-[11px]">Select a source scenario to replicate its projections:</p>
            <div className="space-y-2 pt-1">
              {["Base Case", "Bull Case", "Bear Case", "Management Case"].filter(c => c !== activeScenario).map(c => (
                <button
                  key={c}
                  onClick={() => handleCopyFrom(c)}
                  className="w-full text-left p-2 rounded bg-[#141A2E] hover:bg-indigo-600 hover:text-white transition text-slate-300"
                >
                  Replicate {c}
                </button>
              ))}
            </div>
            <button
              onClick={() => setCopyModalOpen(false)}
              className="w-full mt-2 py-1.5 bg-[#1F2942] hover:bg-slate-700 rounded text-slate-300"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
