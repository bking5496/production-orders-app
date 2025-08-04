// Add sample product recipes to test the Enhanced Workflow
const { dbRun, dbAll } = require('./postgresql/db-postgresql');

async function addSampleRecipes() {
    console.log('🔧 Adding sample product recipes...');
    
    try {
        // Get existing materials first
        const materials = await dbAll('SELECT * FROM materials ORDER BY id');
        console.log(`📦 Found ${materials.length} materials in database`);
        
        if (materials.length === 0) {
            console.log('❌ No materials found. Please run the workflow setup first.');
            return;
        }
        
        // Sample products from your system
        const sampleProducts = [
            'Orange Juice',
            'Apple Juice', 
            'Mixed Berry Drink',
            'Protein Shake',
            'Energy Drink'
        ];
        
        // Add recipes for each product
        for (const product of sampleProducts) {
            console.log(`📝 Creating recipe for ${product}...`);
            
            // Add 2-3 materials per product with realistic quantities
            const recipeMaterials = materials.slice(0, 3); // Use first 3 materials
            
            for (let i = 0; i < recipeMaterials.length; i++) {
                const material = recipeMaterials[i];
                const baseQuantity = i === 0 ? 100 : (20 - i * 5); // First material is main ingredient
                
                await dbRun(`
                    INSERT INTO product_recipes (product_name, material_id, required_quantity, unit_of_measure, sequence_order, is_critical)
                    VALUES ($1, $2, $3, $4, $5, $6)
                    ON CONFLICT DO NOTHING
                `, [
                    product,
                    material.id,
                    baseQuantity,
                    material.unit_of_measure,
                    i + 1,
                    i === 0 // First material is critical
                ]);
            }
        }
        
        // Verify recipes were added
        const recipeCount = await dbAll(`
            SELECT 
                product_name, 
                COUNT(*) as material_count
            FROM product_recipes 
            GROUP BY product_name
        `);
        
        console.log('✅ Sample recipes created:');
        recipeCount.forEach(recipe => {
            console.log(`   - ${recipe.product_name}: ${recipe.material_count} materials`);
        });
        
        console.log('\n🎉 Sample recipes setup completed successfully!');
        
    } catch (error) {
        console.error('💥 Error adding sample recipes:', error);
        process.exit(1);
    }
    
    process.exit(0);
}

// Run the setup
addSampleRecipes();