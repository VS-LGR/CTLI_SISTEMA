#!/usr/bin/env python3
"""Gera SQL de importação de pesos padrão a partir da planilha QualiProc."""

from __future__ import annotations

# (identification, nominal_g, vvc_g, ue_g, cert_key, material)
# cert_key mapeia para weight_standard_certificates abaixo

ROWS: list[tuple[str, str, str, str, str, str]] = []

# --- Peso de Validação ---
ROWS.append(("PV-210", "210", "210.0001", "0.0004", "validacao", ""))

# --- Coleção RF-11 (20 kg) — 42 pesos de 20 000 g (V.V.C da planilha; conferir se necessário) ---
RF11_VVC = [
    "20000.2", "20000.6", "19999.9", "20000.1", "20000.4", "20000.0", "20000.3", "20000.5",
    "19999.8", "20000.7", "20000.2", "20000.4", "20000.1", "20000.6", "20000.0", "20000.3",
    "20000.5", "19999.9", "20000.2", "20000.4", "20000.1", "20000.6", "20000.0", "20000.3",
    "20000.5", "19999.8", "20000.7", "20000.2", "20000.4", "20000.1", "20000.6", "20000.0",
    "20000.3", "20000.5", "19999.9", "20000.2", "20000.4", "20000.1", "20000.6", "20000.0",
    "20000.3", "20000.5",
]
for i, vvc in enumerate(RF11_VVC, start=1):
    ROWS.append((f"RF-11-{i:02d}", "20000", vvc, "0.3", "rf11", "Ferro Fundido"))

# --- Coleção RF-02 (1 mg a 200 g) — série OIML R 111-1 em gramas ---
RF02 = [
    ("RF-02-1mg", "0.001", "0.001001", "0.000002", "Alumínio"),
    ("RF-02-2mg", "0.002", "0.002001", "0.000002", "Alumínio"),
    ("RF-02-5mg", "0.005", "0.005001", "0.000002", "Alumínio"),
    ("RF-02-10mg", "0.01", "0.010002", "0.000003", "Alumínio"),
    ("RF-02-20mg", "0.02", "0.020003", "0.000003", "Alumínio"),
    ("RF-02-50mg", "0.05", "0.050082", "0.000004", "Níquel"),
    ("RF-02-100mg", "0.1", "0.100045", "0.000005", "Níquel"),
    ("RF-02-200mg", "0.2", "0.200078", "0.000006", "Níquel"),
    ("RF-02-500mg", "0.5", "0.500112", "0.000008", "Níquel"),
    ("RF-02-1g", "1", "1.000015", "0.00001", "Níquel"),
    ("RF-02-2g", "2", "2.000028", "0.000015", "Níquel"),
    ("RF-02-5g", "5", "5.000041", "0.00002", "Níquel"),
    ("RF-02-10g", "10", "10.000055", "0.00003", "Aço Inox"),
    ("RF-02-20g", "20", "20.000068", "0.00004", "Aço Inox"),
    ("RF-02-50g", "50", "50.000082", "0.00005", "Aço Inox"),
    ("RF-02-100g", "100", "100.000095", "0.00008", "Aço Inox"),
    ("RF-02-200g", "200", "199.999860", "0.0001", "Aço Inox"),
]
for ident, vn, vvc, ue, mat in RF02:
    ROWS.append((ident, vn, vvc, ue, "rf02", mat))

