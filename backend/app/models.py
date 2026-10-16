from pydantic import BaseModel
from typing import List, Optional, Dict

class FinancialYearRow(BaseModel):
    fy_label: str
    is_estimate: bool = False
    revenue: float = 0.0
    revenue_growth: Optional[float] = None
    expenses: float = 0.0
    operating_profit: float = 0.0
    opm_percent: float = 0.0
    other_income: float = 0.0
    interest: float = 0.0
    depreciation: float = 0.0
    pbt: float = 0.0
    tax_percent: float = 25.0
    pat: float = 0.0
    pat_growth: Optional[float] = None
    shares_cr: float = 1.0
    eps: float = 0.0
    forward_pe: Optional[float] = None

class ValuationTarget(BaseModel):
    fy_label: str
    target_date: str
    eps: float
    pe_multiple: float
    projected_price: float
    upside_pct: float
    cagr_pct: float
    holding_days: int

class ScenarioData(BaseModel):
    financials: List[FinancialYearRow]
    targets: List[ValuationTarget]
    valuation_method: str = "PE"
    selected_fy: str = "FY2028"
    assumptions_html: str = ""

class CompanySummary(BaseModel):
    ticker: str
    company_name: str
    stock_type: str = "STD"
    cmp: float = 0.0
    change_pct: float = 0.0
    pe_ratio: float = 0.0
    market_cap_cr: float = 0.0
    high_52w: float = 0.0
    roce_pct: Optional[float] = None
    roe_pct: Optional[float] = None
    analyst: str = "Saurabh"
    base_cagr: Optional[float] = None
    bull_cagr: Optional[float] = None
    bear_cagr: Optional[float] = None
    mgmt_cagr: Optional[float] = None
    target_fy: str = "PE · FY2028"
    sparkline: List[float] = []
    comments: str = ""
    in_tracker: bool = True
    is_test: bool = False
    screener_sources: List[str] = []

class CompanyFullRecord(CompanySummary):
    pe_history: Dict[str, float] = {"min": 15.0, "median": 22.0, "avg": 23.5, "fy26": 21.0, "max": 35.0}
    probabilities: Dict[str, float] = {"base": 50.0, "bull": 25.0, "bear": 25.0}
    scenarios: Dict[str, ScenarioData] = {}
