// Enhanced Production Workflow API Endpoints
// This file is loaded by server.js

module.exports = function(app, db, authenticateToken, requireRole, body, broadcast) {

// ================================
// ENHANCED PRODUCTION WORKFLOW ENDPOINTS  
// ================================

// Material Preparation Phase
app.post('/api/orders/:id/prepare-materials',
  authenticateToken,
  requireRole(['admin', 'supervisor', 'operator']),
  body('materials').isArray(),
  body('checked_by').isInt(),
  async (req, res) => {
    const { id } = req.params;
    const { materials, notes } = req.body;
    const checked_by = req.user.id;
    
    try {
      await db.transaction(async (client) => {
        // Update order workflow stage
        const updateResult = await client.query(
          `UPDATE production_orders 
           SET workflow_stage = 'materials_prepared',
               material_check_completed = TRUE,
               material_checked_by = $1,
               material_check_time = CURRENT_TIMESTAMP,
               updated_at = CURRENT_TIMESTAMP
           WHERE id = $2 AND workflow_stage = 'created'`,
          [checked_by, id]
        );
        
        if (updateResult.rowCount === 0) {
          throw new Error('Order not found or not in correct stage');
        }
        
        // Record material allocations
        for (const material of materials) {
          await client.query(
            `INSERT INTO material_requirements 
             (order_id, material_code, material_name, required_quantity, unit_of_measure, 
              allocated_quantity, lot_number, supplier, status)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'allocated')`,
            [id, material.code, material.name, material.required_qty, 
             material.unit, material.allocated_qty, material.lot_number, material.supplier]
          );
        }
        
        // Broadcast success
        broadcast('materials_prepared', { 
          order_id: id, 
          prepared_by: req.user.username,
          material_count: materials.length 
        });
        
        res.json({ message: 'Materials prepared successfully' });
      });
    } catch (error) {
      console.error('Materials preparation error:', error);
      res.status(500).json({ error: error.message || 'Failed to prepare materials' });
    }
  }
);

// Machine Setup Phase
app.post('/api/orders/:id/start-setup',
  authenticateToken,
  requireRole(['admin', 'supervisor', 'operator']),
  body('machine_id').isInt(),
  body('setup_type').isIn(['initial_setup', 'changeover', 'maintenance_setup']),
  async (req, res) => {
    const { id } = req.params;
    const { machine_id, setup_type, previous_product } = req.body;
    
    try {
      const result = await db.transaction(async (client) => {
        // Check if materials are prepared
        const order = await client.query(
          'SELECT workflow_stage, material_check_completed FROM production_orders WHERE id = $1',
          [id]
        );
        
        if (!order.rows[0] || !order.rows[0].material_check_completed) {
          throw new Error('Materials must be prepared first');
        }
        
        // Create setup record
        const setupResult = await client.query(
          `INSERT INTO machine_setups 
           (order_id, machine_id, setup_type, previous_product, operator_id, setup_start_time)
           VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
           RETURNING id`,
          [id, machine_id, setup_type, previous_product, req.user.id]
        );
        
        // Update order
        await client.query(
          `UPDATE production_orders 
           SET workflow_stage = 'setup_ready',
               setup_start_time = CURRENT_TIMESTAMP,
               machine_id = $1,
               updated_at = CURRENT_TIMESTAMP
           WHERE id = $2`,
          [machine_id, id]
        );
        
        return { setup_id: setupResult.rows[0].id };
      });
      
      res.json({ 
        message: 'Machine setup started',
        setup_id: result.setup_id 
      });
    } catch (error) {
      console.error('Setup start error:', error);
      res.status(500).json({ error: error.message || 'Failed to start setup' });
    }
  }
);

// Complete Setup Phase
app.post('/api/orders/:id/complete-setup',
  authenticateToken,
  requireRole(['admin', 'supervisor', 'operator']),
  body('setup_checklist').isArray().optional(),
  async (req, res) => {
    const { id } = req.params;
    const { setup_checklist, notes } = req.body;
    
    try {
      const result = await db.transaction(async (client) => {
        // Get setup record
        const setup = await client.query(
          `SELECT ms.id, ms.setup_start_time, po.setup_start_time as order_setup_start
           FROM machine_setups ms 
           JOIN production_orders po ON ms.order_id = po.id
           WHERE ms.order_id = $1 AND ms.status = 'in_progress'`,
          [id]
        );
        
        if (!setup.rows[0]) {
          throw new Error('No active setup found');
        }
        
        const setupRecord = setup.rows[0];
        const setupDuration = Math.round((Date.now() - new Date(setupRecord.setup_start_time)) / (1000 * 60));
        
        // Complete setup record
        await client.query(
          `UPDATE machine_setups 
           SET status = 'completed',
               setup_complete_time = CURRENT_TIMESTAMP,
               setup_duration_minutes = $1,
               setup_checklist = $2,
               notes = $3
           WHERE id = $4`,
          [setupDuration, JSON.stringify(setup_checklist || []), notes, setupRecord.id]
        );
        
        // Update order
        await client.query(
          `UPDATE production_orders 
           SET workflow_stage = 'setup_ready',
               setup_complete_time = CURRENT_TIMESTAMP,
               setup_duration_minutes = $1,
               updated_at = CURRENT_TIMESTAMP
           WHERE id = $2`,
          [setupDuration, id]
        );
        
        return { setupDuration };
      });
      
      broadcast('setup_completed', { 
        order_id: id, 
        setup_duration: result.setupDuration,
        completed_by: req.user.username 
      });
      
      res.json({ 
        message: 'Setup completed successfully',
        setup_duration_minutes: result.setupDuration 
      });
    } catch (error) {
      console.error('Setup completion error:', error);
      res.status(500).json({ error: error.message || 'Failed to complete setup' });
    }
  }
);

// Enhanced Production Start with Pre-flight Checks
app.post('/api/orders/:id/start-enhanced',
  authenticateToken,
  requireRole(['admin', 'supervisor', 'operator']),
  body('batch_number').notEmpty(),
  async (req, res) => {
    const { id } = req.params;
    const { batch_number, environmental_conditions } = req.body;
    
    try {
      const result = await db.transaction(async (client) => {
        // Pre-flight safety checks
        const order = await client.query(
          `SELECT po.*, m.status as machine_status, m.name as machine_name
           FROM production_orders po
           LEFT JOIN machines m ON po.machine_id = m.id
           WHERE po.id = $1`,
          [id]
        );
        
        if (!order.rows[0]) {
          throw new Error('Order not found');
        }
        
        const orderData = order.rows[0];
        
        // Safety validation
        const safetyChecks = [];
        
        if (orderData.workflow_stage !== 'setup_ready') {
          safetyChecks.push('Setup must be completed first');
        }
        
        if (!orderData.material_check_completed) {
          safetyChecks.push('Material preparation incomplete');
        }
        
        if (orderData.machine_status !== 'available') {
          safetyChecks.push(`Machine ${orderData.machine_name} not available (${orderData.machine_status})`);
        }
        
        if (safetyChecks.length > 0) {
          throw new Error('Pre-flight checks failed: ' + safetyChecks.join(', '));
        }
        
        // Create batch record
        const batchResult = await client.query(
          `INSERT INTO production_batches 
           (batch_number, order_id, product_code, product_name, batch_size, production_date, created_by)
           VALUES ($1, $2, $3, $4, $5, CURRENT_DATE, $6)
           RETURNING id`,
          [batch_number, id, orderData.order_number, orderData.product_name, orderData.quantity, req.user.id]
        );
        
        const batchId = batchResult.rows[0].id;
        
        // Update order to production state
        await client.query(
          `UPDATE production_orders 
           SET workflow_stage = 'in_progress',
               status = 'in_progress',
               batch_number = $1,
               operator_id = $2,
               start_time = CURRENT_TIMESTAMP,
               updated_at = CURRENT_TIMESTAMP
           WHERE id = $3`,
          [batch_number, req.user.id, id]
        );
        
        // Update machine status
        await client.query(
          'UPDATE machines SET status = $1 WHERE id = $2',
          ['in_use', orderData.machine_id]
        );
        
        // Record environmental conditions if provided
        if (environmental_conditions) {
          await client.query(
            `INSERT INTO production_conditions 
             (order_id, temperature, humidity, pressure, operator_id)
             VALUES ($1, $2, $3, $4, $5)`,
            [id, environmental_conditions.temperature, 
             environmental_conditions.humidity, environmental_conditions.pressure, req.user.id]
          );
        }
        
        return { batchId, orderData };
      });
      
      broadcast('production_started_enhanced', { 
        order_id: id,
        batch_number,
        operator: req.user.username,
        machine: result.orderData.machine_name 
      });
      
      res.json({ 
        message: 'Production started successfully',
        batch_number,
        batch_id: result.batchId 
      });
    } catch (error) {
      console.error('Enhanced production start error:', error);
      res.status(500).json({ error: error.message || 'Failed to start enhanced production' });
    }
  }
);

// Quality Checkpoint Recording
app.post('/api/orders/:id/quality-check',
  authenticateToken,
  requireRole(['admin', 'supervisor', 'operator']),
  body('checkpoint_name').notEmpty(),
  body('checkpoint_stage').isIn(['pre_production', 'in_process', 'final_inspection']),
  (req, res) => {
    const { id } = req.params;
    const { 
      checkpoint_name, 
      checkpoint_stage, 
      measured_value, 
      target_value, 
      tolerance_min, 
      tolerance_max, 
      unit_of_measure,
      notes 
    } = req.body;
    
    const passed = measured_value >= tolerance_min && measured_value <= tolerance_max;
    
    db.run(
      `INSERT INTO quality_checkpoints 
       (order_id, checkpoint_name, checkpoint_stage, completed, passed, 
        measured_value, target_value, tolerance_min, tolerance_max, unit_of_measure,
        inspector_id, inspection_time, notes)
       VALUES ($1, $2, $3, TRUE, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP, $11)`,
      [id, checkpoint_name, checkpoint_stage, passed, measured_value, 
       target_value, tolerance_min, tolerance_max, unit_of_measure, req.user.id, notes],
      function(err) {
        if (err) {
          return res.status(500).json({ error: 'Failed to record quality check' });
        }
        
        // If quality check failed, put order on hold
        if (!passed) {
          db.run(
            `UPDATE production_orders 
             SET workflow_stage = 'quality_hold'
             WHERE id = $1`,
            [id],
            (err) => {
              if (err) console.error('Failed to update order status:', err);
            }
          );
          
          broadcast('quality_hold', { 
            order_id: id, 
            checkpoint: checkpoint_name,
            measured_value,
            target_value 
          });
        }
        
        res.json({ 
          message: 'Quality check recorded',
          passed,
          checkpoint_id: this.lastID 
        });
      }
    );
  }
);

// Get Enhanced Order Details
app.get('/api/orders/:id/enhanced', authenticateToken, async (req, res) => {
  const { id } = req.params;
  
  try {
    const orderQuery = `
      SELECT po.*, 
             m.name as machine_name,
             u1.username as operator_name,
             u2.username as material_checked_by_name,
             pb.batch_number as current_batch
      FROM production_orders po
      LEFT JOIN machines m ON po.machine_id = m.id
      LEFT JOIN users u1 ON po.operator_id = u1.id
      LEFT JOIN users u2 ON po.material_checked_by = u2.id
      LEFT JOIN production_batches pb ON po.id = pb.order_id
      WHERE po.id = $1
    `;
    
    const materialQuery = 'SELECT * FROM material_requirements WHERE order_id = $1 ORDER BY material_code';
    const qualityQuery = 'SELECT * FROM quality_checkpoints WHERE order_id = $1 ORDER BY checkpoint_stage, created_at';
    const setupQuery = 'SELECT * FROM machine_setups WHERE order_id = $1 ORDER BY setup_start_time DESC LIMIT 1';
    
    const [order, materials, quality_checks, setup] = await Promise.all([
      db.dbGet(orderQuery, [id]),
      db.dbAll(materialQuery, [id]),
      db.dbAll(qualityQuery, [id]),
      db.dbGet(setupQuery, [id])
    ]);
    
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    res.json({
      order,
      materials: materials || [],
      quality_checks: quality_checks || [],
      setup: setup || null,
      workflow_progress: {
        materials_prepared: order.material_check_completed,
        setup_completed: !!order.setup_complete_time,
        production_started: order.workflow_stage === 'in_progress',
        quality_approved: order.quality_approved
      }
    });
  } catch (error) {
    console.error('Enhanced order details error:', error);
    res.status(500).json({ error: 'Failed to fetch order details' });
  }
});

// Enhanced Production Complete with Quality Approval
app.post('/api/orders/:id/complete-enhanced',
  authenticateToken,
  requireRole(['admin', 'supervisor']),
  body('actual_quantity').isInt().optional(),
  body('quality_approved').isBoolean(),
  async (req, res) => {
    const { id } = req.params;
    const { actual_quantity, quality_approved, final_notes, waste_details } = req.body;
    
    if (!quality_approved) {
      return res.status(400).json({ error: 'Quality approval required for completion' });
    }
    
    try {
      const result = await db.transaction(async (client) => {
        const order = await client.query('SELECT * FROM production_orders WHERE id = $1', [id]);
        
        if (!order.rows[0] || order.rows[0].workflow_stage !== 'in_progress') {
          throw new Error('Order not in correct stage for completion');
        }
        
        const orderData = order.rows[0];
        const finalQuantity = actual_quantity || orderData.quantity;
        const efficiency = (finalQuantity / orderData.quantity) * 100;
        
        // Complete the order
        await client.query(
          `UPDATE production_orders 
           SET workflow_stage = 'completed',
               status = 'completed',
               actual_quantity = $1,
               efficiency_percentage = $2,
               quality_approved = TRUE,
               quality_approved_by = $3,
               quality_check_time = CURRENT_TIMESTAMP,
               complete_time = CURRENT_TIMESTAMP,
               notes = COALESCE(notes, '') || ' | ' || $4,
               updated_at = CURRENT_TIMESTAMP
           WHERE id = $5`,
          [finalQuantity, efficiency, req.user.id, final_notes || 'Production completed', id]
        );
        
        // Release machine
        if (orderData.machine_id) {
          await client.query(
            'UPDATE machines SET status = $1 WHERE id = $2',
            ['available', orderData.machine_id]
          );
        }
        
        // Complete batch record
        await client.query(
          `UPDATE production_batches 
           SET status = 'completed' 
           WHERE order_id = $1`,
          [id]
        );
        
        return { finalQuantity, efficiency };
      });
      
      broadcast('production_completed_enhanced', { 
        order_id: id,
        efficiency: result.efficiency,
        actual_quantity: result.finalQuantity,
        completed_by: req.user.username 
      });
      
      res.json({ 
        message: 'Production completed successfully',
        efficiency: result.efficiency,
        actual_quantity: result.finalQuantity 
      });
    } catch (error) {
      console.error('Enhanced production completion error:', error);
      res.status(500).json({ error: error.message || 'Failed to complete enhanced production' });
    }
  }
);

console.log('✨ Enhanced Production Workflow Endpoints Loaded');

}; // End of module.exports