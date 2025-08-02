-- Real-Time Downtime Alert System Database Schema
-- PostgreSQL schema for comprehensive alert management

-- Alert Configuration Table
CREATE TABLE IF NOT EXISTS downtime_alert_configs (
    id SERIAL PRIMARY KEY,
    category_id INTEGER REFERENCES downtime_categories(id),
    severity_level VARCHAR(20) NOT NULL CHECK (severity_level IN ('critical', 'high', 'medium', 'low')),
    threshold_minutes INTEGER NOT NULL DEFAULT 0,
    auto_escalate BOOLEAN DEFAULT false,
    escalation_delay_minutes INTEGER DEFAULT 30,
    notify_roles TEXT, -- JSON array of roles to notify
    notification_channels TEXT, -- JSON array of notification channels
    description TEXT,
    created_by INTEGER REFERENCES users(id),
    updated_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(category_id, severity_level)
);

-- Main Alert Records Table
CREATE TABLE IF NOT EXISTS downtime_alerts (
    id SERIAL PRIMARY KEY,
    downtime_stop_id INTEGER REFERENCES downtime_stops(id),
    alert_type VARCHAR(30) NOT NULL CHECK (alert_type IN ('immediate', 'threshold_exceeded', 'escalation')),
    severity_level VARCHAR(20) NOT NULL CHECK (severity_level IN ('critical', 'high', 'medium', 'low')),
    message TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'acknowledged', 'resolved', 'cancelled')),
    escalation_level INTEGER DEFAULT 0,
    
    -- Triggering information
    triggered_by INTEGER REFERENCES users(id),
    triggered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Acknowledgment information
    acknowledged_by INTEGER REFERENCES users(id),
    acknowledged_at TIMESTAMP,
    acknowledgment_notes TEXT,
    
    -- Resolution information
    resolved_by INTEGER REFERENCES users(id),
    resolved_at TIMESTAMP,
    resolution_notes TEXT,
    resolution_action VARCHAR(100),
    
    -- Escalation tracking
    escalated_at TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Alert Notifications Log
CREATE TABLE IF NOT EXISTS alert_notifications (
    id SERIAL PRIMARY KEY,
    alert_id INTEGER REFERENCES downtime_alerts(id),
    target_user_id INTEGER REFERENCES users(id),
    target_roles TEXT, -- JSON array of roles targeted
    notification_channels TEXT, -- JSON array of channels used
    notification_type VARCHAR(50) DEFAULT 'alert',
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'failed', 'read')),
    delivery_method VARCHAR(30), -- websocket, email, sms, etc.
    error_message TEXT
);

-- Alert Escalation Rules
CREATE TABLE IF NOT EXISTS alert_escalation_rules (
    id SERIAL PRIMARY KEY,
    category_id INTEGER REFERENCES downtime_categories(id),
    severity_level VARCHAR(20) NOT NULL,
    escalation_level INTEGER NOT NULL,
    delay_minutes INTEGER NOT NULL,
    target_roles TEXT, -- JSON array of roles to escalate to
    escalation_actions TEXT, -- JSON array of actions to take
    description TEXT,
    active BOOLEAN DEFAULT true,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(category_id, severity_level, escalation_level)
);

