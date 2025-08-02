// Security Configuration Module
// Centralized security settings and validation

const { getSecret } = require('./secrets-manager');

// Security policy configuration
const SECURITY_POLICIES = {
    // Authentication settings
    auth: {
        JWT_EXPIRY: '24h',
        JWT_REFRESH_THRESHOLD: '1h',
        MAX_LOGIN_ATTEMPTS: 5,
        LOCKOUT_DURATION: 15 * 60 * 1000, // 15 minutes
        PASSWORD_MIN_LENGTH: 8,
        PASSWORD_REQUIRE_SPECIAL: true,
        PASSWORD_REQUIRE_NUMBERS: true,
        PASSWORD_REQUIRE_UPPERCASE: true,
        MFA_REQUIRED_ROLES: ['admin', 'supervisor']
    },
    
    // Rate limiting settings
    rateLimit: {
        GENERAL_WINDOW: 15 * 60 * 1000, // 15 minutes
        GENERAL_MAX: 100,
        LOGIN_WINDOW: 15 * 60 * 1000,
        LOGIN_MAX: 5,
        API_WINDOW: 60 * 1000, // 1 minute
        API_MAX: 60,
        WEBSOCKET_MESSAGE_RATE: 10 // messages per second
    },
    
    // Session management
    session: {
        COOKIE_SECURE: process.env.NODE_ENV === 'production',
        COOKIE_HTTP_ONLY: true,
        COOKIE_SAME_SITE: 'strict',
        SESSION_TIMEOUT: 24 * 60 * 60 * 1000, // 24 hours
        IDLE_TIMEOUT: 2 * 60 * 60 * 1000 // 2 hours
    },
    
    // Database security
    database: {
        CONNECTION_TIMEOUT: 10000,
        QUERY_TIMEOUT: 30000,
        MAX_CONNECTIONS: 10,
        SSL_REQUIRED: process.env.NODE_ENV === 'production',
        BACKUP_ENCRYPTION: true
    },
    
    // WebSocket security
    websocket: {
        ORIGIN_CHECK: true,
        RATE_LIMIT_MESSAGES: 100, // per minute
        HEARTBEAT_INTERVAL: 30000,
        CONNECTION_TIMEOUT: 10000,
        MAX_CONNECTIONS_PER_IP: 5
    },
    
    // File upload security
    upload: {
        MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
        ALLOWED_TYPES: [
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-excel',
            'text/csv'
        ],
        SCAN_FOR_MALWARE: process.env.NODE_ENV === 'production',
        QUARANTINE_SUSPICIOUS: true
    },
    
    // Logging and monitoring
    logging: {
        LOG_LEVEL: process.env.LOG_LEVEL || 'info',
        LOG_FAILED_LOGINS: true,
        LOG_ADMIN_ACTIONS: true,
        LOG_SENSITIVE_OPERATIONS: true,
        AUDIT_TRAIL: true,
        LOG_RETENTION_DAYS: 90
    },
    
    // CORS settings
    cors: {
        ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
        ALLOWED_METHODS: ['GET', 'POST', 'PUT', 'DELETE'],
        ALLOWED_HEADERS: ['Content-Type', 'Authorization', 'X-Requested-With'],
        CREDENTIALS: true,
        MAX_AGE: 86400 // 24 hours
    },
    
    // Content Security Policy
    csp: {
        DEFAULT_SRC: ["'self'"],
        SCRIPT_SRC: [
            "'self'",
            "'unsafe-inline'", // TODO: Remove in production, use nonces
            "https://cdn.tailwindcss.com",
            "https://unpkg.com",
            "https://cdnjs.cloudflare.com"
        ],
        STYLE_SRC: ["'self'", "'unsafe-inline'"],
        IMG_SRC: ["'self'", "data:", "https:"],
        CONNECT_SRC: ["'self'", "ws:", "wss:"],
        FONT_SRC: ["'self'", "https:"],
        OBJECT_SRC: ["'none'"],
        MEDIA_SRC: ["'self'"]
    }
};

