#!/usr/bin/env python3
"""
Extrai golden numbers do Método de fazer cálculo -Manual.xls (aba Estudo Lote P2).
Uso: python scripts/extract-manual-load-batch.py [caminho.xls]
"""
import json
import os
import sys

try:
    import xlrd
except ImportError:
    print("Instale xlrd: pip install xlrd", file=sys.stderr)
    sys.exit(1)

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "src", "lib", "certificateCalculations", "__fixtures__", "manual-load-batch-golden.json")
SHEET = "Planilha - Estudo Lote P2"


def find_manual_path(arg_path=None):
    if arg_path and os.path.isfile(arg_path):
        return arg_path
    dl = os.path.join(os.path.expanduser("~"), "Downloads")
    for name in os.listdir(dl):
        if "Manual" in name and name.endswith(".xls"):
            return os.path.join(dl, name)
    return None


def cell_map(sh, row_idx):
    row = sh.row(row_idx)
    return {i + 1: row[i].value for i in range(sh.ncols) if row[i].value != ""}


def extract_load_batch_blocks(sh):
    blocks = []
    current = None
    for r in range(sh.nrows):
        cells = cell_map(sh, r)
        label = str(cells.get(1, "")).strip()
        if label.startswith("SOMA LOTE DE CARGA P"):
            if current:
                blocks.append(current)
            point = int(label.replace("SOMA LOTE DE CARGA P", ""))
            current = {"point": point, "label": label}
        elif current and "elevado a 2" in label:
            current["upLcSourceLabel"] = label.strip()
            current["upLcSourceValue"] = float(cells.get(2, 0))
            if cells.get(5) is not None:
                current["ueWithLoadBatch"] = float(cells.get(5))
        elif current and label.startswith("Total Uc P"):
            current["totalUcWithLoadBatch"] = float(cells.get(2, 0))
            blocks.append(current)
            current = None
    return blocks


def main():
    path = find_manual_path(sys.argv[1] if len(sys.argv) > 1 else None)
    if not path:
        print("Manual.xls não encontrado", file=sys.stderr)
        sys.exit(1)

    wb = xlrd.open_workbook(path)
    sh = wb.sheet_by_name(SHEET)
    blocks = extract_load_batch_blocks(sh)

    # uc base sem lote (linha ~53)
    uc_sem_lote = None
    for r in range(sh.nrows):
        cells = cell_map(sh, r)
        if cells.get(5) == "uc = " and cells.get(6) is not None:
            uc_sem_lote = float(cells.get(6))
            break

    payload = {
        "source": os.path.basename(path),
        "sheet": SHEET,
        "ucWithoutLoadBatch": uc_sem_lote,
        "loadBatchBlocks": blocks,
        "notes": [
            "upLC = uc do passo anterior (rótulo 'elevado a 2' na planilha didática)",
            "totalUcWithLoadBatch ≈ Ue/2 (k=2) no exemplo fixo",
        ],
    }

    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)
    print(f"Wrote {OUT} ({len(blocks)} blocos P2–P10)")


if __name__ == "__main__":
    main()
