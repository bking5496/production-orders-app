const { Pool } = require('pg');
const { getSecret } = require('./security/secrets-manager');

async function testLabourLayoutAPI() {
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
    
    console.log(`Testing Labour Layout API (/api/labour/roster) for date: ${date}`);
    
    // Simulate the exact queries from /api/labour/roster
    
    // 1. Get assignments
    const assignmentsQuery = `
      SELECT 
        la.id,
        la.employee_id,
        la.machine_id,
        la.assignment_date,
        la.shift_type,
        la.role,
        la.start_time,
        la.end_time,
        la.hourly_rate,
        u.username,
        u.email,
        u.role as user_role,
        u.company,
        CASE 
          WHEN u.employee_code IS NOT NULL AND u.employee_code != '' THEN u.employee_code
          WHEN u.profile_data->>'employee_code' IS NOT NULL AND u.profile_data->>'employee_code' != '' THEN u.profile_data->>'employee_code'
          ELSE LPAD(u.id::text, 4, '0')
        END as employee_code,
        m.name as machine_name,
        m.environment
      FROM labor_assignments la
      JOIN users u ON la.employee_id = u.id
      JOIN machines m ON la.machine_id = m.id
      WHERE la.assignment_date = $1
      ORDER BY m.name, la.shift_type, la.role
    `;
    
    const assignments = await client.query(assignmentsQuery, [date]);
    console.log(`\n=== ASSIGNMENTS (${assignments.rows.length}) ===`);
    
    const assignmentsFormatted = assignments.rows.map((a, index) => {
      const formatted = {
        id: a.id,
        employee_id: a.employee_id,
        fullName: a.username,
        name: a.username,
        employee_code: a.employee_code,
        machine: a.machine_name,
        machine_id: a.machine_id,
        position: a.role,
        shift: a.shift_type,
        shift_type: a.shift_type,
        company: a.company || 'Production Company',
        status: 'scheduled',
        role: a.user_role,
        production_area: a.environment,
        start_time: a.start_time,
        end_time: a.end_time,
        hourly_rate: a.hourly_rate,
        assignment_date: a.assignment_date
      };
      
      console.log(`${index + 1}. ${formatted.name} (${formatted.employee_code}) - ${formatted.machine} - ${formatted.shift} shift - ${formatted.position}`);
      return formatted;
    });
    
    // 2. Get supervisors
    const supervisorsQuery = `
      SELECT DISTINCT
        u.id,
        u.username,
        u.email,
        u.role,
        u.company,
        CASE 
          WHEN u.employee_code IS NOT NULL AND u.employee_code != '' THEN u.employee_code
          WHEN u.profile_data->>'employee_code' IS NOT NULL AND u.profile_data->>'employee_code' != '' THEN u.profile_data->>'employee_code'
          ELSE LPAD(u.id::text, 4, '0')
        END as employee_code,
        la.shift_type
      FROM labor_assignments la
      JOIN users u ON la.employee_id = u.id
      WHERE la.assignment_date = $1 
        AND (u.role = 'supervisor' OR u.role = 'admin')
      ORDER BY u.username
    `;
    
    const supervisors = await client.query(supervisorsQuery, [date]);
    console.log(`\n=== SUPERVISORS (${supervisors.rows.length}) ===`);
    
    const supervisorsFormatted = supervisors.rows.map((s, index) => {
      const formatted = {
        id: s.id,
        fullName: s.username,
        name: s.username,
        employee_code: s.employee_code,
        shift: s.shift_type || 'day',
        status: 'scheduled',
        role: s.role,
        position: 'Supervisor'
      };
      
      console.log(`${index + 1}. ${formatted.name} (${formatted.employee_code}) - ${formatted.shift} shift - Supervisor`);
      return formatted;
    });
    
    // 3. Get machines in use
    const machinesInUseQuery = `
      SELECT DISTINCT m.name
      FROM labor_assignments la
      JOIN machines m ON la.machine_id = m.id
      WHERE la.assignment_date = $1
      ORDER BY m.name
    `;
    
    const machinesInUse = await client.query(machinesInUseQuery, [date]);
    console.log(`\n=== MACHINES IN USE (${machinesInUse.rows.length}) ===`);
    machinesInUse.rows.forEach((m, index) => {
      console.log(`${index + 1}. ${m.name}`);
    });
    
    // Calculate totals
    const dayAssignments = assignmentsFormatted.filter(a => a.shift_type === 'day').length;
    const nightAssignments = assignmentsFormatted.filter(a => a.shift_type === 'night').length;
    const daySupervisors = supervisorsFormatted.filter(s => s.shift === 'day').length;
    const nightSupervisors = supervisorsFormatted.filter(s => s.shift === 'night').length;
    
    const summary = {
      total_supervisors: supervisorsFormatted.length,
      total_assignments: assignmentsFormatted.length,
      total_attendance: supervisorsFormatted.length + assignmentsFormatted.length,
      total_machines_in_use: machinesInUse.rows.length,
      day_supervisors: daySupervisors,
      night_supervisors: nightSupervisors,
      day_assignments: dayAssignments,
      night_assignments: nightAssignments
    };
    
    console.log(`\n=== SUMMARY ===`);
    console.log(`Total Records: ${summary.total_attendance} (${summary.total_supervisors} supervisors + ${summary.total_assignments} assignments)`);
    console.log(`Day: ${summary.day_supervisors} supervisors + ${dayAssignments} assignments = ${summary.day_supervisors + dayAssignments}`);
    console.log(`Night: ${summary.night_supervisors} supervisors + ${nightAssignments} assignments = ${summary.night_supervisors + nightAssignments}`);
    console.log(`Machines in use: ${summary.total_machines_in_use}`);
    
  } finally {
    client.release();
    await pool.end();
  }
}

testLabourLayoutAPI().catch(console.error);