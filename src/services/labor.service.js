// Labor Service - Business Logic Layer
const DatabaseUtils = require('../utils/database');
const { NotFoundError, ValidationError } = require('../middleware/error-handler');

class LaborService {
  
  /**
   * Get employees for planning
   */
  async getEmployeesForPlanning() {
    const query = `
      SELECT 
        id, 
        username, 
        full_name, 
        employee_code,
        role,
        is_active,
        phone,
        preferred_machine
      FROM users 
      WHERE is_active = true 
        AND role IN ('operator', 'supervisor', 'admin')
      ORDER BY full_name, role
    `;
    
    const result = await DatabaseUtils.raw(query);
    return result.rows;
  }

  /**
   * Get supervisors for planning
   */
  async getSupervisors(filters = {}) {
    const { date, shift } = filters;
    
    let query = `
      SELECT 
        ls.*,
        u.full_name,
        u.username,
        u.employee_code
      FROM labor_supervisors ls
      JOIN users u ON ls.user_id = u.id
      WHERE u.is_active = true
    `;
    
    const params = [];
    let paramIndex = 1;
    
    if (date) {
      query += ` AND ls.assignment_date = $${paramIndex}`;
      params.push(date);
      paramIndex++;
    }
    
    if (shift) {
      query += ` AND ls.shift = $${paramIndex}`;
      params.push(shift);
      paramIndex++;
    }
    
    query += ` ORDER BY ls.assignment_date DESC, ls.shift`;
    
    const result = await DatabaseUtils.raw(query, params);
    return result.rows;
  }

  /**
   * Add supervisor assignment
   */
  async addSupervisor(supervisorData, userId) {
    const { user_id, date, shift, environment } = supervisorData;
    
    // Check if supervisor already assigned for this date/shift
    const existing = await DatabaseUtils.findOne(
      'labor_supervisors',
      { user_id, assignment_date: date, shift }
    );
    
    if (existing) {
      throw new ValidationError('Supervisor already assigned for this date and shift');
    }
    
    const supervisor = await DatabaseUtils.insert(
      'labor_supervisors',
      {
        user_id,
        assignment_date: date,
        shift,
        environment,
        assigned_by: userId,
        created_at: new Date(),
        updated_at: new Date()
      },
      '*'
    );
    
    return supervisor;
  }

  /**
   * Delete supervisor assignment
   */
  async deleteSupervisor(supervisorId) {
    const result = await DatabaseUtils.delete('labor_supervisors', { id: supervisorId });
    
    if (!result) {
      throw new NotFoundError('Supervisor assignment not found');
    }
    
    return true;
  }

  /**
   * Update assignment status
   */
  async updateAssignmentStatus(assignmentId, status, userId) {
    const assignment = await DatabaseUtils.update(
      'labor_assignments',
      { id: assignmentId },
      { 
        status, 
        updated_by: userId,
        updated_at: new Date()
      },
      '*'
    );
    
    if (!assignment) {
      throw new NotFoundError('Assignment not found');
    }
    
    return assignment;
  }

  /**
   * Get labor assignments with filtering
   */
  async getLaborAssignments(filters = {}) {
    const { start_date, end_date, environment, machine_id, employee_id, shift_type } = filters;
    
    let query = `
      SELECT 
        la.*,
        u.full_name,
        u.username,
        u.employee_code,
        u.role as employee_role,
        m.name as machine_name,
        m.environment as machine_environment
      FROM labor_assignments la
      JOIN users u ON la.employee_id = u.id
      LEFT JOIN machines m ON la.machine_id = m.id
      WHERE 1=1
    `;
    
    const params = [];
    let paramIndex = 1;
    
    if (start_date) {
      query += ` AND la.assignment_date >= $${paramIndex}`;
      params.push(start_date);
      paramIndex++;
    }
    
    if (end_date) {
      query += ` AND la.assignment_date <= $${paramIndex}`;
      params.push(end_date);
      paramIndex++;
    }
    
    if (environment) {
      query += ` AND (m.environment = $${paramIndex} OR la.machine_id IS NULL)`;
      params.push(environment);
      paramIndex++;
    }
    
    if (machine_id) {
      query += ` AND la.machine_id = $${paramIndex}`;
      params.push(machine_id);
      paramIndex++;
    }
    
    if (employee_id) {
      query += ` AND la.employee_id = $${paramIndex}`;
      params.push(employee_id);
      paramIndex++;
    }
    
    if (shift_type) {
      query += ` AND la.shift_type = $${paramIndex}`;
      params.push(shift_type);
      paramIndex++;
    }
    
    query += ` ORDER BY la.assignment_date, la.shift_type, la.machine_id, la.role`;
    
    const result = await DatabaseUtils.raw(query, params);
    return result.rows;
  }

