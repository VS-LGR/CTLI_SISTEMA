#!/usr/bin/env python3
"""
Referência PR-7.6 Tabela 01 — lote de carga (readonly).
Gera fixture JSON documentando a cadeia upLC implementada em loadBatchCalculations.js.
"""
import json
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "src", "lib", "certificateCalculations", "__fixtures__", "pr76-load-batch-table01.json")

TABLE_01 = [
    {"formation": "l1_p1", "upLcFrom": "p1", "description": "L1 + P1 → uc(P1)"},
    {"formation": "l2_p1", "upLcFrom": "l1_p1", "description": "L2 + P1 → uc(L1+P1)"},
    {"formation": "l3_p1", "upLcFrom": "l2_p1", "description": "L3 + P1 → uc(L2+P1)"},
    {"formation": "l4_p1", "upLcFrom": "l3_p1", "description": "L4 + P1 → uc(L3+P1)"},
    {"formation": "l5_p1", "upLcFrom": "l4_p1", "description": "L5 + P1 → uc(L4+P1)"},
    {"formation": "l6_p1", "upLcFrom": "l5_p1", "description": "L6 + P1 → uc(L5+P1)"},
]

payload = {
    "source": "PR-7.6 Avaliação da Incerteza de Medição — Tabela 01",
    "tabela01": TABLE_01,
    "ucFormula": "uc = sqrt(ua^2 + up^2 + ud^2 + ue^2 + ur^2 + upLC^2)",
    "vrWithLoadBatch": "V.R. = sum(VVC pesos) + nominal_lote",
    "empuxo": "ppm_pesos + ppm_lote (material preset)",
    "errorMultiplierM": 1,
    "implementation": "src/lib/certificateCalculations/loadBatchCalculations.js",
}

os.makedirs(os.path.dirname(OUT), exist_ok=True)
with open(OUT, "w", encoding="utf-8") as f:
    json.dump(payload, f, ensure_ascii=False, indent=2)
print(f"Wrote {OUT}")
