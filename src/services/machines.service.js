// Machines Service - Business Logic Layer
const DatabaseUtils = require('../utils/database');
const { NotFoundError, ValidationError } = require('../middleware/error-handler');

class MachinesService {
  
  /**
   * Get all machines with optional filtering
   */
  async getAllMachines(filters = {}) {
    const { environment, status } = filters;
    
    let query = `
      SELECT 
        m.id, m.name, m.code, m.type, m.environment, m.status, m.capacity, m.production_rate,
        m.crew_size, m.operators_per_shift, m.hopper_loaders_per_shift, m.packers_per_shift,
        po.order_number
      FROM machines m
      LEFT JOIN production_orders po ON m.id = po.machine_id AND po.status IN ('in_progress', 'stopped')
      WHERE 1=1
    `;
    
    const params = [];
    let paramIndex = 1;
    
    if (environment) {
      query += ` AND m.environment = $${paramIndex}`;
      params.push(environment);
      paramIndex++;
    }
    
    if (status) {
      const statuses = status.split(',').map(s => s.trim());
      query += ` AND m.status = ANY($${paramIndex})`;
      params.push(statuses);
      paramIndex++;
    }
    
    query += ' ORDER BY m.name';
    
    const result = await DatabaseUtils.raw(query, params);
    return result.rows;
  }

  /**
   * Get machines with shift cycle enabled
   */
  async getMachinesWithShiftCycles() {
    const query = `
      SELECT 
        id, name, environment, status, capacity, 
        shift_cycle_enabled, cycle_start_date,
        operators_per_shift, hopper_loaders_per_shift, packers_per_shift
      FROM machines 
      WHERE shift_cycle_enabled = true
      ORDER BY environment, name
    `;
    
    const result = await DatabaseUtils.raw(query);
    return result.rows;
  }

  /**
   * Get machine by ID
   */
  async getMachineById(id) {
    const machine = await DatabaseUtils.findOne('machines', { id });
    if (!machine) {
      throw new NotFoundError('Machine');
    }
    return machine;
  }

  /**
   * Create new machine
   */
  async createMachine(machineData, userId) {
    const {
      name,
      type,
      environment,
      capacity = 100
    } = machineData;

    // Validate required fields
    if (!name || !type || !environment) {
      throw new ValidationError('Name, type, and environment are required');
    }

    // Validate environment
    const validEnvironments = ['blending', 'packaging', 'beverage'];
    if (!validEnvironments.includes(environment)) {
      throw new ValidationError('Invalid environment. Must be one of: ' + validEnvironments.join(', '));
    }

    // Validate capacity
    if (capacity < 1 || capacity > 200) {
      throw new ValidationError('Capacity must be between 1 and 200');
    }

    // Check for duplicate machine name
    const existingMachine = await DatabaseUtils.findOne('machines', { name });
    if (existingMachine) {
      throw new ValidationError('Machine name already exists');
    }

    const newMachine = await DatabaseUtils.insert('machines', {
      name: name.trim(),
      type: type.trim(),
      environment,
      capacity,
      status: 'available',
      created_at: new Date(),
      updated_at: new Date()
    });

    return newMachine;
  }

  /**
   * Update machine
   */
  async updateMachine(id, updateData, userId) {
    const machine = await this.getMachineById(id);
    
    // Prevent updates to machines in use
    if (machine.status === 'in_use') {
      throw new ValidationError('Cannot update machine while in use');
    }

    // Validate capacity if provided
    if (updateData.capacity && (updateData.capacity < 1 || updateData.capacity > 200)) {
      throw new ValidationError('Capacity must be between 1 and 200');
    }

    // Trim string fields
    if (updateData.name) updateData.name = updateData.name.trim();
    if (updateData.type) updateData.type = updateData.type.trim();

    const updatedMachine = await DatabaseUtils.update(
      'machines',
      {
        ...updateData,
        updated_at: new Date()
      },
      { id },
      '*'
    );

    return updatedMachine[0];
  }

