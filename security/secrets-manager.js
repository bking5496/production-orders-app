// Basic Secrets Management Module
// Production systems should use enterprise solutions like HashiCorp Vault, AWS Secrets Manager, etc.

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

class SecretsManager {
    constructor() {
        this.secretsFile = path.join(__dirname, '.secrets.enc');
        this.keyFile = path.join(__dirname, '.secret.key');
        this.algorithm = 'aes-256-gcm';
        this.keyLength = 32;
        this.ivLength = 16;
        this.tagLength = 16;
        
        this.initializeSecrets();
    }

    // Initialize secrets management
    initializeSecrets() {
        // Generate master key if it doesn't exist
        if (!fs.existsSync(this.keyFile)) {
            this.generateMasterKey();
        }
        
        // Create secrets file if it doesn't exist
        if (!fs.existsSync(this.secretsFile)) {
            this.initializeSecretsFile();
        }
    }

    // Generate a secure master key
    generateMasterKey() {
        const key = crypto.randomBytes(this.keyLength);
        fs.writeFileSync(this.keyFile, key);
        fs.chmodSync(this.keyFile, 0o600); // Read-write for owner only
        console.log('🔐 Master encryption key generated');
    }

    // Get the master key
    getMasterKey() {
        if (!fs.existsSync(this.keyFile)) {
            throw new Error('Master key not found. Run initializeSecrets() first.');
        }
        return fs.readFileSync(this.keyFile);
    }

    // Encrypt data
    encrypt(plaintext) {
        const key = this.getMasterKey();
        const iv = crypto.randomBytes(this.ivLength);
        const cipher = crypto.createCipheriv(this.algorithm, key, iv);
        
        let encrypted = cipher.update(plaintext, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        
        const tag = cipher.getAuthTag();
        
        return {
            encrypted,
            iv: iv.toString('hex'),
            tag: tag.toString('hex')
        };
    }

    // Decrypt data
    decrypt(encryptedData) {
        const key = this.getMasterKey();
        const { encrypted, iv, tag } = encryptedData;
        
        try {
            const decipher = crypto.createDecipheriv(this.algorithm, key, Buffer.from(iv, 'hex'));
            decipher.setAuthTag(Buffer.from(tag, 'hex'));
            
            let decrypted = decipher.update(encrypted, 'hex', 'utf8');
            decrypted += decipher.final('utf8');
            
            return decrypted;
        } catch (error) {
            throw new Error(`Decryption failed: ${error.message}`);
        }
    }

    // Store a secret
    storeSecret(name, value) {
        const secrets = this.loadSecrets();
        const encryptedValue = this.encrypt(value);
        
        secrets[name] = {
            ...encryptedValue,
            timestamp: new Date().toISOString(),
            version: 1
        };
        
        this.saveSecrets(secrets);
        console.log(`🔒 Secret '${name}' stored securely`);
    }

    // Retrieve a secret
    getSecret(name) {
        const secrets = this.loadSecrets();
        
        if (!secrets[name]) {
            throw new Error(`Secret '${name}' not found`);
        }
        
        try {
            return this.decrypt(secrets[name]);
        } catch (error) {
            throw new Error(`Failed to decrypt secret '${name}': ${error.message}`);
        }
    }

    // List all secret names (not values)
    listSecrets() {
        const secrets = this.loadSecrets();
        return Object.keys(secrets).map(name => ({
            name,
            timestamp: secrets[name].timestamp,
            version: secrets[name].version
        }));
    }

    // Delete a secret
    deleteSecret(name) {
        const secrets = this.loadSecrets();
        
        if (!secrets[name]) {
            throw new Error(`Secret '${name}' not found`);
        }
        
        delete secrets[name];
        this.saveSecrets(secrets);
        console.log(`🗑️ Secret '${name}' deleted`);
    }

    // Load secrets from encrypted file
    loadSecrets() {
        if (!fs.existsSync(this.secretsFile)) {
            return {};
        }
        
        try {
            const encryptedData = fs.readFileSync(this.secretsFile, 'utf8');
            if (!encryptedData.trim()) {
                return {};
            }
            
            return JSON.parse(encryptedData);
        } catch (error) {
            console.error('Failed to load secrets:', error.message);
            return {};
        }
    }

    // Save secrets to encrypted file
    saveSecrets(secrets) {
        const data = JSON.stringify(secrets, null, 2);
        fs.writeFileSync(this.secretsFile, data);
        fs.chmodSync(this.secretsFile, 0o600); // Read-write for owner only
    }

    // Initialize the secrets file with basic structure
    initializeSecretsFile() {
        this.saveSecrets({});
        console.log('🔐 Secrets file initialized');
    }

    // Rotate master key (for advanced security)
    rotateMasterKey() {
        console.log('🔄 Rotating master key...');
        
        // Load all secrets with old key
        const secrets = this.loadSecrets();
        const decryptedSecrets = {};
        
        // Decrypt all secrets with old key
        for (const [name, data] of Object.entries(secrets)) {
            try {
                decryptedSecrets[name] = this.decrypt(data);
            } catch (error) {
                console.error(`Failed to decrypt ${name} during rotation:`, error.message);
            }
        }
        
        // Generate new master key
        this.generateMasterKey();
        
        // Re-encrypt all secrets with new key
        const newSecrets = {};
        for (const [name, value] of Object.entries(decryptedSecrets)) {
            const encrypted = this.encrypt(value);
            newSecrets[name] = {
                ...encrypted,
                timestamp: new Date().toISOString(),
                version: (secrets[name]?.version || 0) + 1
            };
        }
        
        this.saveSecrets(newSecrets);
        console.log('✅ Master key rotation completed');
    }

    // Export secrets for backup (encrypted)
    exportSecrets() {
        const secrets = this.loadSecrets();
        return {
            secrets,
            metadata: {
                exported: new Date().toISOString(),
                version: '1.0.0',
                algorithm: this.algorithm
            }
        };
    }

    // Health check
    healthCheck() {
        try {
            // Test encryption/decryption
            const testData = 'health-check-' + Date.now();
            const encrypted = this.encrypt(testData);
            const decrypted = this.decrypt(encrypted);
            
            if (decrypted !== testData) {
                throw new Error('Encryption/decryption test failed');
            }
            
            return {
                status: 'healthy',
                secretsCount: Object.keys(this.loadSecrets()).length,
                keyExists: fs.existsSync(this.keyFile),
                secretsFileExists: fs.existsSync(this.secretsFile)
            };
        } catch (error) {
            return {
                status: 'unhealthy',
                error: error.message
            };
        }
    }
}

// Singleton instance
const secretsManager = new SecretsManager();

// Utility functions for easy access
const getSecret = (name) => {
    try {
        return secretsManager.getSecret(name);
    } catch (error) {
        // Fall back to environment variable if secret not found
        return process.env[name] || null;
    }
};

const setSecret = (name, value) => {
    secretsManager.storeSecret(name, value);
};

module.exports = {
    SecretsManager,
    secretsManager,
    getSecret,
    setSecret
};