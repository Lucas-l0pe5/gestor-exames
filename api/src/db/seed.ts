import pg from 'pg';
import { createHash } from 'crypto';

const { Pool } = pg;

const pool = new Pool({
  host: process.env.PGHOST || '127.0.0.1',
  port: parseInt(process.env.PGPORT || '5433', 10),
  user: process.env.PGUSER || 'gestor',
  password: process.env.PGPASSWORD || 'troque_esta_senha',
  database: process.env.PGDATABASE || 'gestor_exames',
});

async function hashPassword(password: string): Promise<string> {
  // Simple hash for seed data (not for production)
  return createHash('sha256').update(password).digest('hex');
}

async function seed() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Clear existing data (idempotent)
    await client.query('TRUNCATE TABLE exam_status_history, exams, users, patients, exam_types RESTART IDENTITY CASCADE');
    
    // 1. Insert 2 users (1 ATTENDANT, 1 MANAGER)
    const attendantPassword = await hashPassword('senha123');
    const managerPassword = await hashPassword('senha456');
    
    const usersResult = await client.query(`
      INSERT INTO users (name, email, password_hash, role) VALUES
      ('Atendente Teste', 'atendente@teste.com', $1, 'ATTENDANT'),
      ('Gestor Teste', 'gestor@teste.com', $2, 'MANAGER')
      RETURNING id, role
    `, [attendantPassword, managerPassword]);
    
    const attendantId = usersResult.rows.find(r => r.role === 'ATTENDANT').id;
    const managerId = usersResult.rows.find(r => r.role === 'MANAGER').id;
    
    console.log('✓ Users created');
    
    // 2. Insert 20 patients with fictitious codes
    const patientNames = [
      'João Silva', 'Maria Santos', 'Pedro Oliveira', 'Ana Costa', 'Lucas Ferreira',
      'Juliana Almeida', 'Rafael Lima', 'Camila Rodrigues', 'Bruno Pereira', 'Fernanda Carvalho',
      'Gustavo Ribeiro', 'Amanda Martins', 'Felipe Gomes', 'Larissa Barbosa', 'Diego Cardoso',
      'Isabela Nunes', 'Thiago Rocha', 'Beatriz Moreira', 'Vinícius Souza', 'Natália Araújo'
    ];
    
    for (let i = 0; i < 20; i++) {
      const code = `PAC-${String(i + 1).padStart(4, '0')}`;
      await client.query(
        'INSERT INTO patients (name, code) VALUES ($1, $2)',
        [patientNames[i], code]
      );
    }
    console.log('✓ 20 patients created');
    
    // 3. Insert 5 exam types with different SLA hours
    const examTypes = [
      { name: 'Hemograma Completo', sla_hours: 4 },
      { name: 'Glicose em Jejum', sla_hours: 8 },
      { name: 'Ressonância Magnética', sla_hours: 24 },
      { name: 'Tomografia Computadorizada', sla_hours: 48 },
      { name: 'Biópsia', sla_hours: 72 }
    ];
    
    const examTypeIds: string[] = [];
    for (const et of examTypes) {
      const result = await client.query(
        'INSERT INTO exam_types (name, sla_hours) VALUES ($1, $2) RETURNING id',
        [et.name, et.sla_hours]
      );
      examTypeIds.push(result.rows[0].id);
    }
    console.log('✓ 5 exam types created');
    
    // 4. Insert 200 exams with varied requested_at dates
    // ~20% overdue (40 exams), rest within SLA or pending
    const now = new Date();
    const statuses = ['RECEIVED', 'IN_ANALYSIS', 'REPORT_CHECKED', 'SENT'];
    
    for (let i = 0; i < 200; i++) {
      const patientResult = await client.query('SELECT id FROM patients ORDER BY random() LIMIT 1');
      const patientId = patientResult.rows[0].id;
      
      const examTypeId = examTypeIds[Math.floor(Math.random() * examTypeIds.length)];
      
      // Get SLA for this exam type
      const slaResult = await client.query('SELECT sla_hours FROM exam_types WHERE id = $1', [examTypeId]);
      const slaHours = slaResult.rows[0].sla_hours;
      
      // Distribute requested_at over last 30 days
      const daysAgo = Math.floor(Math.random() * 30);
      const hoursAgo = Math.floor(Math.random() * 24);
      const requestedAt = new Date(now.getTime() - (daysAgo * 24 + hoursAgo) * 60 * 60 * 1000);
      
      // Determine if overdue: requested_at + sla_hours < now AND status != SENT
      const slaDeadline = new Date(requestedAt.getTime() + slaHours * 60 * 60 * 1000);
      const isOverdue = slaDeadline < now;
      
      // Pick status: if overdue, more likely to be non-SENT; if not overdue, mix of statuses
      let status: string;
      if (isOverdue) {
        // Overdue exams: 70% chance of being in progress, 30% SENT (late delivery)
        status = Math.random() < 0.7 ? statuses[Math.floor(Math.random() * 3)] : 'SENT';
      } else {
        // Non-overdue: weighted towards earlier statuses
        const rand = Math.random();
        if (rand < 0.3) status = 'RECEIVED';
        else if (rand < 0.55) status = 'IN_ANALYSIS';
        else if (rand < 0.8) status = 'REPORT_CHECKED';
        else status = 'SENT';
      }
      
      // created_by: mostly attendant, some manager
      const createdBy = Math.random() < 0.8 ? attendantId : managerId;
      
      // Insert exam
      const examResult = await client.query(`
        INSERT INTO exams (patient_id, exam_type_id, status, requested_at, updated_at, created_by)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id
      `, [patientId, examTypeId, status, requestedAt, requestedAt, createdBy]);
      
      const examId = examResult.rows[0].id;
      
      // Insert initial history row (from_status = NULL, to_status = RECEIVED)
      await client.query(`
        INSERT INTO exam_status_history (exam_id, from_status, to_status, changed_by, changed_at)
        VALUES ($1, NULL, 'RECEIVED', $2, $3)
      `, [examId, createdBy, requestedAt]);
      
      // If status progressed, add additional history rows
      if (status !== 'RECEIVED') {
        const statusIndex = statuses.indexOf(status);
        let currentTime = new Date(requestedAt.getTime() + 30 * 60 * 1000); // 30 min later
        
        for (let s = 1; s <= statusIndex; s++) {
          const fromStatus = statuses[s - 1];
          const toStatus = statuses[s];
          
          currentTime = new Date(currentTime.getTime() + Math.floor(Math.random() * 120 + 30) * 60 * 1000);
          
          await client.query(`
            INSERT INTO exam_status_history (exam_id, from_status, to_status, changed_by, changed_at)
            VALUES ($1, $2, $3, $4, $5)
          `, [examId, fromStatus, toStatus, createdBy, currentTime]);
        }
      }
    }
    
    console.log('✓ 200 exams created with history');
    
    await client.query('COMMIT');
    
    // Verify counts
    const counts = await Promise.all([
      client.query('SELECT COUNT(*) FROM users'),
      client.query('SELECT COUNT(*) FROM patients'),
      client.query('SELECT COUNT(*) FROM exam_types'),
      client.query('SELECT COUNT(*) FROM exams'),
      client.query('SELECT COUNT(*) FROM exam_status_history'),
      client.query(`
        SELECT COUNT(*) FROM exams e
        JOIN exam_types et ON e.exam_type_id = et.id
        WHERE e.status != 'SENT' AND (e.requested_at + (et.sla_hours || 'hours')::interval) < NOW()
      `)
    ]);
    
    console.log('\n=== Seed Summary ===');
    console.log(`Users: ${counts[0].rows[0].count}`);
    console.log(`Patients: ${counts[1].rows[0].count}`);
    console.log(`Exam Types: ${counts[2].rows[0].count}`);
    console.log(`Exams: ${counts[3].rows[0].count}`);
    console.log(`Status History: ${counts[4].rows[0].count}`);
    console.log(`Overdue Exams: ${counts[5].rows[0].count}`);
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Seed failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch(console.error);