  /**
   * Get machines scheduled for labor planning by date
   */
  async getMachinesForLaborPlanning(date) {
    if (!date) {
      throw new ValidationError('Date parameter is required');
    }
    
    const query = `
      SELECT DISTINCT
        m.id as machine_id,
        m.name as machine_name,
        m.environment,
        m.capacity,
        m.operators_per_shift,
        m.hopper_loaders_per_shift,
        m.packers_per_shift,
        po.order_number,
        po.product_name,
        po.status as order_status,
        po.id as order_id,
        po.scheduled_start_shift,
        po.scheduled_end_shift,
        po.scheduled_start_date,
        po.scheduled_end_date,
        CASE 
          WHEN po.scheduled_start_shift IS NOT NULL AND po.scheduled_end_shift IS NOT NULL 
            AND po.scheduled_start_shift <> po.scheduled_end_shift
          THEN ARRAY[po.scheduled_start_shift, po.scheduled_end_shift]
          WHEN po.scheduled_start_shift IS NOT NULL 
          THEN ARRAY[po.scheduled_start_shift]
          ELSE array_remove(array_agg(DISTINCT la.shift_type), NULL)
        END as scheduled_shifts
      FROM machines m
      LEFT JOIN labor_assignments la ON m.id = la.machine_id AND la.assignment_date = $1
      LEFT JOIN production_orders po ON m.id = po.machine_id 
        AND (
          DATE(po.scheduled_start_date) = $1 
          OR DATE(po.due_date) = $1
          OR ($1 BETWEEN DATE(po.scheduled_start_date) AND DATE(po.scheduled_end_date))
          OR (po.status IN ('in_progress') AND $1 BETWEEN DATE(po.scheduled_start_date) AND DATE(po.scheduled_end_date))
        )
      WHERE la.id IS NOT NULL OR po.id IS NOT NULL
      GROUP BY m.id, m.name, m.environment, m.capacity, m.operators_per_shift, 
               m.hopper_loaders_per_shift, m.packers_per_shift, po.order_number, 
               po.product_name, po.status, po.id, po.scheduled_start_shift, po.scheduled_end_shift,
               po.scheduled_start_date, po.scheduled_end_date
      ORDER BY m.name
    `;
    
    const result = await DatabaseUtils.raw(query, [date]);
    return result.rows;
  }

  /**
   * Create or update labor assignment
   */
  async createOrUpdateLaborAssignment(assignmentData, userId) {
    const { employee_id, machine_id, assignment_date, shift_type, role, start_time, end_time, hourly_rate } = assignmentData;

    // Validate required fields
    if (!employee_id || !assignment_date || !shift_type || !role) {
      throw new ValidationError('Employee, date, shift type, and role are required');
    }

    // Machine ID is required for regular roles, but optional for factory-wide roles
    const factoryWideRoles = ['supervisor', 'forklift_driver'];
    if (!factoryWideRoles.includes(role) && !machine_id) {
      throw new ValidationError('Machine ID is required for this role');
    }

    // Validate shift type
    const validShiftTypes = ['day', 'night', 'afternoon'];
    if (!validShiftTypes.includes(shift_type)) {
      throw new ValidationError('Invalid shift type. Must be one of: ' + validShiftTypes.join(', '));
    }

    // Validate role
    const validRoles = ['operator', 'hopper_loader', 'packer', 'supervisor', 'forklift_driver'];
    if (!validRoles.includes(role)) {
      throw new ValidationError('Invalid role. Must be one of: ' + validRoles.join(', '));
    }

    // Check for existing assignment
    const existingAssignment = await DatabaseUtils.findOne('labor_assignments', {
      employee_id,
      machine_id,
      assignment_date,
      shift_type,
      role
    });

    if (existingAssignment) {
      // Update existing assignment
      const updatedAssignment = await DatabaseUtils.update(
        'labor_assignments',
        {
          start_time,
          end_time,
          hourly_rate,
          updated_at: new Date(),
          updated_by: userId
        },
        { id: existingAssignment.id },
        '*'
      );
      return { ...updatedAssignment[0], action: 'updated' };
    } else {
      // Create new assignment
      const newAssignment = await DatabaseUtils.insert('labor_assignments', {
        employee_id,
        machine_id,
        assignment_date,
        shift_type,
        role,
        start_time,
        end_time,
        hourly_rate,
        created_by: userId,
        created_at: new Date()
      });
      return { ...newAssignment, action: 'created' };
    }
  }

