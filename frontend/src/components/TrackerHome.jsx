import React, { useState } from 'react';

const QUICK_CHIPS = [
  "RELIANCE", "TCS", "HDFCBANK", "INFY", "ICICIBANK", "HINDUNILVR",
  "SBIN", "BHARTIARTL", "ITC", "LT", "BAJFINANCE", "MARUTI"
];

export default function TrackerHome({ companies, onSelectStock, activeTab, setActiveTab, onSaveComment }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("All"); // "All", "Normal", "Test"
  const [mode, setMode] = useState("Basic"); // "Basic", "Advanced"
  const [editingTicker, setEditingTicker] = useState(null);
  const [commentDraft, setCommentDraft] = useState("");

  const filtered = companies.filter(c => {
    const matchesSearch = c.company_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          c.ticker.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === "All" || c.type === typeFilter;
    return matchesSearch && matchesType;
  });

  const handleEditComment = (c) => {
    setEditingTicker(c.ticker);
    setCommentDraft(c.comment || "");
  };

  const handleCommitComment = (ticker) => {
    onSaveComment(ticker, commentDraft);
    setEditingTicker(null);
  };

  return (
    <div className="min-h-screen bg-[#0B0E17] text-slate-100 flex flex-col font-sans">
      {/* 1. TOP HEADER & QUICK CHIPS */}
      <header className="border-b border-[#1A2238] bg-[#0E1322] px-6 py-3 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-indigo-500" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
            <span className="font-extrabold text-lg tracking-tight text-white">Valuation Tool</span>
          </div>

          <div className="relative w-96">
            <input
              type="text"
              placeholder="Search for Stocks, Indices and ETFs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#141A2E] border border-[#1F2942] rounded-lg px-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <button className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-[#141A2E] border border-[#1F2942] rounded-lg text-slate-300 hover:text-white transition">
            <span>🔒</span> Enable Test Setup
          </button>
        </div>

        {/* Popular Stock Chips */}
        <div className="flex flex-wrap items-center justify-center gap-2 pt-1 font-mono text-[11px]">
          {QUICK_CHIPS.map(chip => (
            <button
              key={chip}
              onClick={() => onSelectStock(chip)}
              className="px-2.5 py-0.5 rounded bg-[#141A2E]/60 border border-[#1F2942] text-indigo-400 hover:border-indigo-500 hover:text-white transition"
            >
              {chip}
            </button>
          ))}
        </div>
      </header>

      {/* 2. SUB-HEADER / CONTROLS STRIP */}
      <div className="border-b border-[#1A2238] bg-[#0E1322] px-6 py-2.5 flex flex-wrap items-center justify-between gap-4">
        {/* Left: Tracker vs All Companies */}
        <div className="flex items-center gap-3">
          <div className="flex bg-[#141A2E] rounded-md p-0.5 border border-[#1F2942]">
            <button
              onClick={() => setActiveTab('tracker')}
              className={`px-3 py-1 rounded text-xs font-bold transition ${activeTab === 'tracker' ? 'bg-[#1E2746] text-white shadow' : 'text-slate-400 hover:text-white'}`}
            >
              Tracker
            </button>
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1 rounded text-xs font-bold transition ${activeTab === 'all' ? 'bg-[#1E2746] text-white shadow' : 'text-slate-400 hover:text-white'}`}
            >
              All Companies
            </button>
          </div>
          <span className="text-xs font-mono text-slate-500">{filtered.length} of {companies.length} companies</span>
        </div>

        {/* Right: Filters & Modes */}
        <div className="flex items-center gap-3">
          {/* Filter Pills */}
          <div className="flex bg-[#141A2E] rounded-md p-0.5 border border-[#1F2942] text-xs">
            {["All", "Normal", "Test"].map(t => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className={`px-2.5 py-0.5 rounded transition ${typeFilter === t ? 'bg-indigo-600 text-white font-semibold' : 'text-slate-400 hover:text-white'}`}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Basic / Advanced Switch */}
          <div className="flex bg-[#141A2E] rounded-md p-0.5 border border-[#1F2942] text-xs">
            <button
              onClick={() => setMode('Basic')}
              className={`px-2.5 py-0.5 rounded transition ${mode === 'Basic' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}
            >
              Basic
            </button>
            <button
              onClick={() => setMode('Advanced')}
              className={`px-2.5 py-0.5 rounded transition ${mode === 'Advanced' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}
            >
              Advanced
            </button>
          </div>

          <button className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-xs font-semibold flex items-center gap-1.5 shadow">
            <span>📥</span> Excel
          </button>
        </div>
      </div>

      {/* 3. MASTER TRACKER TABLE */}
      <main className="flex-1 overflow-x-auto p-6">
        <div className="border border-[#1A2238] rounded-xl overflow-hidden bg-[#0E1322] shadow-2xl">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-[#121829] border-b border-[#1A2238] font-mono text-[11px] text-slate-400 uppercase tracking-wider">
              <tr>
                <th className="p-3 w-10 text-center">#</th>
                <th className="p-3">COMPANY</th>
                <th className="p-3">TYPE</th>
                <th className="p-3 text-right">CMP</th>
                <th className="p-3">ANALYSTS</th>
                <th className="p-3 text-right text-indigo-400">BASE CAGR</th>
                <th className="p-3 text-right text-emerald-400">BULL CAGR</th>
                <th className="p-3 text-right text-rose-400">BEAR CAGR</th>
                <th className="p-3 text-right text-amber-400">MGMT CAGR</th>
                <th className="p-3 text-center">TREND</th>
                <th className="p-3 text-center">RESULTS</th>
                <th className="p-3 text-center">REPORTS</th>
                <th className="p-3">COMMENTS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1A2238]/60 font-sans">
              {filtered.map((c, idx) => {
                const baseCagr = c.scenarios?.["Base Case"]?.cagr_headline;
                const bullCagr = c.scenarios?.["Bull Case"]?.cagr_headline;
                const bearCagr = c.scenarios?.["Bear Case"]?.cagr_headline;
                const mgmtCagr = c.scenarios?.["Management Case"]?.cagr_headline;

                return (
                  <tr key={c.ticker} className="hover:bg-[#151C2F] transition-colors group">
                    <td className="p-3 text-center font-mono text-slate-500">{idx + 1}</td>
                    
                    {/* Company Name + Ticker Badge */}
                    <td className="p-3 cursor-pointer" onClick={() => onSelectStock(c.ticker)}>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-100 group-hover:text-indigo-400 transition">
                          {c.company_name}
                        </span>
                        <span className="font-mono text-[10px] bg-[#141A2E] text-slate-400 border border-[#1F2942] px-1.5 py-0.5 rounded font-bold">
                          {c.ticker}
                        </span>
                      </div>
                    </td>

                    <td className="p-3 font-mono text-slate-400">{c.type || 'STD'}</td>

                    {/* CMP with daily delta */}
                    <td className="p-3 text-right font-mono">
                      <div className="font-bold text-slate-100">₹{c.cmp?.toLocaleString('en-IN')}</div>
                      <div className={`text-[10px] font-semibold ${c.change_pct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {c.change_pct >= 0 ? '+' : ''}{c.change_pct}%
                      </div>
                    </td>

                    {/* Analyst Avatar Badge */}
                    <td className="p-3">
                      <div className="inline-flex items-center gap-1.5 bg-indigo-950/60 border border-indigo-700/50 text-indigo-300 px-2 py-0.5 rounded-full text-[11px] font-semibold">
                        <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                        {c.analyst || 'Unassigned'}
                      </div>
                    </td>

                    {/* Scenario CAGRs */}
                    <td className="p-3 text-right font-mono">
                      {baseCagr != null ? (
                        <>
                          <div className={`font-bold ${baseCagr >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {baseCagr >= 0 ? '+' : ''}{baseCagr}%
                          </div>
                          <div className="text-[9px] text-slate-500">PE - FY2028</div>
                        </>
                      ) : <span className="text-slate-600">—</span>}
                    </td>

                    <td className="p-3 text-right font-mono">
                      {bullCagr != null ? (
                        <>
                          <div className={`font-bold ${bullCagr >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {bullCagr >= 0 ? '+' : ''}{bullCagr}%
                          </div>
                          <div className="text-[9px] text-slate-500">PE - FY2028</div>
                        </>
                      ) : <span className="text-slate-600">—</span>}
                    </td>

                    <td className="p-3 text-right font-mono">
                      {bearCagr != null ? (
                        <>
                          <div className={`font-bold ${bearCagr >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {bearCagr >= 0 ? '+' : ''}{bearCagr}%
                          </div>
                          <div className="text-[9px] text-slate-500">PE - FY2028</div>
                        </>
                      ) : <span className="text-slate-600">—</span>}
                    </td>

                    <td className="p-3 text-right font-mono">
                      {mgmtCagr != null ? (
                        <>
                          <div className={`font-bold ${mgmtCagr >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {mgmtCagr >= 0 ? '+' : ''}{mgmtCagr}%
                          </div>
                          <div className="text-[9px] text-slate-500">PE - FY2028</div>
                        </>
                      ) : <span className="text-slate-600">—</span>}
                    </td>

                    {/* Interactive SVG Sparkline */}
                    <td className="p-3 text-center">
                      <svg className="w-16 h-5 inline-block text-emerald-400" viewBox="0 0 100 25" fill="none">
                        <polyline
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          points="0,20 20,18 40,22 60,10 80,12 100,4"
                        />
                      </svg>
                    </td>

                    <td className="p-3 text-center">
                      <button className="text-slate-500 hover:text-slate-200" title="Quarterly Filings">📋</button>
                    </td>

                    <td className="p-3 text-center">
                      <a href={`https://www.screener.in/company/${c.ticker}/`} target="_blank" rel="noreferrer" className="text-slate-500 hover:text-indigo-400" title="Screener Report">
                        📎
                      </a>
                    </td>

                    {/* Inline Comment Editor */}
                    <td className="p-3 max-w-xs">
                      {editingTicker === c.ticker ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="text"
                            value={commentDraft}
                            onChange={(e) => setCommentDraft(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleCommitComment(c.ticker)}
                            className="bg-[#141A2E] border border-indigo-500 rounded px-2 py-0.5 text-xs text-slate-100 w-full focus:outline-none"
                            autoFocus
                          />
                          <button onClick={() => handleCommitComment(c.ticker)} className="text-emerald-400 text-xs">✓</button>
                        </div>
                      ) : (
                        <div
                          onClick={() => handleEditComment(c)}
                          className="truncate cursor-pointer text-slate-400 hover:text-slate-200 text-[11px]"
                          title="Click to edit comment"
                        >
                          {c.comment || <span className="italic text-slate-600">Click to add comment...</span>}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
