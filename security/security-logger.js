// Security Event Logging System
// Centralized logging for security events and monitoring

const fs = require('fs');
const path = require('path');

class SecurityLogger {
    constructor() {
        this.logDir = path.join(__dirname, '../logs/security');
        this.ensureLogDirectory();
        
        this.events = {
            AUTH_SUCCESS: 'auth_success',
            AUTH_FAILURE: 'auth_failure',
            AUTH_LOCKOUT: 'auth_lockout',
            TOKEN_EXPIRED: 'token_expired',
            TOKEN_INVALID: 'token_invalid',
            WEBSOCKET_AUTH_FAIL: 'websocket_auth_fail',
            RATE_LIMIT_HIT: 'rate_limit_hit',
            SUSPICIOUS_ACTIVITY: 'suspicious_activity',
            ADMIN_ACTION: 'admin_action',
            CONFIG_CHANGE: 'config_change',
            DATABASE_ERROR: 'database_error',
            FILE_UPLOAD: 'file_upload',
            SYSTEM_ERROR: 'system_error'
        };
    }

    // Ensure log directory exists
    ensureLogDirectory() {
        if (!fs.existsSync(this.logDir)) {
            fs.mkdirSync(this.logDir, { recursive: true });
        }
    }

    // Log security event
    logEvent(eventType, details = {}) {
        const timestamp = new Date().toISOString();
        const logEntry = {
            timestamp,
            event: eventType,
            level: this.getEventLevel(eventType),
            ...this.sanitizeDetails(details)
        };

        // Write to daily log file
        const logFile = this.getLogFile(eventType);
        const logLine = JSON.stringify(logEntry) + '\n';
        
        fs.appendFileSync(logFile, logLine);
        
        // Also log to console for development
        if (process.env.NODE_ENV !== 'production') {
            console.log(`🔐 Security Event: ${eventType}`, details);
        }
        
        // Check for critical events that need immediate attention
        if (this.isCriticalEvent(eventType)) {
            this.handleCriticalEvent(logEntry);
        }
    }

    // Get log file path for event
    getLogFile(eventType) {
        const today = new Date().toISOString().split('T')[0];
        const filename = `security-${today}.log`;
        return path.join(this.logDir, filename);
    }

    // Get event severity level
    getEventLevel(eventType) {
        const criticalEvents = [
            this.events.AUTH_LOCKOUT,
            this.events.SUSPICIOUS_ACTIVITY,
            this.events.ADMIN_ACTION,
            this.events.CONFIG_CHANGE
        ];
        
        const warningEvents = [
            this.events.AUTH_FAILURE,
            this.events.TOKEN_INVALID,
            this.events.WEBSOCKET_AUTH_FAIL,
            this.events.RATE_LIMIT_HIT
        ];
        
        if (criticalEvents.includes(eventType)) return 'CRITICAL';
        if (warningEvents.includes(eventType)) return 'WARNING';
        return 'INFO';
    }

    // Check if event is critical
    isCriticalEvent(eventType) {
        return this.getEventLevel(eventType) === 'CRITICAL';
    }

    // Handle critical security events
    handleCriticalEvent(logEntry) {
        console.error('🚨 CRITICAL SECURITY EVENT:', logEntry);
        
        // In production, this could send alerts to:
        // - Security team via email/Slack
        // - SIEM system
        // - Monitoring dashboard
        // - SMS alerts for admin actions
        
        // For now, just ensure it's prominently logged
        const alertFile = path.join(this.logDir, 'critical-events.log');
        const alertLine = JSON.stringify({
            ...logEntry,
            alert: true,
            notified: new Date().toISOString()
        }) + '\n';
        
        fs.appendFileSync(alertFile, alertLine);
    }

    // Sanitize sensitive details for logging
    sanitizeDetails(details) {
        const sanitized = { ...details };
        
        // Remove or mask sensitive fields
        const sensitiveFields = ['password', 'token', 'secret', 'key', 'authorization'];
        
        for (const field of sensitiveFields) {
            if (sanitized[field]) {
                sanitized[field] = '***MASKED***';
            }
        }
        
        // Mask partial information for others
        if (sanitized.username) {
            sanitized.username_masked = this.maskUsername(sanitized.username);
        }
        
        if (sanitized.ip) {
            sanitized.ip_masked = this.maskIP(sanitized.ip);
        }
        
        return sanitized;
    }

