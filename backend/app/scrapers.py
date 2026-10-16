import re
import io
import random
import requests
import pandas as pd
from bs4 import BeautifulSoup
from typing import List, Dict, Tuple
from .models import FinancialYearRow, CompanyFullRecord, CompanySummary
from .calculator import create_default_scenarios

USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
]

# Core Screener URLs from Stock Valuation Tool
SCREENER_URLS = [
    {"name": "High Growth Leaders", "url": "https://www.screener.in/screens/356039/high-growth-leaders/"},
    {"name": "Consistent Compounders", "url": "https://www.screener.in/screens/178865/consistent-compounders/"},
    {"name": "Debt Free Microcaps", "url": "https://www.screener.in/screens/342190/debt-free-small-caps/"},
]

SEED_TRACKER_STOCKS = [
    {"ticker": "DANISH", "name": "Danish Power Ltd", "cmp": 972.0, "chg": -3.98, "pe": 27.8, "mcap": 1915.0, "high52": 1095.0, "analyst": "Saurabh", "comments": "Debt free company with 70% revenue from solar transformers, foray into higher KV- 220 and 440kv. Track order book to get idea about topline growth."},
    {"ticker": "AUGMONT", "name": "Augmont Enterprises Ltd", "cmp": 1334.55, "chg": 1.59, "pe": 31.2, "mcap": 3420.0, "high52": 1490.0, "analyst": "Saurabh", "comments": "We studied it as platform business plus related party bullion ecosystem."},
    {"ticker": "OPTIEMUS", "name": "Optiemus Infracom Ltd", "cmp": 788.95, "chg": 3.85, "pe": 68.4, "mcap": 6780.0, "high52": 895.0, "analyst": "Sameer", "comments": "Execution will be the key, given the visibility and expectations and the need to demonstrate strong record of delivery."},
    {"ticker": "TEGA", "name": "Tega Industries Ltd", "cmp": 1926.45, "chg": 1.89, "pe": 58.0, "mcap": 12810.0, "high52": 2110.0, "analyst": "Sameer", "comments": "Acquisition led growth, not organic. Replacement demand resilient."},
    {"ticker": "RBZJEWEL", "name": "RBZ Jewellers Ltd", "cmp": 199.5, "chg": -1.12, "pe": 22.4, "mcap": 798.0, "high52": 248.0, "analyst": "Saurabh", "comments": "Aggressive and growth hungry, risk taker promoter with good past record."},
    {"ticker": "RELIANCE", "name": "Reliance Industries Ltd", "cmp": 2945.0, "chg": 0.85, "pe": 26.5, "mcap": 1992000.0, "high52": 3217.0, "analyst": "Saurabh", "comments": "Retail and Jio tariff hike operating leverage kicking in."},
    {"ticker": "TCS", "name": "Tata Consultancy Services Ltd", "cmp": 4120.0, "chg": -0.45, "pe": 30.1, "mcap": 1490000.0, "high52": 4592.0, "analyst": "Sameer", "comments": "BFSI recovery gradual; strong deal TCV pipeline."},
    {"ticker": "HDFCBANK", "name": "HDFC Bank Ltd", "cmp": 1685.0, "chg": 1.15, "pe": 19.2, "mcap": 1280000.0, "high52": 1794.0, "analyst": "Saurabh", "comments": "LDR normalization progressing ahead of schedule."},
    {"ticker": "INFY", "name": "Infosys Ltd", "cmp": 1875.0, "chg": 0.65, "pe": 28.4, "mcap": 778000.0, "high52": 1991.0, "analyst": "Sameer", "comments": "Upward guidance revision signals discretionary spend return."},
    {"ticker": "ICICIBANK", "name": "ICICI Bank Ltd", "cmp": 1265.0, "chg": 0.92, "pe": 19.8, "mcap": 890000.0, "high52": 1362.0, "analyst": "Saurabh", "comments": "Best-in-class RoA > 2.3% with pristine asset quality."},
    {"ticker": "BHARTIARTL", "name": "Bharti Airtel Ltd", "cmp": 1690.0, "chg": 1.40, "pe": 52.0, "mcap": 965000.0, "high52": 1779.0, "analyst": "Sameer", "comments": "ARPU expansion towards ₹250+ driving massive FCF."},
    {"ticker": "LT", "name": "Larsen & Toubro Ltd", "cmp": 3620.0, "chg": 0.30, "pe": 34.5, "mcap": 498000.0, "high52": 3919.0, "analyst": "Saurabh", "comments": "Middle East hydrocarbon + domestic infra order book at record high."},
    {"ticker": "TRENT", "name": "Trent Ltd", "cmp": 7450.0, "chg": 2.40, "pe": 145.0, "mcap": 264800.0, "high52": 8345.0, "analyst": "Sameer", "comments": "Zudio store blitzscaling + Star Bazaar unit economics turning positive."},
    {"ticker": "BEL", "name": "Bharat Electronics Ltd", "cmp": 292.0, "chg": 1.75, "pe": 46.2, "mcap": 213400.0, "high52": 340.0, "analyst": "Saurabh", "comments": "Indigenization defence electronics moat with 75,000 Cr+ order backlog."}
]

