import re
from datetime import datetime
from typing import List, Dict, Any, Optional
from .models import FinancialYearRow, ValuationTarget, ScenarioPackage, PeHistoryStats

def extract_year(label: str, default_year: int = 2026) -> int:
    """Extracts a 4-digit fiscal year from labels like 'MAR 2026' or 'FY2026'."""
    matches = re.findall(r"\b(20\d{2})\b", str(label))
    if matches:
        return int(matches[-1])
    return default_year

def compute_cagr(target_price: float, cmp: float, target_date_str: str) -> float:
    """Computes exact fractional-year CAGR."""
    if target_price <= 0 or cmp <= 0:
        return -100.0
    try:
        target_dt = datetime.strptime(target_date_str, "%Y-%m-%d")
        now_dt = datetime.now()
        days = max(1, (target_dt - now_dt).days)
        years = days / 365.25
        cagr = ((target_price / cmp) ** (1.0 / years) - 1.0) * 100.0
        return round(cagr, 1)
    except Exception:
        return 0.0

def derive_pro_forma_row(prev: FinancialYearRow, growth_pct: float, opm_pct: float,
                         other: float, interest: float, dep: float, tax_pct: float,
                         shares_cr: float, year_label: str) -> FinancialYearRow:
    """Derives pro-forma statement with transparent accounting bridges."""
    rev = prev.revenue * (1.0 + (growth_pct / 100.0))
    op = rev * (opm_pct / 100.0)
    exp = max(0.0, rev - op)
    pbt = op + other - interest - dep
    pat = pbt * (1.0 - (tax_pct / 100.0))
    pat_growth = ((pat - prev.pat) / abs(prev.pat) * 100.0) if (prev.pat and prev.pat != 0) else 0.0
    eps = (pat / shares_cr) if shares_cr > 0 else 0.0

    return FinancialYearRow(
        fy_label=f"{year_label} ESTIMATE",
        is_estimate=True,
        revenue=round(rev, 1),
        revenue_growth=round(growth_pct, 1),
        expenses=round(exp, 1),
        operating_profit=round(op, 1),
        opm_percent=round(opm_pct, 1),
        other_income=round(other, 1),
        interest_expense=round(interest, 1),
        depreciation=round(dep, 1),
        pbt=round(pbt, 1),
        tax_percent=round(tax_pct, 1),
        pat=round(pat, 1),
        pat_growth=round(pat_growth, 1),
        shares_cr=shares_cr,
        eps=round(eps, 2)
    )

