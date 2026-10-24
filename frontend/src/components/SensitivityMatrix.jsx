import React, { useState, useEffect } from 'react';

export default function SensitivityMatrix({ baseEps, cmp, peMedian, apiBase, ticker }) {
  const [data, setData] = useState(null);
  const [horizon, setHorizon] = useState(2.0);

  useEffect(() => {
    async function loadMatrix() {
      try {
        const res = await fetch(`${apiBase}/api/stock/${ticker}/sensitivity?horizon=${horizon}`);
        if (res.ok) {
          const json = await res.json();
          setData(json);
        }
      } catch (err) {
        console.error("Sensitivity fetch error:", err);
      }
    }
    if (ticker) loadMatrix();
  }, [ticker, horizon, apiBase]);

  if (!data) return null;

  return (
    <div className="bg-[#0E1322] border border-[#1A2238] rounded-xl p-4 space-y-3 font-mono text-xs">
      <div className="flex items-center justify-between border-b border-[#1A2238] pb-2">
        <div>
          <span className="text-slate-200 font-bold uppercase tracking-wider">
            2D Sensitivity Matrix: Revenue Growth vs. Exit P/E Multiple
          </span>
          <div className="text-[11px] text-slate-400 mt-0.5">
            Displays expected annualized CAGR % across exit horizons from current CMP ₹{cmp}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-slate-400 text-[11px]">Horizon:</span>
          {[1.0, 2.0, 3.0].map((h) => (
            <button
              key={h}
              onClick={() => setHorizon(h)}
              className={`px-2 py-0.5 rounded text-[11px] ${
                horizon === h ? 'bg-indigo-600 text-white font-bold' : 'bg-[#141A2E] text-slate-400 hover:text-white'
              }`}
            >
              {h}Y
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-center border-collapse">
          <thead>
            <tr className="bg-[#121829] text-slate-400 text-[11px]">
              <th className="p-2 text-left">Terminal P/E</th>
              {data.growth_rates.map((g) => (
                <th key={g} className="p-2">+{g}% Growth</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1A2238]/60">
            {data.matrix.map((row) => (
              <tr key={row.pe} className="hover:bg-[#151C2F]">
                <td className="p-2 text-left font-bold text-slate-300">{row.pe}x</td>
                {row.cagrs.map((cagr, idx) => {
                  const isHigh = cagr >= 25;
                  const isPositive = cagr >= 12;
                  const isNegative = cagr < 0;
                  const colorClass = isHigh
                    ? 'bg-emerald-950/70 text-emerald-300 font-bold'
                    : isPositive
                    ? 'bg-emerald-950/30 text-emerald-400'
                    : isNegative
                    ? 'bg-rose-950/50 text-rose-400 font-bold'
                    : 'text-amber-400';

                  return (
                    <td key={idx} className={`p-2 rounded ${colorClass}`}>
                      {cagr >= 0 ? '+' : ''}{cagr}%
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