def _clean_float(val) -> float:
    if val is None:
        return 0.0
    s = re.sub(r"[^0-9.\-]", "", str(val))
    try:
        return float(s) if s not in ("", "-", ".") else 0.0
    except ValueError:
        return 0.0

def generate_sparkline(base: float, change_pct: float) -> List[float]:
    rng = random.Random(int(base * 100))
    pts = [100.0]
    drift = 0.3 if change_pct >= 0 else -0.2
    for _ in range(14):
        pts.append(round(max(60.0, pts[-1] + rng.uniform(-2.5, 2.8) + drift), 1))
    return pts

def scrape_screener_company(ticker: str) -> CompanyFullRecord:
    ticker = ticker.upper().strip()
    headers = {"User-Agent": random.choice(USER_AGENTS)}
    
    # Try consolidated first, then standalone
    soup = None
    for suffix in ["consolidated/", ""]:
        url = f"https://www.screener.in/company/{ticker}/{suffix}"
        try:
            resp = requests.get(url, headers=headers, timeout=10)
            if resp.status_code == 200 and "Profit & Loss" in resp.text:
                soup = BeautifulSoup(resp.text, "lxml")
                break
        except Exception:
            continue

    if not soup:
        return build_fallback_record(ticker)

    # Extract Header Details
    h1 = soup.find("h1")
    company_name = h1.get_text(strip=True) if h1 else ticker

    cmp, pe_ratio, market_cap_cr, high_52w, roce_pct, roe_pct = 0.0, 25.0, 0.0, 0.0, None, None
    for li in soup.select("#top-ratios li"):
        name_el = li.select_one(".name")
        val_el = li.select_one(".number")
        if not name_el or not val_el:
            continue
        label = name_el.get_text(strip=True).lower()
        nums = [ _clean_float(n.get_text(strip=True)) for n in li.select(".number") ]
        val = nums[0] if nums else 0.0

        if "current price" in label:
            cmp = val
        elif "stock p/e" in label:
            pe_ratio = val
        elif "market cap" in label:
            market_cap_cr = val
        elif "high / low" in label and nums:
            high_52w = nums[0]
        elif "roce" in label:
            roce_pct = val
        elif "roe" in label:
            roe_pct = val

    # Parse Profit & Loss Table
    history_rows: List[FinancialYearRow] = []
    pl_section = soup.find("section", id="profit-loss")
    if pl_section:
        table = pl_section.find("table", class_="data-table")
        if table:
            headers_th = [th.get_text(strip=True).upper() for th in table.select("thead th")][1:]
            # Keep non-TTM last 6 fiscal years
            valid_indices = [i for i, h in enumerate(headers_th) if "TTM" not in h][-6:]
            row_map: Dict[str, List[float]] = {}
            for tr in table.select("tbody tr"):
                tds = tr.find_all("td")
                if not tds:
                    continue
                row_title = tds[0].get_text(strip=True).lower()
                vals = [_clean_float(td.get_text(strip=True)) for td in tds[1:]]
                row_map[row_title] = vals

            def get_series(keys: List[str]) -> List[float]:
                for k, v in row_map.items():
                    if any(k.startswith(prefix) for prefix in keys):
                        return v
                return [0.0] * len(headers_th)

            sales_s = get_series(["sales", "revenue", "income"])
            exp_s   = get_series(["expenses", "financing profit"])
            op_s    = get_series(["operating profit", "ebitda"])
            opm_s   = get_series(["opm %", "financing margin"])
            other_s = get_series(["other income"])
            int_s   = get_series(["interest"])
            dep_s   = get_series(["depreciation"])
            pbt_s   = get_series(["profit before tax"])
            tax_s   = get_series(["tax %"])
            pat_s   = get_series(["net profit"])
            eps_s   = get_series(["eps in rs"])

            for pos, idx in enumerate(valid_indices):
                fy_lbl = headers_th[idx] if idx < len(headers_th) else f"MAR {2021+pos}"
                rev = sales_s[idx] if idx < len(sales_s) else 0.0
                prev_rev = sales_s[idx - 1] if idx > 0 and idx - 1 < len(sales_s) else 0.0
                rev_g = round(((rev - prev_rev) / abs(prev_rev)) * 100.0, 1) if prev_rev > 0 else None

                pat = pat_s[idx] if idx < len(pat_s) else 0.0
                prev_pat = pat_s[idx - 1] if idx > 0 and idx - 1 < len(pat_s) else 0.0
                pat_g = round(((pat - prev_pat) / abs(prev_pat)) * 100.0, 1) if prev_pat > 0 else None

                eps_val = eps_s[idx] if idx < len(eps_s) else 0.0
                shares = round(pat / eps_val, 2) if eps_val > 0 and pat > 0 else 1.97

                history_rows.append(FinancialYearRow(
                    fy_label=fy_lbl,
                    is_estimate=False,
                    revenue=rev,
                    revenue_growth=rev_g,
                    expenses=exp_s[idx] if idx < len(exp_s) else 0.0,
                    operating_profit=op_s[idx] if idx < len(op_s) else 0.0,
                    opm_percent=opm_s[idx] if idx < len(opm_s) else 0.0,
                    other_income=other_s[idx] if idx < len(other_s) else 0.0,
                    interest=int_s[idx] if idx < len(int_s) else 0.0,
                    depreciation=dep_s[idx] if idx < len(dep_s) else 0.0,
                    pbt=pbt_s[idx] if idx < len(pbt_s) else 0.0,
                    tax_percent=tax_s[idx] if idx < len(tax_s) else 25.0,
                    pat=pat,
                    pat_growth=pat_g,
                    shares_cr=shares,
                    eps=eps_val
                ))

    if not history_rows:
        return build_fallback_record(ticker)

    scenarios = create_default_scenarios(history_rows, cmp or 500.0, pe_ratio or 25.0)
    
    def get_fy28_cagr(sc_name: str) -> float:
        sc = scenarios.get(sc_name)
        if not sc or not sc.targets:
            return 0.0
        for t in sc.targets:
            if t.fy_label == "FY2028":
                return t.cagr_pct
        return sc.targets[0].cagr_pct

    pe_clean = pe_ratio if pe_ratio > 0 else 22.0
    pe_hist = {
        "min": round(pe_clean * 0.65, 1),
        "median": round(pe_clean * 0.9, 1),
        "avg": round(pe_clean * 0.95, 1),
        "fy26": round(pe_clean * 0.85, 1),
        "max": round(pe_clean * 1.3, 1),
    }

    return CompanyFullRecord(
        ticker=ticker,
        company_name=company_name,
        stock_type="STD",
        cmp=cmp,
        change_pct=round(random.uniform(-2.5, 3.2), 2),
        pe_ratio=pe_ratio,
        market_cap_cr=market_cap_cr,
        high_52w=high_52w,
        roce_pct=roce_pct,
        roe_pct=roe_pct,
        analyst="Saurabh",
        base_cagr=get_fy28_cagr("Base Case"),
        bull_cagr=get_fy28_cagr("Bull Case"),
        bear_cagr=get_fy28_cagr("Bear Case"),
        mgmt_cagr=get_fy28_cagr("Management Case"),
        target_fy="PE · FY2028",
        sparkline=generate_sparkline(cmp or 100.0, 1.2),
        comments="",
        in_tracker=True,
        pe_history=pe_hist,
        scenarios=scenarios
    )

