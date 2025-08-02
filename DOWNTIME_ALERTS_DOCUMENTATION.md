# Real-Time Downtime Alerts System Documentation

## Overview
The Real-Time Downtime Alerts System provides comprehensive alerting, escalation, and notification management for production downtime incidents. It integrates seamlessly with the existing WebSocket infrastructure and downtime tracking capabilities.

## System Architecture

### Core Components
1. **Alert Configuration Management** - Configurable thresholds and escalation rules
2. **Real-Time Alert Triggers** - Immediate and threshold-based alerting
3. **Alert Lifecycle Management** - Acknowledgment and resolution tracking
4. **Automatic Monitoring** - Background threshold monitoring
5. **Targeted Notifications** - Role-based notification system
6. **Escalation Management** - Automatic escalation with configurable delays

## Database Schema

### Key Tables Created
- `downtime_alert_configs` - Alert configuration and thresholds
- `downtime_alerts` - Main alert instances and lifecycle tracking
- `alert_notifications` - Notification delivery logs
- `alert_escalation_rules` - Escalation rules and delays
- `alert_metrics` - Performance metrics for response times
- `alert_templates` - Reusable message templates

### Enhanced Existing Tables
- Added `severity_level` and `name` columns to `downtime_categories`
- Updated `downtime_alerts` with comprehensive tracking fields
- Added foreign key relationships for user tracking

## API Endpoints

### Alert Configuration
- `POST /api/alerts/downtime/config` - Create/update alert configurations
- `GET /api/alerts/downtime/config` - Retrieve alert configurations

### Alert Management
- `POST /api/alerts/downtime/trigger` - Manually trigger alerts
- `POST /api/alerts/downtime/:alertId/acknowledge` - Acknowledge alerts
- `POST /api/alerts/downtime/:alertId/resolve` - Resolve alerts
- `GET /api/alerts/downtime/active` - Get currently active alerts
- `GET /api/alerts/downtime/history` - Get alert history with filters

### Monitoring
- `POST /api/alerts/downtime/monitor` - Background monitoring endpoint

## Alert Types

### 1. Immediate Alerts
- Triggered manually for critical incidents
- Instant notification to configured roles
- No threshold requirements

### 2. Threshold Exceeded Alerts
- Automatically triggered when downtime duration exceeds configured thresholds
- Different thresholds for different severity levels:
  - **Critical**: 5 minutes
  - **High**: 15 minutes
  - **Medium**: 30 minutes
  - **Low**: No automatic alerts

### 3. Escalation Alerts
- Triggered when alerts remain unacknowledged for specified periods
- Automatic escalation to higher-level roles
- Configurable escalation delays

## Severity Levels and Default Configurations

### Critical (Red)
- **Threshold**: 5 minutes
- **Auto-escalate**: Yes (15 minutes)
- **Notify**: Admin, Supervisor
- **Channels**: WebSocket, Email

### High (Orange)
- **Threshold**: 15 minutes
- **Auto-escalate**: Yes (30 minutes)
- **Notify**: Supervisor, Operator
- **Channels**: WebSocket

### Medium (Yellow)
- **Threshold**: 30 minutes
- **Auto-escalate**: No
- **Notify**: Supervisor
- **Channels**: WebSocket

### Low (Green)
- **Threshold**: None
- **Auto-escalate**: No
- **Notify**: None
- **Channels**: None

## WebSocket Events

### Alert Events
- `downtime_alert` - New alert triggered
- `targeted_downtime_alert` - Role-specific alert notification
- `alert_acknowledged` - Alert acknowledged by user
- `alert_resolved` - Alert resolved by supervisor
- `alert_escalated` - Alert escalated to next level

## Alert Lifecycle

### 1. Creation
- Alert is created either manually or automatically when thresholds are exceeded
- Initial status: `active`
- WebSocket notification sent to all relevant users

### 2. Acknowledgment
- Any operator, supervisor, or admin can acknowledge alerts
- Status changes to `acknowledged`
- Acknowledgment notes can be added
- WebSocket notification sent

### 3. Resolution
- Only supervisors and admins can resolve alerts
- Status changes to `resolved`
- Resolution notes and actions are recorded
- WebSocket notification sent

### 4. Escalation (Optional)
- Automatic escalation occurs if configured and alert remains unacknowledged
- Escalation level increments
- Additional notifications sent to higher-level roles

