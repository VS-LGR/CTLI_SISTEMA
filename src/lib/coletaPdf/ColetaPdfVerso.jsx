import { PdfHeader } from "./PdfHeader";
import { SimNaoPair } from "./PdfCheckbox";

export function ColetaPdfVerso({ model, logoUrl }) {
  const { verso, footer } = model;
  const q = verso.questoes;

  return (
    <section className="coleta-pdf-page">
      <PdfHeader header={model.header} logoUrl={logoUrl} />

      <h2 className="coleta-sec-title">1) Descrição da Carga</h2>
      <div className="coleta-desc-box">{verso.descricao_carga || "\u00a0"}</div>

      <h2 className="coleta-sec-title">2) Questões sobre a Carga</h2>
      <div className="coleta-questao">
        <span>2.1 - A Carga é de fácil manuseio?</span>
        <SimNaoPair value={q.facil_manuseio} />
      </div>
      <div className="coleta-questao">
        <span>2.2 - É fácil estimar o centro de gravidade da Carga?</span>
        <SimNaoPair value={q.facil_centro_gravidade} />
      </div>
      <div className="coleta-questao">
        <span>2.3 - A Carga permaneceu com sua massa constante durante a calibração?</span>
        <SimNaoPair value={q.massa_constante} />
      </div>

      <h2 className="coleta-sec-title">3) Repetitividade com Carga de Substituição</h2>
      <table className="coleta-sub-table">
        <thead>
          <tr>
            <th rowSpan={2} className="col-form">
              Formação
              <br />
              da Carga
            </th>
            <th rowSpan={2} className="col-nom">
              Valor nominal
              <br />
              da carga
            </th>
            <th colSpan={3}>Depois do ajuste</th>
            <th rowSpan={2}>
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
            <th rowSpan={2}>
              Temperatura (t)
              <br />
              corrigida (ºC)
            </th>
            <th rowSpan={2}>
              Umidade
              <br />
              relativa (h)
              <br />
              corrigida (%ur)
            </th>
            <th rowSpan={2}>
              Pressão
              <br />
              atmosférica (P)
              <br />
              corrigida (hPa)
            </th>
          </tr>
          <tr>
            <th className="col-leit">Leitura 1</th>
            <th className="col-leit">Leitura 2</th>
            <th className="col-leit">Leitura 3</th>
          </tr>
        </thead>
        <tbody>
          {verso.substituicaoRows.map((row) => (
            <tr key={row.label}>
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

      <p className="coleta-nota">
        * NOTA IMPORTANTE: O VALOR CONSIDERADO PARA P1 É O VALOR INDICADO PELA BALANÇA PARA A CARGA
        EM PESOS-PADRÃO QUE DARÁ PARTIDA AOS LOTES. L = Lote de carga
      </p>

      <div className="coleta-field-row">
        <span className="coleta-label">Observações:</span>
        <span className="coleta-obs-box">{verso.repetitividade.observacoes || "\u00a0"}</span>
      </div>

      <footer className="coleta-pdf-footer">
        <span>
          Cód {footer.code} Ref.: {footer.ref}
        </span>
        <span className="coleta-pdf-footer-center">PÁGINA 2 DE 2</span>
        <span>Revisão: {footer.revision}</span>
      </footer>
    </section>
  );
}
