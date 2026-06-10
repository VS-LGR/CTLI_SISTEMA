import React from "react";
import { PdfHeader, FieldLine } from "./PdfHeader";
import { AbsBlock } from "./AbsBlock";
import {
  BinaryRow,
  PontosSolicitadosCheckboxes,
  TipoBalancaCheckboxes,
  TipoPlataformaCheckboxes,
  TriStateRow,
} from "./PdfCheckbox";
import { unidadeLabel } from "../coletaSchema";
import { FRENTE, CAL_ROW_HEIGHT_EM } from "./layoutSpec";
function BalField({ label, value }) {
  return (
    <div className="coleta-field-box coleta-txt-label">
      <span className="coleta-field-box-label">{label}</span>
      <span className="coleta-field-box-value">{value || "\u00a0"}</span>
    </div>
  );
}

export function ColetaPdfFrente({ model, logoUrl }) {
  const { cliente, balanca, ambiente, excentricidade, controle, calibracaoRows } = model;

  return (
    <section className="coleta-pdf-page">
      <PdfHeader header={model.header} logoUrl={logoUrl} />

      <AbsBlock style={FRENTE.sec1.title} className="coleta-txt-sec">
        1) Dados do Cliente
      </AbsBlock>
      <AbsBlock style={FRENTE.sec1.cliente}>
        <FieldLine label="Cliente" value={cliente.cliente} />
      </AbsBlock>
      <AbsBlock style={FRENTE.sec1.responsavel}>
        <FieldLine label="Resposável" value={cliente.responsavel} />
      </AbsBlock>

      <AbsBlock style={FRENTE.sec2.title} className="coleta-txt-sec">
        2) Informações da Balança
      </AbsBlock>
      <AbsBlock style={FRENTE.sec2.row1}>
        <div className="coleta-grid-bal">
          <BalField label="Fabricante:" value={balanca.fabricante} />
          <BalField label="Modelo:" value={balanca.modelo} />
          <BalField label="Nº de série:" value={balanca.serie} />
          <BalField label="Local da Calibração:" value={balanca.local} />
          <BalField label="Tag / Codigo Interno:" value={balanca.tag} />
        </div>
      </AbsBlock>
      <AbsBlock style={FRENTE.sec2.row2}>
        <div className="coleta-grid-bal">
          <BalField label="Etiqueta IPEM:" value={balanca.etiqueta_ipem} />
          <BalField label="Portaria Inmetro:" value={balanca.portaria_inmetro} />
          <BalField label="Capacidade:" value={balanca.capacidade} />
          <BalField label="Resolução:" value={balanca.resolucao} />
          <BalField label="Unidade" value={unidadeLabel(balanca.unidade)} />
        </div>
      </AbsBlock>
      <AbsBlock style={FRENTE.sec2.tipoBalanca}>
        <TipoBalancaCheckboxes balanca={balanca} />
      </AbsBlock>
      <AbsBlock style={FRENTE.sec2.tipoPlataforma}>
        <TipoPlataformaCheckboxes balanca={balanca} />
      </AbsBlock>

      <AbsBlock style={FRENTE.sec3.title} className="coleta-txt-sec">
        3) Condições Ambientais Durante a Calibração
      </AbsBlock>
      <AbsBlock style={FRENTE.sec3.ambLeft} className="coleta-amb-col">
        <div className="coleta-equip-row coleta-txt-label">
          <span className="coleta-equip-label">
            Climatização dos pesos-padrão e termo-baro-higrômetro (1):
          </span>
          <span className="coleta-underline-block">{ambiente.thermoLabel || "\u00a0"}</span>
        </div>
        <div className="coleta-equip-row coleta-txt-label">
          <span className="coleta-equip-label">Termo-baro-higrômetro (2):</span>
          <span className="coleta-underline-block">{ambiente.thermoLabel2 || "\u00a0"}</span>
        </div>
        <div className="coleta-txt-label coleta-amb-line">
          Horário inicial:{" "}
          <span className="coleta-underline">{ambiente.horario_inicial || "\u00a0"}</span>
          {"  "}Horário final:{" "}
          <span className="coleta-underline">{ambiente.horario_final || "\u00a0"}</span>
        </div>
        <TriStateRow label="A balança foi ajustada ?" value={ambiente.balanca_ajustada} />
        <TriStateRow label="A balança foi nivelada?" value={ambiente.balanca_nivelada} />
        <BinaryRow label="Existe vibração no local?" value={ambiente.existe_vibracao} />
        <BinaryRow label="Existe corrente de ar no local?" value={ambiente.existe_corrente_ar} />
      </AbsBlock>
      <AbsBlock style={FRENTE.sec3.ambRight} className="coleta-amb-col">
        <div className="coleta-measure-block">
          <div className="coleta-measure-title">Temperatura (t) corrigida</div>
          <div className="coleta-measure-row">
            <span>
              Inicial: <span className="coleta-underline">{ambiente.temp_inicial || "\u00a0"}</span> °C
            </span>
            <span>
              Final: <span className="coleta-underline">{ambiente.temp_final || "\u00a0"}</span> °C
            </span>
          </div>
        </div>
        <div className="coleta-measure-block">
          <div className="coleta-measure-title">Umidade relativa (h) corrigida</div>
          <div className="coleta-measure-row">
            <span>
              Inicial: <span className="coleta-underline">{ambiente.umidade_inicial || "\u00a0"}</span> %ur
            </span>
            <span>
              Final: <span className="coleta-underline">{ambiente.umidade_final || "\u00a0"}</span> %ur
            </span>
          </div>
        </div>
        <div className="coleta-measure-block">
          <div className="coleta-measure-title">Pressão atmosférica (P) corrigida</div>
          <div className="coleta-measure-row">
            <span>
              Inicial: <span className="coleta-underline">{ambiente.pressao_inicial || "\u00a0"}</span> hPa
            </span>
            <span>
              Final: <span className="coleta-underline">{ambiente.pressao_final || "\u00a0"}</span> hPa
            </span>
          </div>
        </div>
      </AbsBlock>

      <AbsBlock style={FRENTE.sec4.title} className="coleta-txt-sec">
        4) Ensaio de Excentricidade
      </AbsBlock>
      <AbsBlock style={FRENTE.sec4.valor} className="coleta-txt-body">
        Valor Aplicado:{" "}
        <span className="coleta-underline">{excentricidade.valor_aplicado || "\u00a0"}</span>
      </AbsBlock>
      <AbsBlock style={FRENTE.sec4.table}>
        <table className="coleta-ecc-table">
          <thead>
            <tr>
              <th style={{ width: "18%" }}>Ponto</th>
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
      </AbsBlock>

      <AbsBlock style={FRENTE.sec5.title} className="coleta-txt-sec">
        5) Controle
      </AbsBlock>
      <AbsBlock style={FRENTE.sec5.block} className="coleta-controle-stack">
        <FieldLine label="Representante do Cliente" value={controle.representante_cliente} multiline />
        <FieldLine label="Conferido e Transcrito por" value={controle.conferido_por} multiline />
        <FieldLine label="Número do Certificado Emitido" value={controle.numero_certificado} multiline />
        <FieldLine label="Nome do Executor" value={controle.nome_executor} multiline />
        <FieldLine label="Data da Calibração" value={controle.data_calibracao_fmt} multiline />
        <div className="coleta-field-line coleta-txt-body">
          <span>Pontos de Calibração Solicitados pelo Cliente</span>
          <PontosSolicitadosCheckboxes value={controle.pontos_solicitados} />
        </div>
      </AbsBlock>

      <AbsBlock style={FRENTE.sec6.title} className="coleta-txt-sec">
        6) Calibração da Balança
      </AbsBlock>
      <AbsBlock style={FRENTE.sec6.subTitle} className="coleta-txt-sm">
        Ensaio de Repetitividade
      </AbsBlock>
      <AbsBlock style={FRENTE.sec6.table}>
        <table className="coleta-cal-table">
          <thead>
            <tr>
              <th style={{ width: "4%" }} />
              <th style={{ width: "14%" }}>
                Valor nominal do Peso de
                <br />
                Referência aplicado
              </th>
              <th style={{ width: "11%" }}>
                Leitura antes do
                <br />
                ajuste
              </th>
              <th style={{ width: "9%" }}>Leitura 1</th>
              <th style={{ width: "9%" }}>Leitura 2</th>
              <th style={{ width: "9%" }}>Leitura 3</th>
              <th className="col-ids">
                Identificação do(s) Peso(s) Padrão de Referência aplicado
              </th>
            </tr>
          </thead>
          <tbody>
            {calibracaoRows.map((row) => (
              <tr key={row.label} style={{ height: `${CAL_ROW_HEIGHT_EM}em` }}>
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
      </AbsBlock>

      <AbsBlock style={FRENTE.footer} className="coleta-pdf-footer-line coleta-pdf-footer-right">
        N.PÁG.: 1 / 2
      </AbsBlock>
    </section>
  );
}