def build_default_scenarios(
    history: List[FinancialYearRow],
    cmp: float,
    shares_cr: Optional[float] = None,
    pe_history: Optional[PeHistoryStats] = None,
    moat: str = "Moderate",
    forecast_years: int = 2
) -> Dict[str, ScenarioPackage]:
    """Dynamically builds multi-year Base, Bull, Bear, and Management cases."""
    if not history:
        history = [FinancialYearRow(
            fy_label="MAR 2026", revenue=500.0, expenses=400.0,
            operating_profit=100.0, opm_percent=20.0, pbt=90.0, pat=67.5, eps=15.0
        )]

    last = history[-1]
    shares = shares_cr if (shares_cr and shares_cr > 0) else (last.shares_cr if last.shares_cr > 0 else 1.0)
    pe_stats = pe_history or PeHistoryStats()

    # Calculate historical ratios for accounting bridges
    hist_revs = [h.revenue for h in history if h.revenue > 0]
    other_ratio = (sum(h.other_income for h in history) / sum(hist_revs)) if hist_revs and sum(hist_revs) > 0 else 0.015
    interest_ratio = (sum(h.interest_expense for h in history) / sum(hist_revs)) if hist_revs and sum(hist_revs) > 0 else 0.01
    dep_ratio = (sum(h.depreciation for h in history) / sum(hist_revs)) if hist_revs and sum(hist_revs) > 0 else 0.025
    tax_rate = last.tax_percent if (last.tax_percent and 10 <= last.tax_percent <= 35) else 25.17

    last_year = extract_year(last.fy_label, default_year=datetime.now().year)

    med_pe = max(8.0, pe_stats.median)
    max_pe = max(med_pe * 1.1, pe_stats.max)
    min_pe = max(5.0, min(med_pe * 0.75, pe_stats.min))

    moat_boost = 1.15 if moat == "Strong" else (0.90 if moat == "Weak" else 1.0)

    scenario_configs = {
        "Base Case": {
            "growth": [18.0 * moat_boost, 16.0 * moat_boost],
            "opm": [last.opm_percent, last.opm_percent + 0.5],
            "pe": [round(med_pe, 1), round(med_pe, 1)]
        },
        "Bull Case": {
            "growth": [32.0 * moat_boost, 28.0 * moat_boost],
            "opm": [last.opm_percent + 1.5, last.opm_percent + 2.0],
            "pe": [round(min(max_pe, med_pe * 1.3), 1), round(min(max_pe, med_pe * 1.3), 1)]
        },
        "Bear Case": {
            "growth": [max(3.0, 6.0 / moat_boost), max(2.0, 5.0 / moat_boost)],
            "opm": [max(5.0, last.opm_percent - 3.0), max(5.0, last.opm_percent - 3.5)],
            "pe": [round(min_pe, 1), round(min_pe, 1)]
        },
        "Management Case": {
            "growth": [30.0, 25.0],
            "opm": [last.opm_percent + 1.0, last.opm_percent + 1.5],
            "pe": [round(med_pe * 1.1, 1), round(med_pe * 1.1, 1)]
        }
    }

    scenarios = {}
    for name, cfg in scenario_configs.items():
        projections = []
        targets = []
        prev_row = last

        for i in range(forecast_years):
            est_year = last_year + 1 + i
            g = cfg["growth"][min(i, len(cfg["growth"]) - 1)]
            opm = cfg["opm"][min(i, len(cfg["opm"]) - 1)]
            pe = cfg["pe"][min(i, len(cfg["pe"]) - 1)]

            expected_rev = prev_row.revenue * (1.0 + g / 100.0)
            other_val = max(1.0, round(expected_rev * other_ratio, 1))
            dep_val = max(2.0, round(expected_rev * dep_ratio, 1))
            int_val = max(0.5, round(expected_rev * interest_ratio, 1))

            new_row = derive_pro_forma_row(
                prev=prev_row,
                growth_pct=g,
                opm_pct=opm,
                other=other_val,
                interest=int_val,
                dep=dep_val,
                tax_pct=tax_rate,
                shares_cr=shares,
                year_label=f"MAR {est_year}"
            )
            projections.append(new_row)
            prev_row = new_row

            target_price = round(new_row.eps * pe, 1)
            target_date = f"{est_year}-03-31"
            cagr = compute_cagr(target_price, cmp, target_date)
            upside = round(((target_price - cmp) / cmp * 100.0), 1) if cmp > 0 else 0.0

            target_dt = datetime.strptime(target_date, "%Y-%m-%d")
            duration_days = max(1, (target_dt - datetime.now()).days)

            targets.append(ValuationTarget(
                fy_label=f"FY{est_year}",
                target_date=target_date,
                eps=new_row.eps,
                pe_multiple=pe,
                projected_price=target_price,
                upside_pct=upside,
                cagr_pct=cagr,
                duration_days=duration_days
            ))

        headline_target = targets[-1] if targets else None
        scenarios[name] = ScenarioPackage(
            financials=list(history) + projections,
            targets=targets,
            cagr_headline=headline_target.cagr_pct if headline_target else 0.0,
            target_price_headline=headline_target.projected_price if headline_target else 0.0,
            assumptions_text=""
        )

    return scenarios

def generate_sensitivity_matrix(
    base_eps: float,
    cmp: float,
    growth_rates: Optional[List[float]] = None,
    pe_multiples: Optional[List[float]] = None,
    horizon_years: float = 2.0
) -> Dict[str, Any]:
    """Generates 2D Matrix of Expected CAGR across Growth and Exit Multiples."""
    if growth_rates is None:
        growth_rates = [10.0, 15.0, 20.0, 25.0, 30.0, 35.0]
    if pe_multiples is None:
        pe_multiples = [15.0, 20.0, 24.0, 28.0, 32.0, 36.0]

    matrix = []
    for pe in pe_multiples:
        row = []
        for g in growth_rates:
            future_eps = base_eps * ((1.0 + (g / 100.0)) ** horizon_years)
            target_px = future_eps * pe
            cagr = round((((target_px / cmp) ** (1.0 / horizon_years)) - 1.0) * 100.0, 1) if cmp > 0 else 0.0
            row.append(cagr)
        matrix.append({"pe": pe, "cagrs": row})

    return {
        "growth_rates": growth_rates,
        "pe_multiples": pe_multiples,
        "matrix": matrix,
        "horizon_years": horizon_years
    }
