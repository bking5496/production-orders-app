#!/usr/bin/env node

/**
 * Database Migration: Role-Based Crew Configuration
 * 
 * Adds columns for operators, hopper loaders, and packers per shift
 * Removes the generic crew_size column in favor of role-specific counts
 */

const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, 'production.db');

function runMigration() {
    console.log('🚀 Starting Role-Based Crew Configuration Migration...');
    
    const db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    
    try {
        // Begin transaction
        db.exec('BEGIN TRANSACTION');
        
        console.log('📝 Adding role-based crew columns to machines table...');
        
        // Check if columns already exist
        const machinesInfo = db.prepare("PRAGMA table_info(machines)").all();
        const existingColumns = machinesInfo.map(col => col.name);
        
        if (!existingColumns.includes('operators_per_shift')) {
            db.exec(`
                ALTER TABLE machines 
                ADD COLUMN operators_per_shift INTEGER DEFAULT 2
            `);
            console.log('   ✅ Added operators_per_shift column');
        } else {
            console.log('   ⚠️  operators_per_shift column already exists');
        }
        
        if (!existingColumns.includes('hopper_loaders_per_shift')) {
            db.exec(`
                ALTER TABLE machines 
                ADD COLUMN hopper_loaders_per_shift INTEGER DEFAULT 1
            `);
            console.log('   ✅ Added hopper_loaders_per_shift column');
        } else {
            console.log('   ⚠️  hopper_loaders_per_shift column already exists');
        }
        
        if (!existingColumns.includes('packers_per_shift')) {
            db.exec(`
                ALTER TABLE machines 
                ADD COLUMN packers_per_shift INTEGER DEFAULT 3
            `);
            console.log('   ✅ Added packers_per_shift column');
        } else {
            console.log('   ⚠️  packers_per_shift column already exists');
        }
        
        // Update existing machines with default values
        console.log('📝 Setting default values for existing machines...');
        
        const updateResult = db.prepare(`
            UPDATE machines 
            SET operators_per_shift = COALESCE(operators_per_shift, 2),
                hopper_loaders_per_shift = COALESCE(hopper_loaders_per_shift, 1),
                packers_per_shift = COALESCE(packers_per_shift, 3)
            WHERE operators_per_shift IS NULL 
                OR hopper_loaders_per_shift IS NULL 
                OR packers_per_shift IS NULL
        `).run();
        
        console.log(`   ✅ Updated ${updateResult.changes} machines with default role counts`);
        
        // Commit transaction
        db.exec('COMMIT');
        
        console.log('🎉 Migration completed successfully!');
        console.log('');
        console.log('📊 Migration Summary:');
        console.log('   • Added operators_per_shift column (default: 2)');
        console.log('   • Added hopper_loaders_per_shift column (default: 1)');
        console.log('   • Added packers_per_shift column (default: 3)');
        console.log('   • Updated existing machines with default values');
        
        // Display current database stats
        console.log('');
        console.log('📈 Database Statistics:');
        
        const machineCount = db.prepare('SELECT COUNT(*) as count FROM machines').get();
        console.log(`   • Total machines: ${machineCount.count}`);
        
        const roleStats = db.prepare(`
            SELECT 
                AVG(operators_per_shift) as avg_operators,
                AVG(hopper_loaders_per_shift) as avg_loaders,
                AVG(packers_per_shift) as avg_packers,
                AVG(operators_per_shift + hopper_loaders_per_shift + packers_per_shift) as avg_total
            FROM machines
        `).get();
        
        console.log(`   • Average operators per shift: ${roleStats.avg_operators.toFixed(1)}`);
        console.log(`   • Average hopper loaders per shift: ${roleStats.avg_loaders.toFixed(1)}`);
        console.log(`   • Average packers per shift: ${roleStats.avg_packers.toFixed(1)}`);
        console.log(`   • Average total workforce per shift: ${roleStats.avg_total.toFixed(1)}`);
        
    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        console.error('📝 Rolling back changes...');
        db.exec('ROLLBACK');
        throw error;
    } finally {
        db.close();
    }
}

// Run migration if called directly
if (require.main === module) {
    try {
        runMigration();
        process.exit(0);
    } catch (error) {
        console.error('💥 Migration script failed:', error.message);
        process.exit(1);
    }
}

module.exports = { runMigration };