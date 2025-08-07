// Enhanced Downtime Tracking API Endpoints
// Comprehensive downtime recording, tracking, and analytics

module.exports = function(app, db, authenticateToken, requireRole, body, broadcast) {

// ================================
// DOWNTIME MANAGEMENT ENDPOINTS
// ================================

// Get all downtime categories
app.get('/api/downtime/categories', authenticateToken, (req, res) => {
  const query = `
    SELECT dc.*, 
           COUNT(pse.id) as usage_count
    FROM downtime_categories dc
    LEFT JOIN production_stops_enhanced pse ON dc.id = pse.downtime_category_id
    GROUP BY dc.id
    ORDER BY dc.priority_level, dc.category_name
  `;
  
  db.all(query, [], (err, categories) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to fetch downtime categories' });
    }
    res.json(categories);
  });
});

// Create new downtime event
app.post('/api/downtime/create',
  authenticateToken,
  requireRole(['admin', 'supervisor', 'operator']),
  body('order_id').isInt(),
  body('machine_id').isInt(),
  body('downtime_category_id').isInt(),
  body('primary_cause').notEmpty(),
  body('severity').isIn(['low', 'medium', 'high', 'critical']),
  (req, res) => {
    const {
      order_id,
      machine_id,
      downtime_category_id,
      primary_cause,
      secondary_cause,
      severity,
      production_impact,
      estimated_duration,
      notes,
      workflow_stage,
      quality_impact,
      safety_incident,
      environmental_impact
    } = req.body;

    db.serialize(() => {
      db.run('BEGIN TRANSACTION');
      
      // Create downtime record
      db.run(
        `INSERT INTO production_stops_enhanced 
         (order_id, machine_id, downtime_category_id, primary_cause, secondary_cause, 
          severity, production_impact, estimated_duration, notes, workflow_stage,
          quality_impact, safety_incident, environmental_impact, reported_by, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')`,
        [order_id, machine_id, downtime_category_id, primary_cause, secondary_cause,
         severity, production_impact, estimated_duration, notes, workflow_stage,
         quality_impact || false, safety_incident || false, environmental_impact || false, req.user.id],
        function(err) {
          if (err) {
            db.run('ROLLBACK');
            return res.status(500).json({ error: 'Failed to create downtime record' });
          }
          
          const downtimeId = this.lastID;
          
          // Update machine status if critical
          if (severity === 'critical' || severity === 'high') {
            db.run(
              'UPDATE machines SET status = ? WHERE id = ?',
              ['maintenance', machine_id],
              (err) => {
                if (err) console.error('Failed to update machine status:', err);
              }
            );
          }
          
          // Create alert for critical downtime
          if (severity === 'critical') {
            db.run(
              `INSERT INTO downtime_alerts 
               (downtime_id, alert_type, severity, message, recipient_role)
               VALUES (?, 'critical_failure', 'critical', ?, 'supervisor')`,
              [downtimeId, `Critical downtime: ${primary_cause} on Machine ${machine_id}`],
              (err) => {
                if (err) console.error('Failed to create alert:', err);
              }
            );
          }
          
          db.run('COMMIT');
          
          // Broadcast real-time notification
          broadcast('downtime_started', {
            downtime_id: downtimeId,
            machine_id,
            order_id,
            severity,
            primary_cause,
            reported_by: req.user.username
          });
          
          res.json({ 
            message: 'Downtime recorded successfully',
            downtime_id: downtimeId 
          });
        }
      );
    });
  }
);

// Update downtime event
app.put('/api/downtime/:id',
  authenticateToken,
  requireRole(['admin', 'supervisor', 'operator']),
  (req, res) => {
    const { id } = req.params;
    const updates = req.body;
    
    // Build dynamic update query
    const allowedFields = [
      'secondary_cause', 'root_cause', 'immediate_action', 'corrective_action',
      'preventive_action', 'assigned_to', 'status', 'severity', 'production_impact',
      'cost_impact', 'units_lost', 'notes', 'photos', 'documents'
    ];
    
    const updateFields = [];
    const values = [];
    
    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        updateFields.push(`${key} = ?`);
        values.push(value);
      }
    }
    
    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }
    
    updateFields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);
    
    db.run(
      `UPDATE production_stops_enhanced SET ${updateFields.join(', ')} WHERE id = ?`,
      values,
      function(err) {
        if (err) {
          return res.status(500).json({ error: 'Failed to update downtime record' });
        }
        
        if (this.changes === 0) {
          return res.status(404).json({ error: 'Downtime record not found' });
        }
        
        res.json({ message: 'Downtime updated successfully' });
      }
    );
  }
);

