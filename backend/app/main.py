import os
import json
import sqlite3
from typing import Dict, Any, List
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from .models import CompanyMaster, FinancialYearRow, PeHistoryStats
from .scrapers import (
    TRACKER_SCREENER_STOCKS,
    fetch_nifty500_universe,
    fetch_stock_30d_trend,
    fetch_screener_details
)
from .calculator import (
    build_default_scenarios,
    generate_sensitivity_matrix,
    extract_year
)

app = FastAPI(title="NVT Institutional Valuation & Tracker Engine")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DB_PATH = os.getenv("SQLITE_DB_PATH", "valuation_master.db")

def init_db():
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute("PRAGMA journal_mode=WAL;")
        conn.execute("""
            CREATE TABLE IF NOT EXISTS companies (
                ticker TEXT PRIMARY KEY,
                data JSON NOT NULL,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)
        cur = conn.cursor()
        cur.execute("SELECT count(*) FROM companies")
        count = cur.fetchone()[0]

        if count < 5:
            print("🚀 Seeding Tracker & NIFTY 500 Universe into database...")
            for s in TRACKER_SCREENER_STOCKS:
                hist = []
                for h in s.get("history", []):
                    hist.append(FinancialYearRow(
                        fy_label=h["year"],
                        revenue=h["rev"],
                        expenses=h["exp"],
                        operating_profit=h["op"],
                        opm_percent=h["opm"],
                        other_income=h.get("other", 0.0),
                        interest_expense=h.get("int", 0.0),
                        depreciation=h.get("dep", 0.0),
                        pbt=h["pbt"],
                        pat=h["pat"],
                        shares_cr=s["shares_cr"],
                        eps=h["eps"]
                    ))

                for i in range(1, len(hist)):
                    if hist[i-1].revenue > 0:
                        hist[i].revenue_growth = round(((hist[i].revenue - hist[i-1].revenue) / hist[i-1].revenue) * 100.0, 1)

                pe_stats = PeHistoryStats(
                    min=s.get("pe_min", 15.0),
                    median=s.get("pe_med", 24.0),
                    avg=s.get("pe_avg", 23.5),
                    max=s.get("pe_max", 35.0)
                )

                scenarios = build_default_scenarios(
                    history=hist,
                    cmp=s["cmp"],
                    shares_cr=s["shares_cr"],
                    pe_history=pe_stats,
                    moat="Strong" if s["ticker"] in ["DANISH", "AUGMONT", "TRENT"] else "Moderate"
                )

                rec = CompanyMaster(
                    ticker=s["ticker"],
                    company_name=s["company_name"],
                    cmp=s["cmp"],
                    change_pct=s["change_pct"],
                    pe_ratio=s.get("pe_ratio", 24.0),
                    market_cap_cr=s.get("market_cap_cr", 2000.0),
                    high_52w=round(s["cmp"] * 1.18, 1),
                    low_52w=round(s["cmp"] * 0.75, 1),
                    shares_cr=s["shares_cr"],
                    latest_fy=extract_year(hist[-1].fy_label if hist else "2026"),
                    analyst=s["analyst"],
                    type=s["type"],
                    in_tracker=True,
                    comment=s["comment"],
                    trend=[s["cmp"] * (1 + (i * 0.006)) for i in range(15)],
                    results_url=f"https://www.screener.in/company/{s['ticker']}/#documents",
                    reports_url=f"https://www.screener.in/company/{s['ticker']}/",
                    pe_history=pe_stats,
                    moat="Strong" if s["ticker"] in ["DANISH", "AUGMONT", "TRENT"] else "Moderate",
                    moat_score=8.5 if s["ticker"] in ["DANISH", "TRENT"] else 6.5,
                    avg_fcf=round(s["cmp"] * s["shares_cr"] * 0.04, 1),
                    fcfd=round(s["cmp"] * s["shares_cr"] * 0.04 * 50, 1),
                    dcf=round(s["cmp"] * s["shares_cr"] * 0.04 * 25, 1),
                    value_ratio=0.85 if s["ticker"] in ["DANISH", "TRENT"] else 1.18,
                    opinion="Attractive" if s["ticker"] in ["DANISH", "TRENT"] else "Reasonable",
                    pead_score=8.5 if s["ticker"] in ["DANISH", "OPTIEMUS"] else 6.0,
                    return_1m=f"+{s['change_pct'] * 2.5:.1f}%",
                    scenarios=scenarios
                )
                conn.execute("INSERT OR REPLACE INTO companies (ticker, data) VALUES (?, ?)", (s["ticker"], rec.model_dump_json()))

            # Seed NIFTY 500 Directory
            nifty_list = fetch_nifty500_universe()
            for stock in nifty_list:
                ticker = stock["ticker"]
                if ticker in [x["ticker"] for x in TRACKER_SCREENER_STOCKS]:
                    continue
                hist = [
                    FinancialYearRow(fy_label="MAR 2024", revenue=10000, expenses=8000, operating_profit=2000, opm_percent=20.0, pbt=1800, pat=1350, eps=25.0),
                    FinancialYearRow(fy_label="MAR 2025", revenue=11500, revenue_growth=15.0, expenses=9100, operating_profit=2400, opm_percent=20.9, pbt=2160, pat=1620, eps=30.0),
                    FinancialYearRow(fy_label="MAR 2026", revenue=13200, revenue_growth=14.8, expenses=10300, operating_profit=2900, opm_percent=22.0, pbt=2600, pat=1950, eps=36.1)
                ]
                cmp_est = 1500.0
                pe_stats = PeHistoryStats(min=18.0, median=25.0, avg=25.5, max=35.0)
                scenarios = build_default_scenarios(hist, cmp_est, shares_cr=54.0, pe_history=pe_stats)
                rec = CompanyMaster(
                    ticker=ticker,
                    company_name=stock["company_name"],
                    industry=stock["industry"],
                    cmp=cmp_est,
                    change_pct=round((hash(ticker) % 70 - 30) / 10.0, 2),
                    pe_ratio=24.5,
                    market_cap_cr=81000.0,
                    high_52w=1750.0,
                    low_52w=1250.0,
                    shares_cr=54.0,
                    latest_fy=2026,
                    analyst="Institutional",
                    type="STD",
                    in_tracker=False,
                    comment="NIFTY 500 Index Constituent",
                    trend=[100, 102, 101, 105, 104, 108, 110],
                    results_url=f"https://www.screener.in/company/{ticker}/#documents",
                    reports_url=f"https://www.screener.in/company/{ticker}/",
                    pe_history=pe_stats,
                    moat="Strong",
                    moat_score=7.5,
                    avg_fcf=2800.0,
                    fcfd=140000.0,
                    dcf=70000.0,
                    value_ratio=1.15,
                    opinion="Reasonable",
                    pead_score=7.0,
                    return_1m="+3.1%",
                    scenarios=scenarios
                )
                conn.execute("INSERT OR REPLACE INTO companies (ticker, data) VALUES (?, ?)", (ticker, rec.model_dump_json()))

init_db()

@app.get("/api/companies")
def get_companies(tab: str = "tracker"):
    with sqlite3.connect(DB_PATH) as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT data FROM companies")
        rows = cursor.fetchall()
        companies = [json.loads(r[0]) for r in rows]
        if tab == "tracker":
            return [c for c in companies if c.get("in_tracker") is True]
        return companies

@app.get("/api/stock/{ticker}")
def get_stock(ticker: str):
    ticker = ticker.upper()
    with sqlite3.connect(DB_PATH) as conn:
        cur = conn.cursor()
        cur.execute("SELECT data FROM companies WHERE ticker = ?", (ticker,))
        row = cur.fetchone()
        if not row:
            details = fetch_screener_details(ticker)
            trend = fetch_stock_30d_trend(ticker)
            hist = details.get("financial_history") or [
                FinancialYearRow(fy_label="MAR 2024", revenue=500, expenses=400, operating_profit=100, opm_percent=20.0, pbt=90, pat=67, eps=12.0),
                FinancialYearRow(fy_label="MAR 2025", revenue=600, revenue_growth=20.0, expenses=470, operating_profit=130, opm_percent=21.6, pbt=120, pat=90, eps=16.0),
                FinancialYearRow(fy_label="MAR 2026", revenue=720, revenue_growth=20.0, expenses=560, operating_profit=160, opm_percent=22.2, pbt=150, pat=112, eps=20.0)
            ]
            cmp_val = details["cmp"] if details["cmp"] > 0 else 500.0
            shares = details.get("shares_cr", 1.0)
            pe_stats = PeHistoryStats(**details.get("pe_history", {}))
            scenarios = build_default_scenarios(hist, cmp_val, shares_cr=shares, pe_history=pe_stats, moat=details["moat"])

            rec = CompanyMaster(
                ticker=ticker,
                company_name=ticker,
                cmp=cmp_val,
                pe_ratio=details["pe"],
                market_cap_cr=details["market_cap"],
                high_52w=details["high_52w"],
                low_52w=details.get("low_52w", 0.0),
                shares_cr=shares,
                latest_fy=extract_year(hist[-1].fy_label),
                in_tracker=False,
                trend=trend,
                results_url=details["results_pdf"],
                reports_url=details["reports_link"],
                pe_history=pe_stats,
                moat=details["moat"],
                avg_fcf=details["avg_fcf"],
                dcf=details["dcf"],
                value_ratio=details["value_ratio"],
                scenarios=scenarios
            )
            conn.execute("INSERT OR REPLACE INTO companies (ticker, data) VALUES (?, ?)", (ticker, rec.model_dump_json()))
            return rec.model_dump()
        return json.loads(row[0])

@app.post("/api/stock/{ticker}/fetch")
def live_scrape_stock(ticker: str):
    ticker = ticker.upper()
    details = fetch_screener_details(ticker)
    trend = fetch_stock_30d_trend(ticker)

    with sqlite3.connect(DB_PATH) as conn:
        cur = conn.cursor()
        cur.execute("SELECT data FROM companies WHERE ticker = ?", (ticker,))
        row = cur.fetchone()
        if row:
            record = json.loads(row[0])
            if details.get("cmp"):
                record["cmp"] = details["cmp"]
            if details.get("pe"):
                record["pe_ratio"] = details["pe"]
            if details.get("market_cap"):
                record["market_cap_cr"] = details["market_cap"]
            if details.get("high_52w"):
                record["high_52w"] = details["high_52w"]
            if details.get("low_52w"):
                record["low_52w"] = details["low_52w"]
            if details.get("shares_cr"):
                record["shares_cr"] = details["shares_cr"]
            if details.get("results_pdf"):
                record["results_url"] = details["results_pdf"]
            if details.get("pe_history"):
                record["pe_history"] = details["pe_history"]
            if trend:
                record["trend"] = trend

            if details.get("financial_history"):
                scenarios = build_default_scenarios(
                    history=details["financial_history"],
                    cmp=record["cmp"],
                    shares_cr=record["shares_cr"],
                    pe_history=PeHistoryStats(**record.get("pe_history", {})),
                    moat=details.get("moat", record.get("moat", "Moderate"))
                )
                record["scenarios"] = {k: v.model_dump() for k, v in scenarios.items()}
                record["latest_fy"] = extract_year(details["financial_history"][-1].fy_label)

            conn.execute("UPDATE companies SET data = ? WHERE ticker = ?", (json.dumps(record), ticker))
            return record
        else:
            raise HTTPException(status_code=404, detail="Stock not found")

@app.get("/api/stock/{ticker}/sensitivity")
def get_sensitivity(ticker: str, horizon: float = 2.0):
    ticker = ticker.upper()
    with sqlite3.connect(DB_PATH) as conn:
        cur = conn.cursor()
        cur.execute("SELECT data FROM companies WHERE ticker = ?", (ticker,))
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Stock not found")
        rec = json.loads(row[0])
        mgmt_case = rec.get("scenarios", {}).get("Management Case", {})
        financials = mgmt_case.get("financials", [])
        base_eps = 20.0
        for f in financials:
            if not f.get("is_estimate"):
                base_eps = f.get("eps", base_eps)

        pe_stats = rec.get("pe_history", {})
        median_pe = pe_stats.get("median", 25.0)
        pe_range = [
            round(median_pe * 0.7, 1),
            round(median_pe * 0.85, 1),
            round(median_pe * 1.0, 1),
            round(median_pe * 1.15, 1),
            round(median_pe * 1.3, 1),
            round(median_pe * 1.45, 1)
        ]
        return generate_sensitivity_matrix(
            base_eps=base_eps,
            cmp=rec.get("cmp", 100.0),
            pe_multiples=pe_range,
            horizon_years=horizon
        )

@app.post("/api/stock/{ticker}/save")
def save_stock(ticker: str, payload: CompanyMaster):
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute("INSERT OR REPLACE INTO companies (ticker, data) VALUES (?, ?)", (ticker.upper(), payload.model_dump_json()))
    return {"status": "success", "ticker": ticker}

@app.post("/api/stock/{ticker}/comment")
def update_comment(ticker: str, body: Dict[str, str]):
    new_comment = body.get("comment", "")
    with sqlite3.connect(DB_PATH) as conn:
        cur = conn.cursor()
        cur.execute("SELECT data FROM companies WHERE ticker = ?", (ticker.upper(),))
        row = cur.fetchone()
        if row:
            rec = json.loads(row[0])
            rec["comment"] = new_comment
            conn.execute("UPDATE companies SET data = ? WHERE ticker = ?", (json.dumps(rec), ticker.upper()))
    return {"status": "success"}
