# backend/app/main.py
import os
import sqlite3
import json
from datetime import datetime
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from .models import CompanyValuationRecord
from .calculator import recompute_pro_forma, compute_valuation_targets

app = FastAPI(title="Finastra Scenario Valuation Engine")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Store directly in repository root — no paid disk mount required
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
init_db()

@app.get("/api/companies")
def list_companies():
    with sqlite3.connect(DB_PATH) as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT ticker, data FROM company_valuations")
        rows = cursor.fetchall()
        return [json.loads(r[1]) for r in rows]

@app.get("/api/companies/{ticker}")
def get_company(ticker: str):
    ticker = ticker.upper()
    with sqlite3.connect(DB_PATH) as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT data FROM company_valuations WHERE ticker = ?", (ticker,))
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail=f"Stock {ticker} not found.")
        return json.loads(row[0])

@app.post("/api/companies/{ticker}/save")
def save_company(ticker: str, payload: CompanyValuationRecord):
    ticker = ticker.upper()
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute(
            "INSERT OR REPLACE INTO company_valuations (ticker, data, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)",
            (ticker, payload.model_dump_json())
        )
    return {"status": "success", "ticker": ticker}