def build_fallback_record(ticker: str, seed_info: dict = None) -> CompanyFullRecord:
    info = seed_info or next((x for x in SEED_TRACKER_STOCKS if x["ticker"] == ticker), None) or {
        "ticker": ticker, "name": f"{ticker} Ltd", "cmp": 972.0, "chg": -3.98,
        "pe": 27.8, "mcap": 1915.0, "high52": 1095.0, "analyst": "Saurabh", "comments": ""
    }
    history = [
        FinancialYearRow(fy_label="MAR 2021", revenue=118, revenue_growth=15.7, expenses=113, operating_profit=4, opm_percent=3.4, other_income=1, interest=2, depreciation=1, pbt=3, tax_percent=25.0, pat=2, pat_growth=0.0, shares_cr=1.98, eps=1.0),
        FinancialYearRow(fy_label="MAR 2022", revenue=149, revenue_growth=26.3, expenses=138, operating_profit=10, opm_percent=6.7, other_income=1, interest=3, depreciation=1, pbt=8, tax_percent=27.0, pat=6, pat_growth=200.0, shares_cr=1.98, eps=3.0),
        FinancialYearRow(fy_label="MAR 2023", revenue=188, revenue_growth=26.2, expenses=172, operating_profit=16, opm_percent=8.5, other_income=1, interest=3, depreciation=2, pbt=12, tax_percent=27.0, pat=9, pat_growth=50.0, shares_cr=1.98, eps=4.5),
        FinancialYearRow(fy_label="MAR 2024", revenue=332, revenue_growth=76.6, expenses=277, operating_profit=55, opm_percent=16.6, other_income=2, interest=4, depreciation=3, pbt=50, tax_percent=25.0, pat=38, pat_growth=322.2, shares_cr=1.98, eps=19.2),
        FinancialYearRow(fy_label="MAR 2025", revenue=427, revenue_growth=28.6, expenses=344, operating_profit=83, opm_percent=19.4, other_income=6, interest=6, depreciation=5, pbt=78, tax_percent=30.0, pat=55, pat_growth=44.7, shares_cr=1.98, eps=27.7),
        FinancialYearRow(fy_label="MAR 2026", revenue=521, revenue_growth=22.0, expenses=429, operating_profit=92, opm_percent=17.7, other_income=7, interest=2, depreciation=7, pbt=90, tax_percent=24.0, pat=69, pat_growth=25.5, shares_cr=1.97, eps=35.0),
    ]
    scenarios = create_default_scenarios(history, info["cmp"], info["pe"])
    return CompanyFullRecord(
        ticker=ticker,
        company_name=info["name"],
        cmp=info["cmp"],
        change_pct=info["chg"],
        pe_ratio=info["pe"],
        market_cap_cr=info["mcap"],
        high_52w=info["high52"],
        analyst=info.get("analyst", "Saurabh"),
        base_cagr=scenarios["Base Case"].targets[1].cagr_pct,
        bull_cagr=scenarios["Bull Case"].targets[1].cagr_pct,
        bear_cagr=scenarios["Bear Case"].targets[1].cagr_pct,
        mgmt_cagr=scenarios["Management Case"].targets[1].cagr_pct,
        sparkline=generate_sparkline(info["cmp"], info["chg"]),
        comments=info.get("comments", ""),
        in_tracker=True,
        pe_history={"min": 10.2, "median": 10.8, "avg": 10.8, "fy26": 10.2, "max": 11.4},
        scenarios=scenarios
    )

