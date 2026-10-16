from datetime import datetime
from typing import List, Dict
from .models import FinancialYearRow, ValuationTarget, ScenarioData

def recalculate_scenario_rows(rows: List[FinancialYearRow], cmp: float) -> List[FinancialYearRow]:
    updated = []
    for i, r in enumerate(rows):
        row = r.model_copy()
        if row.is_estimate and i > 0:
            prev = updated[i - 1]
            growth = row.revenue_growth if row.revenue_growth is not None else 20.0
            opm = row.opm_percent if row.opm_percent is not None else prev.opm_percent
            
            row.revenue = round(prev.revenue * (1.0 + growth / 100.0), 1)
            row.operating_profit = round(row.revenue * (opm / 100.0), 1)
            row.expenses = round(row.revenue - row.operating_profit, 1)
            row.pbt = round(row.operating_profit + row.other_income - row.interest - row.depreciation, 1)
            tax_rate = row.tax_percent if row.tax_percent is not None else 25.0
            row.pat = round(row.pbt * (1.0 - tax_rate / 100.0), 1)
            
            if prev.pat and prev.pat > 0:
                row.pat_growth = round(((row.pat - prev.pat) / abs(prev.pat)) * 100.0, 1)
            else:
                row.pat_growth = 0.0
                
            shares = row.shares_cr if row.shares_cr and row.shares_cr > 0 else (prev.shares_cr or 1.0)
            row.shares_cr = round(shares, 2)
            row.eps = round(row.pat / shares, 1) if shares > 0 else 0.0
            row.forward_pe = round(cmp / row.eps, 1) if row.eps > 0 and cmp > 0 else None
        updated.append(row)
    return updated

def build_targets_from_rows(
    rows: List[FinancialYearRow],
    cmp: float,
    existing_multiples: Dict[str, float],
    default_pe: float = 25.0
) -> List[ValuationTarget]:
    targets = []
    now = datetime.now()
    for r in rows:
        if not r.is_estimate:
            continue
        # Extract year e.g. "MAR 2027" -> 2027
        parts = [p for p in r.fy_label.split() if p.isdigit()]
        yr = int(parts[0]) if parts else 2027
        fy_key = f"FY{yr}"
        target_dt = datetime(yr, 3, 31)
        holding_days = max(30, (target_dt - now).days)
        years_frac = holding_days / 365.25

        pe = existing_multiples.get(fy_key, default_pe)
        proj_price = round(r.eps * pe, 1) if r.eps > 0 and pe > 0 else 0.0
        upside = round(((proj_price - cmp) / cmp) * 100.0, 1) if cmp > 0 and proj_price > 0 else 0.0
        
        if cmp > 0 and proj_price > 0 and years_frac > 0:
            cagr = round((((proj_price / cmp) ** (1.0 / years_frac)) - 1.0) * 100.0, 1)
        else:
            cagr = 0.0

        targets.append(ValuationTarget(
            fy_label=fy_key,
            target_date=target_dt.strftime("%d %b %y"),
            eps=round(r.eps, 1),
            pe_multiple=round(pe, 1),
            projected_price=proj_price,
            upside_pct=upside,
            cagr_pct=cagr,
            holding_days=holding_days
        ))
    return targets

def create_default_scenarios(history_rows: List[FinancialYearRow], cmp: float, current_pe: float) -> Dict[str, ScenarioData]:
    base_pe = round(max(12.0, min(current_pe or 24.0, 45.0)), 1)
    configs = {
        "Base Case":       {"g1": 20.0, "g2": 18.0, "g3": 15.0, "opm_delta": 0.0,  "pe": base_pe},
        "Bull Case":       {"g1": 32.0, "g2": 28.0, "g3": 25.0, "opm_delta": 1.5,  "pe": round(base_pe * 1.2, 1)},
        "Bear Case":       {"g1": 8.0,  "g2": 8.0,  "g3": 6.0,  "opm_delta": -2.0, "pe": round(base_pe * 0.75, 1)},
        "Management Case": {"g1": 35.0, "g2": 30.0, "g3": 25.0, "opm_delta": 1.0,  "pe": round(base_pe * 1.1, 1)},
    }

    last = history_rows[-1] if history_rows else FinancialYearRow(
        fy_label="MAR 2026", revenue=500.0, expenses=410.0, operating_profit=90.0,
        opm_percent=18.0, other_income=5.0, interest=3.0, depreciation=8.0,
        pbt=84.0, tax_percent=25.0, pat=63.0, shares_cr=2.0, eps=31.5
    )

    scenarios = {}
    for name, cfg in configs.items():
        est_rows = [r.model_copy() for r in history_rows]
        base_opm = last.opm_percent if last.opm_percent > 0 else 16.0
        for idx, (yr_str, g_val) in enumerate([("MAR 2027", cfg["g1"]), ("MAR 2028", cfg["g2"]), ("MAR 2029", cfg["g3"])]):
            est_rows.append(FinancialYearRow(
                fy_label=yr_str,
                is_estimate=True,
                revenue_growth=g_val,
                opm_percent=round(max(4.0, base_opm + cfg["opm_delta"] * (idx + 1) * 0.5), 1),
                other_income=last.other_income,
                interest=last.interest,
                depreciation=round(last.depreciation * (1.0 + 0.08 * (idx + 1)), 1),
                tax_percent=25.0,
                shares_cr=last.shares_cr if last.shares_cr > 0 else 1.0
            ))
        recalc = recalculate_scenario_rows(est_rows, cmp)
        multiples = {"FY2027": cfg["pe"], "FY2028": cfg["pe"], "FY2029": cfg["pe"]}
        targets = build_targets_from_rows(recalc, cmp, multiples, cfg["pe"])
        scenarios[name] = ScenarioData(
            financials=recalc,
            targets=targets,
            valuation_method="PE",
            selected_fy="FY2028",
            assumptions_html=""
        )
    return scenarios
