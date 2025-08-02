-- Final fix for Alert System Schema

-- Add foreign key constraints without IF NOT EXISTS (not supported in older PostgreSQL)
ALTER TABLE downtime_alerts 
DROP CONSTRAINT IF EXISTS downtime_alerts_triggered_by_fkey,
ADD CONSTRAINT downtime_alerts_triggered_by_fkey 
FOREIGN KEY (triggered_by) REFERENCES users(id);

ALTER TABLE downtime_alerts 
DROP CONSTRAINT IF EXISTS downtime_alerts_resolved_by_fkey,
ADD CONSTRAINT downtime_alerts_resolved_by_fkey 
FOREIGN KEY (resolved_by) REFERENCES users(id);

-- Update the user role constraint to include 'system'
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check 
CHECK (role IN ('admin', 'supervisor', 'operator', 'viewer', 'packer', 'system'));

-- Create system user for background tasks
INSERT INTO users (username, email, password_hash, role, is_active, created_at)
VALUES ('system', 'system@localhost', 'system_hash', 'system', true, CURRENT_TIMESTAMP)
ON CONFLICT (username) DO NOTHING;

-- Insert default alert templates using system user
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

-- Create the performance summary view with correct column names
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
  AND da.triggered_at IS NOT NULL
GROUP BY da.severity_level
ORDER BY 
    CASE da.severity_level 
        WHEN 'critical' THEN 1 
        WHEN 'high' THEN 2 
        WHEN 'medium' THEN 3 
        WHEN 'low' THEN 4 
    END;