-- Alert Performance Metrics
CREATE TABLE IF NOT EXISTS alert_metrics (
    id SERIAL PRIMARY KEY,
    alert_id INTEGER REFERENCES downtime_alerts(id),
    metric_name VARCHAR(50) NOT NULL,
    metric_value DECIMAL(10,2),
    metric_unit VARCHAR(20),
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Alert Templates for Consistent Messaging
CREATE TABLE IF NOT EXISTS alert_templates (
    id SERIAL PRIMARY KEY,
    template_name VARCHAR(100) UNIQUE NOT NULL,
    category_id INTEGER REFERENCES downtime_categories(id),
    severity_level VARCHAR(20),
    alert_type VARCHAR(30),
    message_template TEXT NOT NULL,
    variables TEXT, -- JSON array of variable placeholders
    active BOOLEAN DEFAULT true,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_downtime_alerts_status ON downtime_alerts(status);
CREATE INDEX IF NOT EXISTS idx_downtime_alerts_severity ON downtime_alerts(severity_level);
CREATE INDEX IF NOT EXISTS idx_downtime_alerts_triggered_at ON downtime_alerts(triggered_at);
CREATE INDEX IF NOT EXISTS idx_downtime_alerts_downtime_stop ON downtime_alerts(downtime_stop_id);
CREATE INDEX IF NOT EXISTS idx_alert_configs_category_severity ON downtime_alert_configs(category_id, severity_level);
CREATE INDEX IF NOT EXISTS idx_alert_notifications_alert_id ON alert_notifications(alert_id);
CREATE INDEX IF NOT EXISTS idx_alert_notifications_sent_at ON alert_notifications(sent_at);

-- Create default alert configurations for each category and severity
INSERT INTO downtime_alert_configs (category_id, severity_level, threshold_minutes, auto_escalate, escalation_delay_minutes, notify_roles, notification_channels, description)
SELECT 
    dc.id,
    'critical',
    5,  -- 5 minute threshold for critical
    true,
    15, -- 15 minute escalation delay
    '["admin", "supervisor"]',
    '["websocket", "email"]',
    'Critical downtime alert for ' || dc.name
FROM downtime_categories dc
WHERE dc.severity_level = 'critical'
ON CONFLICT (category_id, severity_level) DO NOTHING;

INSERT INTO downtime_alert_configs (category_id, severity_level, threshold_minutes, auto_escalate, escalation_delay_minutes, notify_roles, notification_channels, description)
SELECT 
    dc.id,
    'high',
    15, -- 15 minute threshold for high
    true,
    30, -- 30 minute escalation delay
    '["supervisor", "operator"]',
    '["websocket"]',
    'High priority downtime alert for ' || dc.name
FROM downtime_categories dc
WHERE dc.severity_level = 'high'
ON CONFLICT (category_id, severity_level) DO NOTHING;

INSERT INTO downtime_alert_configs (category_id, severity_level, threshold_minutes, auto_escalate, escalation_delay_minutes, notify_roles, notification_channels, description)
SELECT 
    dc.id,
    'medium',
    30, -- 30 minute threshold for medium
    false,
    60, -- 60 minute escalation delay
    '["supervisor"]',
    '["websocket"]',
    'Medium priority downtime alert for ' || dc.name
FROM downtime_categories dc
WHERE dc.severity_level = 'medium'
ON CONFLICT (category_id, severity_level) DO NOTHING;

-- Create default alert templates
INSERT INTO alert_templates (template_name, alert_type, message_template, variables, created_by)
VALUES 
('critical_immediate', 'immediate', 'CRITICAL DOWNTIME: {{category_name}} on {{machine_name}} - {{primary_cause}}', '["category_name", "machine_name", "primary_cause"]', 1),
('threshold_exceeded', 'threshold_exceeded', 'THRESHOLD EXCEEDED: {{category_name}} downtime has been active for {{duration_minutes}} minutes (threshold: {{threshold_minutes}} min)', '["category_name", "duration_minutes", "threshold_minutes"]', 1),
('escalation_alert', 'escalation', 'ESCALATED ALERT: {{category_name}} downtime requires immediate attention - Level {{escalation_level}}', '["category_name", "escalation_level"]', 1)
ON CONFLICT (template_name) DO NOTHING;

-- Add alert-related triggers for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_alert_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_downtime_alerts_updated_at
    BEFORE UPDATE ON downtime_alerts
    FOR EACH ROW
    EXECUTE FUNCTION update_alert_updated_at();

CREATE TRIGGER trigger_downtime_alert_configs_updated_at
    BEFORE UPDATE ON downtime_alert_configs
    FOR EACH ROW
    EXECUTE FUNCTION update_alert_updated_at();

-- Performance monitoring view
CREATE OR REPLACE VIEW alert_performance_summary AS
SELECT 
    da.severity_level,
    COUNT(*) as total_alerts,
    COUNT(CASE WHEN da.status = 'resolved' THEN 1 END) as resolved_alerts,
    AVG(EXTRACT(EPOCH FROM (da.acknowledged_at - da.triggered_at)) / 60) as avg_acknowledgment_time_minutes,
    AVG(EXTRACT(EPOCH FROM (da.resolved_at - da.triggered_at)) / 60) as avg_resolution_time_minutes,
    COUNT(CASE WHEN da.escalation_level > 0 THEN 1 END) as escalated_alerts
FROM downtime_alerts da
WHERE da.triggered_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY da.severity_level
ORDER BY 
    CASE da.severity_level 
        WHEN 'critical' THEN 1 
        WHEN 'high' THEN 2 
        WHEN 'medium' THEN 3 
        WHEN 'low' THEN 4 
    END;

COMMENT ON TABLE downtime_alert_configs IS 'Configuration for automatic downtime alert thresholds and escalation rules';
COMMENT ON TABLE downtime_alerts IS 'Main table for tracking downtime alert instances and their lifecycle';
COMMENT ON TABLE alert_notifications IS 'Log of all notification attempts and their delivery status';
COMMENT ON TABLE alert_escalation_rules IS 'Rules for automatic alert escalation based on time and severity';
COMMENT ON TABLE alert_metrics IS 'Performance metrics for alert response times and effectiveness';
COMMENT ON TABLE alert_templates IS 'Reusable message templates for consistent alert formatting';