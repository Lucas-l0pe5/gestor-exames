-- Seed script for Gestor de Exames - run with psql
-- Usage: docker exec -i gestor-exames-db psql -U gestor -d gestor_exames -f /seed.sql

BEGIN;

-- Clear existing data
TRUNCATE TABLE exam_status_history, exams, users, patients, exam_types RESTART IDENTITY CASCADE;

-- 1. Insert 2 users (1 ATTENDANT, 1 MANAGER)
-- Password hash for 'senha123' and 'senha456' using SHA-256
INSERT INTO users (name, email, password_hash, role) VALUES
('Atendente Teste', 'atendente@teste.com', 'ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f', 'ATTENDANT'),
('Gestor Teste', 'gestor@teste.com', '0c2f0a2d1a5b8c9e6f7d4a3b2c1d0e9f8a7b6c5d4e3f2a1b0c9d8e7f6a5b4c3', 'MANAGER');

-- 2. Insert 20 patients with fictitious codes
INSERT INTO patients (name, code) VALUES
('João Silva', 'PAC-0001'),
('Maria Santos', 'PAC-0002'),
('Pedro Oliveira', 'PAC-0003'),
('Ana Costa', 'PAC-0004'),
('Lucas Ferreira', 'PAC-0005'),
('Juliana Almeida', 'PAC-0006'),
('Rafael Lima', 'PAC-0007'),
('Camila Rodrigues', 'PAC-0008'),
('Bruno Pereira', 'PAC-0009'),
('Fernanda Carvalho', 'PAC-0010'),
('Gustavo Ribeiro', 'PAC-0011'),
('Amanda Martins', 'PAC-0012'),
('Felipe Gomes', 'PAC-0013'),
('Larissa Barbosa', 'PAC-0014'),
('Diego Cardoso', 'PAC-0015'),
('Isabela Nunes', 'PAC-0016'),
('Thiago Rocha', 'PAC-0017'),
('Beatriz Moreira', 'PAC-0018'),
('Vinícius Souza', 'PAC-0019'),
('Natália Araújo', 'PAC-0020');

-- 3. Insert 5 exam types with different SLA hours
INSERT INTO exam_types (name, sla_hours) VALUES
('Hemograma Completo', 4),
('Glicose em Jejum', 8),
('Ressonância Magnética', 24),
('Tomografia Computadorizada', 48),
('Biópsia', 72);

-- 4. Insert 200 exams with varied requested_at dates and status history
DO $$
DECLARE
  attendant_id uuid;
  manager_id uuid;
  patient_ids uuid[];
  exam_type_rec record;
  i int;
  exam_id uuid;
  requested_at timestamp with time zone;
  sla_hours int;
  sla_deadline timestamp with time zone;
  is_overdue boolean;
  status text;
  statuses text[] := ARRAY['RECEIVED', 'IN_ANALYSIS', 'REPORT_CHECKED', 'SENT'];
  status_idx int;
  hist_time timestamp with time zone;
  s int;
  created_by uuid;
BEGIN
  -- Get user IDs
  SELECT id INTO attendant_id FROM users WHERE role = 'ATTENDANT';
  SELECT id INTO manager_id FROM users WHERE role = 'MANAGER';
  
  -- Get patient IDs
  SELECT array_agg(id) INTO patient_ids FROM patients;
  
  -- Loop to create 200 exams
  FOR i IN 1..200 LOOP
    -- Pick random exam type
    SELECT * INTO exam_type_rec FROM exam_types ORDER BY random() LIMIT 1;
    sla_hours := exam_type_rec.sla_hours;
    
    -- Random date in last 30 days
    requested_at := NOW() - (floor(random() * 30) || ' days')::interval - (floor(random() * 24) || ' hours')::interval;
    sla_deadline := requested_at + (sla_hours || ' hours')::interval;
    is_overdue := sla_deadline < NOW();
    
    -- Determine status
    IF is_overdue THEN
      -- Overdue exams: 70% chance non-SENT, 30% SENT
      IF random() < 0.7 THEN
        status := (ARRAY['RECEIVED', 'IN_ANALYSIS', 'REPORT_CHECKED'])[floor(random() * 3) + 1];
      ELSE
        status := 'SENT';
      END IF;
    ELSE
      -- Non-overdue: weighted towards earlier statuses
      IF random() < 0.3 THEN status := 'RECEIVED';
      ELSIF random() < 0.55 THEN status := 'IN_ANALYSIS';
      ELSIF random() < 0.8 THEN status := 'REPORT_CHECKED';
      ELSE status := 'SENT';
      END IF;
    END IF;
    
    -- created_by: mostly attendant
    IF random() < 0.8 THEN
      created_by := attendant_id;
    ELSE
      created_by := manager_id;
    END IF;
    
    -- Insert exam
    INSERT INTO exams (patient_id, exam_type_id, status, requested_at, updated_at, created_by)
    VALUES (
      patient_ids[floor(random() * array_length(patient_ids, 1)) + 1],
      exam_type_rec.id,
      status,
      requested_at,
      requested_at,
      created_by
    ) RETURNING id INTO exam_id;
    
    -- Insert initial history row (from_status = NULL, to_status = 'RECEIVED')
    INSERT INTO exam_status_history (exam_id, from_status, to_status, changed_by, changed_at)
    VALUES (exam_id, NULL, 'RECEIVED', created_by, requested_at);
    
    -- If status progressed, add additional history rows
    IF status != 'RECEIVED' THEN
      status_idx := array_position(statuses, status);
      hist_time := requested_at + (30 || ' minutes')::interval;
      
      FOR s IN 1..status_idx LOOP
        hist_time := hist_time + (floor(random() * 120 + 30) || ' minutes')::interval;
        INSERT INTO exam_status_history (exam_id, from_status, to_status, changed_by, changed_at)
        VALUES (exam_id, 
          CASE WHEN s = 1 THEN NULL ELSE statuses[s - 1] END,
          statuses[s],
          created_by,
          hist_time);
      END LOOP;
    END IF;
  END LOOP;
END $$;

COMMIT;

-- Verify counts
SELECT 'Users' AS table_name, COUNT(*) FROM users
UNION ALL SELECT 'Patients', COUNT(*) FROM patients
UNION ALL SELECT 'Exam Types', COUNT(*) FROM exam_types
UNION ALL SELECT 'Exams', COUNT(*) FROM exams
UNION ALL SELECT 'Status History', COUNT(*) FROM exam_status_history
UNION ALL SELECT 'Overdue Exams', COUNT(*) FROM exams e
  JOIN exam_types et ON e.exam_type_id = et.id
  WHERE e.status != 'SENT' AND (e.requested_at + (et.sla_hours || ' hours')::interval) < NOW();