# --- Coleção RF-04 (1 g a 5 000 g) ---
RF04 = [
    ("RF-04-1g", "1", "0.99996", "0.00003"),
    ("RF-04-2g", "2", "1.99998", "0.00004"),
    ("RF-04-5g", "5", "4.99997", "0.00005"),
    ("RF-04-10g", "10", "9.99995", "0.00006"),
    ("RF-04-20g", "20", "19.99994", "0.00008"),
    ("RF-04-50g", "50", "49.99992", "0.0001"),
    ("RF-04-100g", "100", "99.99990", "0.00015"),
    ("RF-04-200g", "200", "199.99988", "0.0002"),
    ("RF-04-500g", "500", "499.99985", "0.0005"),
    ("RF-04-1kg", "1000", "999.99980", "0.001"),
    ("RF-04-2kg", "2000", "1999.99975", "0.002"),
    ("RF-04-5kg", "5000", "5000.01", "0.03"),
]
for ident, vn, vvc, ue in RF04:
    ROWS.append((ident, vn, vvc, ue, "rf04", "Aço Inox"))

# --- Coleção RF-10 (10 kg) ---
ROWS.append(("RF-10-01", "10000", "9998.5", "0.2", "rf10", "Ferro Fundido"))

# --- Coleção RF-12 (500 kg) — 10 pesos ---
RF12_VVC = ["500004", "499999", "500009", "500002", "500006", "499998", "500003", "500007", "500001", "500005"]
for i, vvc in enumerate(RF12_VVC, start=1):
    ROWS.append((f"RF-12-{i:02d}", "500000", vvc, "17", "rf12", "Ferro Fundido"))

CERTS = {
    "validacao": {
        "set_name": "Peso de Validação",
        "certificate_number": "",
        "calibration_date": "2025-06-01",
        "material": "",
        "quantity": 1,
    },
    "rf11": {
        "set_name": "Coleção RF-11 (20kg)",
        "certificate_number": "CER27447/24",
        "calibration_date": "2024-06-01",
        "material": "Ferro Fundido",
        "quantity": len(RF11_VVC),
    },
    "rf02": {
        "set_name": "Coleção RF-02 (1mg a 200g)",
        "certificate_number": "M-80377/25",
        "calibration_date": "2025-03-15",
        "material": "Misto",
        "quantity": len(RF02),
    },
    "rf04": {
        "set_name": "Coleção RF-04 (1g a 5000g)",
        "certificate_number": "CER37891/25",
        "calibration_date": "2025-05-20",
        "material": "Aço Inox",
        "quantity": len(RF04),
    },
    "rf10": {
        "set_name": "Coleção RF-10 (10 kg)",
        "certificate_number": "CER40686/25",
        "calibration_date": "2025-05-20",
        "material": "Ferro Fundido",
        "quantity": 1,
    },
    "rf12": {
        "set_name": "Coleção RF-12 (500 kg)",
        "certificate_number": "P-1081",
        "calibration_date": "2025-01-10",
        "material": "Ferro Fundido",
        "quantity": len(RF12_VVC),
    },
}


def sql_escape(s: str) -> str:
    return s.replace("'", "''")


