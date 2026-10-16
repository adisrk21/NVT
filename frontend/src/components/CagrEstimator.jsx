import React from 'react';

export default function CagrEstimator({ targets, peHistory, onUpdatePe, onApplyAllPe }) {
  return (
    <div className="bg-[#0E1322] border border-[#1A2238] rounded-lg p-4 space-y-4">
      {/* Historical Multiple Anchors */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#1A2238]">
        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="text-slate-500 uppercase">PE History (2Y):</span>
          <button onClick={() => onApplyAllPe(peHistory.min)} className="px-2 py-0.5 rounded bg-[#141A2E] border border-[#1F2942] hover:border-amber-500 text-amber-400">
            MIN {peHistory.min}x
          </button>
          <button onClick={() => onApplyAllPe(peHistory.median)} className="px-2 py-0.5 rounded bg-[#141A2E] border border-[#1F2942] hover:border-indigo-500 text-indigo-400">
            MEDIAN {peHistory.median}x
          </button>
          <button onClick={() => onApplyAllPe(peHistory.avg)} className="px-2 py-0.5 rounded bg-[#141A2E] border border-[#1F2942] hover:border-indigo-500 text-indigo-300">
            AVG {peHistory.avg}x
          </button>
          <button onClick={() => onApplyAllPe(peHistory.max)} className="px-2 py-0.5 rounded bg-[#141A2E] border border-[#1F2942] hover:border-rose-500 text-rose-400">
            MAX {peHistory.max}x
          </button>
        </div>
      </div>

      {/* Target Valuation Table */}
      <table className="w-full text-xs text-left font-mono">
        <thead>
          <tr className="text-slate-500 border-b border-[#1A2238] text-[11px]">
            <th className="pb-2">YEAR</th>
            <th className="pb-2">EPS (₹)</th>
            <th className="pb-2">PE MULTIPLE</th>
            <th className="pb-2">SHARE PRICE (₹)</th>
            <th className="pb-2">UPSIDE %</th>
            <th className="pb-2">CAGR %</th>
            <th className="pb-2 text-right">HORIZON</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#1A2238]/60">
          {targets.map((t, idx) => (
            <tr key={idx} className="hover:bg-[#151C2F]">
              <td className="py-2.5 font-bold text-slate-200">{t.fy_label}</td>
              <td className="py-2.5 text-indigo-300 font-semibold">{t.eps}</td>
              <td className="py-2.5">
                <input
                  type="number"
                  step="0.5"
                  value={t.pe_multiple}
                  onChange={(e) => onUpdatePe(idx, parseFloat(e.target.value) || 0)}
                  className="w-16 px-2 py-1 bg-[#141A2E] border border-indigo-500/60 rounded text-slate-100 font-bold focus:outline-none"
                />
              </td>
              <td className="py-2.5 text-slate-100 font-bold">₹{t.projected_price.toLocaleString('en-IN')}</td>
              <td className={`py-2.5 font-bold ${t.upside_pct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {t.upside_pct >= 0 ? '+' : ''}{t.upside_pct}%
              </td>
              <td className={`py-2.5 font-bold text-sm ${t.cagr_pct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {t.cagr_pct >= 0 ? '+' : ''}{t.cagr_pct}%
              </td>
              <td className="py-2.5 text-right text-slate-500 text-[10px]">{t.holding_days}d</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