  /**
   * Delete labor assignment
   */
  async deleteLaborAssignment(id) {
    const assignment = await DatabaseUtils.findOne('labor_assignments', { id });
    if (!assignment) {
      throw new NotFoundError('Labor assignment');
    }

    await DatabaseUtils.delete('labor_assignments', { id });
    return true;
  }

  /**
   * Copy previous week's assignments
   */
  async copyWeekAssignments(copyData, userId) {
    const { source_week, target_week, environment } = copyData;

    if (!source_week || !target_week || !environment) {
      throw new ValidationError('Source week, target week, and environment are required');
    }

    // Start transaction
    const queries = [
      // First, delete any existing assignments for the target week
      {
        text: `
          DELETE FROM labor_assignments la
          USING machines m
          WHERE la.machine_id = m.id 
          AND la.assignment_date = $1 
          AND m.environment = $2
        `,
        params: [target_week, environment]
      },
      // Copy assignments from source week to target week
      {
        text: `
          INSERT INTO labor_assignments 
          (employee_id, machine_id, assignment_date, shift_type, role, start_time, end_time, hourly_rate, created_by)
          SELECT 
            la.employee_id,
            la.machine_id,
            $2 as assignment_date,
            la.shift_type,
            la.role,
            la.start_time,
            la.end_time,
            la.hourly_rate,
            $3 as created_by
          FROM labor_assignments la
          LEFT JOIN machines m ON la.machine_id = m.id
          WHERE la.assignment_date = $1 
          AND (m.environment = $4 OR la.machine_id IS NULL)
        `,
        params: [source_week, target_week, userId, environment]
      }
    ];

    const results = await DatabaseUtils.transaction(queries);
    const copiedCount = results[1].rowCount;

    return {
      success: true,
      message: `Copied ${copiedCount} assignments from ${source_week} to ${target_week}`,
      copied_count: copiedCount
    };
  }

  /**
   * Finalize week assignments (lock them)
   */
  async finalizeWeekAssignments(finalizeData) {
    const { week, environment } = finalizeData;

    if (!week || !environment) {
      throw new ValidationError('Week and environment are required');
    }

    // For now, this is just a validation placeholder
    const assignmentCount = await DatabaseUtils.raw(`
      SELECT COUNT(*) as count
      FROM labor_assignments la
      JOIN machines m ON la.machine_id = m.id
      WHERE la.assignment_date = $1 AND m.environment = $2
    `, [week, environment]);

    if (parseInt(assignmentCount.rows[0].count) === 0) {
      throw new ValidationError('No assignments found for this week and environment');
    }

    return {
      success: true,
      message: `Week ${week} assignments validated for ${environment}`,
      assignment_count: parseInt(assignmentCount.rows[0].count)
    };
  }

