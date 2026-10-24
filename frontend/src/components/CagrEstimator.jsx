import React from 'react';

export default function CagrEstimator({ targets, peHistory, onUpdatePe, onApplyAllPe }) {
  const peStats = peHistory || { min: 10.0, median: 22.0, avg: 22.5, max: 35.0 };

  return (
    <div className="bg-[#0E1322] border border-[#1A2238] rounded-xl p-4 space-y-4">
      {/* Dynamic Valuation Anchors */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#1A2238]">
        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="text-slate-500 uppercase font-semibold">PE History Anchors:</span>
          <button
            onClick={() => onApplyAllPe(peStats.min)}
            className="px-2.5 py-1 rounded bg-[#141A2E] border border-[#1F2942] hover:border-amber-500 text-amber-400 font-bold transition"
            title="Apply Min Historical Multiple"
          >
            MIN {peStats.min}x
          </button>
          <button
            onClick={() => onApplyAllPe(peStats.median)}
            className="px-2.5 py-1 rounded bg-[#141A2E] border border-[#1F2942] hover:border-indigo-500 text-indigo-400 font-bold transition"
            title="Apply Median Multiple (Base)"
          >
            MEDIAN {peStats.median}x
          </button>
          <button
            onClick={() => onApplyAllPe(peStats.avg)}
            className="px-2.5 py-1 rounded bg-[#141A2E] border border-[#1F2942] hover:border-indigo-500 text-indigo-300 font-bold transition"
            title="Apply Average Multiple"
          >
            AVG {peStats.avg}x
          </button>
          <button
            onClick={() => onApplyAllPe(peStats.max)}
            className="px-2.5 py-1 rounded bg-[#141A2E] border border-[#1F2942] hover:border-rose-500 text-rose-400 font-bold transition"
            title="Apply Max Multiple (Bull)"
          >
            MAX {peStats.max}x
          </button>
        </div>
      </div>

      {/* Target Valuation Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs text-left font-mono">
          <thead>
            <tr className="text-slate-500 border-b border-[#1A2238] text-[11px] uppercase">
              <th className="pb-2.5">Year</th>
              <th className="pb-2.5">Diluted EPS</th>
              <th className="pb-2.5">Terminal PE Multiple</th>
              <th className="pb-2.5">Target Share Price</th>
              <th className="pb-2.5">Expected Upside</th>
              <th className="pb-2.5">Expected CAGR</th>
              <th className="pb-2.5 text-right">Horizon</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1A2238]/60">
            {targets.map((t, idx) => (
              <tr key={idx} className="hover:bg-[#151C2F]">
                <td className="py-2.5 font-bold text-slate-200">{t.fy_label}</td>
                <td className="py-2.5 text-indigo-300 font-semibold">₹{t.eps?.toFixed(2)}</td>
                <td className="py-2.5">
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      step="0.5"
                      value={t.pe_multiple}
                      onChange={(e) => onUpdatePe(idx, parseFloat(e.target.value) || 0)}
                      className="w-16 px-2 py-1 bg-[#141A2E] border border-indigo-500/60 rounded text-slate-100 font-bold text-center focus:outline-none focus:border-indigo-400"
                    />
                    <span className="text-slate-500 font-bold">x</span>
                  </div>
                </td>
                <td className="py-2.5 text-slate-100 font-bold">₹{t.projected_price?.toLocaleString('en-IN')}</td>
                <td className={`py-2.5 font-bold ${t.upside_pct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {t.upside_pct >= 0 ? '+' : ''}{t.upside_pct}%
                </td>
                <td className={`py-2.5 font-bold text-sm ${t.cagr_pct >= 20 ? 'text-emerald-400' : t.cagr_pct >= 0 ? 'text-amber-400' : 'text-rose-400'}`}>
                  {t.cagr_pct >= 0 ? '+' : ''}{t.cagr_pct}%
                </td>
                <td className="py-2.5 text-right text-slate-500 text-[11px]">{t.duration_days} days</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
