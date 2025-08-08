// Analytics Service - Business Logic Layer
const DatabaseUtils = require('../utils/database');
const { ValidationError } = require('../middleware/error-handler');

class AnalyticsService {

  /**
   * Get active production orders
   */
  async getActiveOrders() {
    const query = `
      SELECT 
        po.*,
        m.name as machine_name,
        u.full_name as operator_name
      FROM production_orders po
      LEFT JOIN machines m ON po.machine_id = m.id
      LEFT JOIN users u ON po.operator_id = u.id
      WHERE po.status = 'in_progress'
      ORDER BY po.start_time DESC
    `;
    
    const result = await DatabaseUtils.raw(query);
    return result.rows;
  }

  /**
   * Get machines overview data
   */
  async getMachinesOverview(environment = null) {
    let query = `
      SELECT 
        m.*,
        COUNT(po.id) as active_orders,
        AVG(CASE WHEN po.status = 'in_progress' 
            THEN EXTRACT(EPOCH FROM (NOW() - po.start_time)) / 3600 
            ELSE NULL END) as avg_running_time_hours
      FROM machines m
      LEFT JOIN production_orders po ON m.id = po.machine_id AND po.status = 'in_progress'
    `;
    
    const params = [];
    
    if (environment) {
      query += ' WHERE m.environment = $1';
      params.push(environment);
    }
    
    query += ` GROUP BY m.id ORDER BY m.name`;
    
    const result = await DatabaseUtils.raw(query, params);
    return result.rows;
  }

  /**
   * Get production floor overview - main dashboard data
   */
  async getProductionFloorOverview() {
    const queries = {
      // Overall statistics
      overall: `
        SELECT 
          COUNT(*) as total_orders,
          COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as active_orders,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_today,
          COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_orders
        FROM production_orders 
        WHERE DATE(created_at) = CURRENT_DATE
      `,
      
      // Machine status
      machines: `
        SELECT 
          status,
          COUNT(*) as count
        FROM machines 
        WHERE is_active = true
        GROUP BY status
      `,
      
      // Recent orders
      recent_orders: `
        SELECT 
          po.id,
          po.order_number,
          po.product_name,
          po.status,
          po.quantity,
          m.name as machine_name,
          po.start_time
        FROM production_orders po
        LEFT JOIN machines m ON po.machine_id = m.id
        ORDER BY po.created_at DESC
        LIMIT 10
      `,
      
      // Active stops
      active_stops: `
        SELECT COUNT(*) as count
        FROM production_stops ps
        WHERE ps.end_time IS NULL
      `
    };
    
    const results = {};
    
    for (const [key, query] of Object.entries(queries)) {
      const result = await DatabaseUtils.raw(query);
      results[key] = result.rows;
    }
    
    return results;
  }

  /**
   * Get production status summary
   */
  async getProductionStatus() {
    const statusQuery = `
      SELECT 
        status,
        COUNT(*) as count,
        SUM(quantity) as total_quantity
      FROM production_orders
      WHERE DATE(created_at) = CURRENT_DATE
      GROUP BY status
    `;
    
    const result = await DatabaseUtils.raw(statusQuery);
    return result.rows;
  }

  /**
   * Get analytics summary with basic production metrics
   */
  async getAnalyticsSummary(filters = {}) {
    const { start_date, end_date } = filters;

    let whereClause = '';
    const params = [];
    let paramIndex = 1;

    if (start_date) {
      whereClause += ` AND created_at >= $${paramIndex}`;
      params.push(start_date);
      paramIndex++;
    }

    if (end_date) {
      whereClause += ` AND created_at <= $${paramIndex}`;
      params.push(end_date);
      paramIndex++;
    }

    const summaryQuery = `
      SELECT 
        COUNT(*) as total_orders,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_orders,
        COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as active_orders,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_orders,
        COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_orders,
        SUM(CASE WHEN status = 'completed' THEN quantity ELSE 0 END) as total_production,
        AVG(CASE WHEN status = 'completed' AND start_time IS NOT NULL AND stop_time IS NOT NULL 
            THEN EXTRACT(EPOCH FROM (stop_time - start_time)) / 3600 END) as avg_cycle_time_hours
      FROM production_orders
      WHERE 1=1 ${whereClause}
    `;

    const result = await DatabaseUtils.raw(summaryQuery, params);
    const summaryData = result.rows[0];

    // Calculate efficiency percentage
    const efficiency = summaryData.total_orders > 0 
      ? Math.round((summaryData.completed_orders / summaryData.total_orders) * 100)
      : 0;

    return {
      totalOrders: parseInt(summaryData.total_orders),
      completedOrders: parseInt(summaryData.completed_orders),
      activeOrders: parseInt(summaryData.active_orders),
      pendingOrders: parseInt(summaryData.pending_orders),
      cancelledOrders: parseInt(summaryData.cancelled_orders),
      totalProduction: parseInt(summaryData.total_production) || 0,
      efficiency,
      avgCycleTimeHours: parseFloat(summaryData.avg_cycle_time_hours) || 0
    };
  }