  /**
   * Auto-populate daily assignments based on yesterday's assignments
   */
  async autoPopulateDailyAssignments(populateData) {
    const { date, environment } = populateData;

    if (!date || !environment) {
      throw new ValidationError('Date and environment are required');
    }

    // Get yesterday's date
    const yesterday = new Date(date);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    // Get yesterday's assignments for this environment
    const yesterdayAssignments = await DatabaseUtils.raw(`
      SELECT DISTINCT
        la.machine_id,
        la.employee_id,
        la.shift_type,
        la.role,
        u.username as emp_name,
        u.employee_code as employee_number,
        m.name as machine_name
      FROM labor_assignments la
      JOIN users u ON la.employee_id = u.id
      JOIN machines m ON la.machine_id = m.id
      WHERE la.assignment_date = $1 
        AND m.environment = $2
        AND u.is_active = true
      ORDER BY la.machine_id, la.shift_type, la.role
    `, [yesterdayStr, environment]);

    // Get today's active machines for this environment
    const activeMachines = await DatabaseUtils.raw(`
      SELECT DISTINCT 
        m.id,
        m.name,
        po.id as order_id
      FROM machines m
      LEFT JOIN production_orders po ON po.machine_id = m.id 
        AND DATE(po.start_time AT TIME ZONE 'UTC' AT TIME ZONE '+02:00') = $1
        AND po.status IN ('in_progress', 'paused', 'pending')
      WHERE m.environment = $2 AND m.status != 'offline'
    `, [date, environment]);

    const suggestions = [];

    // For each active machine today, find matching assignments from yesterday
    for (const machine of activeMachines.rows) {
      const machineYesterdayAssignments = yesterdayAssignments.rows.filter(
        ya => ya.machine_id === machine.id
      );

      for (const assignment of machineYesterdayAssignments) {
        // Check if this employee is already assigned today
        const existingAssignment = await DatabaseUtils.findOne('labor_assignments', {
          assignment_date: date,
          employee_id: assignment.employee_id
        });

        if (!existingAssignment) {
          suggestions.push({
            machine_id: machine.id,
            machine_name: machine.name,
            employee_id: assignment.employee_id,
            employee_name: assignment.emp_name,
            employee_number: assignment.employee_number,
            shift_type: assignment.shift_type,
            role: assignment.role,
            priority: 'continuity'
          });
        }
      }
    }

    return {
      success: true,
      suggestions,
      message: `Found ${suggestions.length} assignment suggestions for ${date}`
    };
  }

  /**
   * Lock daily assignments (finalize the daily schedule)
   */
  async lockDailyAssignments(lockData) {
    const { date, environment } = lockData;

    if (!date || !environment) {
      throw new ValidationError('Date and environment are required');
    }

    // Check if there are any assignments for this date and environment
    const assignmentCount = await DatabaseUtils.raw(`
      SELECT COUNT(*) as count
      FROM labor_assignments la
      JOIN machines m ON la.machine_id = m.id
      WHERE la.assignment_date = $1 AND m.environment = $2
    `, [date, environment]);

    if (parseInt(assignmentCount.rows[0].count) === 0) {
      throw new ValidationError('No assignments found for this date and environment');
    }

    // Add locked column if it doesn't exist
    try {
      await DatabaseUtils.raw(`
        ALTER TABLE labor_assignments 
        ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT FALSE
      `);
    } catch (error) {
      // Column might already exist, ignore error
    }

    // Lock all assignments for this date and environment
    const lockResult = await DatabaseUtils.raw(`
      UPDATE labor_assignments 
      SET is_locked = true, updated_at = NOW()
      FROM machines m
      WHERE labor_assignments.machine_id = m.id 
        AND labor_assignments.assignment_date = $1 
        AND m.environment = $2
        AND labor_assignments.is_locked = false
    `, [date, environment]);

    return {
      success: true,
      message: `Locked ${lockResult.rowCount} assignments for ${date} in ${environment}`,
      locked_count: lockResult.rowCount
    };
  }

  /**
   * Get labour roster for a specific date
   */
  async getLabourRoster(date) {
    if (!date) {
      date = new Date().toISOString().split('T')[0];
    }

    // Get actual labor assignments for the specified date
    const assignments = await DatabaseUtils.raw(`
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
    `, [date]);

    // Get supervisors who have assignments for this date
    const supervisors = await DatabaseUtils.raw(`
      SELECT DISTINCT
        u.id,
        u.username,
        u.email,
        u.role,
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
    `, [date]);

    // Get machines that have labor assignments for this date
    const machinesInUse = await DatabaseUtils.raw(`
      SELECT DISTINCT m.name
      FROM labor_assignments la
      JOIN machines m ON la.machine_id = m.id
      WHERE la.assignment_date = $1
      ORDER BY m.name
    `, [date]);

    return {
      supervisors: supervisors.rows.map(s => ({
        id: s.id,
        fullName: s.username,
        name: s.username,
        employee_code: s.employee_code,
        shift: s.shift_type || 'day',
        status: 'scheduled',
        role: s.role,
        position: 'Supervisor'
      })),
      assignments: assignments.rows.map(a => ({
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
        company: 'Production Company',
        status: 'scheduled',
        role: a.user_role,
        production_area: a.environment,
        start_time: a.start_time,
        end_time: a.end_time,
        hourly_rate: a.hourly_rate,
        assignment_date: a.assignment_date
      })),
      attendance: [], // Keep empty for now
      machinesInUse: machinesInUse.rows.map(m => m.name),
      summary: {
        total_supervisors: supervisors.rows.length,
        total_assignments: assignments.rows.length,
        total_attendance: supervisors.rows.length + assignments.rows.length,
        total_machines_in_use: machinesInUse.rows.length,
        day_supervisors: supervisors.rows.filter(s => s.shift_type === 'day').length,
        night_supervisors: supervisors.rows.filter(s => s.shift_type === 'night').length,
        day_assignments: assignments.rows.filter(a => a.shift_type === 'day').length,
        night_assignments: assignments.rows.filter(a => a.shift_type === 'night').length
      }
    };
  }

