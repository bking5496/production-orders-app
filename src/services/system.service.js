// System Service - System-wide settings, health, and configuration
const DatabaseUtils = require('../utils/database');
const { NotFoundError, ValidationError } = require('../middleware/error-handler');

class SystemService {

  /**
   * Get general system settings
   */
  async getGeneralSettings() {
    // For now, return default settings
    // In the future, these could be stored in a settings table
    return {
      theme: 'light',
      language: 'en',
      timezone: 'SAST', // South African Standard Time
      dateFormat: 'YYYY-MM-DD',
      timeFormat: '24h',
      pageSize: 25,
      refreshInterval: 30000, // 30 seconds
      notifications: {
        enabled: true,
        sound: true,
        desktop: true
      },
      dashboard: {
        autoRefresh: true,
        showMetrics: true,
        compactView: false
      }
    };
  }

  /**
   * Update general system settings
   */
  async updateGeneralSettings(settings, userId) {
    // Validate settings
    const allowedSettings = [
      'theme', 'language', 'timezone', 'dateFormat', 'timeFormat', 
      'pageSize', 'refreshInterval', 'notifications', 'dashboard'
    ];

    const validSettings = {};
    for (const key in settings) {
      if (allowedSettings.includes(key)) {
        validSettings[key] = settings[key];
      }
    }

    // For now, just return success
    // In the future, store in database
    return {
      success: true,
      updatedSettings: validSettings,
      updatedBy: userId,
      updatedAt: new Date().toISOString()
    };
  }

