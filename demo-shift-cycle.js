#!/usr/bin/env node

/**
 * 2-2-2 Shift Cycle System Demo
 * 
 * This script demonstrates how the automatic crew rotation works
 * with 3 staggered crews providing 24/7 coverage
 */

const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, 'production.db');

function calculateCrewAssignment(startDate, currentDate, offset) {
    const start = new Date(startDate);
    const current = new Date(currentDate);
    const daysSinceStart = Math.floor((current - start) / (1000 * 60 * 60 * 24));
    const cycleDay = (daysSinceStart + offset) % 6;
    
    if (cycleDay === 0 || cycleDay === 1) return 'day';
    if (cycleDay === 2 || cycleDay === 3) return 'night';
    return 'rest';
}

function generateSchedule(startDate, days = 14) {
    const crews = [
        { letter: 'A', offset: 0 },
        { letter: 'B', offset: 2 },
        { letter: 'C', offset: 4 }
    ];
    
    console.log('🔄 2-2-2 Shift Cycle Schedule');
    console.log('Pattern: 2 Days Day Shift → 2 Days Night Shift → 2 Days Rest');
    console.log('='.repeat(80));
    console.log(`${'Date'.padEnd(12)} ${'Day'.padEnd(5)} ${'Day Shift'.padEnd(15)} ${'Night Shift'.padEnd(15)} ${'Rest'.padEnd(10)}`);
    console.log('-'.repeat(80));
    
    for (let i = 0; i < days; i++) {
        const date = new Date(startDate);
        date.setDate(date.getDate() + i);
        
        const dateStr = date.toISOString().split('T')[0];
        const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'short' });
        
        const assignments = crews.reduce((acc, crew) => {
            const assignment = calculateCrewAssignment(startDate, date, crew.offset);
            acc[assignment].push(crew.letter);
            return acc;
        }, { day: [], night: [], rest: [] });
        
        const dayShift = assignments.day.join(', ') || '-';
        const nightShift = assignments.night.join(', ') || '-';
        const resting = assignments.rest.join(', ') || '-';
        
        console.log(`${dateStr.padEnd(12)} ${dayOfWeek.padEnd(5)} ${'Crew ' + dayShift.padEnd(11)} ${'Crew ' + nightShift.padEnd(11)} ${'Crew ' + resting}`);
    }
    
    console.log('='.repeat(80));
    console.log('✅ Coverage Analysis:');
    console.log('   • Every day has exactly 1 crew on day shift');
    console.log('   • Every day has exactly 1 crew on night shift');
    console.log('   • Each crew works 4 days, rests 2 days per 6-day cycle');
    console.log('   • 24/7 operations maintained with 3 crews total');
}

function demonstrateDatabase() {
    console.log('\n📊 Database Integration Demo');
    console.log('='.repeat(50));
    
    const db = new Database(DB_PATH);
    
    try {
        // Get machines with cycle enabled
        const machines = db.prepare(`
            SELECT id, name, shift_cycle_enabled, cycle_start_date, crew_size
            FROM machines 
            WHERE shift_cycle_enabled = 1
        `).all();
        
        console.log(`Found ${machines.length} machines with shift cycles enabled:`);
        
        machines.forEach(machine => {
            console.log(`\n🏭 ${machine.name} (ID: ${machine.id})`);
            console.log(`   Cycle Start: ${machine.cycle_start_date}`);
            console.log(`   Crew Size: ${machine.crew_size} people per shift`);
            
            // Get crews for this machine
            const crews = db.prepare(`
                SELECT crew_letter, cycle_offset, employees
                FROM machine_crews 
                WHERE machine_id = ? AND is_active = 1
                ORDER BY crew_letter
            `).all(machine.id);
            
            if (crews.length > 0) {
                console.log(`   Crews configured: ${crews.length}`);
                crews.forEach(crew => {
                    const employeeCount = JSON.parse(crew.employees || '[]').length;
                    console.log(`     • Crew ${crew.crew_letter}: ${employeeCount} employees (${crew.cycle_offset} day offset)`);
                });
            } else {
                console.log('   ⚠️ No crews configured yet');
            }
        });
        
        if (machines.length === 0) {
            console.log('⚠️ No machines have shift cycles enabled yet.');
            console.log('💡 Enable shift cycles in the Machine Management interface.');
        }
        
    } catch (error) {
        console.error('Database error:', error.message);
    } finally {
        db.close();
    }
}

// Main demo
console.log('🎯 2-2-2 Shift Cycle System Demonstration\n');

// Demo with sample start date
const startDate = '2025-07-30';
generateSchedule(startDate, 14);

// Show database integration
demonstrateDatabase();

console.log('\n🔧 Next Steps:');
console.log('1. Open the Machine Management page in your browser');
console.log('2. Edit a machine and enable "2-2-2 Shift Cycle"');
console.log('3. Set a cycle start date and assign employees to crews');
console.log('4. View the 14-day preview to see automatic scheduling');
console.log('5. The Labor Planner will show cycle assignments automatically');

console.log('\n🌐 Access your application at: http://localhost:3000');