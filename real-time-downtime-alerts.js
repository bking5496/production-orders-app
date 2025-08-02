// Real-Time Downtime Alerts and Notifications System
// Comprehensive alert management with escalation rules and customizable thresholds

module.exports = function(app, db, authenticateToken, requireRole, body, broadcast) {

// ================================
// ALERT CONFIGURATION MANAGEMENT
// ================================

// Create or update alert configuration
app.post('/api/alerts/downtime/config',
  authenticateToken,
  requireRole(['admin', 'supervisor']),
  body('severity_level').isIn(['critical', 'high', 'medium', 'low']),
  body('threshold_minutes').isInt({ min: 0 }),
  async (req, res) => {
    try {
      const {
        category_id,
        severity_level,
        threshold_minutes,
        auto_escalate,
        escalation_delay_minutes,
        notify_roles,
        notification_channels,
        description
      } = req.body;

      const config = await db.dbRun(
        `INSERT INTO downtime_alert_configs 
         (category_id, severity_level, threshold_minutes, auto_escalate, 
          escalation_delay_minutes, notify_roles, notification_channels, 
          description, created_by, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
         ON CONFLICT (category_id, severity_level) 
         DO UPDATE SET 
           threshold_minutes = EXCLUDED.threshold_minutes,
           auto_escalate = EXCLUDED.auto_escalate,
           escalation_delay_minutes = EXCLUDED.escalation_delay_minutes,
           notify_roles = EXCLUDED.notify_roles,
           notification_channels = EXCLUDED.notification_channels,
           description = EXCLUDED.description,
           updated_at = CURRENT_TIMESTAMP,
           updated_by = $9`,
        [category_id, severity_level, threshold_minutes, auto_escalate,
         escalation_delay_minutes, JSON.stringify(notify_roles), 
         JSON.stringify(notification_channels), description, req.user.id]
      );

      res.json({
        message: 'Alert configuration saved successfully',
        config_id: config.lastID
      });
    } catch (error) {
      console.error('Alert config error:', error);
      res.status(500).json({ error: 'Failed to save alert configuration' });
    }
  }
);

// Get alert configurations
app.get('/api/alerts/downtime/config',
  authenticateToken,
  requireRole(['admin', 'supervisor']),
  async (req, res) => {
    try {
      const configs = await db.dbAll(`
        SELECT ac.*, dc.category, dc.name as category_name, dc.severity_level as default_severity
        FROM downtime_alert_configs ac
        LEFT JOIN downtime_categories dc ON ac.category_id = dc.id
        ORDER BY dc.category, ac.severity_level
      `);

      res.json(configs);
    } catch (error) {
      console.error('Get alert configs error:', error);
      res.status(500).json({ error: 'Failed to fetch alert configurations' });
    }
  }
);

// ================================
// REAL-TIME ALERT TRIGGERS
// ================================

// Trigger immediate alert for critical downtime
app.post('/api/alerts/downtime/trigger',
  authenticateToken,
  requireRole(['admin', 'supervisor', 'operator']),
  body('downtime_stop_id').isInt(),
  body('alert_type').isIn(['immediate', 'threshold_exceeded', 'escalation']),
  async (req, res) => {
    try {
      const { downtime_stop_id, alert_type, custom_message } = req.body;

      // Get downtime details
      const downtime = await db.dbGet(`
        SELECT ds.*, dc.category, dc.name as category_name, dc.severity_level,
               po.order_number, po.product_name, po.environment,
               m.name as machine_name, m.type as machine_type
        FROM downtime_stops ds
        LEFT JOIN downtime_categories dc ON ds.category_id = dc.id
        LEFT JOIN production_orders po ON ds.order_id = po.id
        LEFT JOIN machines m ON po.machine_id = m.id
        WHERE ds.id = $1
      `, [downtime_stop_id]);

      if (!downtime) {
        return res.status(404).json({ error: 'Downtime record not found' });
      }

      // Get alert configuration for this category and severity
      const alertConfig = await db.dbGet(`
        SELECT * FROM downtime_alert_configs 
        WHERE category_id = $1 AND severity_level = $2
      `, [downtime.category_id, downtime.severity_level]);

      // Create alert record
      const alertResult = await db.dbRun(`
        INSERT INTO downtime_alerts 
        (downtime_stop_id, alert_type, severity_level, message, 
         triggered_by, triggered_at, status, escalation_level)
        VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, 'active', 0)
        RETURNING id
      `, [
        downtime_stop_id,
        alert_type,
        downtime.severity_level,
        custom_message || `${alert_type.toUpperCase()}: ${downtime.category_name} - ${downtime.primary_cause}`,
        req.user.id
      ]);

      const alertId = alertResult.lastID;

      // Prepare alert data for broadcasting
      const alertData = {
        alert_id: alertId,
        alert_type,
        severity_level: downtime.severity_level,
        downtime_id: downtime_stop_id,
        order_number: downtime.order_number,
        product_name: downtime.product_name,
        machine_name: downtime.machine_name,
        category: downtime.category,
        primary_cause: downtime.primary_cause,
        environment: downtime.environment,
        duration_minutes: downtime.actual_duration_minutes,
        triggered_by: req.user.username,
        triggered_at: new Date().toISOString(),
        message: custom_message || `${alert_type.toUpperCase()}: ${downtime.category_name} - ${downtime.primary_cause}`
      };

      // Broadcast alert via WebSocket
      broadcast('downtime_alert', alertData);

      // If configuration exists, send targeted notifications
      if (alertConfig) {
        await sendTargetedNotifications(alertConfig, alertData, db, broadcast);
      }

      // Schedule escalation if auto-escalate is enabled
      if (alertConfig && alertConfig.auto_escalate && alertConfig.escalation_delay_minutes > 0) {
        setTimeout(async () => {
          await escalateAlert(alertId, db, broadcast);
        }, alertConfig.escalation_delay_minutes * 60 * 1000);
      }

      res.json({
        message: 'Alert triggered successfully',
        alert_id: alertId,
        alert_data: alertData
      });

    } catch (error) {
      console.error('Alert trigger error:', error);
      res.status(500).json({ error: 'Failed to trigger alert' });
    }
  }
);

// ================================
// ALERT MANAGEMENT
// ================================

// Acknowledge alert
app.post('/api/alerts/downtime/:alertId/acknowledge',
  authenticateToken,
  requireRole(['admin', 'supervisor', 'operator']),
  async (req, res) => {
    try {
      const { alertId } = req.params;
      const { acknowledgment_notes } = req.body;

      const result = await db.dbRun(`
        UPDATE downtime_alerts 
        SET status = 'acknowledged',
            acknowledged_by = $1,
            acknowledged_at = CURRENT_TIMESTAMP,
            acknowledgment_notes = $2
        WHERE id = $3 AND status = 'active'
      `, [req.user.id, acknowledgment_notes, alertId]);

      if (result.changes === 0) {
        return res.status(404).json({ error: 'Alert not found or already processed' });
      }

      // Broadcast acknowledgment
      broadcast('alert_acknowledged', {
        alert_id: alertId,
        acknowledged_by: req.user.username,
        acknowledgment_notes
      });

      res.json({ message: 'Alert acknowledged successfully' });
    } catch (error) {
      console.error('Alert acknowledgment error:', error);
      res.status(500).json({ error: 'Failed to acknowledge alert' });
    }
  }
);

// Resolve alert
app.post('/api/alerts/downtime/:alertId/resolve',
  authenticateToken,
  requireRole(['admin', 'supervisor']),
  async (req, res) => {
    try {
      const { alertId } = req.params;
      const { resolution_notes, resolution_action } = req.body;

      const result = await db.dbRun(`
        UPDATE downtime_alerts 
        SET status = 'resolved',
            resolved_by = $1,
            resolved_at = CURRENT_TIMESTAMP,
            resolution_notes = $2,
            resolution_action = $3
        WHERE id = $4 AND status IN ('active', 'acknowledged')
      `, [req.user.id, resolution_notes, resolution_action, alertId]);

      if (result.changes === 0) {
        return res.status(404).json({ error: 'Alert not found or already resolved' });
      }

      // Broadcast resolution
      broadcast('alert_resolved', {
        alert_id: alertId,
        resolved_by: req.user.username,
        resolution_notes,
        resolution_action
      });

      res.json({ message: 'Alert resolved successfully' });
    } catch (error) {
      console.error('Alert resolution error:', error);
      res.status(500).json({ error: 'Failed to resolve alert' });
    }
  }
);

// Get active alerts
app.get('/api/alerts/downtime/active',
  authenticateToken,
  async (req, res) => {
    try {
      const { environment, severity_level } = req.query;

      let whereConditions = ["da.status IN ('active', 'acknowledged')"];
      let params = [];
      let paramIndex = 1;

      if (environment) {
        whereConditions.push(`po.environment = $${paramIndex}`);
        params.push(environment);
        paramIndex++;
      }

      if (severity_level) {
        whereConditions.push(`da.severity_level = $${paramIndex}`);
        params.push(severity_level);
        paramIndex++;
      }

      const whereClause = whereConditions.join(' AND ');

      const alerts = await db.dbAll(`
        SELECT da.*, ds.primary_cause, ds.actual_duration_minutes,
               dc.category, dc.name as category_name,
               po.order_number, po.product_name, po.environment,
               m.name as machine_name, m.type as machine_type,
               u1.username as triggered_by_name,
               u2.username as acknowledged_by_name,
               EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - da.triggered_at)) / 60 as alert_age_minutes
        FROM downtime_alerts da
        LEFT JOIN downtime_stops ds ON da.downtime_stop_id = ds.id
        LEFT JOIN downtime_categories dc ON ds.category_id = dc.id
        LEFT JOIN production_orders po ON ds.order_id = po.id
        LEFT JOIN machines m ON po.machine_id = m.id
        LEFT JOIN users u1 ON da.triggered_by = u1.id
        LEFT JOIN users u2 ON da.acknowledged_by = u2.id
        WHERE ${whereClause}
        ORDER BY da.severity_level = 'critical' DESC,
                 da.severity_level = 'high' DESC,
                 da.triggered_at ASC
      `, params);

      res.json(alerts);
    } catch (error) {
      console.error('Get active alerts error:', error);
      res.status(500).json({ error: 'Failed to fetch active alerts' });
    }
  }
);

// Get alert history
app.get('/api/alerts/downtime/history',
  authenticateToken,
  requireRole(['admin', 'supervisor']),
  async (req, res) => {
    try {
      const { start_date, end_date, environment, limit = 100 } = req.query;

      let whereConditions = ['1=1'];
      let params = [];
      let paramIndex = 1;

      if (start_date && end_date) {
        whereConditions.push(`da.triggered_at >= $${paramIndex} AND da.triggered_at <= $${paramIndex + 1}`);
        params.push(start_date, end_date);
        paramIndex += 2;
      }

      if (environment) {
        whereConditions.push(`po.environment = $${paramIndex}`);
        params.push(environment);
        paramIndex++;
      }

      const whereClause = whereConditions.join(' AND ');

      const history = await db.dbAll(`
        SELECT da.*, ds.primary_cause, ds.actual_duration_minutes,
               dc.category, dc.name as category_name,
               po.order_number, po.product_name, po.environment,
               m.name as machine_name,
               u1.username as triggered_by_name,
               u2.username as acknowledged_by_name,
               u3.username as resolved_by_name,
               EXTRACT(EPOCH FROM (COALESCE(da.resolved_at, da.acknowledged_at, CURRENT_TIMESTAMP) - da.triggered_at)) / 60 as response_time_minutes
        FROM downtime_alerts da
        LEFT JOIN downtime_stops ds ON da.downtime_stop_id = ds.id
        LEFT JOIN downtime_categories dc ON ds.category_id = dc.id
        LEFT JOIN production_orders po ON ds.order_id = po.id
        LEFT JOIN machines m ON po.machine_id = m.id
        LEFT JOIN users u1 ON da.triggered_by = u1.id
        LEFT JOIN users u2 ON da.acknowledged_by = u2.id
        LEFT JOIN users u3 ON da.resolved_by = u3.id
        WHERE ${whereClause}
        ORDER BY da.triggered_at DESC
        LIMIT $${paramIndex}
      `, [...params, limit]);

      res.json(history);
    } catch (error) {
      console.error('Get alert history error:', error);
      res.status(500).json({ error: 'Failed to fetch alert history' });
    }
  }
);

// ================================
// AUTOMATIC ALERT MONITORING
// ================================

// Monitor downtime thresholds (called periodically by background task)
app.post('/api/alerts/downtime/monitor',
  authenticateToken,
  requireRole(['system', 'admin']), // System role for background tasks
  async (req, res) => {
    try {
      // Get active downtime incidents
      const activeDowntime = await db.dbAll(`
        SELECT ds.*, dc.category, dc.severity_level,
               po.order_number, po.environment,
               EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - ds.start_time)) / 60 as current_duration_minutes
        FROM downtime_stops ds
        LEFT JOIN downtime_categories dc ON ds.category_id = dc.id
        LEFT JOIN production_orders po ON ds.order_id = po.id
        WHERE ds.resolution_status = 'pending' 
        AND ds.start_time IS NOT NULL
      `);

      // Get alert configurations
      const alertConfigs = await db.dbAll(`
        SELECT * FROM downtime_alert_configs 
        WHERE threshold_minutes > 0
      `);

      let triggeredAlerts = 0;

      for (const downtime of activeDowntime) {
        const matchingConfig = alertConfigs.find(config => 
          config.category_id === downtime.category_id && 
          config.severity_level === downtime.severity_level
        );

        if (matchingConfig && downtime.current_duration_minutes >= matchingConfig.threshold_minutes) {
          // Check if alert already exists for this downtime
          const existingAlert = await db.dbGet(`
            SELECT id FROM downtime_alerts 
            WHERE downtime_stop_id = $1 AND alert_type = 'threshold_exceeded'
          `, [downtime.id]);

          if (!existingAlert) {
            // Trigger threshold exceeded alert
            const alertResult = await db.dbRun(`
              INSERT INTO downtime_alerts 
              (downtime_stop_id, alert_type, severity_level, message, 
               triggered_by, triggered_at, status, escalation_level)
              VALUES ($1, 'threshold_exceeded', $2, $3, 1, CURRENT_TIMESTAMP, 'active', 0)
            `, [
              downtime.id,
              downtime.severity_level,
              `THRESHOLD EXCEEDED: ${downtime.category} downtime has exceeded ${matchingConfig.threshold_minutes} minutes`
            ]);

            // Broadcast the alert
            broadcast('downtime_alert', {
              alert_id: alertResult.lastID,
              alert_type: 'threshold_exceeded',
              severity_level: downtime.severity_level,
              downtime_id: downtime.id,
              order_number: downtime.order_number,
              environment: downtime.environment,
              category: downtime.category,
              duration_minutes: Math.round(downtime.current_duration_minutes),
              threshold_minutes: matchingConfig.threshold_minutes,
              message: `THRESHOLD EXCEEDED: ${downtime.category} downtime has exceeded ${matchingConfig.threshold_minutes} minutes`
            });

            triggeredAlerts++;
          }
        }
      }

      res.json({
        message: 'Monitoring completed',
        checked_incidents: activeDowntime.length,
        triggered_alerts: triggeredAlerts
      });

    } catch (error) {
      console.error('Alert monitoring error:', error);
      res.status(500).json({ error: 'Failed to monitor alerts' });
    }
  }
);

// ================================
// HELPER FUNCTIONS
// ================================

// Send targeted notifications based on configuration
async function sendTargetedNotifications(alertConfig, alertData, db, broadcast) {
  try {
    const notifyRoles = JSON.parse(alertConfig.notify_roles || '[]');
    const channels = JSON.parse(alertConfig.notification_channels || '[]');

    // Get users to notify based on roles
    if (notifyRoles.length > 0) {
      const users = await db.dbAll(`
        SELECT u.id, u.username, u.email, u.role 
        FROM users u 
        WHERE u.role = ANY($1) AND u.active = true
      `, [notifyRoles]);

      // Send targeted notifications via WebSocket
      for (const user of users) {
        broadcast('targeted_downtime_alert', {
          ...alertData,
          target_user_id: user.id,
          target_username: user.username,
          notification_channels: channels
        });
      }
    }

    // Log notification attempt
    await db.dbRun(`
      INSERT INTO alert_notifications 
      (alert_id, target_roles, notification_channels, sent_at, status)
      VALUES ($1, $2, $3, CURRENT_TIMESTAMP, 'sent')
    `, [alertData.alert_id, JSON.stringify(notifyRoles), JSON.stringify(channels)]);

  } catch (error) {
    console.error('Targeted notification error:', error);
  }
}

// Escalate alert after delay
async function escalateAlert(alertId, db, broadcast) {
  try {
    // Check if alert is still active
    const alert = await db.dbGet(`
      SELECT * FROM downtime_alerts WHERE id = $1 AND status = 'active'
    `, [alertId]);

    if (alert) {
      // Increase escalation level
      const newEscalationLevel = alert.escalation_level + 1;
      
      await db.dbRun(`
        UPDATE downtime_alerts 
        SET escalation_level = $1, 
            escalated_at = CURRENT_TIMESTAMP
        WHERE id = $2
      `, [newEscalationLevel, alertId]);

      // Broadcast escalation
      broadcast('alert_escalated', {
        alert_id: alertId,
        escalation_level: newEscalationLevel,
        escalated_at: new Date().toISOString()
      });
    }
  } catch (error) {
    console.error('Alert escalation error:', error);
  }
}

console.log('🚨 Real-Time Downtime Alerts and Notifications System Loaded');

}; // End of module.exports