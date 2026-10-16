from datetime import datetime
from typing import List
from .models import FinancialYearRow, ValuationTarget

def recompute_pro_forma(
    history: List[FinancialYearRow],
    forecast_growths: List[dict]  # [{"growth": 35.0, "opm": 19.0, "other": 7.0, "int": 2.0, "dep": 12.0, "tax": 25.0, "shares": 1.97, "year": "MAR 2027"}]
) -> List[FinancialYearRow]:
    result = list(history)
    for f in forecast_growths:
        prev = result[-1]
        rev = prev.revenue * (1.0 + (f["growth"] / 100.0))
        op = rev * (f["opm"] / 100.0)
        exp = rev - op
        pbt = op + f["other"] - f["int"] - f["dep"]
        pat = pbt * (1.0 - (f["tax"] / 100.0))
        pat_growth = ((pat - prev.pat) / abs(prev.pat) * 100.0) if prev.pat else 0.0
        eps = pat / f["shares"] if f["shares"] > 0 else 0.0

        row = FinancialYearRow(
            fy_label=f"{f['year']} ESTIMATE",
            is_estimate=True,
            revenue=round(rev, 2),
            revenue_growth=round(f["growth"], 1),
            expenses=round(exp, 2),
            operating_profit=round(op, 2),
            opm_percent=round(f["opm"], 1),
            other_income=f["other"],
            interest=f["int"],
            depreciation=f["dep"],
            pbt=round(pbt, 2),
            tax_percent=f["tax"],
            pat=round(pat, 2),
            pat_growth=round(pat_growth, 1),
            shares_cr=f["shares"],
            eps=round(eps, 2)
        )
        result.append(row)
    return result

def compute_valuation_targets(
    cmp: float,
    as_of_date: datetime,
    projected_rows: List[FinancialYearRow],
    multiples: dict # {"MAR 2027": 28.0, "MAR 2028": 28.0}
) -> List[ValuationTarget]:
    targets = []
    for row in projected_rows:
        if not row.is_estimate:
            continue
        year_token = row.fy_label.split()[1] # "2027"
        target_date = datetime(int(year_token), 3, 31)
        pe = multiples.get(f"MAR {year_token}", 20.0)
        
        projected_price = row.eps * pe
        upside = ((projected_price - cmp) / cmp) * 100.0
        
        delta_days = max(1, (target_date - as_of_date).days)
        delta_years = delta_days / 365.25
        
        if projected_price > 0 and cmp > 0:
            cagr = ((projected_price / cmp) ** (1.0 / delta_years) - 1.0) * 100.0
        else:
            cagr = -100.0

        targets.append(ValuationTarget(
            fy_label=f"FY{year_token}",
            target_date=target_date.strftime("%Y-%m-%d"),
            eps=round(row.eps, 2),
            pe_multiple=round(pe, 1),
            projected_price=round(projected_price, 2),
            upside_pct=round(upside, 1),
            cagr_pct=round(cagr, 1),
            holding_days=delta_days
        ))
    return targets