  /**
   * Update machine status only
   */
  async updateMachineStatus(id, status, userId) {
    const machine = await this.getMachineById(id);
    
    // Validate status
    const validStatuses = ['available', 'maintenance', 'offline'];
    if (!validStatuses.includes(status)) {
      throw new ValidationError('Invalid status. Must be one of: ' + validStatuses.join(', '));
    }

    // Check if machine can change status
    if (machine.status === 'in_use' || machine.status === 'paused') {
      throw new ValidationError('Cannot change status while machine is in use or paused');
    }

    const updatedMachine = await DatabaseUtils.update(
      'machines',
      {
        status,
        updated_at: new Date()
      },
      { id },
      '*'
    );

    return updatedMachine[0];
  }

  /**
   * Delete machine
   */
  async deleteMachine(id, userId) {
    const machine = await this.getMachineById(id);
    
    // Check if machine is in use
    if (machine.status === 'in_use' || machine.status === 'paused') {
      throw new ValidationError('Cannot delete machine while in use');
    }

    // Check if machine has production history
    const orderCount = await DatabaseUtils.raw(
      'SELECT COUNT(*) as count FROM production_orders WHERE machine_id = $1',
      [id]
    );

    if (parseInt(orderCount.rows[0].count) > 0) {
      throw new ValidationError('Cannot delete machine with production history. Set to offline instead.');
    }

    await DatabaseUtils.delete('machines', { id });
    return true;
  }

  /**
   * Get machine statistics grouped by environment
   */
  async getMachineStats() {
    const query = `
      SELECT 
        environment,
        COUNT(*) as total,
        SUM(CASE WHEN status = 'available' THEN 1 ELSE 0 END) as available,
        SUM(CASE WHEN status = 'in_use' THEN 1 ELSE 0 END) as in_use,
        SUM(CASE WHEN status = 'maintenance' THEN 1 ELSE 0 END) as maintenance,
        SUM(CASE WHEN status = 'offline' THEN 1 ELSE 0 END) as offline
      FROM machines
      GROUP BY environment
      ORDER BY environment
    `;

    const result = await DatabaseUtils.raw(query);
    return result.rows;
  }

  /**
   * Get machine status overview
   */
  async getMachineStatusOverview() {
    const query = `
      SELECT 
        id,
        name,
        type,
        status,
        environment
      FROM machines
      ORDER BY name
    `;

    const result = await DatabaseUtils.raw(query);
    return result.rows;
  }

  /**
   * Get machines with active orders for a specific date and environment
   */
  async getDailyActiveMachines(date, environment) {
    if (!date || !environment) {
      throw new ValidationError('Date and environment are required');
    }

    const query = `
      SELECT DISTINCT 
        m.id,
        m.name,
        m.type,
        m.environment,
        po.id as order_id,
        po.order_number,
        po.product_name,
        po.start_time,
        po.status as order_status,
        CASE WHEN po.id IS NOT NULL THEN true ELSE false END as has_orders_today
      FROM machines m
      LEFT JOIN production_orders po ON po.machine_id = m.id 
        AND DATE(po.start_time AT TIME ZONE 'UTC' AT TIME ZONE '+02:00') = $1
        AND po.status IN ('in_progress', 'paused', 'pending')
      WHERE m.environment = $2 AND m.status != 'offline'
      ORDER BY m.name
    `;

    const result = await DatabaseUtils.raw(query, [date, environment]);
    return result.rows;
  }

  /**
   * Synchronize machine statuses using database function
   */
  async syncMachineStatuses() {
    await DatabaseUtils.raw('SELECT sync_machine_statuses()');
    return { success: true, message: 'Machine statuses synchronized successfully' };
  }

