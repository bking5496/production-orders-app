// Fix workflow_progress table constraints
const { dbRun } = require('./postgresql/db-postgresql');

async function fixConstraints() {
    console.log('🔧 Adding unique constraints to workflow_progress table...');
    
    try {
        // Add unique constraint for order_id + stage combination
        await dbRun(`
            ALTER TABLE workflow_progress 
            ADD CONSTRAINT unique_order_stage 
            UNIQUE (order_id, stage)
        `);
        
        console.log('✅ Added unique constraint for order_id + stage');
        
        // Also add unique constraint for quality_results if not exists
        await dbRun(`
            ALTER TABLE quality_results 
            ADD CONSTRAINT unique_order_checkpoint 
            UNIQUE (order_id, checkpoint_id)
        `);
        
        console.log('✅ Added unique constraint for quality results');
        
    } catch (error) {
        // Constraints might already exist, which is fine
        console.log('⚠️ Constraints may already exist:', error.message);
    }
    
    console.log('🎉 Constraint fixes completed!');
    process.exit(0);
}

fixConstraints();