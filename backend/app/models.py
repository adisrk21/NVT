from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

class FinancialYearRow(BaseModel):
    fy_label: str
    is_estimate: bool = False
    revenue: float
    revenue_growth: Optional[float] = None
    expenses: float
    operating_profit: float
    opm_percent: float
    other_income: float = 0.0
    interest_expense: float = 0.0
    depreciation: float = 0.0
    pbt: float
    tax_percent: float = 25.0
    pat: float
    pat_growth: Optional[float] = None
    shares_cr: float
    eps: float

class ValuationTarget(BaseModel):
    fy_label: str
    target_date: str
    eps: float
    pe_multiple: float
    projected_price: float
    upside_pct: float
    cagr_pct: float
    duration_days: int

class ScenarioPackage(BaseModel):
    financials: List[FinancialYearRow]
    targets: List[ValuationTarget]
    cagr_headline: float
    target_price_headline: float
    assumptions_text: str = ""

class CompanyMaster(BaseModel):
    ticker: str
    company_name: str
    cmp: float
    change_pct: float = 0.0
    pe_ratio: float = 0.0
    market_cap_cr: float = 0.0
    high_52w: float = 0.0
    analyst: str = "Saurabh"
    type: str = "STD"
    in_tracker: bool = True
    comment: str = ""
    trend: List[float] = [100, 102, 101, 104, 108, 106, 112]
    scenarios: Dict[str, ScenarioPackage] = {}