  /**
   * Get downtime analytics by category
   */
  async getDowntimeAnalytics(filters = {}) {
    const { start_date, end_date } = filters;

    let whereClause = '';
    const params = [];
    let paramIndex = 1;

    if (start_date && end_date) {
      whereClause = 'WHERE start_time >= $1 AND start_time <= $2';
      params.push(start_date, end_date);
      paramIndex = 3;
    }

    const downtimeQuery = `
      SELECT 
        category,
        COUNT(*) as count,
        COALESCE(SUM(duration), 0) as total_duration,
        COALESCE(AVG(duration), 0) as avg_duration,
        COALESCE(SUM(cost_impact), 0) as total_cost_impact,
        COALESCE(SUM(production_loss), 0) as total_production_loss
      FROM production_stops 
      ${whereClause}
      GROUP BY category
      ORDER BY total_duration DESC
    `;

    const result = await DatabaseUtils.raw(downtimeQuery, params);

    const downtimeData = {};
    result.rows.forEach(item => {
      downtimeData[item.category] = {
        count: parseInt(item.count),
        duration: parseFloat(item.total_duration) || 0,
        avg_duration: parseFloat(item.avg_duration) || 0,
        cost_impact: parseFloat(item.total_cost_impact) || 0,
        production_loss: parseInt(item.total_production_loss) || 0
      };
    });

    return downtimeData;
  }

