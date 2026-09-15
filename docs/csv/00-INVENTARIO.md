# Inventário do sistema computadorizado — QUATI

**Documento:** rascunho DevSistem (15/09/2026). Não substitui o inventário controlado da Qualidade.

| Campo | Valor |
|-------|-------|
| Nome comercial | QUATI |
| Dono / área | CTLI — laboratório de calibração (balanças e pesos-padrão) |
| Versão de software | npm `0.1.0` (congelar no RFV na data de go-live) |
| Tipo | Sistema já desenvolvido; validação **prospectiva do produto** |
| Infra (GAMP 1) | Vercel (estáticos) + Supabase Auth / Postgres / Storage / Edge Functions |
| Aplicação (GAMP 3) | SPA React + SQL/RLS + Edge Functions + fórmulas de certificado em JS |
| Dados | Postgres (RLS por tenant e papel); Storage (PDFs, assinaturas, backups) |
| Utilizadores | Admin CTLI, gerente qualidade, gerente geral, cliente (portal), técnico de campo, demais papéis em `roles.js` |

## Módulos em inventário

| Módulo | Código / tabelas | Impacto BPx | Notas |
|--------|------------------|-------------|--------|
| Proposta comercial | RE-7.1A | I | Entrada do fluxo crítico |
| Coleta OS balanças | RE-7.2A | I | Dados de calibração |
| Coleta pesos | RE-7.2 pesos | I | Dados de calibração |
| Certificados balanças / pesos | RE-7.2B | I | Resultado oficial |
| Cálculo de incerteza | `src/lib/certificateCalculations/` | I | Motor JS |
| Pessoal | RE-6.2A–F | I | Treino / competência |
| Equipamentos | RE-6.4 | I | Ficha, cronograma, verificação, manutenção |
| Lista mestra / DOCX | PR-8.3 | I | Documentação controlada |
| Compras / recebimento | PR-6.6 | I | Fornecedores / pedidos |
| Dashboard / admin | — | NI/I misto | Admin cross-tenant = risco |
| Backup tenant | `tenant-backup` | I | Continuidade / ALCOA+ |
| Pastas QMS NC/CAPA/reclamações | PR-7.9/7.10/8.7 | NI (só documental) | Sem workflow |

## Controlos eletrónicos (código)

Migração `supabase/migrations/20250915120000_bpx_electronic_controls.sql` + Edge Function `critical-esign`.
