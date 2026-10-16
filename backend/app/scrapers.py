import requests
from bs4 import BeautifulSoup
import re
import math
from typing import Dict, Any, List, Optional

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Accept-Language": "en-US,en;q=0.9",
}

NIFTY_500_SEEDS = [
    {"ticker": "DANISH", "company": "Danish Power Ltd", "cmp": 972.0, "change_pct": 3.98, "analyst": "Saurabh", "type": "STD", "base_cagr": 14.5, "bull_cagr": 39.1, "bear_cagr": -10.2, "mgmt_cagr": 53.0, "in_tracker": True, "comment": "Debt free company with 70% revenue from solar transformers, foray into higher KV- 220 and 440kv."},
    {"ticker": "AUGMONT", "company": "Augmont Enterprises Ltd", "cmp": 1334.55, "change_pct": 1.59, "analyst": "Saurabh", "type": "STD", "base_cagr": -5.0, "bull_cagr": 25.0, "bear_cagr": -31.6, "mgmt_cagr": None, "in_tracker": True, "comment": "Platform business with gold bullion refining and retail gold SIP distribution."},
    {"ticker": "OPTIEMUS", "company": "Optiemus Infracom Ltd", "cmp": 788.95, "change_pct": 3.85, "analyst": "Sameer", "type": "STD", "base_cagr": 34.3, "bull_cagr": None, "bear_cagr": None, "mgmt_cagr": 70.4, "in_tracker": True, "comment": "Execution will be the key, given high customer expectations and delivery record."},
    {"ticker": "TEGA", "company": "Tega Industries Ltd", "cmp": 1926.45, "change_pct": 1.89, "analyst": "Sameer", "type": "STD", "base_cagr": 6.2, "bull_cagr": None, "bear_cagr": None, "mgmt_cagr": None, "in_tracker": True, "comment": "Acquisition led growth, not organic. Re-rating contingent on North America integration."},
    {"ticker": "RBZ", "company": "RBZ Jewellers Ltd", "cmp": 199.50, "change_pct": -0.85, "analyst": "Saurabh", "type": "STD", "base_cagr": 15.6, "bull_cagr": 48.4, "bear_cagr": -8.1, "mgmt_cagr": None, "in_tracker": True, "comment": "Aggressive and growth hungry, risk profile elevated with past working capital expansion."},
    {"ticker": "RELIANCE", "company": "Reliance Industries Ltd", "cmp": 2985.00, "change_pct": 0.82, "analyst": "Institutional", "type": "STD", "base_cagr": 12.8, "bull_cagr": 22.4, "bear_cagr": -2.1, "mgmt_cagr": 18.5, "in_tracker": False, "comment": "Retail and Jio tariff revisions driving free cash generation."},
    {"ticker": "TCS", "company": "Tata Consultancy Services Ltd", "cmp": 4120.00, "change_pct": -0.45, "analyst": "Institutional", "type": "STD", "base_cagr": 11.2, "bull_cagr": 18.0, "bear_cagr": 2.5, "mgmt_cagr": 14.0, "in_tracker": False, "comment": "BFSI recovery and mega-deal momentum sustaining double digit returns."},
    {"ticker": "HDFCBANK", "company": "HDFC Bank Ltd", "cmp": 1680.00, "change_pct": 1.15, "analyst": "Institutional", "type": "STD", "base_cagr": 16.5, "bull_cagr": 28.0, "bear_cagr": 4.2, "mgmt_cagr": 21.0, "in_tracker": False, "comment": "Credit-to-deposit normalization ahead of schedule; NIMs bottoming."},
    {"ticker": "INFY", "company": "Infosys Ltd", "cmp": 1890.00, "change_pct": 2.10, "analyst": "Institutional", "type": "STD", "base_cagr": 13.0, "bull_cagr": 21.5, "bear_cagr": 1.0, "mgmt_cagr": 17.5, "in_tracker": False, "comment": "Discretionary IT spending turning positive in North America."},
    {"ticker": "ICICIBANK", "company": "ICICI Bank Ltd", "cmp": 1260.00, "change_pct": 0.95, "analyst": "Institutional", "type": "STD", "base_cagr": 17.2, "bull_cagr": 26.5, "bear_cagr": 5.0, "mgmt_cagr": 22.0, "in_tracker": False, "comment": "Consistent best-in-class ROA (2.3%) and asset quality."},
    {"ticker": "BHARTIARTL", "company": "Bharti Airtel Ltd", "cmp": 1650.00, "change_pct": 1.40, "analyst": "Sameer", "type": "STD", "base_cagr": 18.5, "bull_cagr": 31.0, "bear_cagr": 3.5, "mgmt_cagr": 24.0, "in_tracker": False, "comment": "ARPU expanding towards ₹300 milestone with 5G monetization."},
    {"ticker": "LT", "company": "Larsen & Toubro Ltd", "cmp": 3620.00, "change_pct": 0.65, "analyst": "Saurabh", "type": "STD", "base_cagr": 15.0, "bull_cagr": 24.5, "bear_cagr": 0.5, "mgmt_cagr": 19.0, "in_tracker": False, "comment": "Record ₹5 Lakh Cr order book provides 3-year revenue visibility."}
]

