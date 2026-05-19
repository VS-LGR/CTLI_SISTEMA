import { TIPO_BALANCA_OPTIONS, TIPO_PLATAFORMA_OPTIONS } from "../coletaSchema";

export function Cb({ checked, children }) {
  return (
    <span className="coleta-cb">
      ({checked ? "X" : " "}) {children}
    </span>
  );
}

export function SimNaoPair({ value }) {
  return (
    <>
      <Cb checked={value === "sim"}>Sim</Cb>
      <Cb checked={value === "nao"}>Não</Cb>
    </>
  );
}

export function TriStateRow({ value, label }) {
  return (
    <span className="coleta-cb-line">
      {label}{" "}
      <Cb checked={value === "sim"}>sim</Cb>
      <Cb checked={value === "nao"}>não</Cb>
      <Cb checked={value === "na"}>não disponível</Cb>
    </span>
  );
}

export function BinaryRow({ value, label }) {
  return (
    <span className="coleta-cb-line">
      {label}{" "}
      <Cb checked={value === "sim"}>sim</Cb>
      <Cb checked={value === "nao"}>não</Cb>
    </span>
  );
}

export function TipoBalancaCheckboxes({ balanca }) {
  const v = balanca.tipo_balanca;
  const outros = balanca.tipo_balanca_outros;
  return (
    <div className="coleta-cb-line">
      <span className="coleta-cb-group-title">Tipo de balança:</span>
      {TIPO_BALANCA_OPTIONS.map((opt) => (
        <Cb key={opt.value} checked={v === opt.value}>
          {opt.label}
        </Cb>
      ))}
      <span>
        Outros: <span className="coleta-value-inline">{v === "outros" ? outros : ""}</span>
      </span>
    </div>
  );
}

export function TipoPlataformaCheckboxes({ balanca }) {
  const v = balanca.tipo_plataforma;
  return (
    <div className="coleta-cb-line">
      <span className="coleta-cb-group-title">Tipo de plataforma:</span>
      {TIPO_PLATAFORMA_OPTIONS.map((opt) => (
        <Cb key={opt.value} checked={v === opt.value}>
          {opt.label}
        </Cb>
      ))}
    </div>
  );
}

export function PontosSolicitadosCheckboxes({ value }) {
  return (
    <span className="coleta-cb-line">
      <Cb checked={value === "sim"}>SIM</Cb>
      <Cb checked={value === "nao"}>NÃO</Cb>
    </span>
  );
}
