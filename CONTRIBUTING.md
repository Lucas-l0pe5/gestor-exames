# Como contribuir

## Branches
- `main`: produção. Só recebe `release/*` e `hotfix/*`.
- `develop`: integração. Recebe todas as features.
- `feature/<escopo>-<descricao>`: novas funcionalidades.
- `fix/<descricao>`: correções.

## Commits
Formato: `tipo(escopo): descrição no imperativo`.
Exemplos: `feat(api): adiciona endpoint de status do exame`, `fix(web): corrige reset dos filtros`.

## Pull Requests
- Um PR por assunto.
- Título igual à mensagem do commit principal.
- Faça autorrevisão antes de pedir revisão.
- Merge por Squash and merge em `develop`.