// Resolve downtime event
app.post('/api/downtime/:id/resolve',
  authenticateToken,
  requireRole(['admin', 'supervisor', 'operator']),
  body('corrective_action').notEmpty(),
  (req, res) => {
    const { id } = req.params;
    const { corrective_action, preventive_action, notes, cost_impact, units_lost } = req.body;
    
    db.serialize(() => {
      db.run('BEGIN TRANSACTION');
      
      // Get current downtime record
      db.get(
        'SELECT * FROM production_stops_enhanced WHERE id = ?',
        [id],
        (err, downtime) => {
          if (err) {
            db.run('ROLLBACK');
            return res.status(500).json({ error: 'Database error' });
          }
          
          if (!downtime) {
            db.run('ROLLBACK');
            return res.status(404).json({ error: 'Downtime record not found' });
          }
          
          const endTime = new Date();
          const startTime = new Date(downtime.start_time);
          const durationMinutes = Math.round((endTime - startTime) / (1000 * 60));
          
          // Update downtime record
          db.run(
            `UPDATE production_stops_enhanced 
             SET end_time = CURRENT_TIMESTAMP,
                 duration_minutes = ?,
                 corrective_action = ?,
                 preventive_action = ?,
                 notes = COALESCE(notes, '') || ' | Resolution: ' || ?,
                 cost_impact = ?,
                 units_lost = ?,
                 resolved_by = ?,
                 status = 'resolved',
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = ?`,
            [durationMinutes, corrective_action, preventive_action, notes || '', 
             cost_impact || 0, units_lost || 0, req.user.id, id],
            function(err) {
              if (err) {
                db.run('ROLLBACK');
                return res.status(500).json({ error: 'Failed to resolve downtime' });
              }
              
              // Update machine status back to available
              if (downtime.machine_id) {
                db.run(
                  'UPDATE machines SET status = ? WHERE id = ?',
                  ['available', downtime.machine_id],
                  (err) => {
                    if (err) console.error('Failed to update machine status:', err);
                  }
                );
              }
              
              // Mark related alerts as resolved
              db.run(
                'UPDATE downtime_alerts SET status = ?, acknowledged_at = CURRENT_TIMESTAMP WHERE downtime_id = ?',
                ['resolved', id],
                (err) => {
                  if (err) console.error('Failed to update alerts:', err);
                }
              );
              
              db.run('COMMIT');
              
              // Broadcast resolution
              broadcast('downtime_resolved', {
                downtime_id: id,
                machine_id: downtime.machine_id,
                order_id: downtime.order_id,
                duration_minutes: durationMinutes,
                resolved_by: req.user.username
              });
              
              res.json({ 
                message: 'Downtime resolved successfully',
                duration_minutes: durationMinutes 
              });
            }
          );
        }
      );
    });
  }
);

// Get active downtime events
app.get('/api/downtime/active', authenticateToken, (req, res) => {
  const query = `
    SELECT pse.*,
           dc.category_name,
           dc.color_code,
           dc.priority_level,
           m.name as machine_name,
           po.order_number,
           u1.username as reported_by_name,
           u2.username as assigned_to_name,
           ROUND((julianday('now') - julianday(pse.start_time)) * 24 * 60) as current_duration_minutes
    FROM production_stops_enhanced pse
    LEFT JOIN downtime_categories dc ON pse.downtime_category_id = dc.id
    LEFT JOIN machines m ON pse.machine_id = m.id
    LEFT JOIN production_orders po ON pse.order_id = po.id
    LEFT JOIN users u1 ON pse.reported_by = u1.id
    LEFT JOIN users u2 ON pse.assigned_to = u2.id
    WHERE pse.status IN ('active', 'investigating', 'resolving')
    ORDER BY pse.severity DESC, pse.start_time DESC
  `;
  
  db.all(query, [], (err, downtimes) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to fetch active downtime' });
    }
    res.json(downtimes);
  });
});

