import React from 'react';

export default function FinancialGrid({ financials, onUpdateForecast }) {
  return (
    <div className="overflow-x-auto border border-[#1A2238] rounded-xl bg-[#0E1322]">
      <table className="w-full text-xs text-left border-collapse">
        <thead>
          <tr className="border-b border-[#1A2238] bg-[#121829] text-slate-400 font-mono text-[11px]">
            <th className="p-3 sticky left-0 bg-[#121829] z-10">FINANCIAL METRIC</th>
            {financials.map((f, idx) => (
              <th
                key={idx}
                className={`p-3 text-right whitespace-nowrap ${
                  f.is_estimate ? 'text-amber-400 font-bold bg-amber-950/20 border-l border-amber-900/30' : ''
                }`}
              >
                {f.fy_label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[#1A2238]/60 font-mono">
          {/* Revenue Row */}
          <tr className="hover:bg-[#151C2F]">
            <td className="p-2.5 font-sans font-medium text-slate-200 sticky left-0 bg-[#0E1322]">Revenue (₹ Cr)</td>
            {financials.map((f, i) => (
              <td
                key={i}
                className={`p-2.5 text-right font-bold ${
                  f.is_estimate ? 'text-emerald-400 bg-amber-950/10 border-l border-amber-900/30' : 'text-slate-100'
                }`}
              >
                ₹{f.revenue?.toLocaleString('en-IN', { maximumFractionDigits: 1 })}
              </td>
            ))}
          </tr>

          {/* Revenue Growth % Input Row */}
          <tr className="hover:bg-[#151C2F] bg-[#0B0E17]/30">
            <td className="p-2.5 font-sans text-rose-400 font-medium sticky left-0 bg-[#0E1322]">Revenue Growth %</td>
            {financials.map((f, i) => (
              <td
                key={i}
                className={`p-2.5 text-right ${f.is_estimate ? 'bg-amber-950/10 border-l border-amber-900/30' : ''}`}
              >
                {f.is_estimate ? (
                  <div className="flex items-center justify-end gap-1">
                    <input
                      type="number"
                      step="0.5"
                      value={f.revenue_growth ?? ''}
                      onChange={(e) => onUpdateForecast(i, 'growth', parseFloat(e.target.value) || 0)}
                      className="w-16 px-1.5 py-0.5 bg-[#141A2E] border border-amber-500/70 rounded text-right text-amber-300 font-bold focus:outline-none focus:ring-1 focus:ring-amber-400"
                    />
                    <span className="text-amber-500 text-[10px] font-bold">%</span>
                  </div>
                ) : (
                  <span className={f.revenue_growth >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                    {f.revenue_growth != null ? `${f.revenue_growth}%` : '—'}
                  </span>
                )}
              </td>
            ))}
          </tr>

          {/* Operating Profit */}
          <tr className="hover:bg-[#151C2F]">
            <td className="p-2.5 font-sans text-slate-300 sticky left-0 bg-[#0E1322]">Operating Profit (₹ Cr)</td>
            {financials.map((f, i) => (
              <td
                key={i}
                className={`p-2.5 text-right ${
                  f.is_estimate ? 'text-slate-200 bg-amber-950/10 border-l border-amber-900/30 font-semibold' : 'text-slate-300'
                }`}
              >
                ₹{f.operating_profit?.toLocaleString('en-IN', { maximumFractionDigits: 1 })}
              </td>
            ))}
          </tr>

          {/* OPM % Input Row */}
          <tr className="hover:bg-[#151C2F]">
            <td className="p-2.5 font-sans text-slate-400 sticky left-0 bg-[#0E1322]">OPM %</td>
            {financials.map((f, i) => (
              <td
                key={i}
                className={`p-2.5 text-right ${f.is_estimate ? 'bg-amber-950/10 border-l border-amber-900/30' : ''}`}
              >
                {f.is_estimate ? (
                  <div className="flex items-center justify-end gap-1">
                    <input
                      type="number"
                      step="0.5"
                      value={f.opm_percent ?? ''}
                      onChange={(e) => onUpdateForecast(i, 'opm', parseFloat(e.target.value) || 0)}
                      className="w-16 px-1.5 py-0.5 bg-[#141A2E] border border-amber-500/70 rounded text-right text-amber-300 font-bold focus:outline-none focus:ring-1 focus:ring-amber-400"
                    />
                    <span className="text-amber-500 text-[10px] font-bold">%</span>
                  </div>
                ) : (
                  <span className="text-slate-300">{f.opm_percent?.toFixed(1)}%</span>
                )}
              </td>
            ))}
          </tr>

          {/* PAT */}
          <tr className="hover:bg-[#151C2F] bg-[#121829]/40">
            <td className="p-2.5 font-sans font-semibold text-slate-100 sticky left-0 bg-[#0E1322]">PAT (₹ Cr)</td>
            {financials.map((f, i) => (
              <td
                key={i}
                className={`p-2.5 text-right font-bold ${
                  f.is_estimate ? 'text-emerald-400 bg-amber-950/10 border-l border-amber-900/30' : 'text-emerald-400'
                }`}
              >
                ₹{f.pat?.toLocaleString('en-IN', { maximumFractionDigits: 1 })}
              </td>
            ))}
          </tr>

          {/* Diluted EPS */}
          <tr className="hover:bg-[#151C2F] bg-indigo-950/20">
            <td className="p-2.5 font-sans font-bold text-indigo-300 sticky left-0 bg-[#0E1322]">EPS (₹)</td>
            {financials.map((f, i) => (
              <td
                key={i}
                className={`p-2.5 text-right font-bold ${
                  f.is_estimate ? 'text-sky-300 bg-amber-950/10 border-l border-amber-900/30 text-sm' : 'text-indigo-400'
                }`}
              >
                ₹{f.eps?.toFixed(2)}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}
