#!/usr/bin/env node

// Security Initialization Script
// Run this script to set up initial security configuration

const { secretsManager } = require('./secrets-manager');
const crypto = require('crypto');

async function initializeSecurity() {
    console.log('🔐 Initializing security configuration...');
    
    try {
        // Check health of secrets manager
        const health = secretsManager.healthCheck();
        console.log('Secrets Manager Health:', health);
        
        if (health.status !== 'healthy') {
            console.error('❌ Secrets manager is not healthy:', health.error);
            process.exit(1);
        }
        
        // Store critical secrets if they don't exist
        const secrets = secretsManager.listSecrets();
        const existingSecretNames = secrets.map(s => s.name);
        
        // Generate JWT secret if not exists
        if (!existingSecretNames.includes('JWT_SECRET')) {
            const jwtSecret = crypto.randomBytes(64).toString('base64');
            secretsManager.storeSecret('JWT_SECRET', jwtSecret);
            console.log('✅ JWT_SECRET generated and stored');
        }
        
        // Generate database password if not exists
        if (!existingSecretNames.includes('DB_PASSWORD')) {
            const dbPassword = crypto.randomBytes(32).toString('base64');
            secretsManager.storeSecret('DB_PASSWORD', dbPassword);
            console.log('✅ DB_PASSWORD generated and stored');
        }
        
        // Generate session secret if not exists
        if (!existingSecretNames.includes('SESSION_SECRET')) {
            const sessionSecret = crypto.randomBytes(32).toString('base64');
            secretsManager.storeSecret('SESSION_SECRET', sessionSecret);
            console.log('✅ SESSION_SECRET generated and stored');
        }
        
        // Generate API keys for external integrations
        if (!existingSecretNames.includes('API_ENCRYPTION_KEY')) {
            const apiKey = crypto.randomBytes(32).toString('base64');
            secretsManager.storeSecret('API_ENCRYPTION_KEY', apiKey);
            console.log('✅ API_ENCRYPTION_KEY generated and stored');
        }
        
        console.log('\n🔒 Current secrets:');
        secretsManager.listSecrets().forEach(secret => {
            console.log(`  - ${secret.name} (${secret.timestamp})`);
        });
        
        console.log('\n✅ Security initialization completed successfully!');
        console.log('\n⚠️  IMPORTANT SECURITY NOTES:');
        console.log('1. The master encryption key is stored in security/.secret.key');
        console.log('2. Back up this key securely - it cannot be recovered if lost');
        console.log('3. Set proper file permissions (600) on all security files');
        console.log('4. In production, consider using enterprise secrets management');
        console.log('5. Rotate secrets regularly using the secrets manager');
        
    } catch (error) {
        console.error('❌ Security initialization failed:', error.message);
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    initializeSecurity();
}

module.exports = { initializeSecurity };