# Gestor de Exames

Sistema de acompanhamento de fluxo de exames e indicadores de SLA para laboratório fictício.

## Language

**User** (Usuário)
Pessoa que acessa o sistema (atendente ou gestor). Possui credenciais de login.
_Avoid_: Account, Login, Profile

**Attendant** (Atendente)
Papel de usuário que recebe solicitações de exames e inicia o fluxo.
_Avoid_: Operator, Clerk, Staff

**Manager** (Gestor)
Papel de usuário que visualiza dashboards, relatórios e indicadores de SLA.
_Avoid_: Admin, Supervisor, Lead

**Patient** (Paciente)
Pessoa fictícia para quem exames são solicitados. Identificada por código único fictício.
_Avoid_: Client, Subject, Person

**Exam Type** (Tipo de Exame)
Categoria de exame com SLA próprio em horas (ex: "Hemograma", "Ressonância Magnética").
_Avoid_: Test Category, Exam Category, Procedure

**Exam** (Exame)
Solicitação concreta de um exame para um paciente, com status que avança linearmente (RECEIVED → IN_ANALYSIS → REPORT_CHECKED → SENT). Criado por um Attendant (created_by, pode ser NULL se usuário removido).
_Avoid_: Test, Order, Request, Case

**Exam Status** (Status do Exame)
Estado atual do exame no fluxo: RECEIVED → IN_ANALYSIS → REPORT_CHECKED → SENT.
_Avoid_: State, Stage, Phase

**Status Transition** (Transição de Status)
Mudança de um status para o próximo no fluxo obrigatório. Sempre registrada no histórico.
_Avoid_: Status Change, State Transition

**SLA** (Service Level Agreement)
Tempo máximo em horas entre a solicitação (requested_at) e o envio do laudo (status SENT), definido por Exam Type.
_Avoid_: Deadline, Target, Threshold

**Overdue Exam** (Exame Atrasado)
Exame cujo status não é SENT e cujo requested_at + sla_hours já passou.
_Avoid_: Late Exam, Expired Exam, Delayed Exam

**Seed Data** (Dados de Semente)
Conjunto de dados 100% fictícios para desenvolvimento e demonstração (2 usuários, 20 pacientes, 5 tipos de exame, 200 exames).
_Avoid_: Fixtures, Mock Data, Test Data
