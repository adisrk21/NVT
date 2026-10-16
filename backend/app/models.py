from pydantic import BaseModel, Field
from typing import List, Optional, Dict

class FinancialYearRow(BaseModel):
    fy_label: str                     # e.g. "MAR 2024", "MAR 2027 ESTIMATE"
    is_estimate: bool = False
    revenue: float                    # in Crores
    revenue_growth: Optional[float] = None
    expenses: float
    operating_profit: float
    opm_percent: float
    other_income: float = 0.0
    interest: float = 0.0
    depreciation: float = 0.0
    pbt: float
    tax_percent: float = 25.0
    pat: float
    pat_growth: Optional[float] = None
    shares_cr: float                  # Diluted Shares in Crores
    eps: float

class ValuationTarget(BaseModel):
    fy_label: str                     # e.g. "FY2028"
    target_date: str                  # ISO date: "2028-03-31"
    eps: float
    pe_multiple: float
    projected_price: float
    upside_pct: float
    cagr_pct: float
    holding_days: int

class ScenarioData(BaseModel):
    financials: List[FinancialYearRow]
    targets: List[ValuationTarget]
    assumptions_markdown: str = ""

class CompanyValuationRecord(BaseModel):
    ticker: str
    company_name: str
    cmp: float
    pe_ratio: float
    market_cap_cr: float
    high_52w: float
    analyst: str = "Unassigned"
    base_cagr: Optional[float] = None
    bull_cagr: Optional[float] = None
    bear_cagr: Optional[float] = None
    mgmt_cagr: Optional[float] = None
    scenarios: Dict[str, ScenarioData] # Keys: "Base", "Bull", "Bear", "Management"
