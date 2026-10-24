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
    shares_cr: float = 1.0
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

class PeHistoryStats(BaseModel):
    min: float = 10.0
    median: float = 22.0
    avg: float = 22.5
    max: float = 35.0

class CompanyMaster(BaseModel):
    ticker: str
    company_name: str
    industry: str = "General"
    cmp: float
    change_pct: float = 0.0
    pe_ratio: float = 0.0
    market_cap_cr: float = 0.0
    high_52w: float = 0.0
    low_52w: float = 0.0
    shares_cr: float = 1.0
    latest_fy: int = 2026
    analyst: str = "Saurabh"
    type: str = "STD"
    in_tracker: bool = False
    comment: str = ""
    trend: List[float] = []
    results_url: str = ""
    reports_url: str = ""
    pe_history: PeHistoryStats = Field(default_factory=PeHistoryStats)
    # Advanced Institutional Valuation Columns
    moat: str = "Moderate"
    moat_score: float = 6.0
    avg_fcf: float = 0.0
    fcfd: float = 0.0
    dcf: float = 0.0
    value_ratio: float = 1.0
    opinion: str = "Reasonable"
    pead_score: float = 6.0
    return_1m: str = "+2.4%"
    scenarios: Dict[str, ScenarioPackage] = {}