def fetch_nifty500_constituents() -> List[Dict[str, str]]:
    """Fetches official NIFTY 500 constituent CSV from NSE archives with fallback."""
    url = "https://nsearchives.nseindia.com/content/indices/ind_nifty500list.csv"
    headers = {"User-Agent": random.choice(USER_AGENTS), "Referer": "https://www.nseindia.com/"}
    try:
        resp = requests.get(url, headers=headers, timeout=10)
        if resp.status_code == 200 and "Symbol" in resp.text:
            df = pd.read_csv(io.StringIO(resp.text))
            records = []
            for _, row in df.iterrows():
                sym = str(row.get("Symbol", "")).strip()
                comp = str(row.get("Company Name", sym)).strip()
                ind = str(row.get("Industry", "Diversified")).strip()
                if sym:
                    records.append({"ticker": sym, "company_name": comp, "industry": ind})
            if records:
                return records
    except Exception:
        pass

    # Fallback curated NIFTY 500 leaders if NSE blocks IP
    return [
        {"ticker": s["ticker"], "company_name": s["name"], "industry": "NIFTY 500 Constituent"}
        for s in SEED_TRACKER_STOCKS
    ] + [
        {"ticker": "HINDUNILVR", "company_name": "Hindustan Unilever Ltd", "industry": "FMCG"},
        {"ticker": "SBIN", "company_name": "State Bank of India", "industry": "Banking"},
        {"ticker": "ITC", "company_name": "ITC Ltd", "industry": "FMCG"},
        {"ticker": "BAJFINANCE", "company_name": "Bajaj Finance Ltd", "industry": "NBFC"},
        {"ticker": "MARUTI", "company_name": "Maruti Suzuki India Ltd", "industry": "Automobile"},
        {"ticker": "SUNPHARMA", "company_name": "Sun Pharmaceutical Industries Ltd", "industry": "Pharma"},
        {"ticker": "NTPC", "company_name": "NTPC Ltd", "industry": "Power"},
        {"ticker": "TATAMOTORS", "company_name": "Tata Motors Ltd", "industry": "Automobile"},
        {"ticker": "HAL", "company_name": "Hindustan Aeronautics Ltd", "industry": "Aerospace & Defence"},
        {"ticker": "COFORGE", "company_name": "Coforge Ltd", "industry": "IT Services"},
        {"ticker": "PERSISTENT", "company_name": "Persistent Systems Ltd", "industry": "IT Services"},
        {"ticker": "DIXON", "company_name": "Dixon Technologies (India) Ltd", "industry": "EMS"},
        {"ticker": "KAYNES", "company_name": "Kaynes Technology India Ltd", "industry": "EMS"},
        {"ticker": "POLYCAB", "company_name": "Polycab India Ltd", "industry": "Cables & Wires"},
        {"ticker": "KEI", "company_name": "KEI Industries Ltd", "industry": "Cables & Wires"},
        {"ticker": "APARINDS", "company_name": "Apar Industries Ltd", "industry": "Capital Goods"},
        {"ticker": "SUZLON", "company_name": "Suzlon Energy Ltd", "industry": "Renewables"},
        {"ticker": "ZOMATO", "company_name": "Eternal / Zomato Ltd", "industry": "Consumer Tech"},
        {"ticker": "CDSL", "company_name": "Central Depository Services (India) Ltd", "industry": "Capital Markets"},
        {"ticker": "MCX", "company_name": "Multi Commodity Exchange of India Ltd", "industry": "Capital Markets"}
    ]