// Get downtime history with filters
app.get('/api/downtime/history', authenticateToken, (req, res) => {
  const { start_date, end_date, machine_id, category_id, severity, limit = 50 } = req.query;
  
  let query = `
    SELECT pse.*,
           dc.category_name,
           dc.color_code,
           m.name as machine_name,
           po.order_number,
           u1.username as reported_by_name,
           u2.username as resolved_by_name
    FROM production_stops_enhanced pse
    LEFT JOIN downtime_categories dc ON pse.downtime_category_id = dc.id
    LEFT JOIN machines m ON pse.machine_id = m.id
    LEFT JOIN production_orders po ON pse.order_id = po.id
    LEFT JOIN users u1 ON pse.reported_by = u1.id
    LEFT JOIN users u2 ON pse.resolved_by = u2.id
    WHERE 1=1
  `;
  
  const params = [];
  
  if (start_date && end_date) {
    query += ' AND DATE(pse.start_time) BETWEEN ? AND ?';
    params.push(start_date, end_date);
  }
  
  if (machine_id) {
    query += ' AND pse.machine_id = ?';
    params.push(machine_id);
  }
  
  if (category_id) {
    query += ' AND pse.downtime_category_id = ?';
    params.push(category_id);
  }
  
  if (severity) {
    query += ' AND pse.severity = ?';
    params.push(severity);
  }
  
  query += ' ORDER BY pse.start_time DESC LIMIT ?';
  params.push(parseInt(limit));
  
  db.all(query, params, (err, downtimes) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to fetch downtime history' });
    }
    res.json(downtimes);
  });
});

// Get downtime analytics
app.get('/api/downtime/analytics', authenticateToken, (req, res) => {
  const { start_date, end_date, machine_id } = req.query;
  
  let baseWhere = 'WHERE pse.end_time IS NOT NULL';
  const params = [];
  
  if (start_date && end_date) {
    baseWhere += ' AND DATE(pse.start_time) BETWEEN ? AND ?';
    params.push(start_date, end_date);
  }
  
  if (machine_id) {
    baseWhere += ' AND pse.machine_id = ?';
    params.push(machine_id);
  }
  
  const queries = {
    // Total downtime by category
    by_category: `
      SELECT dc.category_name,
             dc.color_code,
             COUNT(pse.id) as count,
             SUM(pse.duration_minutes) as total_minutes,
             AVG(pse.duration_minutes) as avg_minutes
      FROM production_stops_enhanced pse
      JOIN downtime_categories dc ON pse.downtime_category_id = dc.id
      ${baseWhere}
      GROUP BY dc.id, dc.category_name, dc.color_code
      ORDER BY total_minutes DESC
    `,
    
    // Downtime by severity
    by_severity: `
      SELECT pse.severity,
             COUNT(pse.id) as count,
             SUM(pse.duration_minutes) as total_minutes
      FROM production_stops_enhanced pse
      ${baseWhere}
      GROUP BY pse.severity
      ORDER BY total_minutes DESC
    `,
    
    // Daily downtime trend
    daily_trend: `
      SELECT DATE(pse.start_time) as date,
             COUNT(pse.id) as incident_count,
             SUM(pse.duration_minutes) as total_minutes
      FROM production_stops_enhanced pse
      ${baseWhere}
      GROUP BY DATE(pse.start_time)
      ORDER BY date DESC
      LIMIT 30
    `,
    
    // Machine performance
    by_machine: `
      SELECT m.name as machine_name,
             COUNT(pse.id) as incident_count,
             SUM(pse.duration_minutes) as total_minutes,
             AVG(pse.duration_minutes) as avg_minutes
      FROM production_stops_enhanced pse
      JOIN machines m ON pse.machine_id = m.id
      ${baseWhere}
      GROUP BY m.id, m.name
      ORDER BY total_minutes DESC
    `
  };
  
  const results = {};
  const queryPromises = Object.entries(queries).map(([key, query]) => {
    return new Promise((resolve, reject) => {
      db.all(query, params, (err, data) => {
        if (err) {
          reject(err);
        } else {
          results[key] = data;
          resolve();
        }
      });
    });
  });
  
  Promise.all(queryPromises)
    .then(() => {
      res.json(results);
    })
    .catch(err => {
      console.error('Downtime analytics error:', err);
      res.status(500).json({ error: 'Failed to fetch downtime analytics' });
    });
});

// Real-time downtime alerts
app.get('/api/downtime/alerts', authenticateToken, (req, res) => {
  const query = `
    SELECT da.*,
           pse.primary_cause,
           m.name as machine_name,
           po.order_number
    FROM downtime_alerts da
    LEFT JOIN production_stops_enhanced pse ON da.downtime_id = pse.id
    LEFT JOIN machines m ON pse.machine_id = m.id
    LEFT JOIN production_orders po ON pse.order_id = po.id
    WHERE da.status = 'active'
    ORDER BY da.severity DESC, da.created_at DESC
  `;
  
  db.all(query, [], (err, alerts) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to fetch alerts' });
    }
    res.json(alerts);
  });
});

