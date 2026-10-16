import os
import json
import sqlite3
from typing import List
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from .models import CompanyFullRecord, CompanySummary
from .scrapers import (
    SEED_TRACKER_STOCKS,
    build_fallback_record,
    scrape_screener_company,
    fetch_nifty500_constituents
)
from .calculator import recalculate_scenario_rows, build_targets_from_rows

app = FastAPI(title="Finastra Scenario Valuation Studio API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DB_PATH = os.getenv("SQLITE_DB_PATH", "valuation_studio.db")

def init_db():
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute("PRAGMA journal_mode=WAL;")
        conn.execute("""
            CREATE TABLE IF NOT EXISTS company_valuations (
                ticker TEXT PRIMARY KEY,
                data JSON NOT NULL,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)
        # Seed initial tracker stocks if DB is empty
        cur = conn.cursor()
        cur.execute("SELECT COUNT(*) FROM company_valuations")
        if cur.fetchone()[0] == 0:
            for item in SEED_TRACKER_STOCKS:
                rec = build_fallback_record(item["ticker"], item)
                conn.execute(
                    "INSERT OR IGNORE INTO company_valuations (ticker, data) VALUES (?, ?)",
                    (rec.ticker, rec.model_dump_json())
                )

init_db()

@app.get("/api/tracker")
def get_tracker_companies():
    with sqlite3.connect(DB_PATH) as conn:
        cur = conn.cursor()
        cur.execute("SELECT data FROM company_valuations ORDER BY updated_at DESC")
        rows = [json.loads(r[0]) for r in cur.fetchall()]
    return {"count": len(rows), "companies": rows}

@app.get("/api/nifty500")
def get_nifty500():
    constituents = fetch_nifty500_constituents()
    with sqlite3.connect(DB_PATH) as conn:
        cur = conn.cursor()
        cur.execute("SELECT ticker, data FROM company_valuations")
        tracked_map = {r[0]: json.loads(r[1]) for r in cur.fetchall()}

    merged = []
    for c in constituents:
        t = c["ticker"]
        if t in tracked_map:
            merged.append(tracked_map[t])
        else:
            merged.append({
                "ticker": t,
                "company_name": c["company_name"],
                "stock_type": "STD",
                "cmp": 0.0,
                "change_pct": 0.0,
                "pe_ratio": 0.0,
                "market_cap_cr": 0.0,
                "high_52w": 0.0,
                "analyst": "Unassigned",
                "base_cagr": None,
                "bull_cagr": None,
                "bear_cagr": None,
                "mgmt_cagr": None,
                "target_fy": "PE · FY2028",
                "sparkline": [100, 101, 100.5, 102, 103],
                "comments": f"Sector: {c.get('industry', 'NIFTY 500')}",
                "in_tracker": False,
                "is_test": False
            })
    return {"count": len(merged), "companies": merged}

@app.get("/api/companies/{ticker}")
def get_or_fetch_company(ticker: str, refresh: bool = False):
    ticker = ticker.upper().strip()
    if not refresh:
        with sqlite3.connect(DB_PATH) as conn:
            cur = conn.cursor()
            cur.execute("SELECT data FROM company_valuations WHERE ticker = ?", (ticker,))
            row = cur.fetchone()
            if row:
                return json.loads(row[0])

    # Live scrape from Screener.in
    record = scrape_screener_company(ticker)
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute(
            "INSERT OR REPLACE INTO company_valuations (ticker, data, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)",
            (ticker, record.model_dump_json())
        )
    return record

@app.post("/api/companies/{ticker}/save")
def save_company_model(ticker: str, payload: CompanyFullRecord):
    ticker = ticker.upper().strip()
    # Recompute scenario rows and top-level CAGRs before saving
    for sc_name, sc in payload.scenarios.items():
        sc.financials = recalculate_scenario_rows(sc.financials, payload.cmp)
        mult_map = {t.fy_label: t.pe_multiple for t in sc.targets}
        sc.targets = build_targets_from_rows(sc.financials, payload.cmp, mult_map)
        
        # Sync FY2028 CAGR to summary header
        fy28 = next((t.cagr_pct for t in sc.targets if t.fy_label == sc.selected_fy), None)
        if fy28 is None and sc.targets:
            fy28 = sc.targets[1].cagr_pct if len(sc.targets) > 1 else sc.targets[0].cagr_pct
            
        if sc_name == "Base Case":
            payload.base_cagr = fy28
        elif sc_name == "Bull Case":
            payload.bull_cagr = fy28
        elif sc_name == "Bear Case":
            payload.bear_cagr = fy28
        elif sc_name == "Management