  /**
   * Get comprehensive system health check
   */
  async getSystemHealth() {
    try {
      // Test database connection
      await DatabaseUtils.raw('SELECT 1 as health_check');
      
      // Get table information
      const tablesQuery = `
        SELECT tablename 
        FROM pg_catalog.pg_tables 
        WHERE schemaname != 'pg_catalog' AND schemaname != 'information_schema'
        ORDER BY tablename
      `;
      const tables = await DatabaseUtils.raw(tablesQuery);

      // Get database statistics
      const dbStatsQuery = `
        SELECT 
          (SELECT count(*) FROM production_orders) as total_orders,
          (SELECT count(*) FROM machines) as total_machines,
          (SELECT count(*) FROM users WHERE is_active = true) as active_users,
          (SELECT count(*) FROM labor_assignments WHERE assignment_date >= CURRENT_DATE - INTERVAL '7 days') as recent_assignments
      `;
      const dbStats = await DatabaseUtils.raw(dbStatsQuery);

      // Check critical tables
      const criticalTables = [
        'production_orders', 'machines', 'users', 'labor_assignments', 
        'production_stops', 'environments'
      ];
      
      const existingTables = tables.rows.map(t => t.tablename);
      const missingTables = criticalTables.filter(table => !existingTables.includes(table));

      // System metrics
      const systemInfo = {
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        environment: process.env.NODE_ENV || 'development',
        nodeVersion: process.version
      };

      return {
        status: missingTables.length === 0 ? 'healthy' : 'degraded',
        database: { 
          status: 'connected', 
          type: 'PostgreSQL',
          tables: existingTables,
          totalTables: existingTables.length,
          missingTables: missingTables,
          statistics: dbStats.rows[0]
        },
        system: systemInfo,
        services: {
          websocket: 'running', // This would be checked if WebSocket service is integrated
          authentication: 'running',
          notifications: 'running'
        }
      };

    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Get all environments
   */
  async getEnvironments() {
    const query = `
      SELECT id, code, name, description, color, machine_types, is_active, created_at, updated_at
      FROM environments 
      WHERE is_active = true
      ORDER BY name
    `;
    
    const result = await DatabaseUtils.raw(query);
    return result.rows;
  }

  /**
   * Create new environment
   */
  async createEnvironment(environmentData, userId) {
    const { name, code, description, color = 'blue', machine_types = [] } = environmentData;

    // Validate required fields
    if (!name || !code) {
      throw new ValidationError('Name and code are required');
    }

    // Check for duplicate code
    const existingEnvironment = await DatabaseUtils.findOne('environments', { code });
    if (existingEnvironment) {
      throw new ValidationError('Environment code already exists');
    }

    const newEnvironment = await DatabaseUtils.insert('environments', {
      name: name.trim(),
      code: code.trim().toLowerCase(),
      description: description ? description.trim() : null,
      color,
      machine_types,
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    });

    return newEnvironment;
  }

  /**
   * Update environment
   */
  async updateEnvironment(id, updateData, userId) {
    const environment = await DatabaseUtils.findOne('environments', { id, is_active: true });
    if (!environment) {
      throw new NotFoundError('Environment');
    }

    // Check for duplicate code if changing
    if (updateData.code && updateData.code !== environment.code) {
      const existingCode = await DatabaseUtils.findOne('environments', { code: updateData.code });
      if (existingCode) {
        throw new ValidationError('Environment code already exists');
      }
    }

    // Trim string fields
    if (updateData.name) updateData.name = updateData.name.trim();
    if (updateData.code) updateData.code = updateData.code.trim().toLowerCase();
    if (updateData.description) updateData.description = updateData.description.trim();

    const updatedEnvironment = await DatabaseUtils.update(
      'environments',
      {
        ...updateData,
        updated_at: new Date()
      },
      { id },
      '*'
    );

    return updatedEnvironment[0];
  }

  /**
   * Delete environment (soft delete)
   */
  async deleteEnvironment(id, userId) {
    const environment = await DatabaseUtils.findOne('environments', { id, is_active: true });
    if (!environment) {
      throw new NotFoundError('Environment');
    }

    // Check if environment has machines
    const machineCount = await DatabaseUtils.raw(
      'SELECT COUNT(*) as count FROM machines WHERE environment = $1',
      [environment.code]
    );

    if (parseInt(machineCount.rows[0].count) > 0) {
      throw new ValidationError('Cannot delete environment with associated machines');
    }

    await DatabaseUtils.update(
      'environments',
      {
        is_active: false,
        updated_at: new Date()
      },
      { id }
    );

    return true;
  }

  /**
   * Get all machine types
   */
  async getMachineTypes() {
    const query = `
      SELECT 
        mt.*,
        COUNT(m.id) as machine_count,
        array_agg(m.name ORDER BY m.name) FILTER (WHERE m.name IS NOT NULL) as machines
      FROM machine_types mt
      LEFT JOIN machines m ON m.type = mt.name
      WHERE mt.is_active = true
      GROUP BY mt.id, mt.name, mt.description, mt.category, mt.specifications, mt.is_active
      ORDER BY mt.name
    `;

    const result = await DatabaseUtils.raw(query);
    return result.rows;
  }

  /**
   * Create new machine type
   */
  async createMachineType(machineTypeData, userId) {
    const { name, description, category, specifications = {} } = machineTypeData;

    // Validate required fields
    if (!name) {
      throw new ValidationError('Machine type name is required');
    }

    // Check for duplicate name
    const existingType = await DatabaseUtils.findOne('machine_types', { name });
    if (existingType) {
      throw new ValidationError('Machine type name already exists');
    }

    const newMachineType = await DatabaseUtils.insert('machine_types', {
      name: name.trim(),
      description: description ? description.trim() : null,
      category: category ? category.trim() : null,
      specifications: JSON.stringify(specifications),
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    });

    return newMachineType;
  }

  /**
   * Update machine type
   */
  async updateMachineType(id, updateData, userId) {
    const machineType = await DatabaseUtils.findOne('machine_types', { id, is_active: true });
    if (!machineType) {
      throw new NotFoundError('Machine type');
    }

    // Check for duplicate name if changing
    if (updateData.name && updateData.name !== machineType.name) {
      const existingName = await DatabaseUtils.findOne('machine_types', { name: updateData.name });
      if (existingName) {
        throw new ValidationError('Machine type name already exists');
      }
    }

    // Trim string fields
    if (updateData.name) updateData.name = updateData.name.trim();
    if (updateData.description) updateData.description = updateData.description.trim();
    if (updateData.category) updateData.category = updateData.category.trim();
    
    // Handle specifications
    if (updateData.specifications && typeof updateData.specifications === 'object') {
      updateData.specifications = JSON.stringify(updateData.specifications);
    }

    const updatedMachineType = await DatabaseUtils.update(
      'machine_types',
      {
        ...updateData,
        updated_at: new Date()
      },
      { id },
      '*'
    );

    return updatedMachineType[0];
  }

  /**
   * Delete machine type (soft delete)
   */
  async deleteMachineType(id, userId) {
    const machineType = await DatabaseUtils.findOne('machine_types', { id, is_active: true });
    if (!machineType) {
      throw new NotFoundError('Machine type');
    }

    // Check if any machines are using this type
    const machineCount = await DatabaseUtils.raw(
      'SELECT COUNT(*) as count FROM machines WHERE type = $1',
      [machineType.name]
    );

    if (parseInt(machineCount.rows[0].count) > 0) {
      throw new ValidationError(`Cannot delete machine type. ${machineCount.rows[0].count} machine(s) are using this type.`);
    }

    await DatabaseUtils.update(
      'machine_types',
      {
        is_active: false,
        updated_at: new Date()
      },
      { id }
    );

    return true;
  }

  /**
   * Get system statistics
   */
  async getSystemStatistics() {
    const statsQuery = `
      SELECT 
        (SELECT COUNT(*) FROM production_orders) as total_orders,
        (SELECT COUNT(*) FROM production_orders WHERE DATE(created_at) = CURRENT_DATE) as todays_orders,
        (SELECT COUNT(*) FROM machines) as total_machines,
        (SELECT COUNT(*) FROM machines WHERE status = 'available') as available_machines,
        (SELECT COUNT(*) FROM users WHERE is_active = true) as active_users,
        (SELECT COUNT(*) FROM environments WHERE is_active = true) as active_environments,
        (SELECT COUNT(*) FROM labor_assignments WHERE assignment_date >= CURRENT_DATE - INTERVAL '7 days') as weekly_assignments
    `;

    const result = await DatabaseUtils.raw(statsQuery);
    return result.rows[0];
  }
}

module.exports = new SystemService();