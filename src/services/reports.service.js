// Reports Service - Business Logic Layer
const DatabaseUtils = require('../utils/database');
const { ValidationError } = require('../middleware/error-handler');

class ReportsService {

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
      filters: { start_date, end_date, machine_id, category },
      metadata: {
        report_generated: new Date().toISOString(),
        total_records: records.rows.length
      }
    };
  }

  /**
   * Export downtime report in different formats
   */
  async exportDowntimeReport(filters = {}, format = 'json') {
    const report = await this.getDowntimeReport(filters);

    if (format === 'csv') {
      return this.generateDowntimeCSV(report);
    }

    return report;
  }

  /**
   * Generate CSV format for downtime report
   */
  generateDowntimeCSV(report) {
    const csvHeaders = [
      'ID', 'Start Time', 'End Time', 'Duration (min)', 'Reason', 'Category', 'Subcategory',
      'Notes', 'Cost Impact', 'Production Loss', 'Supervisor Notified', 'Order Number', 
      'Machine Name', 'Stopped By', 'Resolved By', 'Status'
    ];

    const csvData = report.records.map(record => [
      record.id,
      record.start_time,
      record.end_time || '',
      record.duration || 0,
      record.reason || '',
      record.category || '',
      record.subcategory || '',
      record.notes || '',
      record.cost_impact || 0,
      record.production_loss || 0,
      record.supervisor_notified ? 'Yes' : 'No',
      record.order_number || '',
      record.machine_name || '',
      record.stopped_by || '',
      record.resolved_by || '',
      record.status
    ]);

    const csv = [csvHeaders, ...csvData]
      .map(row => row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    return {
      data: csv,
      filename: `downtime_report_${new Date().toISOString().split('T')[0]}.csv`,
      contentType: 'text/csv'
    };
  }

  /**
   * Get production summary report
   */
  async getProductionSummaryReport(filters = {}) {
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
      whereClause += ` AND po.environment = $${paramIndex}`;
      params.push(environment);
      paramIndex++;
    }

    const summaryQuery = `
      SELECT 
        po.environment,
        COUNT(*) as total_orders,
        SUM(CASE WHEN po.status = 'completed' THEN 1 ELSE 0 END) as completed_orders,
        SUM(CASE WHEN po.status = 'in_progress' THEN 1 ELSE 0 END) as in_progress_orders,
        SUM(CASE WHEN po.status = 'pending' THEN 1 ELSE 0 END) as pending_orders,
        SUM(CASE WHEN po.status = 'cancelled' THEN 1 ELSE 0 END) as cancelled_orders,
        SUM(CASE WHEN po.status = 'completed' THEN po.quantity ELSE 0 END) as total_production,
        SUM(CASE WHEN po.status = 'completed' THEN po.actual_quantity ELSE 0 END) as actual_production,
        SUM(CASE WHEN po.status = 'completed' THEN po.waste_quantity ELSE 0 END) as total_waste,
        AVG(CASE WHEN po.status = 'completed' AND po.start_time IS NOT NULL AND po.stop_time IS NOT NULL 
            THEN EXTRACT(EPOCH FROM (po.stop_time - po.start_time)) / 3600 END) as avg_cycle_time_hours
      FROM production_orders po
      LEFT JOIN machines m ON po.machine_id = m.id
      WHERE 1=1 ${whereClause}
      GROUP BY po.environment
      ORDER BY po.environment
    `;

    const machineUtilizationQuery = `
      SELECT 
        m.name as machine_name,
        m.environment,
        COUNT(po.id) as orders_processed,
        SUM(CASE WHEN po.status = 'completed' THEN 1 ELSE 0 END) as completed_orders,
        SUM(CASE WHEN po.status = 'completed' THEN po.quantity ELSE 0 END) as total_production
      FROM machines m
      LEFT JOIN production_orders po ON m.id = po.machine_id
      WHERE 1=1 ${whereClause.replace('po.environment', 'm.environment')}
      GROUP BY m.id, m.name, m.environment
      ORDER BY total_production DESC
    `;

    const [summary, machineUtilization] = await Promise.all([
      DatabaseUtils.raw(summaryQuery, params),
      DatabaseUtils.raw(machineUtilizationQuery, params)
    ]);

    return {
      summary: summary.rows,
      machine_utilization: machineUtilization.rows,
      filters: { start_date, end_date, environment },
      metadata: {
        report_generated: new Date().toISOString(),
        environments: summary.rows.length,
        machines: machineUtilization.rows.length
      }
    };
  }

  /**
   * Get quality report
   */
  async getQualityReport(filters = {}) {
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
      whereClause += ` AND po.environment = $${paramIndex}`;
      params.push(environment);
      paramIndex++;
    }

    const qualityQuery = `
      SELECT 
        po.product_name,
        po.environment,
        COUNT(*) as total_orders,
        SUM(po.quantity) as planned_quantity,
        SUM(po.actual_quantity) as actual_quantity,
        SUM(po.waste_quantity) as waste_quantity,
        ROUND(
          CASE 
            WHEN SUM(po.quantity) > 0 
            THEN (SUM(po.actual_quantity) / SUM(po.quantity)) * 100 
            ELSE 0 
          END, 2
        ) as yield_percentage,
        ROUND(
          CASE 
            WHEN SUM(po.actual_quantity) > 0 
            THEN (SUM(po.waste_quantity) / SUM(po.actual_quantity)) * 100 
            ELSE 0 
          END, 2
        ) as waste_percentage
      FROM production_orders po
      WHERE po.status = 'completed' ${whereClause}
      GROUP BY po.product_name, po.environment
      ORDER BY waste_percentage DESC, yield_percentage ASC
    `;

    const result = await DatabaseUtils.raw(qualityQuery, params);

    return {
      quality_metrics: result.rows,
      filters: { start_date, end_date, environment },
      metadata: {
        report_generated: new Date().toISOString(),
        products: result.rows.length
      }
    };
  }

  /**
   * Get efficiency report
   */
  async getEfficiencyReport(filters = {}) {
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
      whereClause += ` AND po.environment = $${paramIndex}`;
      params.push(environment);
      paramIndex++;
    }

    const efficiencyQuery = `
      SELECT 
        DATE_TRUNC('day', po.created_at) as date,
        po.environment,
        COUNT(*) as orders_started,
        SUM(CASE WHEN po.status = 'completed' THEN 1 ELSE 0 END) as orders_completed,
        ROUND(
          CASE 
            WHEN COUNT(*) > 0 
            THEN (SUM(CASE WHEN po.status = 'completed' THEN 1 ELSE 0 END) / COUNT(*)) * 100 
            ELSE 0 
          END, 2
        ) as completion_rate,
        AVG(
          CASE 
            WHEN po.status = 'completed' AND po.start_time IS NOT NULL AND po.stop_time IS NOT NULL 
            THEN EXTRACT(EPOCH FROM (po.stop_time - po.start_time)) / 3600 
          END
        ) as avg_cycle_time_hours
      FROM production_orders po
      WHERE 1=1 ${whereClause}
      GROUP BY DATE_TRUNC('day', po.created_at), po.environment
      ORDER BY date DESC, po.environment
    `;

    const result = await DatabaseUtils.raw(efficiencyQuery, params);

    return {
      efficiency_trends: result.rows,
      filters: { start_date, end_date, environment },
      metadata: {
        report_generated: new Date().toISOString(),
        data_points: result.rows.length
      }
    };
  }

  /**
   * Get waste report
   */
  async getWasteReport(filters = {}) {
    const { 
      start_date = '2024-01-01', 
      end_date = new Date().toISOString().split('T')[0],
      machine_id,
      category 
    } = filters;

    // Get waste data from production_waste table
    let whereClause = 'WHERE pw.recorded_at >= $1 AND pw.recorded_at <= $2';
    let params = [start_date, end_date];
    let paramIndex = 3;

    if (machine_id) {
      whereClause += ` AND po.machine_id = $${paramIndex}`;
      params.push(machine_id);
      paramIndex++;
    }

    if (category) {
      whereClause += ` AND pw.waste_type = $${paramIndex}`;
      params.push(category);
      paramIndex++;
    }

    const wasteQuery = `
      SELECT 
        pw.id,
        pw.recorded_at,
        pw.waste_type,
        pw.quantity,
        pw.unit,
        pw.cost_per_unit,
        pw.total_cost,
        pw.reason,
        m.name as machine_name,
        po.order_number,
        u.full_name as recorded_by_name
      FROM production_waste pw
      LEFT JOIN production_orders po ON pw.order_id = po.id
      LEFT JOIN machines m ON po.machine_id = m.id
      LEFT JOIN users u ON pw.recorded_by = u.id
      ${whereClause}
      ORDER BY pw.recorded_at DESC
    `;

    // Get summary data
    const summaryQuery = `
      SELECT 
        pw.waste_type,
        COUNT(*) as incident_count,
        SUM(pw.quantity) as total_quantity,
        AVG(pw.quantity) as avg_quantity,
        SUM(pw.total_cost) as total_cost
      FROM production_waste pw
      LEFT JOIN production_orders po ON pw.order_id = po.id
      LEFT JOIN machines m ON po.machine_id = m.id
      ${whereClause}
      GROUP BY pw.waste_type
      ORDER BY total_cost DESC
    `;

    const [records, summary] = await Promise.all([
      DatabaseUtils.raw(wasteQuery, params),
      DatabaseUtils.raw(summaryQuery, params)
    ]);

    return {
      records: records.rows,
      summary: summary.rows,
      totals: {
        total_incidents: records.rows.length,
        total_cost: summary.rows.reduce((sum, item) => sum + (parseFloat(item.total_cost) || 0), 0),
        total_quantity: summary.rows.reduce((sum, item) => sum + (parseFloat(item.total_quantity) || 0), 0)
      },
      filters: { start_date, end_date, machine_id, category },
      metadata: {
        report_generated: new Date().toISOString(),
        total_records: records.rows.length
      }
    };
  }
}

module.exports = new ReportsService();