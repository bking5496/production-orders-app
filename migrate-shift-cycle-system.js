#!/usr/bin/env node

/**
 * Database Migration: 2-2-2 Shift Cycle System
 * 
 * This migration adds support for automatic crew rotation with the 2-2-2 pattern:
 * - 2 days on day shift
 * - 2 days on night shift  
 * - 2 days rest
 * - Cycle repeats with 3 staggered crews for 24/7 coverage
 * 
 * Usage: node migrate-shift-cycle-system.js
 */

const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, 'production.db');

function runMigration() {
    console.log('🚀 Starting 2-2-2 Shift Cycle System Migration...');
    
    const db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    
    try {
        // Begin transaction
        db.exec('BEGIN TRANSACTION');
        
        console.log('📝 Step 1: Adding shift cycle columns to machines table...');
        
        // Check if columns already exist
        const machinesInfo = db.prepare("PRAGMA table_info(machines)").all();
        const existingColumns = machinesInfo.map(col => col.name);
        
        if (!existingColumns.includes('shift_cycle_enabled')) {
            db.exec(`
                ALTER TABLE machines 
                ADD COLUMN shift_cycle_enabled BOOLEAN DEFAULT 0
            `);
            console.log('   ✅ Added shift_cycle_enabled column');
        } else {
            console.log('   ⚠️  shift_cycle_enabled column already exists');
        }
        
        if (!existingColumns.includes('cycle_start_date')) {
            db.exec(`
                ALTER TABLE machines 
                ADD COLUMN cycle_start_date DATE
            `);
            console.log('   ✅ Added cycle_start_date column');
        } else {
            console.log('   ⚠️  cycle_start_date column already exists');
        }
        
        if (!existingColumns.includes('crew_size')) {
            db.exec(`
                ALTER TABLE machines 
                ADD COLUMN crew_size INTEGER DEFAULT 1
            `);
            console.log('   ✅ Added crew_size column');
        } else {
            console.log('   ⚠️  crew_size column already exists');
        }
        
        console.log('📝 Step 2: Creating machine_crews table...');
        
        db.exec(`
            CREATE TABLE IF NOT EXISTS machine_crews (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                machine_id INTEGER NOT NULL,
                crew_letter TEXT NOT NULL CHECK(crew_letter IN ('A', 'B', 'C')),
                cycle_offset INTEGER NOT NULL CHECK(cycle_offset IN (0, 2, 4)),
                employees TEXT DEFAULT '[]', -- JSON array of employee IDs
                is_active BOOLEAN DEFAULT 1,
                created_date DATE DEFAULT (datetime('now', '+2 hours')),
                updated_date DATE DEFAULT (datetime('now', '+2 hours')),
                created_by INTEGER,
                FOREIGN KEY(machine_id) REFERENCES machines(id) ON DELETE CASCADE,
                FOREIGN KEY(created_by) REFERENCES users(id),
                UNIQUE(machine_id, crew_letter)
            )
        `);
        console.log('   ✅ Created machine_crews table');
        
        console.log('📝 Step 3: Creating crew_assignments table...');
        
        db.exec(`
            CREATE TABLE IF NOT EXISTS crew_assignments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                machine_id INTEGER NOT NULL,
                crew_id INTEGER NOT NULL,
                assignment_date DATE NOT NULL,
                shift_type TEXT NOT NULL CHECK(shift_type IN ('day', 'night', 'rest')),
                auto_generated BOOLEAN DEFAULT 1,
                is_override BOOLEAN DEFAULT 0,
                override_reason TEXT,
                created_at DATETIME DEFAULT (datetime('now', '+2 hours')),
                created_by INTEGER,
                FOREIGN KEY(machine_id) REFERENCES machines(id) ON DELETE CASCADE,
                FOREIGN KEY(crew_id) REFERENCES machine_crews(id) ON DELETE CASCADE,
                FOREIGN KEY(created_by) REFERENCES users(id),
                UNIQUE(machine_id, crew_id, assignment_date)
            )
        `);
        console.log('   ✅ Created crew_assignments table');
        
        console.log('📝 Step 4: Creating indexes for performance...');
        
        // Indexes for machine_crews
        db.exec(`
            CREATE INDEX IF NOT EXISTS idx_machine_crews_machine_id 
            ON machine_crews(machine_id)
        `);
        
        db.exec(`
            CREATE INDEX IF NOT EXISTS idx_machine_crews_active 
            ON machine_crews(is_active) WHERE is_active = 1
        `);
        
        // Indexes for crew_assignments
        db.exec(`
            CREATE INDEX IF NOT EXISTS idx_crew_assignments_machine_date 
            ON crew_assignments(machine_id, assignment_date)
        `);
        
        db.exec(`
            CREATE INDEX IF NOT EXISTS idx_crew_assignments_date_shift 
            ON crew_assignments(assignment_date, shift_type)
        `);
        
        db.exec(`
            CREATE INDEX IF NOT EXISTS idx_crew_assignments_auto_generated 
            ON crew_assignments(auto_generated) WHERE auto_generated = 1
        `);
        
        console.log('   ✅ Created performance indexes');
        
        console.log('📝 Step 5: Creating sample crew configuration...');
        
        // Check if we have any machines to create sample crews for
        const sampleMachine = db.prepare(`
            SELECT id, name FROM machines 
            WHERE environment = 'production' 
            LIMIT 1
        `).get();
        
        if (sampleMachine) {
            console.log(`   📋 Creating sample crews for machine: ${sampleMachine.name}`);
            
            // Create 3 crews (A, B, C) with proper offsets
            const crewData = [
                { letter: 'A', offset: 0 },
                { letter: 'B', offset: 2 },
                { letter: 'C', offset: 4 }
            ];
            
            const insertCrew = db.prepare(`
                INSERT OR IGNORE INTO machine_crews 
                (machine_id, crew_letter, cycle_offset, employees, created_date) 
                VALUES (?, ?, ?, '[]', datetime('now', '+2 hours'))
            `);
            
            crewData.forEach(crew => {
                insertCrew.run(sampleMachine.id, crew.letter, crew.offset);
                console.log(`     ✅ Created Crew ${crew.letter} (offset: ${crew.offset} days)`);
            });
        } else {
            console.log('   ⚠️  No production machines found - skipping sample crew creation');
        }
        
        console.log('📝 Step 6: Adding helpful views...');
        
        // Create view for easy crew schedule lookups
        db.exec(`
            CREATE VIEW IF NOT EXISTS crew_schedule_view AS
            SELECT 
                m.name as machine_name,
                mc.crew_letter,
                mc.cycle_offset,
                ca.assignment_date,
                ca.shift_type,
                ca.auto_generated,
                ca.is_override,
                mc.employees as crew_employees
            FROM machine_crews mc
            JOIN machines m ON mc.machine_id = m.id
            LEFT JOIN crew_assignments ca ON mc.id = ca.crew_id
            WHERE mc.is_active = 1
            ORDER BY m.name, ca.assignment_date, mc.crew_letter
        `);
        
        console.log('   ✅ Created crew_schedule_view for easy reporting');
        
        // Commit transaction
        db.exec('COMMIT');
        
        console.log('🎉 Migration completed successfully!');
        console.log('');
        console.log('📊 Migration Summary:');
        console.log('   • Added 3 new columns to machines table');
        console.log('   • Created machine_crews table for crew management');
        console.log('   • Created crew_assignments table for scheduling');
        console.log('   • Added performance indexes');
        console.log('   • Created helpful database views');
        
        // Display current database stats
        console.log('');
        console.log('📈 Database Statistics:');
        
        const machineCount = db.prepare('SELECT COUNT(*) as count FROM machines').get();
        console.log(`   • Total machines: ${machineCount.count}`);
        
        const crewCount = db.prepare('SELECT COUNT(*) as count FROM machine_crews').get();
        console.log(`   • Total crews configured: ${crewCount.count}`);
        
        const cycleEnabledCount = db.prepare('SELECT COUNT(*) as count FROM machines WHERE shift_cycle_enabled = 1').get();
        console.log(`   • Machines with cycle enabled: ${cycleEnabledCount.count}`);
        
        console.log('');
        console.log('🔧 Next Steps:');
        console.log('   1. Update machine management UI to include cycle settings');
        console.log('   2. Implement crew assignment interface');
        console.log('   3. Add auto-assignment calculation engine');
        console.log('   4. Integrate with labor planner for cycle display');
        
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
        console.error(error.stack);
        process.exit(1);
    }
}

module.exports = { runMigration };