// Acknowledge downtime alert
app.post('/api/downtime/alerts/:id/acknowledge',
  authenticateToken,
  (req, res) => {
    const { id } = req.params;
    
    db.run(
      `UPDATE downtime_alerts 
       SET status = 'acknowledged',
           acknowledged_at = CURRENT_TIMESTAMP,
           acknowledged_by = json_insert(
             COALESCE(acknowledged_by, '[]'),
             '$[#]',
             ?
           )
       WHERE id = ?`,
      [req.user.id, id],
      function(err) {
        if (err) {
          return res.status(500).json({ error: 'Failed to acknowledge alert' });
        }
        
        if (this.changes === 0) {
          return res.status(404).json({ error: 'Alert not found' });
        }
        
        res.json({ message: 'Alert acknowledged successfully' });
      }
    );
  }
);

// Get machine performance metrics (for OEE calculation)
app.get('/api/machines/:id/performance', authenticateToken, (req, res) => {
  const { id } = req.params;
  const { start_date, end_date } = req.query;
  
  let query = `
    SELECT *
    FROM machine_performance_metrics
    WHERE machine_id = ?
  `;
  
  const params = [id];
  
  if (start_date && end_date) {
    query += ' AND metric_date BETWEEN ? AND ?';
    params.push(start_date, end_date);
  }
  
  query += ' ORDER BY metric_date DESC LIMIT 30';
  
  db.all(query, params, (err, metrics) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to fetch performance metrics' });
    }
    res.json(metrics);
  });
});

// Calculate and store daily OEE
app.post('/api/machines/:id/calculate-oee',
  authenticateToken,
  requireRole(['admin', 'supervisor']),
  (req, res) => {
    const { id } = req.params;
    const { date = new Date().toISOString().split('T')[0] } = req.body;
    
    // Calculate OEE for the specified date
    const queries = {
      // Get total downtime for the day
      downtime: `
        SELECT COALESCE(SUM(duration_minutes), 0) as total_downtime
        FROM production_stops_enhanced
        WHERE machine_id = ? AND DATE(start_time) = ?
      `,
      
      // Get production data for the day
      production: `
        SELECT COUNT(*) as total_orders,
               SUM(quantity) as planned_units,
               SUM(actual_quantity) as actual_units,
               SUM(CASE WHEN status = 'completed' THEN actual_quantity ELSE 0 END) as good_units
        FROM production_orders
        WHERE machine_id = ? AND DATE(created_at) = ?
      `
    };
    
    db.get(queries.downtime, [id, date], (err, downtimeData) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to calculate downtime' });
      }
      
      db.get(queries.production, [id, date], (err, productionData) => {
        if (err) {
          return res.status(500).json({ error: 'Failed to fetch production data' });
        }
        
        // Calculate OEE components
        const scheduledTime = 480; // 8 hours in minutes (adjustable)
        const downtime = downtimeData.total_downtime || 0;
        const availableTime = scheduledTime - downtime;
        
        const availability = scheduledTime > 0 ? (availableTime / scheduledTime) * 100 : 0;
        const performance = 100; // Simplified - would need cycle time data
        const quality = productionData.planned_units > 0 
          ? (productionData.good_units / productionData.planned_units) * 100 
          : 0;
        
        const oee = (availability * performance * quality) / 10000;
        
        // Store the calculated metrics
        db.run(
          `INSERT OR REPLACE INTO machine_performance_metrics
           (machine_id, metric_date, scheduled_time, downtime_minutes, availability_percentage,
            performance_percentage, quality_percentage, total_units_produced, good_units_produced,
            oee_percentage)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [id, date, scheduledTime, downtime, availability, performance, quality,
           productionData.actual_units || 0, productionData.good_units || 0, oee],
          function(err) {
            if (err) {
              return res.status(500).json({ error: 'Failed to store OEE metrics' });
            }
            
            res.json({
              message: 'OEE calculated successfully',
              metrics: {
                date,
                availability: Math.round(availability * 100) / 100,
                performance: Math.round(performance * 100) / 100,
                quality: Math.round(quality * 100) / 100,
                oee: Math.round(oee * 100) / 100,
                downtime_minutes: downtime,
                scheduled_time: scheduledTime
              }
            });
          }
        );
      });
    });
  }
);

console.log('✨ Enhanced Downtime Tracking Endpoints Loaded');

}; // End of module.exports