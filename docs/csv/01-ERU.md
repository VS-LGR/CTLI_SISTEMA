# Especificação de Requisitos do Usuário (ERU) — QUATI

**Documento:** rascunho DevSistem (15/09/2026). Não é ERU aprovada.  
**Dono:** CTLI. **Sistema:** QUATI `0.1.0`.  
**Impacto BPx:** SIM (rastreabilidade, resultados de calibração, documentação, treino, equipamentos).  
**Referências:** Guia ANVISA CSV; GAMP 5; ISO/IEC 17025; ALCOA+; REQ-F-ER-001–007.

## 1. Introdução

Este ERU descreve necessidades testáveis do laboratório para gerir propostas, coletas, certificados e SGQ. Requisitos **Regulatório/Mandatório** entram obrigatoriamente na validação.

## 2. Objetivo e escopo

**Inclui:** multi-tenant; papéis; coleta balanças/pesos; cálculo; aprovação/emissão; PDF; e-mail; lista mestra; pessoal; equipamentos; backup; aceite legal/privacidade.  
**Exclui:** produção farmacêutica; comando de equipamento; workflow de NC/CAPA/reclamações.

## 3. Mapeamento dos processos

Proposta RE-7.1A → Coleta OS RE-7.2A / pesos → Cálculo de incerteza → Aprovação (e-sign) → Emissão PDF (e-sign) → Envio e-mail.

## 4. Requisitos

| ID | Descrição | Classificação |
|----|-----------|---------------|
| REQ-U-001 | Isolar dados por ambiente (tenant); admin CTLI acede a todos com registo de ação sensível | Regulatório |
| REQ-U-002 | Restringir leitura/escrita de coleta, certificado e documentos vigentes **por papel no servidor** | Regulatório |
| REQ-U-003 | Impedir UPDATE de pontos/status após `aprovado\|emitido\|enviado` (exceto RPC de emissão/aprovação) | Regulatório |
| REQ-U-004 | Exigir reautenticação (senha no ato) na aprovação e na emissão; ator = `auth.uid()` | Regulatório |
| REQ-U-005 | Registar trilha imutável (quem, quando, campo, old/new, origem) em coleta e certificado | Regulatório |
| REQ-U-006 | Desativar contas logicamente; não apagar `auth.users` nem reutilizar identidade | Regulatório |
| REQ-U-007 | Bloquear login após 3 falhas (15 min); encerrar sessão após 15 min de inatividade | Regulatório |
| REQ-U-008 | Forçar troca de senha provisória no 1.º acesso | Regulatório |
| REQ-U-009 | Aceite EULA + privacidade persistido no servidor antes de atos críticos | Regulatório |
| REQ-U-010 | Backup ZIP com hash, retenção ≥ 6 anos (2190 dias), dry-run e reauth no replace | Regulatório |
| REQ-U-011 | Calcular incerteza/conformidade de forma reproduzível a partir dos dados da coleta | Importante |
| REQ-U-012 | Numerar certificado ativo de forma única por tenant/ano | Importante |
| REQ-U-013 | Snapshot técnico na emissão (cliente, executor, signatário, pontos) | Regulatório |
| REQ-U-014 | Gerar PDF RE-7.2B / pesos a partir do certificado emitido | Importante |
| REQ-U-015 | Fluxo proposta → OS/coleta → certificado (balanças e pesos) | Importante |
| REQ-U-016 | Lista mestra: documentos vigentes não editáveis/apagáveis por papel sem permissão | Regulatório |
| REQ-F-ER-001 | Autorização por papel no servidor | Regulatório |
| REQ-F-ER-002 | Tentativas de acesso + bloqueio | Regulatório |
| REQ-F-ER-003 | Log de acessos | Regulatório |
| REQ-F-ER-004 | Trilha old/new | Regulatório |
| REQ-F-ER-005 | Export de negócio (backup/PDF) | Importante |
| REQ-F-ER-006 | Inviolabilidade do registro emitido | Regulatório |
| REQ-F-ER-007 | Backup + restauro com evidência | Regulatório |

## 5. Ambiente

Browser atual; autenticação Supabase; sem instalação local. HW/SO/BD = plataforma do fornecedor (GAMP 1).

## 6. Não operacionais

Treino de papéis; SOP de emissão; patches via controlo de mudanças; revisão periódica (não “revalidação” genérica).