  /**
   * Get machines available for labor planning by date
   */
  async getMachinesForLaborPlanning(date) {
    if (!date) {
      throw new ValidationError('Date is required');
    }

    const query = `
      SELECT 
        m.id as machine_id,
        m.name as machine_name,
        m.type,
        m.environment,
        m.capacity,
        COALESCE(
          (SELECT COUNT(DISTINCT la.employee_id) 
           FROM labor_assignments la 
           WHERE la.machine_id = m.id AND la.assignment_date = $1), 
          0
        ) as assigned_workers,
        COALESCE(
          (SELECT COUNT(*) 
           FROM production_orders po 
           WHERE po.machine_id = m.id 
             AND po.status IN ('pending', 'in_progress')
             AND DATE(po.due_date) = $1), 
          0
        ) as scheduled_orders
      FROM machines m
      LEFT JOIN labor_assignments la ON m.id = la.machine_id AND la.assignment_date = $1
      LEFT JOIN production_orders po ON m.id = po.machine_id 
        AND po.status IN ('pending', 'in_progress')
        AND (po.due_date IS NULL OR DATE(po.due_date) = $1)
      WHERE m.status != 'offline'
      GROUP BY m.id, m.name, m.type, m.environment, m.capacity
      ORDER BY m.name
    `;

    const result = await DatabaseUtils.raw(query, [date]);
    return result.rows;
  }

  /**
   * Get crew assignments for a machine
   */
  async getMachineCrews(machineId) {
    try {
      // Ensure machine_crews table exists first
      await DatabaseUtils.raw(`
        CREATE TABLE IF NOT EXISTS machine_crews (
          id SERIAL PRIMARY KEY,
          machine_id INTEGER NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
          crew_data JSONB NOT NULL,
          created_by INTEGER REFERENCES users(id),
          updated_by INTEGER REFERENCES users(id),
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW(),
          UNIQUE(machine_id)
        )
      `);

      const result = await DatabaseUtils.raw(`
        SELECT crew_data
        FROM machine_crews 
        WHERE machine_id = $1
      `, [machineId]);
      
      if (result.rows.length > 0 && result.rows[0].crew_data) {
        return JSON.parse(result.rows[0].crew_data);
      }
      
      // Return default crew structure if none exists
      return [
        { letter: 'A', offset: 0, employees: [] },
        { letter: 'B', offset: 2, employees: [] },
        { letter: 'C', offset: 4, employees: [] }
      ];
    } catch (error) {
      console.error('Error getting machine crews:', error);
      // Return default crew structure on error
      return [
        { letter: 'A', offset: 0, employees: [] },
        { letter: 'B', offset: 2, employees: [] },
        { letter: 'C', offset: 4, employees: [] }
      ];
    }
  }

  /**
   * Save crew assignments for a machine
   */
  async saveMachineCrews(machineId, crews, userId) {
    try {
      // Ensure machine_crews table exists
      await DatabaseUtils.raw(`
        CREATE TABLE IF NOT EXISTS machine_crews (
          id SERIAL PRIMARY KEY,
          machine_id INTEGER NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
          crew_data JSONB NOT NULL,
          created_by INTEGER REFERENCES users(id),
          updated_by INTEGER REFERENCES users(id),
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW(),
          UNIQUE(machine_id)
        )
      `);

      // Use upsert to insert or update crew data
      const result = await DatabaseUtils.raw(`
        INSERT INTO machine_crews (machine_id, crew_data, created_by, updated_by)
        VALUES ($1, $2, $3, $3)
        ON CONFLICT (machine_id)
        DO UPDATE SET 
          crew_data = EXCLUDED.crew_data,
          updated_by = EXCLUDED.updated_by,
          updated_at = NOW()
        RETURNING *
      `, [machineId, JSON.stringify(crews), userId]);

      return result.rows[0];
    } catch (error) {
      console.error('Error saving machine crews:', error);
      throw new Error('Failed to save machine crews: ' + error.message);
    }
  }
}

module.exports = new MachinesService();