    // Mask username for privacy
    maskUsername(username) {
        if (username.length <= 2) return '***';
        return username[0] + '*'.repeat(username.length - 2) + username[username.length - 1];
    }

    // Mask IP address for privacy
    maskIP(ip) {
        const parts = ip.split('.');
        if (parts.length === 4) {
            return `${parts[0]}.${parts[1]}.***.**`;
        }
        return '***masked***';
    }

    // Log authentication success
    logAuthSuccess(username, ip, userAgent) {
        this.logEvent(this.events.AUTH_SUCCESS, {
            username,
            ip,
            userAgent,
            success: true
        });
    }

    // Log authentication failure
    logAuthFailure(username, ip, reason, userAgent) {
        this.logEvent(this.events.AUTH_FAILURE, {
            username,
            ip,
            reason,
            userAgent,
            success: false
        });
    }

    // Log account lockout
    logAccountLockout(username, ip, attemptCount) {
        this.logEvent(this.events.AUTH_LOCKOUT, {
            username,
            ip,
            attemptCount,
            action: 'account_locked'
        });
    }

    // Log admin action
    logAdminAction(adminUser, action, target, details = {}) {
        this.logEvent(this.events.ADMIN_ACTION, {
            admin: adminUser,
            action,
            target,
            ...details
        });
    }

    // Log configuration change
    logConfigChange(user, setting, oldValue, newValue) {
        this.logEvent(this.events.CONFIG_CHANGE, {
            user,
            setting,
            oldValue: oldValue ? '***SET***' : '***UNSET***',
            newValue: newValue ? '***SET***' : '***UNSET***'
        });
    }

    // Log suspicious activity
    logSuspiciousActivity(ip, activity, details = {}) {
        this.logEvent(this.events.SUSPICIOUS_ACTIVITY, {
            ip,
            activity,
            ...details
        });
    }

    // Log rate limit hit
    logRateLimitHit(ip, endpoint, limit) {
        this.logEvent(this.events.RATE_LIMIT_HIT, {
            ip,
            endpoint,
            limit
        });
    }

    // Get security statistics
    getSecurityStats(days = 7) {
        const stats = {
            authSuccesses: 0,
            authFailures: 0,
            lockouts: 0,
            suspiciousActivities: 0,
            rateLimitHits: 0,
            adminActions: 0
        };
        
        // Read log files for the specified period
        for (let i = 0; i < days; i++) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const logFile = path.join(this.logDir, `security-${date.toISOString().split('T')[0]}.log`);
            
            if (fs.existsSync(logFile)) {
                const content = fs.readFileSync(logFile, 'utf8');
                const lines = content.trim().split('\n').filter(line => line);
                
                lines.forEach(line => {
                    try {
                        const event = JSON.parse(line);
                        switch (event.event) {
                            case this.events.AUTH_SUCCESS:
                                stats.authSuccesses++;
                                break;
                            case this.events.AUTH_FAILURE:
                                stats.authFailures++;
                                break;
                            case this.events.AUTH_LOCKOUT:
                                stats.lockouts++;
                                break;
                            case this.events.SUSPICIOUS_ACTIVITY:
                                stats.suspiciousActivities++;
                                break;
                            case this.events.RATE_LIMIT_HIT:
                                stats.rateLimitHits++;
                                break;
                            case this.events.ADMIN_ACTION:
                                stats.adminActions++;
                                break;
                        }
                    } catch (error) {
                        // Skip malformed log lines
                    }
                });
            }
        }
        
        return stats;
    }

    // Clean up old log files
    cleanupOldLogs(retentionDays = 90) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
        
        const files = fs.readdirSync(this.logDir);
        let deletedCount = 0;
        
        files.forEach(file => {
            if (file.startsWith('security-') && file.endsWith('.log')) {
                const dateStr = file.replace('security-', '').replace('.log', '');
                const fileDate = new Date(dateStr);
                
                if (fileDate < cutoffDate) {
                    fs.unlinkSync(path.join(this.logDir, file));
                    deletedCount++;
                }
            }
        });
        
        if (deletedCount > 0) {
            console.log(`🗑️ Cleaned up ${deletedCount} old security log files`);
        }
    }
}

// Create singleton instance
const securityLogger = new SecurityLogger();

// Export both class and instance
module.exports = {
    SecurityLogger,
    securityLogger
};