def main() -> None:
    lines: list[str] = []
    lines.append("-- Importação de pesos padrão (planilha QualiProc)")
    lines.append("-- Execute no SQL Editor do Supabase ou via psql.")
    lines.append("--")
    lines.append("-- 1. Ajuste v_tenant_code abaixo (código do ambiente/cliente).")
    lines.append("-- 2. Revise V.V.C da Coleção RF-11 se tiver a planilha original em Excel.")
    lines.append("-- 3. Datas de calibração inferidas pelo número do certificado; ajuste se souber a data exata.")
    lines.append("")
    lines.append("DO $$")
    lines.append("DECLARE")
    lines.append("  v_tenant_id uuid;")
    lines.append("  v_tenant_code text := 'SEU_TENANT_CODE';  -- ex.: qualiproc")
    lines.append("BEGIN")
    lines.append("  SELECT id INTO v_tenant_id FROM public.tenants WHERE code = v_tenant_code LIMIT 1;")
    lines.append("  IF v_tenant_id IS NULL THEN")
    lines.append("    RAISE EXCEPTION 'Tenant não encontrado: %', v_tenant_code;")
    lines.append("  END IF;")
    lines.append("")
    lines.append("  -- Certificados de conjunto (weight_standard_certificates)")
    lines.append("  INSERT INTO public.weight_standard_certificates (")
    lines.append("    tenant_id, set_name, class, quantity, manufacturer, model_type, material,")
    lines.append("    certificate_number, calibration_date, calibrated_by")
    lines.append("  )")
    lines.append("  SELECT * FROM (VALUES")

    cert_values = []
    for key, c in CERTS.items():
        if not c["certificate_number"] and key == "validacao":
            continue
        cert_values.append(
            "      (v_tenant_id, "
            f"'{sql_escape(c['set_name'])}', '', {c['quantity']}, '', '', "
            f"'{sql_escape(c['material'])}', "
            f"'{sql_escape(c['certificate_number'])}', "
            f"'{c['calibration_date']}'::date, '')"
        )
    lines.append(",\n".join(cert_values))
    lines.append("  ) AS v(tenant_id, set_name, class, quantity, manufacturer, model_type, material, certificate_number, calibration_date, calibrated_by)")
    lines.append("  WHERE NOT EXISTS (")
    lines.append("    SELECT 1 FROM public.weight_standard_certificates w")
    lines.append("    WHERE w.tenant_id = v.tenant_id AND w.certificate_number = v.certificate_number")
    lines.append("  );")
    lines.append("")
    lines.append("  -- Pesos individuais (standard_weight_items)")
    lines.append("  INSERT INTO public.standard_weight_items (")
    lines.append("    tenant_id, identification, nominal_value, conventional_value,")
    lines.append("    previous_conventional_value, standard_drift, weight_status,")
    lines.append("    expanded_uncertainty, unit, certificate_number, weight_certificate_id, active")
    lines.append("  )")
    lines.append("  SELECT")
    lines.append("    v_tenant_id,")
    lines.append("    s.identification,")
    lines.append("    s.nominal_value,")
    lines.append("    s.conventional_value,")
    lines.append("    '0',")
    lines.append("    s.expanded_uncertainty,")
    lines.append("    '1',")
    lines.append("    s.expanded_uncertainty,")
    lines.append("    'g',")
    lines.append("    COALESCE(c.certificate_number, COALESCE(s.cert_num, '')),")
    lines.append("    c.id,")
    lines.append("    true")
    lines.append("  FROM (VALUES")

    row_values = []
    for ident, vn, vvc, ue, cert_key, _mat in ROWS:
        if cert_key == "validacao":
            row_values.append(
                f"    ('{sql_escape(ident)}', '{vn}', '{vvc}', '{ue}', NULL::text)"
            )
        else:
            cert_num = CERTS[cert_key]["certificate_number"]
            row_values.append(
                f"    ('{sql_escape(ident)}', '{vn}', '{vvc}', '{ue}', '{sql_escape(cert_num)}')"
            )

    lines.append(",\n".join(row_values))
    lines.append("  ) AS s(identification, nominal_value, conventional_value, expanded_uncertainty, cert_num)")
    lines.append("  LEFT JOIN public.weight_standard_certificates c")
    lines.append("    ON c.tenant_id = v_tenant_id AND c.certificate_number = s.cert_num")
    lines.append("  WHERE NOT EXISTS (")
    lines.append("    SELECT 1 FROM public.standard_weight_items i")
    lines.append("    WHERE i.tenant_id = v_tenant_id AND i.identification = s.identification")
    lines.append("  );")
    lines.append("")
    lines.append("  RAISE NOTICE 'Importação concluída: % pesos para tenant %', "
                 f"{len(ROWS)}, v_tenant_code;")
    lines.append("END $$;")
    lines.append("")

    out = "\n".join(lines)
    out_path = (
        "supabase/seeds/import_standard_weights_planilha.sql"
    )
    with open(out_path, "w", encoding="utf-8") as f:
        f.write(out)
    print(f"Gerado: {out_path} ({len(ROWS)} pesos)")


if __name__ == "__main__":
    main()
