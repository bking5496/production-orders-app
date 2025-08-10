const { Pool } = require('pg');
const { getSecret } = require('./security/secrets-manager');

async function testAttendanceAPI() {
  const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'production_orders',
    user: 'postgres',
    password: getSecret('DB_PASSWORD'),
  });

  const client = await pool.connect();
  try {
    const date = '2025-08-09';
    const shift = 'day';
    
    console.log(`Testing attendance register API for date: ${date}, shift: ${shift}`);
    
    // Simulate the exact query that attendance register API uses
    let assignmentsQuery = `
      SELECT 
        la.employee_id,
        la.machine_id,
        u.username as employee_name,
        CASE 
          WHEN u.employee_code IS NOT NULL AND u.employee_code != '' THEN u.employee_code
          WHEN u.profile_data->>'employee_code' IS NOT NULL AND u.profile_data->>'employee_code' != '' THEN u.profile_data->>'employee_code'
          ELSE LPAD(u.id::text, 4, '0')
        END as employee_code,
        m.name as machine_name
      FROM labor_assignments la
      JOIN users u ON la.employee_id = u.id
      JOIN machines m ON la.machine_id = m.id
      WHERE la.assignment_date = $1
      AND la.shift_type = $2
    `;
    
    const assignments = await client.query(assignmentsQuery, [date, shift]);
    
    console.log(`Found ${assignments.rows.length} assignments:`);
    assignments.rows.forEach((assignment, index) => {
      console.log(`${index + 1}. ${assignment.employee_name} (${assignment.employee_code}) - ${assignment.machine_name}`);
    });
    
    // Test the complete data structure that would be returned
    const completeData = assignments.rows.map(assignment => ({
      employee_id: assignment.employee_id,
      machine_id: assignment.machine_id,
      employee_name: assignment.employee_name,
      employee_code: assignment.employee_code,
      machine_name: assignment.machine_name,
      shift_type: shift || 'day',
      status: null,
      check_in_time: null,
      check_out_time: null,
      hours_worked: null,
      notes: null,
      marked_by: null,
      created_at: null
    }));
    
    console.log(`\nWould return ${completeData.length} records to attendance register`);
    
  } finally {
    client.release();
    await pool.end();
  }
}

testAttendanceAPI().catch(console.error);