## Performance Monitoring

### Alert Performance Summary View
```sql
SELECT 
    severity_level,
    total_alerts,
    resolved_alerts,
    avg_acknowledgment_time_minutes,
    avg_resolution_time_minutes,
    escalated_alerts
FROM alert_performance_summary;
```

### Key Metrics Tracked
- **Response Time**: Time from trigger to acknowledgment
- **Resolution Time**: Time from trigger to resolution
- **Escalation Rate**: Percentage of alerts that require escalation
- **Notification Delivery**: Success/failure rates for different channels

## Integration Points

### WebSocket Integration
- All alert events broadcast to connected clients
- Real-time updates for alert status changes
- Environment-specific subscriptions supported

### Enhanced Workflow Integration
- Alerts can be triggered from downtime recording endpoints
- Integration with existing production workflow
- Automatic categorization based on downtime type

### Analytics Integration
- Alert data feeds into downtime analytics reports
- Performance metrics available in dashboards
- Historical trend analysis for alert patterns

## Configuration Examples

### Setting Up Critical Equipment Alerts
```json
{
  "category_id": 1,
  "severity_level": "critical",
  "threshold_minutes": 3,
  "auto_escalate": true,
  "escalation_delay_minutes": 10,
  "notify_roles": ["admin", "supervisor", "maintenance"],
  "notification_channels": ["websocket", "email", "sms"],
  "description": "Critical production line failure"
}
```

### Background Monitoring Setup
The system includes automatic monitoring that runs periodically to check for threshold violations:
- Checks all active downtime incidents
- Compares duration against configured thresholds
- Triggers alerts for threshold violations
- Prevents duplicate alerts for the same incident

## Security and Permissions

### Role-Based Access
- **Admin**: Full access to all alert management
- **Supervisor**: Can resolve alerts, view all alerts
- **Operator**: Can acknowledge alerts, trigger immediate alerts
- **Viewer**: Read-only access to alert history
- **System**: Background monitoring and automatic triggers

### Authentication Required
All endpoints require valid JWT authentication and appropriate role permissions.

## Future Enhancements

### Planned Features
1. **Email Integration** - SMTP-based email notifications
2. **SMS Integration** - Text message alerts for critical incidents
3. **Push Notifications** - Mobile app notifications
4. **Alert Analytics Dashboard** - Visual performance metrics
5. **Machine Learning** - Predictive alerting based on patterns
6. **Integration APIs** - Third-party system integrations

### Extension Points
- Custom notification channels
- Advanced escalation rules
- Alert correlation and grouping
- Maintenance window suppression
- Dynamic threshold adjustment

## Usage Examples

### Triggering Manual Alert
```javascript
// Trigger immediate critical alert
const response = await fetch('/api/alerts/downtime/trigger', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    downtime_stop_id: 123,
    alert_type: 'immediate',
    custom_message: 'Critical machine failure requires immediate attention'
  })
});
```

### Acknowledging Alert
```javascript
// Acknowledge alert with notes
const response = await fetch('/api/alerts/downtime/456/acknowledge', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    acknowledgment_notes: 'Investigating root cause, ETA 15 minutes'
  })
});
```

### WebSocket Alert Handling
```javascript
// Listen for real-time alerts
websocket.on('downtime_alert', (alertData) => {
  if (alertData.severity_level === 'critical') {
    showCriticalAlert(alertData);
    playAlertSound();
  }
  updateAlertDashboard(alertData);
});
```

## Troubleshooting

### Common Issues
1. **Alerts not triggering**: Check alert configurations and thresholds
2. **Notifications not delivered**: Verify WebSocket connections and user roles
3. **Escalation not working**: Check escalation delay settings and user permissions
4. **Database errors**: Ensure all required tables exist and foreign keys are valid

### Performance Considerations
- Alert monitoring runs as background task to avoid blocking main operations
- Database indexes optimize alert queries for real-time performance
- WebSocket connections are managed efficiently to handle multiple concurrent alerts

## Conclusion

The Real-Time Downtime Alerts System provides a comprehensive solution for managing production incidents with configurable thresholds, automatic escalation, and multi-channel notifications. It integrates seamlessly with the existing production management system while providing the flexibility to adapt to different operational requirements.