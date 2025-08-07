// Downtime Analytics and Reporting API Endpoints
// Comprehensive analytics for downtime analysis and reporting

module.exports = function(app, db, authenticateToken, requireRole, body, broadcast) {

// ================================
// DOWNTIME ANALYTICS ENDPOINTS
// ================================

// Get comprehensive downtime analytics
app.get('/api/analytics/downtime/comprehensive',
  authenticateToken,
  requireRole(['admin', 'supervisor']),
  async (req, res) => {
    try {
      const { start_date, end_date, environment, category } = req.query;
      
      // Build dynamic WHERE clause
      let whereConditions = ['1=1'];
      let params = [];
      let paramIndex = 1;
      
      if (start_date && end_date) {
        whereConditions.push(`ds.start_time >= $${paramIndex} AND ds.start_time <= $${paramIndex + 1}`);
        params.push(start_date, end_date);
        paramIndex += 2;
      }
      
      if (environment) {
        whereConditions.push(`po.environment = $${paramIndex}`);
        params.push(environment);
        paramIndex++;
      }
      
      if (category) {
        whereConditions.push(`dc.category = $${paramIndex}`);
        params.push(category);
        paramIndex++;
      }
      
      const whereClause = whereConditions.join(' AND ');
      
      // Get downtime summary statistics
      const summaryQuery = `
        SELECT 
          COUNT(*) as total_incidents,
          SUM(ds.actual_duration_minutes) as total_downtime_minutes,
          AVG(ds.actual_duration_minutes) as avg_downtime_minutes,
          MIN(ds.actual_duration_minutes) as min_downtime_minutes,
          MAX(ds.actual_duration_minutes) as max_downtime_minutes,
          COUNT(CASE WHEN ds.resolution_status = 'resolved' THEN 1 END) as resolved_incidents,
          COUNT(CASE WHEN ds.resolution_status = 'pending' THEN 1 END) as pending_incidents,
          SUM(ds.estimated_cost) as total_estimated_cost,
          AVG(ds.estimated_cost) as avg_estimated_cost
        FROM downtime_stops ds
        LEFT JOIN production_orders po ON ds.order_id = po.id
        LEFT JOIN downtime_categories dc ON ds.category_id = dc.id
        WHERE ${whereClause}
      `;
      
      // Get category breakdown
      const categoryQuery = `
        SELECT 
          dc.category,
          dc.name as category_name,
          dc.severity_level,
          COUNT(*) as incident_count,
          SUM(ds.actual_duration_minutes) as total_duration,
          AVG(ds.actual_duration_minutes) as avg_duration,
          SUM(ds.estimated_cost) as total_cost
        FROM downtime_stops ds
        LEFT JOIN production_orders po ON ds.order_id = po.id
        LEFT JOIN downtime_categories dc ON ds.category_id = dc.id
        WHERE ${whereClause}
        GROUP BY dc.category, dc.name, dc.severity_level
        ORDER BY total_duration DESC
      `;
      
      // Get machine breakdown
      const machineQuery = `
        SELECT 
          m.name as machine_name,
          m.type as machine_type,
          COUNT(*) as incident_count,
          SUM(ds.actual_duration_minutes) as total_downtime,
          AVG(ds.actual_duration_minutes) as avg_downtime,
          MAX(ds.actual_duration_minutes) as max_downtime
        FROM downtime_stops ds
        LEFT JOIN production_orders po ON ds.order_id = po.id
        LEFT JOIN machines m ON po.machine_id = m.id
        WHERE ${whereClause} AND m.id IS NOT NULL
        GROUP BY m.id, m.name, m.type
        ORDER BY total_downtime DESC
      `;
      
      // Get time-based trends (daily aggregation)
      const trendsQuery = `
        SELECT 
          DATE(ds.start_time) as date,
          COUNT(*) as incident_count,
          SUM(ds.actual_duration_minutes) as total_downtime,
          AVG(ds.actual_duration_minutes) as avg_downtime
        FROM downtime_stops ds
        LEFT JOIN production_orders po ON ds.order_id = po.id
        LEFT JOIN downtime_categories dc ON ds.category_id = dc.id
        WHERE ${whereClause}
        GROUP BY DATE(ds.start_time)
        ORDER BY date DESC
        LIMIT 30
      `;
      
      // Get top causes
      const causesQuery = `
        SELECT 
          ds.primary_cause,
          COUNT(*) as frequency,
          SUM(ds.actual_duration_minutes) as total_impact,
          AVG(ds.actual_duration_minutes) as avg_impact
        FROM downtime_stops ds
        LEFT JOIN production_orders po ON ds.order_id = po.id
        LEFT JOIN downtime_categories dc ON ds.category_id = dc.id
        WHERE ${whereClause} AND ds.primary_cause IS NOT NULL
        GROUP BY ds.primary_cause
        ORDER BY frequency DESC
        LIMIT 10
      `;
      
      const [summary, categoryBreakdown, machineBreakdown, trends, topCauses] = await Promise.all([
        db.dbGet(summaryQuery, params),
        db.dbAll(categoryQuery, params),
        db.dbAll(machineQuery, params),
        db.dbAll(trendsQuery, params),
        db.dbAll(causesQuery, params)
      ]);
      
      // Calculate efficiency metrics
      const mtbf = summary.total_incidents > 0 ? 
        (24 * 60) / (summary.total_incidents / 30) : 0; // Mean Time Between Failures (assuming 30 days)
      
      const mttr = summary.resolved_incidents > 0 ? 
        summary.total_downtime_minutes / summary.resolved_incidents : 0; // Mean Time To Repair
      
      const availability = summary.total_downtime_minutes > 0 ? 
        ((24 * 60 * 30 - summary.total_downtime_minutes) / (24 * 60 * 30)) * 100 : 100; // % availability
      
      res.json({
        summary: {
          ...summary,
          mtbf_hours: Math.round(mtbf / 60 * 100) / 100,
          mttr_hours: Math.round(mttr / 60 * 100) / 100,
          availability_percentage: Math.round(availability * 100) / 100
        },
        categoryBreakdown: categoryBreakdown || [],
        machineBreakdown: machineBreakdown || [],
        trends: trends || [],
        topCauses: topCauses || [],
        metadata: {
          date_range: { start_date, end_date },
          filters: { environment, category },
          generated_at: new Date().toISOString()
        }
      });
      
    } catch (error) {
      console.error('Comprehensive downtime analytics error:', error);
      res.status(500).json({ error: 'Failed to fetch downtime analytics' });
    }
  }
);

// Get downtime OEE (Overall Equipment Effectiveness) metrics
app.get('/api/analytics/downtime/oee',
  authenticateToken,
  requireRole(['admin', 'supervisor']),
  async (req, res) => {
    try {
      const { start_date, end_date, machine_id } = req.query;
      
      let whereConditions = ['1=1'];
      let params = [];
      let paramIndex = 1;
      
      if (start_date && end_date) {
        whereConditions.push(`ds.start_time >= $${paramIndex} AND ds.start_time <= $${paramIndex + 1}`);
        params.push(start_date, end_date);
        paramIndex += 2;
      }
      
      if (machine_id) {
        whereConditions.push(`po.machine_id = $${paramIndex}`);
        params.push(machine_id);
        paramIndex++;
      }
      
      const whereClause = whereConditions.join(' AND ');
      
      // Calculate OEE components
      const oeeQuery = `
        WITH production_time AS (
          SELECT 
            po.machine_id,
            m.name as machine_name,
            SUM(EXTRACT(EPOCH FROM (po.complete_time - po.start_time)) / 60) as total_production_minutes,
            COUNT(*) as total_orders,
            SUM(po.quantity) as total_planned_quantity,
            SUM(po.actual_quantity) as total_actual_quantity
          FROM production_orders po
          LEFT JOIN machines m ON po.machine_id = m.id
          WHERE po.status = 'completed' 
            AND po.start_time IS NOT NULL 
            AND po.complete_time IS NOT NULL
            ${start_date && end_date ? `AND po.start_time >= $${paramIndex - 2} AND po.start_time <= $${paramIndex - 1}` : ''}
            ${machine_id ? `AND po.machine_id = $${machine_id ? paramIndex - 1 : paramIndex}` : ''}
          GROUP BY po.machine_id, m.name
        ),
        downtime_data AS (
          SELECT 
            po.machine_id,
            SUM(ds.actual_duration_minutes) as total_downtime_minutes,
            COUNT(*) as downtime_incidents
          FROM downtime_stops ds
          LEFT JOIN production_orders po ON ds.order_id = po.id
          WHERE ${whereClause}
          GROUP BY po.machine_id
        ),
        planned_time AS (
          SELECT 
            pt.machine_id,
            pt.machine_name,
            pt.total_production_minutes,
            COALESCE(dd.total_downtime_minutes, 0) as total_downtime_minutes,
            pt.total_production_minutes + COALESCE(dd.total_downtime_minutes, 0) as total_planned_time,
            pt.total_orders,
            pt.total_planned_quantity,
            pt.total_actual_quantity,
            COALESCE(dd.downtime_incidents, 0) as downtime_incidents
          FROM production_time pt
          LEFT JOIN downtime_data dd ON pt.machine_id = dd.machine_id
        )
        SELECT 
          machine_id,
          machine_name,
          total_planned_time,
          total_production_minutes,
          total_downtime_minutes,
          total_orders,
          total_planned_quantity,
          total_actual_quantity,
          downtime_incidents,
          -- Availability = (Planned Time - Downtime) / Planned Time
          CASE 
            WHEN total_planned_time > 0 
            THEN ROUND(((total_planned_time - total_downtime_minutes) / total_planned_time) * 100, 2)
            ELSE 0 
          END as availability_percentage,
          -- Performance = Actual Production Time / (Planned Time - Downtime)
          CASE 
            WHEN (total_planned_time - total_downtime_minutes) > 0 
            THEN ROUND((total_production_minutes / (total_planned_time - total_downtime_minutes)) * 100, 2)
            ELSE 0 
          END as performance_percentage,
          -- Quality = Actual Quantity / Planned Quantity
          CASE 
            WHEN total_planned_quantity > 0 
            THEN ROUND((total_actual_quantity / total_planned_quantity) * 100, 2)
            ELSE 0 
          END as quality_percentage
        FROM planned_time
        ORDER BY machine_name
      `;
      
      const oeeData = await db.dbAll(oeeQuery, params);
      
      // Calculate overall OEE for each machine
      const oeeResults = oeeData.map(machine => ({
        ...machine,
        oee_percentage: Math.round(
          (machine.availability_percentage * machine.performance_percentage * machine.quality_percentage) / 10000 * 100
        ) / 100
      }));
      
      // Calculate fleet-wide averages
      const fleetAverage = oeeResults.length > 0 ? {
        avg_availability: Math.round(oeeResults.reduce((sum, m) => sum + m.availability_percentage, 0) / oeeResults.length * 100) / 100,
        avg_performance: Math.round(oeeResults.reduce((sum, m) => sum + m.performance_percentage, 0) / oeeResults.length * 100) / 100,
        avg_quality: Math.round(oeeResults.reduce((sum, m) => sum + m.quality_percentage, 0) / oeeResults.length * 100) / 100,
        avg_oee: Math.round(oeeResults.reduce((sum, m) => sum + m.oee_percentage, 0) / oeeResults.length * 100) / 100,
        total_downtime_incidents: oeeResults.reduce((sum, m) => sum + m.downtime_incidents, 0),
        total_downtime_minutes: oeeResults.reduce((sum, m) => sum + m.total_downtime_minutes, 0)
      } : {};
      
      res.json({
        machines: oeeResults,
        fleet_average: fleetAverage,
        metadata: {
          date_range: { start_date, end_date },
          machine_id,
          generated_at: new Date().toISOString()
        }
      });
      
    } catch (error) {
      console.error('OEE analytics error:', error);
      res.status(500).json({ error: 'Failed to fetch OEE analytics' });
    }
  }
);

// Generate downtime report for export
app.get('/api/reports/downtime/detailed',
  authenticateToken,
  requireRole(['admin', 'supervisor']),
  async (req, res) => {
    try {
      const { start_date, end_date, environment, format = 'json' } = req.query;
      
      let whereConditions = ['1=1'];
      let params = [];
      let paramIndex = 1;
      
      if (start_date && end_date) {
        whereConditions.push(`ds.start_time >= $${paramIndex} AND ds.start_time <= $${paramIndex + 1}`);
        params.push(start_date, end_date);
        paramIndex += 2;
      }
      
      if (environment) {
        whereConditions.push(`po.environment = $${paramIndex}`);
        params.push(environment);
        paramIndex++;
      }
      
      const whereClause = whereConditions.join(' AND ');
      
      const reportQuery = `
        SELECT 
          ds.id,
          ds.start_time,
          ds.end_time,
          ds.actual_duration_minutes,
          ds.primary_cause,
          ds.secondary_cause,
          ds.description,
          ds.resolution_status,
          ds.resolution_notes,
          ds.estimated_cost,
          ds.actual_cost,
          dc.category,
          dc.name as category_name,
          dc.severity_level,
          po.order_number,
          po.product_name,
          po.environment,
          m.name as machine_name,
          m.type as machine_type,
          u1.username as reported_by,
          u2.username as resolved_by,
          CASE 
            WHEN ds.end_time IS NOT NULL 
            THEN EXTRACT(EPOCH FROM (ds.end_time - ds.start_time)) / 60
            ELSE ds.actual_duration_minutes
          END as calculated_duration
        FROM downtime_stops ds
        LEFT JOIN downtime_categories dc ON ds.category_id = dc.id
        LEFT JOIN production_orders po ON ds.order_id = po.id
        LEFT JOIN machines m ON po.machine_id = m.id
        LEFT JOIN users u1 ON ds.created_by = u1.id
        LEFT JOIN users u2 ON ds.resolved_by = u2.id
        WHERE ${whereClause}
        ORDER BY ds.start_time DESC
      `;
      
      const incidents = await db.dbAll(reportQuery, params);
      
      if (format === 'csv') {
        // Generate CSV format
        const csvHeaders = [
          'ID', 'Start Time', 'End Time', 'Duration (min)', 'Primary Cause', 'Secondary Cause',
          'Description', 'Status', 'Category', 'Severity', 'Order Number', 'Product', 
          'Environment', 'Machine', 'Machine Type', 'Reported By', 'Resolved By', 
          'Estimated Cost', 'Actual Cost'
        ];
        
        const csvData = incidents.map(incident => [
          incident.id,
          incident.start_time,
          incident.end_time || '',
          incident.calculated_duration,
          incident.primary_cause || '',
          incident.secondary_cause || '',
          incident.description || '',
          incident.resolution_status || '',
          incident.category || '',
          incident.severity_level || '',
          incident.order_number || '',
          incident.product_name || '',
          incident.environment || '',
          incident.machine_name || '',
          incident.machine_type || '',
          incident.reported_by || '',
          incident.resolved_by || '',
          incident.estimated_cost || 0,
          incident.actual_cost || 0
        ]);
        
        const csv = [csvHeaders, ...csvData]
          .map(row => row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(','))
          .join('\n');
        
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="downtime_report_${new Date().toISOString().split('T')[0]}.csv"`);
        return res.send(csv);
      }
      
      // Generate summary for the report
      const summary = {
        total_incidents: incidents.length,
        total_downtime_minutes: incidents.reduce((sum, inc) => sum + (inc.calculated_duration || 0), 0),
        avg_downtime_minutes: incidents.length > 0 ? 
          incidents.reduce((sum, inc) => sum + (inc.calculated_duration || 0), 0) / incidents.length : 0,
        resolved_incidents: incidents.filter(inc => inc.resolution_status === 'resolved').length,
        pending_incidents: incidents.filter(inc => inc.resolution_status === 'pending').length,
        total_estimated_cost: incidents.reduce((sum, inc) => sum + (inc.estimated_cost || 0), 0),
        total_actual_cost: incidents.reduce((sum, inc) => sum + (inc.actual_cost || 0), 0)
      };
      
      res.json({
        summary,
        incidents,
        metadata: {
          report_generated: new Date().toISOString(),
          date_range: { start_date, end_date },
          filters: { environment },
          total_records: incidents.length
        }
      });
      
    } catch (error) {
      console.error('Detailed downtime report error:', error);
      res.status(500).json({ error: 'Failed to generate downtime report' });
    }
  }
);

// Get downtime trends and predictions
app.get('/api/analytics/downtime/trends',
  authenticateToken,
  requireRole(['admin', 'supervisor']),
  async (req, res) => {
    try {
      const { period = 'daily', days = 30 } = req.query;
      
      let dateFormat, dateInterval;
      switch (period) {
        case 'hourly':
          dateFormat = 'YYYY-MM-DD HH24:00:00';
          dateInterval = '1 hour';
          break;
        case 'weekly':
          dateFormat = 'YYYY-"W"WW';
          dateInterval = '1 week';
          break;
        case 'monthly':
          dateFormat = 'YYYY-MM';
          dateInterval = '1 month';
          break;
        default:
          dateFormat = 'YYYY-MM-DD';
          dateInterval = '1 day';
      }
      
      const trendsQuery = `
        WITH time_series AS (
          SELECT 
            TO_CHAR(ds.start_time, '${dateFormat}') as period,
            COUNT(*) as incident_count,
            SUM(ds.actual_duration_minutes) as total_downtime,
            AVG(ds.actual_duration_minutes) as avg_downtime,
            COUNT(CASE WHEN dc.severity_level = 'critical' THEN 1 END) as critical_incidents,
            COUNT(CASE WHEN dc.severity_level = 'high' THEN 1 END) as high_incidents,
            COUNT(CASE WHEN dc.severity_level = 'medium' THEN 1 END) as medium_incidents,
            COUNT(CASE WHEN dc.severity_level = 'low' THEN 1 END) as low_incidents
          FROM downtime_stops ds
          LEFT JOIN downtime_categories dc ON ds.category_id = dc.id
          WHERE ds.start_time >= NOW() - INTERVAL '${days} days'
          GROUP BY TO_CHAR(ds.start_time, '${dateFormat}')
          ORDER BY period DESC
        )
        SELECT 
          period,
          incident_count,
          total_downtime,
          ROUND(avg_downtime, 2) as avg_downtime,
          critical_incidents,
          high_incidents,
          medium_incidents,
          low_incidents,
          -- Calculate trend (simple moving average)
          AVG(incident_count) OVER (
            ORDER BY period 
            ROWS BETWEEN 2 PRECEDING AND CURRENT ROW
          ) as trend_incidents,
          AVG(total_downtime) OVER (
            ORDER BY period 
            ROWS BETWEEN 2 PRECEDING AND CURRENT ROW
          ) as trend_downtime
        FROM time_series
      `;
      
      const trends = await db.dbAll(trendsQuery);
      
      // Calculate trend direction
      const trendsWithDirection = trends.map((trend, index) => {
        const prevTrend = trends[index + 1];
        let incident_direction = 'stable';
        let downtime_direction = 'stable';
        
        if (prevTrend) {
          if (trend.incident_count > prevTrend.incident_count * 1.1) incident_direction = 'increasing';
          else if (trend.incident_count < prevTrend.incident_count * 0.9) incident_direction = 'decreasing';
          
          if (trend.total_downtime > prevTrend.total_downtime * 1.1) downtime_direction = 'increasing';
          else if (trend.total_downtime < prevTrend.total_downtime * 0.9) downtime_direction = 'decreasing';
        }
        
        return {
          ...trend,
          incident_direction,
          downtime_direction
        };
      });
      
      res.json({
        trends: trendsWithDirection,
        metadata: {
          period,
          days: parseInt(days),
          generated_at: new Date().toISOString()
        }
      });
      
    } catch (error) {
      console.error('Downtime trends error:', error);
      res.status(500).json({ error: 'Failed to fetch downtime trends' });
    }
  }
);

console.log('📊 Downtime Analytics and Reporting Endpoints Loaded');

}; // End of module.exports