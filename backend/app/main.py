import os
import json
import sqlite3
from typing import Dict, Any, List
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from .models import CompanyMaster, FinancialYearRow
from .scrapers import (
    TRACKER_SCREENER_STOCKS,
    fetch_nifty500_universe,
    fetch_stock_30d_trend,
    fetch_screener_details
)
from .calculator import build_default_scenarios

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
        
        # Seed if fewer than 50 stocks exist (to guarantee all NIFTY 500 + Tracker stocks)
        if count < 50:
            print("🚀 Seeding Tracker & NIFTY 500 Universe into database...")
            # 1. Seed Tracker Screeners
            for s in TRACKER_SCREENER_STOCKS:
                hist = [
                    FinancialYearRow(fy_label="MAR 2021", revenue=118, revenue_growth=15.7, expenses=113, operating_profit=4, opm_percent=3.4, pbt=3, pat=2, eps=1.0),
                    FinancialYearRow(fy_label="MAR 2022", revenue=149, revenue_growth=26.3, expenses=138, operating_profit=10, opm_percent=6.7, pbt=8, pat=6, eps=3.0),
                    FinancialYearRow(fy_label="MAR 2023", revenue=188, revenue_growth=26.2, expenses=172, operating_profit=16, opm_percent=8.5, pbt=12, pat=9, eps=4.5),
                    FinancialYearRow(fy_label="MAR 2024", revenue=332, revenue_growth=76.6, expenses=277, operating_profit=55, opm_percent=16.6, pbt=50, pat=38, eps=19.3),
                    FinancialYearRow(fy_label="MAR 2025", revenue=427, revenue_growth=28.6, expenses=344, operating_profit=83, opm_percent=19.4, pbt=78, pat=55, eps=27.7),
                    FinancialYearRow(fy_label="MAR 2026", revenue=521, revenue_growth=22.0, expenses=429, operating_profit=92, opm_percent=17.7, pbt=90, pat=69, eps=35.0),
                ]
                scenarios = build_default_scenarios(hist, s["cmp"])
                rec = CompanyMaster(
                    ticker=s["ticker"],
                    company_name=s["company_name"],
                    cmp=s["cmp"],
                    change_pct=s["change_pct"],
                    pe_ratio=27.8,
                    market_cap_cr=1915.0,
                    high_52w=round(s["cmp"] * 1.15, 1),
                    analyst=s["analyst"],
                    type=s["type"],
                    in_tracker=True,
                    comment=s["comment"],
                    trend=[s["cmp"] * (1 + (i*0.008)) for i in range(15)],
                    results_url=f"https://www.screener.in/company/{s['ticker']}/#documents",
                    reports_url=f"https://www.screener.in/company/{s['ticker']}/",
                    moat="Strong" if s["ticker"] in ["DANISH", "AUGMONT", "TRENT"] else "Moderate",
                    avg_fcf=round(s["cmp"] * 0.45, 1),
                    fcfd=round(s["cmp"] * 0.45 * 50, 1),
                    dcf=round(s["cmp"] * 0.45 * 25, 1),
                    value_ratio=0.82 if s["ticker"] in ["DANISH", "TRENT"] else 1.24,
                    opinion="Attractive" if s["ticker"] in ["DANISH", "TRENT"] else "Reasonable",
                    pead_score=8.0 if s["ticker"] in ["DANISH", "OPTIEMUS"] else 5.0,
                    return_1m=f"+{s['change_pct'] * 2.5:.1f}%",
                    scenarios=scenarios
                )
                conn.execute("INSERT OR REPLACE INTO companies (ticker, data) VALUES (?, ?)", (s["ticker"], rec.model_dump_json()))

            # 2. Seed NIFTY 500 Constituents
            nifty_list = fetch_nifty500_universe()
            for stock in nifty_list:
                ticker = stock["ticker"]
                if ticker in [x["ticker"] for x in TRACKER_SCREENER_STOCKS]:
                    continue  # already in tracker
                hist = [
                    FinancialYearRow(fy_label="MAR 2024", revenue=1000, expenses=800, operating_profit=200, opm_percent=20.0, pbt=180, pat=135, eps=25.0),
                    FinancialYearRow(fy_label="MAR 2025", revenue=1150, revenue_growth=15.0, expenses=900, operating_profit=250, opm_percent=21.7, pbt=220, pat=165, eps=30.0),
                    FinancialYearRow(fy_label="MAR 2026", revenue=1320, revenue_growth=14.8, expenses=1020, operating_profit=300, opm_percent=22.7, pbt=270, pat=202, eps=37.0)
                ]
                cmp_est = 1500.0
                scenarios = build_default_scenarios(hist, cmp_est)
                rec = CompanyMaster(
                    ticker=ticker,
                    company_name=stock["company_name"],
                    industry=stock["industry"],
                    cmp=cmp_est,
                    change_pct=round((hash(ticker) % 70 - 30) / 10.0, 2),
                    pe_ratio=24.5,
                    market_cap_cr=25000.0,
                    high_52w=1750.0,
                    analyst="Institutional",
                    type="STD",
                    in_tracker=False,
                    comment="NIFTY 500 Index Constituent",
                    trend=[100, 102, 101, 105, 104, 108, 110],
                    results_url=f"https://www.screener.in/company/{ticker}/#documents",
                    reports_url=f"https://www.screener.in/company/{ticker}/",
                    moat="Strong",
                    avg_fcf=450.0,
                    fcfd=22500.0,
                    dcf=11250.0,
                    value_ratio=1.05,
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
            # Dynamically fetch if not present
            details = fetch_screener_details(ticker)
            trend = fetch_stock_30d_trend(ticker)
            hist = [
                FinancialYearRow(fy_label="MAR 2024", revenue=500, expenses=400, operating_profit=100, opm_percent=20.0, pbt=90, pat=67, eps=12.0),
                FinancialYearRow(fy_label="MAR 2025", revenue=600, revenue_growth=20.0, expenses=470, operating_profit=130, opm_percent=21.6, pbt=120, pat=90, eps=16.0),
                FinancialYearRow(fy_label="MAR 2026", revenue=720, revenue_growth=20.0, expenses=560, operating_profit=160, opm_percent=22.2, pbt=150, pat=112, eps=20.0)
            ]
            cmp_val = details["cmp"] if details["cmp"] > 0 else 500.0
            scenarios = build_default_scenarios(hist, cmp_val)
            rec = CompanyMaster(
                ticker=ticker,
                company_name=ticker,
                cmp=cmp_val,
                pe_ratio=details["pe"],
                market_cap_cr=details["market_cap"],
                high_52w=details["high_52w"],
                in_tracker=False,
                trend=trend,
                results_url=details["results_pdf"],
                reports_url=details["reports_link"],
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
            if details.get("results_pdf"):
                record["results_url"] = details["results_pdf"]
            if trend:
                record["trend"] = trend
            if details.get("avg_fcf"):
                record["avg_fcf"] = details["avg_fcf"]
                record["dcf"] = details["dcf"]
                record["value_ratio"] = details["value_ratio"]
                record["moat"] = details["moat"]
            conn.execute("UPDATE companies SET data = ? WHERE ticker = ?", (json.dumps(record), ticker))
            return record
        else:
            raise HTTPException(status_code=404, detail="Stock not found")

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
