-- Fix Alert System Schema to Match Existing Structure
-- Update existing tables and add missing columns

-- First, drop the incorrectly created indexes
DROP INDEX IF EXISTS idx_downtime_alerts_severity;
DROP INDEX IF EXISTS idx_downtime_alerts_triggered_at;
DROP INDEX IF EXISTS idx_downtime_alerts_downtime_stop;

-- Update downtime_alerts table to match our new requirements
-- Add missing columns
ALTER TABLE downtime_alerts 
ADD COLUMN IF NOT EXISTS downtime_stop_id INTEGER,
ADD COLUMN IF NOT EXISTS severity_level VARCHAR(20) DEFAULT 'medium',
ADD COLUMN IF NOT EXISTS escalation_level INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS triggered_by INTEGER,
ADD COLUMN IF NOT EXISTS triggered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS resolved_by INTEGER,
ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS acknowledgment_notes TEXT,
ADD COLUMN IF NOT EXISTS resolution_notes TEXT,
ADD COLUMN IF NOT EXISTS resolution_action VARCHAR(100),
ADD COLUMN IF NOT EXISTS escalated_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Update existing data to use new column names
UPDATE downtime_alerts SET 
    downtime_stop_id = downtime_id,
    severity_level = severity,
    triggered_at = created_at
WHERE downtime_stop_id IS NULL;

-- Add missing check constraints
ALTER TABLE downtime_alerts 
DROP CONSTRAINT IF EXISTS downtime_alerts_alert_type_check,
ADD CONSTRAINT downtime_alerts_alert_type_check 
CHECK (alert_type IN ('immediate', 'threshold_exceeded', 'escalation', 'new_downtime', 'duration_exceeded', 'critical_failure', 'approval_required'));

ALTER TABLE downtime_alerts
DROP CONSTRAINT IF EXISTS downtime_alerts_severity_level_check,
ADD CONSTRAINT downtime_alerts_severity_level_check 
CHECK (severity_level IN ('critical', 'high', 'medium', 'low'));

-- Add foreign key constraints for user references
ALTER TABLE downtime_alerts 
ADD CONSTRAINT IF NOT EXISTS downtime_alerts_triggered_by_fkey 
FOREIGN KEY (triggered_by) REFERENCES users(id);

ALTER TABLE downtime_alerts 
ADD CONSTRAINT IF NOT EXISTS downtime_alerts_resolved_by_fkey 
FOREIGN KEY (resolved_by) REFERENCES users(id);

-- Create proper indexes
CREATE INDEX IF NOT EXISTS idx_downtime_alerts_severity_level ON downtime_alerts(severity_level);
CREATE INDEX IF NOT EXISTS idx_downtime_alerts_triggered_at ON downtime_alerts(triggered_at);
CREATE INDEX IF NOT EXISTS idx_downtime_alerts_downtime_stop_id ON downtime_alerts(downtime_stop_id);

-- Add severity_level column to downtime_categories if it doesn't exist
ALTER TABLE downtime_categories 
ADD COLUMN IF NOT EXISTS severity_level VARCHAR(20) DEFAULT 'medium';

-- Update existing categories with appropriate severity levels
UPDATE downtime_categories SET severity_level = 
    CASE 
        WHEN category_code IN ('machine_failure', 'safety_incident', 'power_outage') THEN 'critical'
        WHEN category_code IN ('tooling_issue', 'quality_issue', 'material_shortage') THEN 'high'
        WHEN category_code IN ('changeover', 'maintenance') THEN 'medium'
        ELSE 'low'
    END
WHERE severity_level = 'medium';

-- Add name column to downtime_categories (alias for category_name)
ALTER TABLE downtime_categories 
ADD COLUMN IF NOT EXISTS name VARCHAR(100);

UPDATE downtime_categories SET name = category_name WHERE name IS NULL;

-- Insert default alert configurations using existing category structure
INSERT INTO downtime_alert_configs (category_id, severity_level, threshold_minutes, auto_escalate, escalation_delay_minutes, notify_roles, notification_channels, description)
SELECT 
    dc.id,
    'critical',
    5,  -- 5 minute threshold for critical
    true,
    15, -- 15 minute escalation delay
    '["admin", "supervisor"]',
    '["websocket", "email"]',
    'Critical downtime alert for ' || dc.category_name
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
    'High priority downtime alert for ' || dc.category_name
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
    'Medium priority downtime alert for ' || dc.category_name
FROM downtime_categories dc
WHERE dc.severity_level = 'medium'
ON CONFLICT (category_id, severity_level) DO NOTHING;

-- Create system user for background tasks if it doesn't exist
INSERT INTO users (username, email, role, active, created_at)
VALUES ('system', 'system@localhost', 'system', true, CURRENT_TIMESTAMP)
ON CONFLICT (username) DO NOTHING;

-- Get system user ID for template creation
INSERT INTO alert_templates (template_name, alert_type, message_template, variables, created_by)
SELECT 
    'critical_immediate', 
    'immediate', 
    'CRITICAL DOWNTIME: {{category_name}} on {{machine_name}} - {{primary_cause}}', 
    '["category_name", "machine_name", "primary_cause"]', 
    u.id
FROM users u WHERE u.username = 'system'
ON CONFLICT (template_name) DO NOTHING;

INSERT INTO alert_templates (template_name, alert_type, message_template, variables, created_by)
SELECT 
    'threshold_exceeded', 
    'threshold_exceeded', 
    'THRESHOLD EXCEEDED: {{category_name}} downtime has been active for {{duration_minutes}} minutes (threshold: {{threshold_minutes}} min)', 
    '["category_name", "duration_minutes", "threshold_minutes"]', 
    u.id
FROM users u WHERE u.username = 'system'
ON CONFLICT (template_name) DO NOTHING;

INSERT INTO alert_templates (template_name, alert_type, message_template, variables, created_by)
SELECT 
    'escalation_alert', 
    'escalation', 
    'ESCALATED ALERT: {{category_name}} downtime requires immediate attention - Level {{escalation_level}}', 
    '["category_name", "escalation_level"]', 
    u.id
FROM users u WHERE u.username = 'system'
ON CONFLICT (template_name) DO NOTHING;

-- Update the performance summary view to use correct column names
DROP VIEW IF EXISTS alert_performance_summary;
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