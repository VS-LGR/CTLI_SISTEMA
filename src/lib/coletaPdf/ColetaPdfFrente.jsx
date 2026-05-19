import { PdfHeader, FieldRow } from "./PdfHeader";
import {
  BinaryRow,
  PontosSolicitadosCheckboxes,
  TipoBalancaCheckboxes,
  TipoPlataformaCheckboxes,
  TriStateRow,
} from "./PdfCheckbox";
import { unidadeLabel } from "../coletaSchema";

function GridField({ label, value }) {
  return (
    <div className="coleta-field-row">
      <span className="coleta-label">{label}</span>
      <span className="coleta-value">{value || "\u00a0"}</span>
    </div>
  );
}

export function ColetaPdfFrente({ model, logoUrl }) {
  const { cliente, balanca, ambiente, excentricidade, controle, calibracaoRows } = model;

  return (
    <section className="coleta-pdf-page">
      <PdfHeader header={model.header} logoUrl={logoUrl} />

      <h2 className="coleta-sec-title">1) Dados do Cliente</h2>
      <FieldRow label="Cliente" value={cliente.cliente} />
      <FieldRow label="Resposável" value={cliente.responsavel} />

      <h2 className="coleta-sec-title">2) Informações da Balança</h2>
      <div className="coleta-grid-3">
        <GridField label="Fabricante:" value={balanca.fabricante} />
        <GridField label="Modelo:" value={balanca.modelo} />
        <GridField label="Nº de série:" value={balanca.serie} />
      </div>
      <div className="coleta-grid-3">
        <GridField label="Etiqueta IPEM:" value={balanca.etiqueta_ipem} />
        <GridField label="Portaria Inmetro:" value={balanca.portaria_inmetro} />
        <GridField label="Capacidade:" value={balanca.capacidade} />
      </div>
      <div className="coleta-grid-3">
        <GridField label="Tag / Codigo Interno:" value={balanca.tag} />
        <GridField label="Resolução:" value={balanca.resolucao} />
        <GridField label="Unidade" value={unidadeLabel(balanca.unidade)} />
      </div>
      <FieldRow label="Local da Calibração:" value={balanca.local} />
      <TipoBalancaCheckboxes balanca={balanca} />
      <TipoPlataformaCheckboxes balanca={balanca} />

      <h2 className="coleta-sec-title">3) Condições Ambientais Durante a Calibração</h2>
      <div className="coleta-amb-block">
        <FieldRow
          label="Climatização dos pesos-padrão e termo-baro-higrômetro"
          value={ambiente.thermoLabel}
        />
        <div className="coleta-amb-row">
          <span>
            Horário inicial: <span className="coleta-value-inline">{ambiente.horario_inicial}</span>
          </span>
          <span>
            Horário final: <span className="coleta-value-inline">{ambiente.horario_final}</span>
          </span>
        </div>
        <TriStateRow label="A balança foi ajustada?" value={ambiente.balanca_ajustada} />
        <TriStateRow label="A balança foi nivelada?" value={ambiente.balanca_nivelada} />
        <BinaryRow label="Existe vibração no local?" value={ambiente.existe_vibracao} />
        <BinaryRow label="Existe corrente de ar no local?" value={ambiente.existe_corrente_ar} />
        <div className="coleta-amb-measures">
          <div>
            <div>Temperatura (t) corrigida</div>
            <div className="coleta-measure-pair">
              <span>
                Inicial: <span className="coleta-value-inline">{ambiente.temp_inicial}</span> °C
              </span>
              <span>
                Final: <span className="coleta-value-inline">{ambiente.temp_final}</span> °C
              </span>
            </div>
          </div>
          <div>
            <div>Umidade relativa (h) corrigida</div>
            <div className="coleta-measure-pair">
              <span>
                Inicial: <span className="coleta-value-inline">{ambiente.umidade_inicial}</span> %ur
              </span>
              <span>
                Final: <span className="coleta-value-inline">{ambiente.umidade_final}</span> %ur
              </span>
            </div>
          </div>
          <div>
            <div>Pressão atmosférica (P) corrigida</div>
            <div className="coleta-measure-pair">
              <span>
                Inicial: <span className="coleta-value-inline">{ambiente.pressao_inicial}</span> hPa
              </span>
              <span>
                Final: <span className="coleta-value-inline">{ambiente.pressao_final}</span> hPa
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="coleta-split">
        <div>
          <h2 className="coleta-sec-title-sm">4) Ensaio de Excentricidade</h2>
          <div className="coleta-field-row">
            <span className="coleta-label">Valor Aplicado:</span>
            <span className="coleta-value">{excentricidade.valor_aplicado || "\u00a0"}</span>
          </div>
          <table className="coleta-ecc-table">
            <thead>
              <tr>
                <th>Ponto</th>
                <th>Antes do ajuste</th>
                <th>Depois do ajuste</th>
              </tr>
            </thead>
            <tbody>
              {excentricidade.pontos.map((pt, i) => (
                <tr key={i}>
                  <td>{i + 1}</td>
                  <td>{pt.antes || ""}</td>
                  <td>{pt.depois || ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="coleta-controle-fields">
          <h2 className="coleta-sec-title-sm">5) Controle</h2>
          <FieldRow label="Representante do Cliente" value={controle.representante_cliente} />
          <FieldRow label="Conferido e Transcrito por" value={controle.conferido_por} />
          <FieldRow label="Número do Certificado Emitido" value={controle.numero_certificado} />
          <FieldRow label="Nome do Executor" value={controle.nome_executor} />
          <FieldRow label="Data da Calibração" value={controle.data_calibracao_fmt} />
          <div className="coleta-field-row">
            <span className="coleta-label">Pontos de Calibração Solicitados pelo Cliente</span>
            <PontosSolicitadosCheckboxes value={controle.pontos_solicitados} />
          </div>
        </div>
      </div>

      <h2 className="coleta-sec-title">6) Calibração da Balança</h2>
      <p className="coleta-sec-title-sm" style={{ marginTop: 0 }}>
        Ensaio de Repetitividade
      </p>
      <table className="coleta-cal-table">
        <thead>
          <tr>
            <th />
            <th className="col-peso">
              Valor nominal do Peso de Referência aplicado
            </th>
            <th className="col-antes">Leitura antes do ajuste</th>
            <th className="col-rep">Leitura 1</th>
            <th className="col-rep">Leitura 2</th>
            <th className="col-rep">Leitura 3</th>
            <th className="col-ids">
              Identificação do(s) Peso(s) Padrão de Referência aplicado
            </th>
          </tr>
        </thead>
        <tbody>
          {calibracaoRows.map((row) => (
            <tr key={row.label}>
              <td>{row.label}</td>
              <td>{row.pesoNominal}</td>
              <td>{row.antes}</td>
              <td>{row.rep1}</td>
              <td>{row.rep2}</td>
              <td>{row.rep3}</td>
              <td className="col-ids">{row.pesos}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <footer className="coleta-pdf-footer">
        <span />
        <span className="coleta-pdf-footer-center">Página 1 de 2</span>
        <span />
      </footer>
    </section>
  );
}
