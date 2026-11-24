# API Node.js + Express + TypeScript

## Arquitetura e Tipagem

- TypeScript com `strict: true`[cite: 1]. Proibido o uso de `any` ou supressões de lint (`@ts-ignore`).
- Valide todas as entradas HTTP com `zod`[cite: 1].
- Respeite a separação estrita de camadas: `routes` -> `controllers` -> `services` -> `repositories`[cite: 1].
- Queries SQL e chamadas ao `pg` devem ficar **exclusivamente** dentro de `repositories`[cite: 1].

## Regras de Negócio e Banco

- Migrações gerenciadas com `node-pg-migrate`[cite: 1].
- A transição de status de exames (`RECEIVED -> IN_ANALYSIS -> REPORT_CHECKED -> SENT`) deve ocorrer dentro de uma **transação SQL única**, atualizando o exame e inserindo o registro em `exam_status_history` juntos[cite: 1].
- Testes de integração com Jest + Supertest rodando contra PostgreSQL real[cite: 1].

## Formatação

- Antes de commitar, rode `npx prettier --write` nos arquivos alterados/criados (inclui Markdown, YAML, JSON, TS/JS). O CI falha se `npm run format:check` não passar.