// Security validation functions
const SecurityValidation = {
    // Validate password strength
    validatePassword(password) {
        const policy = SECURITY_POLICIES.auth;
        const errors = [];
        
        if (password.length < policy.PASSWORD_MIN_LENGTH) {
            errors.push(`Password must be at least ${policy.PASSWORD_MIN_LENGTH} characters`);
        }
        
        if (policy.PASSWORD_REQUIRE_UPPERCASE && !/[A-Z]/.test(password)) {
            errors.push('Password must contain at least one uppercase letter');
        }
        
        if (policy.PASSWORD_REQUIRE_NUMBERS && !/\d/.test(password)) {
            errors.push('Password must contain at least one number');
        }
        
        if (policy.PASSWORD_REQUIRE_SPECIAL && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
            errors.push('Password must contain at least one special character');
        }
        
        return {
            valid: errors.length === 0,
            errors
        };
    },
    
    // Validate user input for XSS/injection
    sanitizeInput(input) {
        if (typeof input !== 'string') return input;
        
        return input
            .replace(/[<>]/g, '') // Remove potential HTML tags
            .replace(/['"]/g, '') // Remove quotes that could break SQL
            .trim();
    },
    
    // Validate file upload
    validateUpload(file) {
        const policy = SECURITY_POLICIES.upload;
        const errors = [];
        
        if (file.size > policy.MAX_FILE_SIZE) {
            errors.push(`File size exceeds ${policy.MAX_FILE_SIZE / 1024 / 1024}MB limit`);
        }
        
        if (!policy.ALLOWED_TYPES.includes(file.mimetype)) {
            errors.push('File type not allowed');
        }
        
        return {
            valid: errors.length === 0,
            errors
        };
    },
    
    // Validate WebSocket origin
    validateWebSocketOrigin(origin, allowedOrigins = null) {
        const allowed = allowedOrigins || SECURITY_POLICIES.cors.ALLOWED_ORIGINS;
        return allowed.includes(origin) || allowed.includes('*');
    }
};

// Security utilities
const SecurityUtils = {
    // Generate secure random string
    generateSecureRandom(length = 32) {
        const crypto = require('crypto');
        return crypto.randomBytes(length).toString('base64');
    },
    
    // Hash sensitive data
    hashSensitiveData(data) {
        const crypto = require('crypto');
        return crypto.createHash('sha256').update(data).digest('hex');
    },
    
    // Mask sensitive data for logging
    maskSensitiveData(data, fields = ['password', 'token', 'secret', 'key']) {
        if (typeof data !== 'object' || data === null) return data;
        
        const masked = { ...data };
        
        for (const field of fields) {
            if (masked[field]) {
                masked[field] = '***MASKED***';
            }
        }
        
        return masked;
    },
    
    // Check if IP is suspicious (basic implementation)
    isIPSuspicious(ip) {
        // TODO: Implement real IP reputation checking
        const suspiciousIPs = [];
        return suspiciousIPs.includes(ip);
    },
    
    // Rate limiting key generator
    generateRateLimitKey(req, type = 'general') {
        const ip = req.ip || req.connection.remoteAddress;
        const user = req.user?.id || 'anonymous';
        return `${type}:${ip}:${user}`;
    }
};

// Export configuration and utilities
module.exports = {
    SECURITY_POLICIES,
    SecurityValidation,
    SecurityUtils,
    
    // Quick access to common settings
    getJWTSecret: () => getSecret('JWT_SECRET') || process.env.JWT_SECRET,
    getDBPassword: () => getSecret('DB_PASSWORD') || process.env.DB_PASSWORD,
    getSessionSecret: () => getSecret('SESSION_SECRET') || process.env.SESSION_SECRET,
    
    // Security headers middleware
    getSecurityHeaders: () => ({
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block',
        'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'Permissions-Policy': 'camera=(), microphone=(), geolocation=()'
    })
};