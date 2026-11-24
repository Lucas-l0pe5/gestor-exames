# Database Schema Design for Exam Tracking System

## Context

We need a relational schema to support exam tracking with SLA monitoring. The domain has Users (Attendants/Managers), Patients, Exam Types, Exams, and Exam Status History.

## Decision

We use PostgreSQL with the following tables and constraints:

### users

- `id`: UUID, PK, gen_random_uuid()
- `name`: VARCHAR(255), NOT NULL
- `email`: VARCHAR(255), NOT NULL, UNIQUE
- `password_hash`: VARCHAR(255), NOT NULL
- `role`: VARCHAR(20), NOT NULL, CHECK IN ('ATTENDANT', 'MANAGER')
- `created_at`: TIMESTAMPTZ, NOT NULL, DEFAULT now()

### patients

- `id`: UUID, PK, gen_random_uuid()
- `name`: VARCHAR(255), NOT NULL
- `code`: VARCHAR(50), NOT NULL, UNIQUE (fictitious code per security rules)
- `created_at`: TIMESTAMPTZ, NOT NULL, DEFAULT now()

### exam_types

- `id`: UUID, PK, gen_random_uuid()
- `name`: VARCHAR(255), NOT NULL
- `sla_hours`: INTEGER, NOT NULL, CHECK > 0
- `created_at`: TIMESTAMPTZ, NOT NULL, DEFAULT now()

### exams

- `id`: UUID, PK, gen_random_uuid()
- `patient_id`: UUID, NOT NULL, FK → patients(id) ON DELETE RESTRICT
- `exam_type_id`: UUID, NOT NULL, FK → exam_types(id) ON DELETE RESTRICT
- `status`: VARCHAR(20), NOT NULL, DEFAULT 'RECEIVED', CHECK IN ('RECEIVED', 'IN_ANALYSIS', 'REPORT_CHECKED', 'SENT')
- `requested_at`: TIMESTAMPTZ, NOT NULL, DEFAULT now()
- `updated_at`: TIMESTAMPTZ, NOT NULL, DEFAULT now()
- `created_by`: UUID, NULL, FK → users(id) ON DELETE SET NULL
- Index on `status` for dashboard queries
- Index on `requested_at` for SLA calculations and time-range queries

### exam_status_history

- `id`: UUID, PK, gen_random_uuid()
- `exam_id`: UUID, NOT NULL, FK → exams(id) ON DELETE CASCADE
- `from_status`: VARCHAR(20), NULL, CHECK IN ('RECEIVED', 'IN_ANALYSIS', 'REPORT_CHECKED', 'SENT') -- NULL for initial RECEIVED
- `to_status`: VARCHAR(20), NOT NULL, CHECK IN ('RECEIVED', 'IN_ANALYSIS', 'REPORT_CHECKED', 'SENT')
- `changed_by`: UUID, NOT NULL, FK → users(id) ON DELETE RESTRICT
- `changed_at`: TIMESTAMPTZ, NOT NULL, DEFAULT now()
- CHECK constraint: from_status IS NULL OR from_status != to_status
- Index on `exam_id` for history lookups

## Rationale

- UUIDs for all PKs: avoids enumeration attacks, works well with distributed systems
- TIMESTAMPTZ for all timestamps: correct handling of timezones
- RESTRICT on FKs for core entities (users, patients, exam_types): prevents accidental deletion of referenced data
- SET NULL on exams.created_by: preserves exam record if attendant is deleted, maintains audit trail
- CASCADE on exam_status_history: history is meaningless without the exam
- Status as VARCHAR with CHECK: simple, no separate enum type migration needed, portable
- Linear status flow enforced at application layer (single transaction for exam update + history insert) — simpler than DB triggers, keeps business logic in service layer
- Initial history row has from_status=NULL, to_status='RECEIVED' to represent creation without a "from" state
- Indexes on exams.status and exams.requested_at: support high-frequency dashboard and SLA queries
- SLA hours on exam_type: each exam type has its own SLA, computed at query time

## Consequences

- Application must enforce linear status transitions (RECEIVED → IN_ANALYSIS → REPORT_CHECKED → SENT)
- SLA calculation: `exams.requested_at + exam_types.sla_hours * interval '1 hour' < now()` for overdue detection
- Seed script generates 200 exams with varied requested_at dates to test overdue logic
