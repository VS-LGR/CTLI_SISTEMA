import React from "react";
import { PdfHeader } from "./PdfHeader";
import { AbsBlock } from "./AbsBlock";
import { SimNaoPair } from "./PdfCheckbox";
import { VERSO, SUB_ROW_HEIGHT_EM } from "./layoutSpec";

export function ColetaPdfVerso({ model, logoUrl }) {
  const { verso, footer } = model;

  if (!verso.repetitividadeAplicavel) {
    return (
      <section className="coleta-pdf-page">
        <PdfHeader header={model.header} logoUrl={logoUrl} layout={VERSO.header} />
        <AbsBlock
          style={{ position: "absolute", top: "28em", left: "5em", width: "40em", textAlign: "center" }}
          className="coleta-txt-body"
        >
          Ensaio de repetitividade com carga de substituição não aplicável.
        </AbsBlock>
        <AbsBlock style={VERSO.footer.left} className="coleta-pdf-footer-line">
          Cód {footer.code} Ref.: {footer.ref}
        </AbsBlock>
        <AbsBlock style={VERSO.footer.center} className="coleta-pdf-footer-line coleta-pdf-footer-center">
          PÁGINA 2 DE 2
        </AbsBlock>
        <AbsBlock style={VERSO.footer.right} className="coleta-pdf-footer-line">
          Revisão: {footer.revision}
        </AbsBlock>
      </section>
    );
  }

  const q = verso.questoes;

  return (
    <section className="coleta-pdf-page">
      <PdfHeader header={model.header} logoUrl={logoUrl} layout={VERSO.header} />

      <AbsBlock style={VERSO.sec1.title} className="coleta-txt-sec">
        1) Descrição da Carga
      </AbsBlock>
      <AbsBlock style={VERSO.sec1.box}>
        <div className="coleta-desc-box">{verso.descricao_carga || "\u00a0"}</div>
      </AbsBlock>

      <AbsBlock style={VERSO.sec2.title} className="coleta-txt-sec">
        2) Questões sobre a Carga
      </AbsBlock>
      <AbsBlock style={VERSO.sec2.q21} className="coleta-questao">
        <span>2.1 - A Carga é de fácil manuseio?</span>
        <SimNaoPair value={q.facil_manuseio} />
      </AbsBlock>
      <AbsBlock style={VERSO.sec2.q22} className="coleta-questao">
        <span>2.2 - É fácil estimar o centro de gravidade da Carga?</span>
        <SimNaoPair value={q.facil_centro_gravidade} />
      </AbsBlock>
      <AbsBlock style={VERSO.sec2.q23} className="coleta-questao">
        <span>2.3 - A Carga permaneceu com sua massa constante durante a calibração?</span>
        <SimNaoPair value={q.massa_constante} />
      </AbsBlock>

      <AbsBlock style={VERSO.sec3.title} className="coleta-txt-sec">
        3) Repetitividade com Carga de Substituição
      </AbsBlock>
      <AbsBlock style={VERSO.sec3.table}>
        <table className="coleta-sub-table">
          <thead>
            <tr>
              <th rowSpan={2} style={{ width: "7%" }}>
                Formação
                <br />
                da Carga
              </th>
              <th rowSpan={2} style={{ width: "12%" }}>
                Valor nominal
                <br />
                da carga
              </th>
              <th colSpan={3}>Depois do ajuste</th>
              <th rowSpan={2} style={{ width: "8%" }}>
                Massa
                <br />
                específica
                <br />
                estimada da
                <br />
                carga
                <br />
                (kg/m³)
              </th>
              <th rowSpan={2} style={{ width: "7%" }}>
                Temperatura (t)
                <br />
                corrigida (ºC)
              </th>
              <th rowSpan={2} style={{ width: "8%" }}>
                Umidade
                <br />
                relativa (h)
                <br />
                corrigida (%ur)
              </th>
              <th rowSpan={2} style={{ width: "8%" }}>
                Pressão
                <br />
                atmosférica (P)
                <br />
                corrigida (hPa)
              </th>
            </tr>
            <tr className="sub-head-row2">
              <th style={{ width: "9%" }}>Leitura 1</th>
              <th style={{ width: "9%" }}>Leitura 2</th>
              <th style={{ width: "9%" }}>Leitura 3</th>
            </tr>
          </thead>
          <tbody>
            {verso.substituicaoRows.map((row) => (
              <tr key={row.label} style={{ height: `${SUB_ROW_HEIGHT_EM}em` }}>
                <td>{row.label}</td>
                <td>{row.valorNominal}</td>
                <td>{row.leitura1}</td>
                <td>{row.leituras3 ? row.leitura2 : ""}</td>
                <td>{row.leituras3 ? row.leitura3 : ""}</td>
                <td>{row.massaEspecifica}</td>
                <td>{row.temp}</td>
                <td>{row.umidade}</td>
                <td>{row.pressao}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </AbsBlock>

      <AbsBlock style={VERSO.nota} className="coleta-nota">
        * NOTA IMPORTANTE: O VALOR CONSIDERADO PARA P1 É O VALOR INDICADO PELA BALANÇA PARA A CARGA
        EM PESOS-PADRÃO QUE DARÁ PARTIDA AOS LOTES. L = Lote de carga
      </AbsBlock>

      <AbsBlock style={VERSO.obs} className="coleta-obs-line">
        <span>Observações:</span>
        <span className="coleta-underline-block">{verso.repetitividade.observacoes || "\u00a0"}</span>
      </AbsBlock>

      <AbsBlock style={VERSO.footer.left} className="coleta-pdf-footer-line">
        Cód {footer.code} Ref.: {footer.ref}
      </AbsBlock>
      <AbsBlock style={VERSO.footer.center} className="coleta-pdf-footer-line coleta-pdf-footer-center">
        PÁGINA 2 DE 2
      </AbsBlock>
      <AbsBlock style={VERSO.footer.right} className="coleta-pdf-footer-line">
        Revisão: {footer.revision}
      </AbsBlock>
    </section>
  );
}
