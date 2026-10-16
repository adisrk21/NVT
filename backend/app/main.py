import os
import json
import sqlite3
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from .models import CompanyMaster, FinancialYearRow
from .scrapers import NIFTY_500_SEEDS, fetch_screener_financials
from .calculator import build_default_scenarios

app = FastAPI(title="Valuation Studio & Tracker Engine")

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
        # Seed database if empty
        cur = conn.cursor()
        cur.execute("SELECT count(*) FROM companies")
        if cur.fetchone()[0] == 0:
            for s in NIFTY_500_SEEDS:
                # Seed baseline pro-forma
                hist = [
                    FinancialYearRow(fy_label="MAR 2021", revenue=118, revenue_growth=15.7, expenses=113, operating_profit=4, opm_percent=3.4, pbt=3, pat=2, shares_cr=1.97, eps=1.0),
                    FinancialYearRow(fy_label="MAR 2022", revenue=149, revenue_growth=26.3, expenses=138, operating_profit=10, opm_percent=6.7, pbt=8, pat=6, shares_cr=1.97, eps=3.0),
                    FinancialYearRow(fy_label="MAR 2023", revenue=188, revenue_growth=26.2, expenses=172, operating_profit=16, opm_percent=8.5, pbt=12, pat=9, shares_cr=1.97, eps=4.5),
                    FinancialYearRow(fy_label="MAR 2024", revenue=332, revenue_growth=76.6, expenses=277, operating_profit=55, opm_percent=16.6, pbt=50, pat=38, shares_cr=1.98, eps=19.3),
                    FinancialYearRow(fy_label="MAR 2025", revenue=427, revenue_growth=28.6, expenses=344, operating_profit=83, opm_percent=19.4, pbt=78, pat=55, shares_cr=1.97, eps=27.7),
                    FinancialYearRow(fy_label="MAR 2026", revenue=521, revenue_growth=22.0, expenses=429, operating_profit=92, opm_percent=17.7, pbt=90, pat=69, shares_cr=1.97, eps=35.0),
                ]
                scenarios = build_default_scenarios(hist, s["cmp"])
                rec = CompanyMaster(
                    ticker=s["ticker"],
                    company_name=s["company"],
                    cmp=s["cmp"],
                    change_pct=s["change_pct"],
                    pe_ratio=27.8,
                    market_cap_cr=1915.0,
                    high_52w=1095.0,
                    analyst=s["analyst"],
                    type=s["type"],
                    in_tracker=s["in_tracker"],
                    comment=s["comment"],
                    scenarios=scenarios
                )
                conn.execute("INSERT OR REPLACE INTO companies (ticker, data) VALUES (?, ?)", (s["ticker"], rec.model_dump_json()))

init_db()

@app.get("/api/companies")
def get_all_companies(tab: str = "tracker"):
    with sqlite3.connect(DB_PATH) as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT data FROM companies")
        rows = cursor.fetchall()
        companies = [json.loads(r[0]) for r in rows]
        if tab == "tracker":
            return [c for c in companies if c.get("in_tracker") is True]
        return companies

@app.get("/api/stock/{ticker}")
def get_stock_detail(ticker: str):
    ticker = ticker.upper()
    with sqlite3.connect(DB_PATH) as conn:
        cur = conn.cursor()
        cur.execute("SELECT data FROM companies WHERE ticker = ?", (ticker,))
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Company not registered.")
        return json.loads(row[0])

@app.post("/api/stock/{ticker}/fetch")
def fetch_live_data(ticker: str):
    ticker = ticker.upper()
    data = fetch_screener_financials(ticker)
    if not data or not data.get("cmp"):
        raise HTTPException(status_code=502, detail="Unable to retrieve live market filings from Screener.in")
    
    with sqlite3.connect(DB_PATH) as conn:
        cur = conn.cursor()
        cur.execute("SELECT data FROM companies WHERE ticker = ?", (ticker,))
        row = cur.fetchone()
        if row:
            existing = json.loads(row[0])
            existing["cmp"] = data["cmp"]
            existing["pe_ratio"] = data["pe"]
            existing["market_cap_cr"] = data["market_cap"]
            existing["high_52w"] = data["high_52w"]
            conn.execute("UPDATE companies SET data = ? WHERE ticker = ?", (json.dumps(existing), ticker))
            return existing
        else:
            return data

@app.post("/api/stock/{ticker}/save")
def save_stock_detail(ticker: str, payload: CompanyMaster):
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
            record = json.loads(row[0])
            record["comment"] = new_comment
            conn.execute("UPDATE companies SET data = ? WHERE ticker = ?", (json.dumps(record), ticker.upper()))
    return {"status": "success"}
