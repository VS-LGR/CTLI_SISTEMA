# LGPD / DPA — QualiProc (rascunho operacional)

**Documento:** rascunho DevSistem (15/09/2026). **Não substitui** parecer jurídico nem o DPA assinado com o cliente.  
**Política ao titular:** rota `/privacidade` (`PRIVACY_VERSION` = `2026-09-15`).

## 1. Papéis

| Papel | Quem |
|-------|------|
| Controlador (dados do laboratório) | Cliente (titular do tenant) |
| Operador / subprocessador da aplicação | CTLI (QualiProc) |
| Subprocessadores de infra | Hospedagem (Vercel) e base de dados/auth/storage (Supabase), nos termos dos respetivos DPAs |

## 2. Dados e bases legais

Ver secções da política em `src/lib/legal/privacyContent.js`: execução de contrato (art. 7º, V); obrigação legal/regulatória (art. 7º, II — ISO/IEC 17025, sistemas computadorizados); legítimo interesse para segurança da conta (art. 7º, IX).

PII típica: nome, e-mail, papel; eventualmente CPF/RG e imagem de assinatura de colaboradores; cadastros de clientes/fornecedores.

## 3. Acordo de tratamento (cláusulas mínimas a incluir no contrato)

1. CTLI trata dados só para prestar o QualiProc, backup e suporte.  
2. O Cliente define bases legais internamente e é responsável pelos utilizadores do tenant.  
3. Instruções documentadas; subprocessadores listados; confidencialidade.  
4. Medidas: contas individuais, lockout, idle, trilha, desativação lógica, aceite no servidor.  
5. Retenção de registros BPx e backups: **mínimo 6 anos** após descontinuidade (default `backup_retention_days = 2190`), salvo prazo legal superior.  
6. Direitos do titular: canal do Cliente; CTLI apoia na medida do tecnicamente possível sem violar retenção legal de certificados.  
7. Notificação de incidente nos prazos legais.  
8. Eliminação ou devolução ao termo, **exceto** retenção legal de evidência metrológica.

## 4. Enforce técnico do aceite

- UI: `EulaAcceptanceGate` exige EULA + licença + privacidade.  
- RPC `accept_legal_terms(p_version, p_privacy_version)`.  
- Aprovação/emissão recusam se `legal_acceptance_ok()` for falso (`legal_accepted_at` e `privacy_accepted_at`).

## 5. Minimização

Recomenda-se ao Cliente não armazenar CPF/RG se o identificador profissional bastar. Assinatura de colaborador destina-se ao PDF, não a marketing.

## 6. Pacote fornecedor (P1 comercial)

Versão congelada no RFV; QI da instância do cliente (URL, projeto Supabase, papéis); exclusões PR-7.9 / 7.10 / 8.7 (pastas documentais sem workflow).
