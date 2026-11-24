# Gestor de Exames — Regras Globais do Projeto

## Contexto e Segurança

- Sistema full stack de portfólio para acompanhamento de fluxo de exames e indicadores de SLA[cite: 1].
- **REGRA CRÍTICA:** Dados 100% fictícios[cite: 1]. Nunca utilize nomes, códigos ou dados reais de pacientes ou do Grupo Fleury[cite: 1].
- Nunca commite arquivos `.env`, tokens ou credenciais reais[cite: 1].

## Fluxo Git e Qualidade

- Siga rigorosamente o Git Flow: branches `feature/<escopo>-<descricao>` sempre criadas a partir de `develop`[cite: 1].
- Commits atômicos no padrão Conventional Commits em inglês: `tipo(escopo): descrição no imperativo` (ex: `feat(db): add users table`)[cite: 1].
- Escopos válidos: `api`, `web`, `reports`, `infra`, `db`, `docs`[cite: 1].
- Todo código novo exige testes automatizados passando antes de concluir a tarefa[cite: 1].
- Planeje a implementação antes de sair editando arquivos e mantenha as mudanças enxutas (< 400 linhas por PR)[cite: 1].
- **Formatação**: antes de commitar, rode `npx prettier --write` nos arquivos alterados/criados (inclui Markdown, YAML, JSON, TS/JS). O CI falha se `npm run format:check` não passar.
