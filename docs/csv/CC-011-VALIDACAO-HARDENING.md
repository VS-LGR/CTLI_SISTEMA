# Controle de Mudança — CC-011

| Campo | Valor |
|-------|-------|
| Sistema / versão atual | QUATI `0.1.0` |
| Solicitante | DevSistem (endurecimento pós-reverificação live CTLI) |
| Data | 15/09/2026 |
| Tipo | Planejada |

**Documento:** rascunho DevSistem. Vistos da Qualidade em falta.

## 1. Descrição da mudança

Publicar `critical-esign` e funções de desativação lógica no projeto CTLI; RLS por papel em propostas e pessoal; `REVOKE` de RPCs de emitir/aprovar a `anon`/`PUBLIC`; trilha em proposta/cargo; registar `20250915120000` no histórico.

## 2. Motivo / benefício

Fechar blockers OPS-001, 005, 006, 008 da reverificação live para permitir ensaio QO. Não declara o sistema validado.

## 3. Avaliação de impacto

| Aspecto | Impacto (S/N) | Detalhe |
|---------|---------------|---------|
| BPx / qualidade do produto | S | Certificados, propostas, pessoal |
| Integridade de dados | S | Trilha e lock já existentes + RBAC extra |
| Segurança / acesso | S | Menos superfície API |
| Interfaces | S | Edge `critical-esign` |
| Infraestrutura | S | Funções no projeto `wgnnxgqrezqvhpmhsshk` |
| Documentação de validação | S | Matriz REQ-U-002/004; este CC |

- Criticidade: Alta
- Risco residual após controles: Médio até QO executado e frontend Vercel alinhado

## 4. Atividades necessárias

| Item | Ação | Responsável |
|------|------|-------------|
| Docs | CC-011, reverificação live, matriz | DevSistem |
| Testes | OQ-RBAC, OQ-ESIGN, OQ-ACCOUNT, OQ-TRAIL | Qualidade |
| Matriz | REQ-U-002 alargado a proposta/pessoal | DevSistem |
| Treinamento | Senha no ato + aceite privacidade | Dono |
| Inventário | Versões `20250915120000` e `20250915140000` no DB | TI |

## 5. Aprovações

| Papel | Nome | Data | Decisão |
|-------|------|------|---------|
| Dono do sistema | | | |
| TI | | | |
| Validação | | | |
| Garantia da Qualidade | | | |

## 6. Execução e evidências

- `critical-esign` ACTIVE, `verify_jwt=true` (v1).
- `admin-delete-user` / `tenant-manage-*` republicadas com `disableAuthUser`.
- Migração `20250915140000_bpx_validation_hardening.sql` aplicada no CTLI.
- Políticas `cp_select` / `pp_select` com `can_access_proposals()` / `can_access_personnel()`.
- EXECUTE de emit/approve só `authenticated` / `postgres` / `service_role`.

## 7. Desvios relacionados

Histórico `schema_migrations` ainda incompleto para ficheiros `202507*`–`202508*` (objetos existem; versões não listadas). Frontend Vercel desta commit **não** foi publicado nesta mudança.

## 8. Encerramento

- Estado validado mantido: **Não** (ainda não havia estado validado; claim GxP continua condicionado a QO+RFV)
- Data de fechamento: aberto até vistos GQ
