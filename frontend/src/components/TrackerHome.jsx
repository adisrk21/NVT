import React, { useState, useMemo } from 'react';

const QUICK_CHIPS = [
  "RELIANCE", "TCS", "HDFCBANK", "INFY", "ICICIBANK", "HINDUNILVR",
  "SBIN", "BHARTIARTL", "ITC", "LT", "BAJFINANCE", "MARUTI"
];

function Sparkline({ data, changePct }) {
  if (!data || data.length < 2) {
    return <span className="text-slate-600 font-mono text-[10px]">—</span>;
  }
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const width = 80;
  const height = 22;

  const points = data
    .map((val, idx) => {
      const x = (idx / (data.length - 1)) * width;
      const y = height - ((val - min) / range) * (height - 4) - 2;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  const isUp = (changePct ?? 0) >= 0;
  const color = isUp ? '#34D399' : '#F87171';

  return (
    <svg width={width} height={height} className="overflow-visible inline-block">
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
}

// Reusable Sortable Column Header Component
function SortHeader({
  label,
  colKey,
  sortConfig,
  onSort,
  align = "left",
  className = "",
  title
}) {
  const isActive = sortConfig.key === colKey;
  const isAsc = sortConfig.direction === 'asc';

  return (
    <th
      onClick={() => onSort(colKey)}
      title={title || `Sort by ${label}`}
      className={`p-3 cursor-pointer select-none group transition-colors hover:text-slate-100 ${
        align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left'
      } ${className}`}
    >
      <div
        className={`inline-flex items-center gap-1.5 ${
          align === 'right' ? 'justify-end' : align === 'center' ? 'justify-center' : 'justify-start'
        }`}
      >
        <span>{label}</span>
        <span
          className={`text-[10px] transition-all duration-150 ${
            isActive
              ? 'text-indigo-400 opacity-100 font-bold scale-110'
              : 'text-slate-600 opacity-0 group-hover:opacity-60'
          }`}
        >
          {isActive ? (isAsc ? '▲' : '▼') : '↕'}
        </span>
      </div>
    </th>
  );
}

export default function TrackerHome({ companies, onSelectStock, activeTab, setActiveTab, onSaveComment }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");
  const [mode, setMode] = useState("Basic"); // "Basic" or "Advanced"
  const [editingTicker, setEditingTicker] = useState(null);
  const [commentDraft, setCommentDraft] = useState("");
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'desc' });

  // Handle header click sorting logic
  const handleSort = (colKey) => {
    setSortConfig(prev => {
      if (prev.key === colKey) {
        return {
          key: colKey,
          direction: prev.direction === 'asc' ? 'desc' : 'asc'
        };
      }
      // Textual columns default to A-Z ('asc'), numeric to highest first ('desc')
      const textKeys = ['company', 'type', 'analyst', 'moat', 'comment'];
      const defaultDir = textKeys.includes(colKey) ? 'asc' : 'desc';
      return {
        key: colKey,
        direction: defaultDir
      };
    });
  };

  // Memoized filter and universal sort pipeline
  const filtered = useMemo(() => {
    let list = companies.filter(c => {
      const matchesSearch =
        c.company_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.ticker?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = typeFilter === "All" || c.type === typeFilter;
      return matchesSearch && matchesType;
    });

    if (!sortConfig.key) return list;

    return [...list].sort((a, b) => {
      let valA, valB;

      switch (sortConfig.key) {
        case 'company':
          valA = (a.company_name || a.ticker || '').toLowerCase();
          valB = (b.company_name || b.ticker || '').toLowerCase();
          break;
        case 'type':
          valA = (a.type || '').toLowerCase();
          valB = (b.type || '').toLowerCase();
          break;
        case 'cmp':
          valA = a.cmp;
          valB = b.cmp;
          break;
        case 'analyst':
          valA = (a.analyst || '').toLowerCase();
          valB = (b.analyst || '').toLowerCase();
          break;
        case 'base_cagr':
          valA = a.scenarios?.["Base Case"]?.cagr_headline;
          valB = b.scenarios?.["Base Case"]?.cagr_headline;
          break;
        case 'bull_cagr':
          valA = a.scenarios?.["Bull Case"]?.cagr_headline;
          valB = b.scenarios?.["Bull Case"]?.cagr_headline;
          break;
        case 'bear_cagr':
          valA = a.scenarios?.["Bear Case"]?.cagr_headline;
          valB = b.scenarios?.["Bear Case"]?.cagr_headline;
          break;
        case 'mgmt_cagr':
          valA = a.scenarios?.["Management Case"]?.cagr_headline;
          valB = b.scenarios?.["Management Case"]?.cagr_headline;
          break;
        case 'moat':
          valA = (a.moat || '').toLowerCase();
          valB = (b.moat || '').toLowerCase();
          break;
        case 'avg_fcf':
          valA = a.avg_fcf;
          valB = b.avg_fcf;
          break;
        case 'dcf':
          valA = a.dcf;
          valB = b.dcf;
          break;
        case 'market_cap_cr':
          valA = a.market_cap_cr;
          valB = b.market_cap_cr;
          break;
        case 'value_ratio':
          valA = a.value_ratio;
          valB = b.value_ratio;
          break;
        case 'pead_score':
          valA = a.pead_score;
          valB = b.pead_score;
          break;
        case 'trend':
          valA = a.change_pct;
          valB = b.change_pct;
          break;
        case 'comment':
          valA = (a.comment || '').toLowerCase();
          valB = (b.comment || '').toLowerCase();
          break;
        default:
          return 0;
      }

      // Safeguard: push nulls and undefined to bottom regardless of sort order
      const isANull = valA === null || valA === undefined || (typeof valA === 'number' && isNaN(valA));
      const isBNull = valB === null || valB === undefined || (typeof valB === 'number' && isNaN(valB));
      if (isANull && isBNull) return 0;
      if (isANull) return 1;
      if (isBNull) return -1;

      if (typeof valA === 'string' && typeof valB === 'string') {
        return sortConfig.direction === 'asc'
          ? valA.localeCompare(valB)
          : valB.localeCompare(valA);
      }

      return sortConfig.direction === 'asc' ? valA - valB : valB - valA;
    });
  }, [companies, searchTerm, typeFilter, sortConfig]);

  const handleEditComment = (c) => {
    setEditingTicker(c.ticker);
    setCommentDraft(c.comment || "");
  };

  const handleCommitComment = (ticker) => {
    onSaveComment(ticker, commentDraft);
    setEditingTicker(null);
  };

  const exportToExcel = () => {
    const headers = [
      "Company", "Ticker", "Type", "CMP", "Change %", "Analyst",
      "Base CAGR", "Bull CAGR", "Bear CAGR", "Mgmt CAGR",
      "Moat", "Avg FCF", "DCF 25x", "Market Cap", "Value Ratio", "Comments"
    ];
    const rows = filtered.map(c => [
      c.company_name,
      c.ticker,
      c.type,
      c.cmp,
      c.change_pct,
      c.analyst,
      c.scenarios?.["Base Case"]?.cagr_headline ?? "",
      c.scenarios?.["Bull Case"]?.cagr_headline ?? "",
      c.scenarios?.["Bear Case"]?.cagr_headline ?? "",
      c.scenarios?.["Management Case"]?.cagr_headline ?? "",
      c.moat || "",
      c.avg_fcf || "",
      c.dcf || "",
      c.market_cap_cr || "",
      c.value_ratio || "",
      `"${(c.comment || "").replace(/"/g, '""')}"`
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Valuation_Universe_${activeTab}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-[#0B0E17] text-slate-100 flex flex-col font-sans">
      {/* 1. TOP HEADER & QUICK CHIPS */}
      <header className="border-b border-[#1A2238] bg-[#0E1322] px-6 py-3 flex flex-col gap-3 shrink-0">
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
      <div className="border-b border-[#1A2238] bg-[#0E1322] px-6 py-2.5 flex flex-wrap items-center justify-between gap-4 shrink-0">
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
          <span className="text-xs font-mono text-slate-500">
            {filtered.length} of {companies.length} companies
            {sortConfig.key && (
              <button
                onClick={() => setSortConfig({ key: null, direction: 'desc' })}
                className="ml-2 text-[10px] text-indigo-400 hover:underline"
              >
                (Reset Sort)
              </button>
            )}
          </span>
        </div>

        <div className="flex items-center gap-3">
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

          {/* BASIC / ADVANCED MODE SWITCH */}
          <div className="flex bg-[#141A2E] rounded-md p-0.5 border border-[#1F2942] text-xs">
            <button
              onClick={() => setMode('Basic')}
              className={`px-2.5 py-1 rounded transition font-medium ${mode === 'Basic' ? 'bg-indigo-600 text-white font-semibold shadow' : 'text-slate-400 hover:text-white'}`}
            >
              Basic
            </button>
            <button
              onClick={() => setMode('Advanced')}
              className={`px-2.5 py-1 rounded transition font-medium ${mode === 'Advanced' ? 'bg-indigo-600 text-white font-semibold shadow' : 'text-slate-400 hover:text-white'}`}
            >
              Advanced
            </button>
          </div>

          <button
            onClick={exportToExcel}
            className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-xs font-semibold flex items-center gap-1.5 shadow transition"
          >
            <span>📥</span> Excel
          </button>
        </div>
      </div>

      {/* 3. DYNAMIC OBSIDIAN TRACKER TABLE WITH UNIVERSAL COLUMN SORTING */}
      <main className="flex-1 overflow-auto p-6">
        <div className="border border-[#1A2238] rounded-xl overflow-hidden bg-[#0E1322] shadow-2xl">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-[#121829] border-b border-[#1A2238] font-mono text-[11px] text-slate-400 uppercase tracking-wider sticky top-0 z-10">
              <tr>
                <th
                  onClick={() => setSortConfig({ key: null, direction: 'desc' })}
                  title="Click to reset sorting"
                  className="p-3 w-10 text-center cursor-pointer hover:text-slate-200"
                >
                  #
                </th>

                <SortHeader
                  label="COMPANY"
                  colKey="company"
                  sortConfig={sortConfig}
                  onSort={handleSort}
                />

                <SortHeader
                  label="TYPE"
                  colKey="type"
                  sortConfig={sortConfig}
                  onSort={handleSort}
                />

                <SortHeader
                  label="CMP"
                  colKey="cmp"
                  sortConfig={sortConfig}
                  onSort={handleSort}
                  align="right"
                />

                <SortHeader
                  label="ANALYSTS"
                  colKey="analyst"
                  sortConfig={sortConfig}
                  onSort={handleSort}
                />

                <SortHeader
                  label="BASE CAGR"
                  colKey="base_cagr"
                  sortConfig={sortConfig}
                  onSort={handleSort}
                  align="right"
                  className="text-indigo-400"
                />

                <SortHeader
                  label="BULL CAGR"
                  colKey="bull_cagr"
                  sortConfig={sortConfig}
                  onSort={handleSort}
                  align="right"
                  className="text-emerald-400"
                />

                <SortHeader
                  label="BEAR CAGR"
                  colKey="bear_cagr"
                  sortConfig={sortConfig}
                  onSort={handleSort}
                  align="right"
                  className="text-rose-400"
                />

                <SortHeader
                  label="MGMT CAGR"
                  colKey="mgmt_cagr"
                  sortConfig={sortConfig}
                  onSort={handleSort}
                  align="right"
                  className="text-amber-400"
                />

                {/* ADVANCED COLUMNS EXPANSION */}
                {mode === "Advanced" && (
                  <>
                    <SortHeader
                      label="MOAT"
                      colKey="moat"
                      sortConfig={sortConfig}
                      onSort={handleSort}
                      align="center"
                    />

                    <SortHeader
                      label="AVG FCF (CR)"
                      colKey="avg_fcf"
                      sortConfig={sortConfig}
                      onSort={handleSort}
                      align="right"
                    />

                    <SortHeader
                      label="DCF (25X)"
                      colKey="dcf"
                      sortConfig={sortConfig}
                      onSort={handleSort}
                      align="right"
                    />

                    <SortHeader
                      label="MCAP (CR)"
                      colKey="market_cap_cr"
                      sortConfig={sortConfig}
                      onSort={handleSort}
                      align="right"
                    />

                    <SortHeader
                      label="VALUE"
                      colKey="value_ratio"
                      sortConfig={sortConfig}
                      onSort={handleSort}
                      align="center"
                    />

                    <SortHeader
                      label="PEAD"
                      colKey="pead_score"
                      sortConfig={sortConfig}
                      onSort={handleSort}
                      align="center"
                    />
                  </>
                )}

                <SortHeader
                  label="TREND"
                  colKey="trend"
                  sortConfig={sortConfig}
                  onSort={handleSort}
                  align="center"
                  title="Sort by 1-Month Trend %"
                />

                <th className="p-3 text-center">RESULTS</th>
                <th className="p-3 text-center">REPORTS</th>

                <SortHeader
                  label="COMMENTS"
                  colKey="comment"
                  sortConfig={sortConfig}
                  onSort={handleSort}
                />
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
                    
                    {/* Stock Name + Ticker Badge */}
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

                    {/* CMP with Live % Change */}
                    <td className="p-3 text-right font-mono">
                      <div className="font-bold text-slate-100">₹{c.cmp?.toLocaleString('en-IN')}</div>
                      <div className={`text-[10px] font-semibold ${c.change_pct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {c.change_pct >= 0 ? '+' : ''}{c.change_pct}%
                      </div>
                    </td>

                    {/* Analyst Badge */}
                    <td className="p-3">
                      <div className="inline-flex items-center gap-1.5 bg-indigo-950/60 border border-indigo-700/50 text-indigo-300 px-2 py-0.5 rounded-full text-[11px] font-semibold">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                        {c.analyst || 'Unassigned'}
                      </div>
                    </td>

                    {/* 4-Scenario CAGR Columns */}
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

                    {/* ADVANCED COLUMNS DATA */}
                    {mode === "Advanced" && (
                      <>
                        <td className="p-3 text-center">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold ${
                            (c.moat || '').includes('Strong') ? 'bg-purple-950/70 border border-purple-700/50 text-purple-300' : 'bg-[#141A2E] text-slate-400'
                          }`}>
                            {c.moat || 'Moderate'}
                          </span>
                        </td>
                        <td className="p-3 text-right font-mono text-slate-300">
                          ₹{c.avg_fcf ? c.avg_fcf.toLocaleString('en-IN') : '—'}
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-indigo-400">
                          ₹{c.dcf ? c.dcf.toLocaleString('en-IN') : '—'}
                        </td>
                        <td className="p-3 text-right font-mono text-slate-200">
                          ₹{c.market_cap_cr ? c.market_cap_cr.toLocaleString('en-IN') : '—'}
                        </td>
                        <td className="p-3 text-center font-mono">
                          <span className={`font-bold ${
                            c.value_ratio <= 0.85 ? 'text-emerald-400' : c.value_ratio > 1.3 ? 'text-rose-400' : 'text-slate-300'
                          }`}>
                            {c.value_ratio ? `${c.value_ratio}x` : 'N/M'}
                          </span>
                        </td>
                        <td className="p-3 text-center font-mono">
                          <span className="px-2 py-0.5 rounded font-bold text-[10px] bg-emerald-950/60 border border-emerald-800/40 text-emerald-400">
                            {c.pead_score || 7}/10
                          </span>
                        </td>
                      </>
                    )}

                    {/* DYNAMIC 30-DAY STOCK GRAPH SPARKLINE */}
                    <td className="p-3 text-center">
                      <Sparkline data={c.trend} changePct={c.change_pct} />
                    </td>

                    {/* LATEST RESULT PDF / WORD DIRECT LINK */}
                    <td className="p-3 text-center">
                      <a
                        href={c.results_url || `https://www.screener.in/company/${c.ticker}/#documents`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center justify-center p-1.5 rounded hover:bg-[#1F2942] text-slate-400 hover:text-amber-400 transition"
                        title="View Latest Quarterly Result PDF / Filing"
                      >
                        📄
                      </a>
                    </td>

                    {/* REPORTS / SCREENER PROFILE */}
                    <td className="p-3 text-center">
                      <a
                        href={c.reports_url || `https://www.screener.in/company/${c.ticker}/`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center justify-center p-1.5 rounded hover:bg-[#1F2942] text-slate-400 hover:text-indigo-400 transition"
                        title="Open Screener.in Consolidated Reports"
                      >
                        📎
                      </a>
                    </td>

                    {/* INLINE COMMENT EDITOR */}
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