  /**
   * Get production floor overview - main dashboard data
   */
  async getProductionFloorOverview() {
    // Get active orders with machine and progress information
    const activeOrdersQuery = `
      SELECT 
        po.*,
        m.name as machine_name,
        m.type as machine_type,
        u.username as operator_name,
        EXTRACT(EPOCH FROM (NOW() - po.start_time)) / 3600 as hours_running
      FROM production_orders po
      LEFT JOIN machines m ON po.machine_id = m.id
      LEFT JOIN users u ON po.operator_id = u.id
      WHERE po.status = 'in_progress'
      ORDER BY po.start_time DESC
    `;

    // Get all machines with their current status and any active orders
    const machinesQuery = `
      SELECT 
        m.id,
        m.name,
        m.code,
        m.type,
        m.environment,
        m.status,
        m.capacity,
        m.production_rate,
        m.location,
        po.id as order_id,
        po.order_number,
        po.product_name,
        po.quantity,
        po.start_time
      FROM machines m
      LEFT JOIN production_orders po ON m.id = po.machine_id AND po.status = 'in_progress'
      ORDER BY m.name
    `;

    // Get machine status summary for statistics
    const machineStatusSummaryQuery = `
      SELECT 
        status,
        COUNT(*) as count
      FROM machines
      GROUP BY status
    `;

    // Get production summary for today
    const todayProductionQuery = `
      SELECT 
        COUNT(*) as total_orders,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_orders,
        SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as active_orders,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_orders
      FROM production_orders
      WHERE DATE(created_at) = CURRENT_DATE
    `;

    const [activeOrders, machines, machineStatusSummary, todayStats] = await Promise.all([
      DatabaseUtils.raw(activeOrdersQuery),
      DatabaseUtils.raw(machinesQuery),
      DatabaseUtils.raw(machineStatusSummaryQuery),
      DatabaseUtils.raw(todayProductionQuery)
    ]);

    // Calculate efficiency metrics
    const todayStatsData = todayStats.rows[0] || { total_orders: 0, completed_orders: 0, active_orders: 0, pending_orders: 0 };
    const efficiency = todayStatsData.total_orders > 0 
      ? Math.round((todayStatsData.completed_orders / todayStatsData.total_orders) * 100)
      : 0;

    return {
      activeOrders: activeOrders.rows || [],
      machines: machines.rows || [],
      machineStatus: machines.rows || [], // For compatibility with frontend expecting machineStatus
      machineStatusSummary: machineStatusSummary.rows || [],
      todayStats: todayStatsData,
      efficiency,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Get production status summary
   */
  async getProductionStatus() {
    const statusQuery = `
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as active,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status = 'stopped' THEN 1 ELSE 0 END) as stopped,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending
      FROM production_orders
      WHERE DATE(created_at) = CURRENT_DATE
    `;

    const result = await DatabaseUtils.raw(statusQuery);
    return result.rows[0] || { total: 0, active: 0, completed: 0, stopped: 0, pending: 0 };
  }

  /**
   * Get machine utilization analytics
   */
  async getMachineUtilization(filters = {}) {
    const { start_date, end_date, environment } = filters;

    let whereClause = '';
    const params = [];
    let paramIndex = 1;

    if (start_date && end_date) {
      whereClause += ` AND po.created_at >= $${paramIndex} AND po.created_at <= $${paramIndex + 1}`;
      params.push(start_date, end_date);
      paramIndex += 2;
    }

    if (environment) {
      whereClause += ` AND m.environment = $${paramIndex}`;
      params.push(environment);
      paramIndex++;
    }

    const utilizationQuery = `
      SELECT 
        m.id,
        m.name,
        m.environment,
        m.capacity,
        COUNT(po.id) as orders_processed,
        SUM(CASE WHEN po.status = 'completed' THEN 1 ELSE 0 END) as completed_orders,
        SUM(CASE WHEN po.status = 'completed' THEN po.quantity ELSE 0 END) as total_production,
        AVG(CASE WHEN po.status = 'completed' AND po.start_time IS NOT NULL AND po.stop_time IS NOT NULL 
            THEN EXTRACT(EPOCH FROM (po.stop_time - po.start_time)) / 3600 END) as avg_cycle_time_hours,
        SUM(CASE WHEN po.status = 'completed' AND po.start_time IS NOT NULL AND po.stop_time IS NOT NULL 
            THEN EXTRACT(EPOCH FROM (po.stop_time - po.start_time)) / 3600 ELSE 0 END) as total_runtime_hours
      FROM machines m
      LEFT JOIN production_orders po ON m.id = po.machine_id
      WHERE 1=1 ${whereClause}
      GROUP BY m.id, m.name, m.environment, m.capacity
      ORDER BY total_production DESC
    `;

    const result = await DatabaseUtils.raw(utilizationQuery, params);
    
    return result.rows.map(machine => ({
      ...machine,
      orders_processed: parseInt(machine.orders_processed) || 0,
      completed_orders: parseInt(machine.completed_orders) || 0,
      total_production: parseInt(machine.total_production) || 0,
      avg_cycle_time_hours: parseFloat(machine.avg_cycle_time_hours) || 0,
      total_runtime_hours: parseFloat(machine.total_runtime_hours) || 0,
      efficiency: machine.orders_processed > 0 
        ? Math.round((machine.completed_orders / machine.orders_processed) * 100)
        : 0
    }));
  }

  /**
   * Get comprehensive downtime report with analytics
   */
  async getDowntimeReport(filters = {}) {
    const { 
      start_date = '2024-01-01', 
      end_date = new Date().toISOString().split('T')[0],
      machine_id,
      category 
    } = filters;

    // Format dates properly for PostgreSQL
    const formatStartDate = start_date.includes('T') ? start_date : start_date + 'T00:00:00';
    const formatEndDate = end_date.includes('T') ? end_date : end_date + 'T23:59:59';

    let whereClause = 'WHERE ps.start_time >= $1 AND ps.start_time <= $2';
    let params = [formatStartDate, formatEndDate];
    let paramIndex = 3;

    if (machine_id) {
      whereClause += ` AND m.id = $${paramIndex}`;
      params.push(machine_id);
      paramIndex++;
    }

    if (category) {
      whereClause += ` AND ps.category = $${paramIndex}`;
      params.push(category);
      paramIndex++;
    }

    // Get detailed records
    const recordsQuery = `
      SELECT 
        ps.id,
        ps.start_time,
        ps.end_time,
        ps.duration,
        ps.reason,
        ps.category,
        ps.subcategory,
        ps.notes,
        ps.cost_impact,
        ps.production_loss,
        ps.supervisor_notified,
        ps.created_at,
        ps.resolved_at,
        po.order_number,
        m.name as machine_name,
        u1.username as stopped_by,
        u2.username as resolved_by,
        CASE WHEN ps.end_time IS NULL THEN 'Active' ELSE 'Resolved' END as status
      FROM production_stops ps
      LEFT JOIN production_orders po ON ps.order_id = po.id
      LEFT JOIN machines m ON po.machine_id = m.id
      LEFT JOIN users u1 ON ps.operator_id = u1.id
      LEFT JOIN users u2 ON ps.resolved_by = u2.id
      ${whereClause}
      ORDER BY ps.start_time DESC
    `;

    // Get summary statistics
    const summaryQuery = `
      SELECT 
        COUNT(*) as total_stops,
        COUNT(CASE WHEN ps.end_time IS NULL THEN 1 END) as active_stops,
        COUNT(CASE WHEN ps.end_time IS NOT NULL THEN 1 END) as resolved_stops,
        COALESCE(SUM(ps.duration), 0) as total_downtime_minutes,
        COALESCE(ROUND(SUM(ps.duration) / 60.0, 2), 0) as total_downtime_hours,
        COALESCE(ROUND(AVG(ps.duration), 2), 0) as average_downtime_minutes,
        COALESCE(SUM(ps.cost_impact), 0) as total_cost_impact,
        COALESCE(SUM(ps.production_loss), 0) as total_production_loss
      FROM production_stops ps
      LEFT JOIN production_orders po ON ps.order_id = po.id
      LEFT JOIN machines m ON po.machine_id = m.id
      ${whereClause}
    `;

    // Get category breakdown
    const categoryQuery = `
      SELECT 
        ps.category,
        COUNT(*) as count,
        COALESCE(SUM(ps.duration), 0) as total_minutes,
        COALESCE(ROUND(AVG(ps.duration), 2), 0) as avg_minutes
      FROM production_stops ps
      LEFT JOIN production_orders po ON ps.order_id = po.id
      LEFT JOIN machines m ON po.machine_id = m.id
      ${whereClause}
      GROUP BY ps.category
      ORDER BY total_minutes DESC
    `;

    const [records, summary, categoryBreakdown] = await Promise.all([
      DatabaseUtils.raw(recordsQuery, params),
      DatabaseUtils.raw(summaryQuery, params),
      DatabaseUtils.raw(categoryQuery, params)
    ]);

    const categoryData = {};
    categoryBreakdown.rows.forEach(row => {
      categoryData[row.category] = {
        count: parseInt(row.count),
        total_minutes: parseFloat(row.total_minutes),
        avg_minutes: parseFloat(row.avg_minutes)
      };
    });

    return {
      records: records.rows,
      summary: summary.rows[0],
      category_breakdown: categoryData,
      filters: { start_date, end_date, machine_id, category }
    };
  }

  /**
   * Get production trends over time
   */
  async getProductionTrends(filters = {}) {
    const { start_date, end_date, environment, interval = 'day' } = filters;

    // Validate interval
    const validIntervals = ['hour', 'day', 'week', 'month'];
    if (!validIntervals.includes(interval)) {
      throw new ValidationError('Invalid interval. Must be one of: ' + validIntervals.join(', '));
    }

    let whereClause = '';
    const params = [];
    let paramIndex = 1;

    if (start_date && end_date) {
      whereClause += ` AND created_at >= $${paramIndex} AND created_at <= $${paramIndex + 1}`;
      params.push(start_date, end_date);
      paramIndex += 2;
    }

    if (environment) {
      whereClause += ` AND m.environment = $${paramIndex}`;
      params.push(environment);
      paramIndex++;
    }

    const trendsQuery = `
      SELECT 
        DATE_TRUNC('${interval}', po.created_at) as period,
        COUNT(*) as total_orders,
        SUM(CASE WHEN po.status = 'completed' THEN 1 ELSE 0 END) as completed_orders,
        SUM(CASE WHEN po.status = 'completed' THEN po.quantity ELSE 0 END) as total_production,
        AVG(CASE WHEN po.status = 'completed' AND po.start_time IS NOT NULL AND po.stop_time IS NOT NULL 
            THEN EXTRACT(EPOCH FROM (po.stop_time - po.start_time)) / 3600 END) as avg_cycle_time_hours
      FROM production_orders po
      LEFT JOIN machines m ON po.machine_id = m.id
      WHERE 1=1 ${whereClause}
      GROUP BY DATE_TRUNC('${interval}', po.created_at)
      ORDER BY period
    `;

    const result = await DatabaseUtils.raw(trendsQuery, params);
    
    return result.rows.map(row => ({
      period: row.period,
      total_orders: parseInt(row.total_orders),
      completed_orders: parseInt(row.completed_orders),
      total_production: parseInt(row.total_production) || 0,
      avg_cycle_time_hours: parseFloat(row.avg_cycle_time_hours) || 0,
      efficiency: row.total_orders > 0 
        ? Math.round((row.completed_orders / row.total_orders) * 100)
        : 0
    }));
  }

  /**
   * Get stops analytics (basic version)
   */
  async getStopsAnalytics(filters = {}) {
    const { start_date, end_date, environment } = filters;
    
    // For now, return empty array as mentioned in original code
    // This can be expanded later with actual stops data
    return [];
  }
}

module.exports = new AnalyticsService();