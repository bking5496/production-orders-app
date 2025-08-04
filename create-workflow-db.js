// Script to create workflow database tables using the server's database connection
const { dbRun, dbAll } = require('./postgresql/db-postgresql');
const fs = require('fs');

async function createWorkflowTables() {
    console.log('🔧 Creating workflow database tables...');
    
    try {
        // Read the PostgreSQL-compatible SQL file
        const sql = fs.readFileSync('./create-workflow-tables-postgresql.sql', 'utf8');
        
        // Split SQL into individual statements (PostgreSQL specific)
        const statements = sql.split(';').filter(stmt => stmt.trim().length > 0);
        
        console.log(`📄 Found ${statements.length} SQL statements to execute`);
        
        // Execute each statement
        for (let i = 0; i < statements.length; i++) {
            const statement = statements[i].trim();
            if (statement) {
                console.log(`⚡ Executing statement ${i + 1}/${statements.length}...`);
                try {
                    await dbRun(statement);
                    console.log(`✅ Statement ${i + 1} completed successfully`);
                } catch (error) {
                    console.error(`❌ Error in statement ${i + 1}:`, error.message);
                    console.log('Statement:', statement.substring(0, 100) + '...');
                }
            }
        }
        
        // Verify tables were created
        console.log('\n📊 Verifying created tables...');
        const tables = await dbAll(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name IN ('materials', 'product_recipes', 'setup_checklists', 'quality_checkpoints', 'workflow_progress', 'material_allocations', 'setup_progress', 'quality_results')
            ORDER BY table_name
        `);
        
        console.log('✅ Created workflow tables:');
        tables.forEach(table => {
            console.log(`   - ${table.table_name}`);
        });
        
        console.log('\n🎉 Workflow database setup completed successfully!');
        
    } catch (error) {
        console.error('💥 Error setting up workflow database:', error);
        process.exit(1);
    }
    
    process.exit(0);
}

// Run the setup
createWorkflowTables();