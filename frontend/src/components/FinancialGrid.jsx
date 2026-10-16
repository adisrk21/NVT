import React from 'react';

export default function FinancialGrid({ financials, onUpdateForecast }) {
  return (
    <div className="overflow-x-auto border border-[#1A2238] rounded-lg bg-[#0E1322]">
      <table className="w-full text-xs text-left border-collapse">
        <thead>
          <tr className="border-b border-[#1A2238] bg-[#121829] text-slate-400 font-mono text-[11px]">
            <th className="p-3 sticky left-0 bg-[#121829] z-10">FINANCIAL METRIC</th>
            {financials.map((f, idx) => (
              <th key={idx} className={`p-3 text-right ${f.is_estimate ? 'text-amber-500 font-bold bg-[#151a2e]' : ''}`}>
                {f.fy_label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[#1A2238]/60 font-mono">
          {/* Revenue */}
          <tr className="hover:bg-[#151C2F]">
            <td className="p-2.5 font-sans font-medium text-slate-200 sticky left-0 bg-[#0E1322]">Revenue (Cr)</td>
            {financials.map((f, i) => (
              <td key={i} className="p-2.5 text-right text-slate-100 font-bold">
                ₹{f.revenue.toLocaleString('en-IN')}
              </td>
            ))}
          </tr>
          {/* Revenue Growth % */}
          <tr className="hover:bg-[#151C2F] bg-[#0B0E17]/30">
            <td className="p-2.5 font-sans text-rose-400 font-medium sticky left-0 bg-[#0E1322]">Revenue Growth %</td>
            {financials.map((f, i) => (
              <td key={i} className="p-2.5 text-right">
                {f.is_estimate ? (
                  <input
                    type="number"
                    value={f.revenue_growth ?? ''}
                    onChange={(e) => onUpdateForecast(i, 'growth', parseFloat(e.target.value) || 0)}
                    className="w-16 px-1.5 py-0.5 bg-[#141A2E] border border-amber-600/50 rounded text-right text-amber-400 font-bold focus:outline-none"
                  />
                ) : (
                  <span className="text-emerald-400">{f.revenue_growth ? `${f.revenue_growth}%` : '-'}</span>
                )}
              </td>
            ))}
          </tr>
          {/* Operating Profit */}
          <tr className="hover:bg-[#151C2F]">
            <td className="p-2.5 font-sans text-slate-300 sticky left-0 bg-[#0E1322]">Operating Profit (Cr)</td>
            {financials.map((f, i) => (
              <td key={i} className="p-2.5 text-right text-slate-200">₹{f.operating_profit.toLocaleString('en-IN')}</td>
            ))}
          </tr>
          {/* OPM % */}
          <tr className="hover:bg-[#151C2F]">
            <td className="p-2.5 font-sans text-slate-400 sticky left-0 bg-[#0E1322]">OPM %</td>
            {financials.map((f, i) => (
              <td key={i} className="p-2.5 text-right">
                {f.is_estimate ? (
                  <input
                    type="number"
                    value={f.opm_percent ?? ''}
                    onChange={(e) => onUpdateForecast(i, 'opm', parseFloat(e.target.value) || 0)}
                    className="w-16 px-1.5 py-0.5 bg-[#141A2E] border border-amber-600/50 rounded text-right text-amber-400 font-bold focus:outline-none"
                  />
                ) : (
                  <span className="text-slate-300">{f.opm_percent}%</span>
                )}
              </td>
            ))}
          </tr>
          {/* PAT */}
          <tr className="hover:bg-[#151C2F] bg-[#121829]/40">
            <td className="p-2.5 font-sans font-semibold text-slate-100 sticky left-0 bg-[#0E1322]">PAT (Cr)</td>
            {financials.map((f, i) => (
              <td key={i} className="p-2.5 text-right text-emerald-400 font-bold">₹{f.pat.toLocaleString('en-IN')}</td>
            ))}
          </tr>
          {/* EPS */}
          <tr className="hover:bg-[#151C2F] bg-indigo-950/20">
            <td className="p-2.5 font-sans font-bold text-indigo-300 sticky left-0 bg-[#0E1322]">EPS (₹)</td>
            {financials.map((f, i) => (
              <td key={i} className="p-2.5 text-right text-indigo-400 font-bold">{f.eps.toFixed(1)}</td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}
