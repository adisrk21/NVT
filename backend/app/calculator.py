from datetime import datetime
from typing import List, Dict, Any
from .models import FinancialYearRow, ValuationTarget, ScenarioPackage

def derive_pro_forma_row(prev: FinancialYearRow, growth_pct: float, opm_pct: float, other: float,
                         interest: float, dep: float, tax_pct: float, shares_cr: float, year_label: str) -> FinancialYearRow:
    rev = prev.revenue * (1.0 + (growth_pct / 100.0))
    op = rev * (opm_pct / 100.0)
    exp = rev - op
    pbt = op + other - interest - dep
    pat = pbt * (1.0 - (tax_pct / 100.0))
    pat_growth = ((pat - prev.pat) / abs(prev.pat) * 100.0) if prev.pat else 0.0
    eps = (pat / shares_cr) if shares_cr > 0 else 0.0

    return FinancialYearRow(
        fy_label=f"{year_label} ESTIMATE",
        is_estimate=True,
        revenue=round(rev, 1),
        revenue_growth=round(growth_pct, 1),
        expenses=round(exp, 1),
        operating_profit=round(op, 1),
        opm_percent=round(opm_pct, 1),
        other_income=other,
        interest_expense=interest,
        depreciation=dep,
        pbt=round(pbt, 1),
        tax_percent=tax_pct,
        pat=round(pat, 1),
        pat_growth=round(pat_growth, 1),
        shares_cr=shares_cr,
        eps=round(eps, 2)
    )

def compute_cagr(target_price: float, cmp: float, target_date_str: str) -> float:
    if target_price <= 0 or cmp <= 0:
        return -100.0
    target_dt = datetime.strptime(target_date_str, "%Y-%m-%d")
    now_dt = datetime.now()
    days = max(1, (target_dt - now_dt).days)
    years = days / 365.25
    cagr = ((target_price / cmp) ** (1.0 / years) - 1.0) * 100.0
    return round(cagr, 1)

def build_default_scenarios(history: List[FinancialYearRow], cmp: float) -> Dict[str, ScenarioPackage]:
    last = history[-1]
    shares = last.shares_cr if last.shares_cr > 0 else 1.97
    
    scenario_configs = {
        "Base Case": {"g1": 20.0, "g2": 18.0, "opm1": 17.5, "opm2": 18.0, "pe1": 22.0, "pe2": 22.0},
        "Bull Case": {"g1": 35.0, "g2": 32.0, "opm1": 19.0, "opm2": 20.0, "pe1": 32.0, "pe2": 32.0},
        "Bear Case": {"g1": 5.0,  "g2": 5.0,  "opm1": 14.0, "opm2": 13.5, "pe1": 15.0, "pe2": 14.0},
        "Management Case": {"g1": 35.0, "g2": 30.0, "opm1": 19.0, "opm2": 19.5, "pe1": 28.0, "pe2": 28.0}
    }

    scenarios = {}
    for name, cfg in scenario_configs.items():
        # Project FY2027 and FY2028
        row_27 = derive_pro_forma_row(last, cfg["g1"], cfg["opm1"], 7.0, 2.0, 12.0, 25.0, shares, "MAR 2027")
        row_28 = derive_pro_forma_row(row_27, cfg["g2"], cfg["opm2"], 7.0, 2.0, 14.0, 25.0, shares, "MAR 2028")
        
        financials = list(history) + [row_27, row_28]
        
        target_27_price = round(row_27.eps * cfg["pe1"], 1)
        target_28_price = round(row_28.eps * cfg["pe2"], 1)
        
        cagr_27 = compute_cagr(target_27_price, cmp, "2027-03-31")
        cagr_28 = compute_cagr(target_28_price, cmp, "2028-03-31")
        
        targets = [
            ValuationTarget(
                fy_label="FY2027", target_date="2027-03-31", eps=row_27.eps, pe_multiple=cfg["pe1"],
                projected_price=target_27_price, upside_pct=round(((target_27_price - cmp)/cmp)*100, 1),
                cagr_pct=cagr_27, duration_days=166
            ),
            ValuationTarget(
                fy_label="FY2028", target_date="2028-03-31", eps=row_28.eps, pe_multiple=cfg["pe2"],
                projected_price=target_28_price, upside_pct=round(((target_28_price - cmp)/cmp)*100, 1),
                cagr_pct=cagr_28, duration_days=532
            )
        ]
        
        scenarios[name] = ScenarioPackage(
            financials=financials,
            targets=targets,
            cagr_headline=cagr_28,
            target_price_headline=target_28_price,
            assumptions_text=""
        )
        
    return scenarios