def clean_num(text: Optional[str]) -> float:
    if not text:
        return 0.0
    cleaned = re.sub(r"[^\d.-]", "", text)
    try:
        return float(cleaned)
    except ValueError:
        return 0.0

def fetch_screener_financials(ticker: str) -> Dict[str, Any]:
    url = f"https://www.screener.in/company/{ticker.upper()}/consolidated/"
    session = requests.Session()
    session.headers.update(HEADERS)
    
    resp = session.get(url, timeout=12)
    if resp.status_code == 404:
        # Retry standalone
        url = f"https://www.screener.in/company/{ticker.upper()}/"
        resp = session.get(url, timeout=12)
        
    if resp.status_code != 200:
        return {}

    soup = BeautifulSoup(resp.text, "html.parser")
    
    # Overview metrics
    cmp_val = 0.0
    pe_val = 0.0
    mcap_val = 0.0
    high52_val = 0.0

    ratios_div = soup.find("ul", id="top-ratios")
    if ratios_div:
        for li in ratios_div.find_all("li"):
            name = li.find("span", class_="name")
            val = li.find("span", class_="nowrap value")
            if name and val:
                txt = name.text.strip().lower()
                num = clean_num(val.text)
                if "current price" in txt:
                    cmp_val = num
                elif "stock p/e" in txt:
                    pe_val = num
                elif "market cap" in txt:
                    mcap_val = num
                elif "high / low" in txt:
                    high52_val = num

    # Extract Income Statement
    pnl_section = soup.find("section", id="profit-loss")
    years = []
    sales_row = []
    opm_row = []
    op_row = []
    other_inc = []
    interest = []
    deprec = []
    pbt_row = []
    tax_pct = []
    net_profit = []
    eps_row = []

    if pnl_section:
        table = pnl_section.find("table", class_="data-table")
        if table:
            thead = table.find("thead")
            if thead:
                years = [th.text.strip().upper() for th in thead.find_all("th")[1:]]

            tbody = table.find("tbody")
            if tbody:
                for tr in tbody.find_all("tr"):
                    tds = tr.find_all("td")
                    if not tds:
                        continue
                    row_name = tds[0].text.strip().lower()
                    values = [clean_num(td.text) for td in tds[1:]]

                    if "sales" in row_name:
                        sales_row = values
                    elif "opm %" in row_name:
                        opm_row = values
                    elif "operating profit" in row_name:
                        op_row = values
                    elif "other income" in row_name:
                        other_inc = values
                    elif "interest" in row_name:
                        interest = values
                    elif "depreciation" in row_name:
                        deprec = values
                    elif "profit before tax" in row_name:
                        pbt_row = values
                    elif "tax %" in row_name:
                        tax_pct = values
                    elif "net profit" in row_name:
                        net_profit = values
                    elif "eps in rs" in row_name:
                        eps_row = values

    return {
        "ticker": ticker.upper(),
        "cmp": cmp_val,
        "pe": pe_val,
        "market_cap": mcap_val,
        "high_52w": high52_val,
        "years": years,
        "sales": sales_row,
        "opm": opm_row,
        "operating_profit": op_row,
        "other_income": other_inc,
        "interest": interest,
        "depreciation": deprec,
        "pbt": pbt_row,
        "tax": tax_pct,
        "pat": net_profit,
        "eps": eps_row
    }