  /**
   * Get today's labour data
   */
  async getTodayLabourData() {
    const today = new Date().toISOString().split('T')[0];
    return await this.getLabourRoster(today);
  }

  /**
   * Get attendance register data
   */
  async getAttendanceRegister(filters) {
    const { date, shift, machine_id } = filters;
    const targetDate = date || new Date().toISOString().split('T')[0];
    
    // Get labor assignments for the specified date and shift
    let query = `
      SELECT DISTINCT
        la.id as assignment_id,
        la.employee_id,
        la.machine_id,
        la.assignment_date,
        la.shift_type,
        la.role as assignment_role,
        u.username,
        u.full_name,
        CASE 
          WHEN u.employee_code IS NOT NULL AND u.employee_code != '' THEN u.employee_code
          WHEN u.profile_data->>'employee_code' IS NOT NULL AND u.profile_data->>'employee_code' != '' THEN u.profile_data->>'employee_code'
          ELSE LPAD(u.id::text, 4, '0')
        END as employee_code,
        COALESCE(u.full_name, u.username) as employee_name,
        m.name as machine_name,
        m.environment as machine_environment,
        ar.status,
        ar.check_in_time,
        ar.notes as attendance_notes,
        ar.marked_by
      FROM labor_assignments la
      JOIN users u ON la.employee_id = u.id
      LEFT JOIN machines m ON la.machine_id = m.id
      LEFT JOIN attendance_register ar ON (
        ar.date = la.assignment_date 
        AND ar.employee_id = la.employee_id 
        AND ar.machine_id = la.machine_id 
        AND ar.shift_type = la.shift_type
      )
      WHERE la.assignment_date = $1 
        AND la.shift_type = $2
        AND u.is_active = true
        AND (m.status IN ('available', 'in_use', 'maintenance') OR m.status IS NULL)
      ORDER BY m.name, la.role, u.full_name
    `;
    
    const params = [targetDate, shift];
    
    if (machine_id && machine_id !== 'all') {
      query += ` AND la.machine_id = $3`;
      params.push(machine_id);
    }
    
    const result = await DatabaseUtils.raw(query, params);
    return result.rows;
  }

  /**
   * Mark attendance
   */
  async markAttendance(attendanceData, userId) {
    const { date, machine_id, employee_id, shift_type, status, check_in_time, notes } = attendanceData;
    
    // Convert HH:MM or HH:MM:SS format to full timestamp if needed
    let processedCheckInTime = null;
    if (check_in_time) {
      if (check_in_time.match(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/)) {
        // If it's HH:MM or HH:MM:SS format, combine with date
        processedCheckInTime = `${date} ${check_in_time}`;
        // Add seconds if not present
        if (!check_in_time.includes(':') || check_in_time.split(':').length === 2) {
          processedCheckInTime = `${date} ${check_in_time}:00`;
        }
      } else {
        // If it's already a full timestamp, use as-is
        processedCheckInTime = check_in_time;
      }
    }
    
    const query = `
      INSERT INTO attendance_register (
        date, machine_id, employee_id, shift_type, status, check_in_time, notes, marked_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (date, machine_id, employee_id, shift_type)
      DO UPDATE SET 
        status = EXCLUDED.status,
        check_in_time = EXCLUDED.check_in_time,
        notes = EXCLUDED.notes,
        marked_by = EXCLUDED.marked_by
      RETURNING *
    `;
    
    const result = await DatabaseUtils.raw(query, [
      date, machine_id, employee_id, shift_type, status, processedCheckInTime, notes, userId
    ]);
    
    return result.rows[0];
  }

}

module.exports = new LaborService();