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
  (req, res) => {
    const { id } = req.params;
    const { materials, notes } = req.body;
    const checked_by = req.user.id;
    
    db.serialize(() => {
      db.run('BEGIN TRANSACTION');
      
      // Update order workflow stage
      db.run(
        `UPDATE production_orders 
         SET workflow_stage = 'materials_prepared',
             material_check_completed = TRUE,
             material_checked_by = $1,
             material_check_time = CURRENT_TIMESTAMP,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $2 AND workflow_stage = 'created'`,
        [checked_by, id],
        function(err) {
          if (err) {
            db.run('ROLLBACK');
            return res.status(500).json({ error: 'Failed to update order' });
          }
          
          if (this.changes === 0) {
            db.run('ROLLBACK');
            return res.status(400).json({ error: 'Order not found or not in correct stage' });
          }
          
          // Record material allocations
          const materialPromises = materials.map(material => {
            return new Promise((resolve, reject) => {
              db.run(
                `INSERT INTO material_requirements 
                 (order_id, material_code, material_name, required_quantity, unit_of_measure, 
                  allocated_quantity, lot_number, supplier, status)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'allocated')`,
                [id, material.code, material.name, material.required_qty, 
                 material.unit, material.allocated_qty, material.lot_number, material.supplier],
                (err) => err ? reject(err) : resolve()
              );
            });
          });
          
          Promise.all(materialPromises)
            .then(() => {
              db.run('COMMIT');
              broadcast('materials_prepared', { 
                order_id: id, 
                prepared_by: req.user.username,
                material_count: materials.length 
              });
              res.json({ message: 'Materials prepared successfully' });
            })
            .catch(err => {
              db.run('ROLLBACK');
              res.status(500).json({ error: 'Failed to record materials' });
            });
        }
      );
    });
  }
);

// Machine Setup Phase
app.post('/api/orders/:id/start-setup',
  authenticateToken,
  requireRole(['admin', 'supervisor', 'operator']),
  body('machine_id').isInt(),
  body('setup_type').isIn(['initial_setup', 'changeover', 'maintenance_setup']),
  (req, res) => {
    const { id } = req.params;
    const { machine_id, setup_type, previous_product } = req.body;
    
    db.serialize(() => {
      db.run('BEGIN TRANSACTION');
      
      // Check if materials are prepared
      db.get(
        'SELECT workflow_stage, material_check_completed FROM production_orders WHERE id = $1',
        [id],
        (err, order) => {
          if (err) {
            db.run('ROLLBACK');
            return res.status(500).json({ error: 'Database error' });
          }
          
          if (!order || !order.material_check_completed) {
            db.run('ROLLBACK');
            return res.status(400).json({ error: 'Materials must be prepared first' });
          }
          
          // Create setup record
          db.run(
            `INSERT INTO machine_setups 
             (order_id, machine_id, setup_type, previous_product, operator_id, setup_start_time)
             VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)`,
            [id, machine_id, setup_type, previous_product, req.user.id],
            function(err) {
              if (err) {
                db.run('ROLLBACK');
                return res.status(500).json({ error: 'Failed to start setup' });
              }
              
              // Update order
              db.run(
                `UPDATE production_orders 
                 SET workflow_stage = 'setup_ready',
                     setup_start_time = CURRENT_TIMESTAMP,
                     machine_id = $1,
                     updated_at = CURRENT_TIMESTAMP
                 WHERE id = $2`,
                [machine_id, id],
                (err) => {
                  if (err) {
                    db.run('ROLLBACK');
                    return res.status(500).json({ error: 'Failed to update order' });
                  }
                  
                  db.run('COMMIT');
                  res.json({ 
                    message: 'Machine setup started',
                    setup_id: this.lastID 
                  });
                }
              );
            }
          );
        }
      );
    });
  }
);

// Complete Setup Phase
app.post('/api/orders/:id/complete-setup',
  authenticateToken,
  requireRole(['admin', 'supervisor', 'operator']),
  body('setup_checklist').isArray().optional(),
  (req, res) => {
    const { id } = req.params;
    const { setup_checklist, notes } = req.body;
    
    db.serialize(() => {
      db.run('BEGIN TRANSACTION');
      
      // Get setup record
      db.get(
        `SELECT ms.id, ms.setup_start_time, po.setup_start_time as order_setup_start
         FROM machine_setups ms 
         JOIN production_orders po ON ms.order_id = po.id
         WHERE ms.order_id = $1 AND ms.status = 'in_progress'`,
        [id],
        (err, setup) => {
          if (err) {
            db.run('ROLLBACK');
            return res.status(500).json({ error: 'Database error' });
          }
          
          if (!setup) {
            db.run('ROLLBACK');
            return res.status(400).json({ error: 'No active setup found' });
          }
          
          const setupDuration = Math.round((Date.now() - new Date(setup.setup_start_time)) / (1000 * 60));
          
          // Complete setup record
          db.run(
            `UPDATE machine_setups 
             SET status = 'completed',
                 setup_complete_time = CURRENT_TIMESTAMP,
                 setup_duration_minutes = $1,
                 setup_checklist = $2,
                 notes = $3
             WHERE id = $4`,
            [setupDuration, JSON.stringify(setup_checklist || []), notes, setup.id],
            (err) => {
              if (err) {
                db.run('ROLLBACK');
                return res.status(500).json({ error: 'Failed to complete setup' });
              }
              
              // Update order
              db.run(
                `UPDATE production_orders 
                 SET workflow_stage = 'setup_ready',
                     setup_complete_time = CURRENT_TIMESTAMP,
                     setup_duration_minutes = $1,
                     updated_at = CURRENT_TIMESTAMP
                 WHERE id = $2`,
                [setupDuration, id],
                (err) => {
                  if (err) {
                    db.run('ROLLBACK');
                    return res.status(500).json({ error: 'Failed to update order' });
                  }
                  
                  db.run('COMMIT');
                  broadcast('setup_completed', { 
                    order_id: id, 
                    setup_duration: setupDuration,
                    completed_by: req.user.username 
                  });
                  res.json({ 
                    message: 'Setup completed successfully',
                    setup_duration_minutes: setupDuration 
                  });
                }
              );
            }
          );
        }
      );
    });
  }
);

// Enhanced Production Start with Pre-flight Checks
app.post('/api/orders/:id/start-enhanced',
  authenticateToken,
  requireRole(['admin', 'supervisor', 'operator']),
  body('batch_number').notEmpty(),
  (req, res) => {
    const { id } = req.params;
    const { batch_number, environmental_conditions } = req.body;
    
    db.serialize(() => {
      db.run('BEGIN TRANSACTION');
      
      // Pre-flight safety checks
      db.get(
        `SELECT po.*, m.status as machine_status, m.name as machine_name
         FROM production_orders po
         LEFT JOIN machines m ON po.machine_id = m.id
         WHERE po.id = $1`,
        [id],
        async (err, order) => {
          if (err) {
            db.run('ROLLBACK');
            return res.status(500).json({ error: 'Database error' });
          }
          
          // Safety validation
          const safetyChecks = [];
          
          if (!order) {
            safetyChecks.push('Order not found');
          } else {
            if (order.workflow_stage !== 'setup_ready') {
              safetyChecks.push('Setup must be completed first');
            }
            
            if (!order.material_check_completed) {
              safetyChecks.push('Material preparation incomplete');
            }
            
            if (order.machine_status !== 'available') {
              safetyChecks.push(`Machine ${order.machine_name} not available (${order.machine_status})`);
            }
          }
          
          if (safetyChecks.length > 0) {
            db.run('ROLLBACK');
            return res.status(400).json({ 
              error: 'Pre-flight checks failed',
              safety_issues: safetyChecks 
            });
          }
          
          // Create batch record
          db.run(
            `INSERT INTO production_batches 
             (batch_number, order_id, product_code, product_name, batch_size, production_date, created_by)
             VALUES ($1, $2, $3, $4, $5, CURRENT_DATE, $6)`,
            [batch_number, id, order.order_number, order.product_name, order.quantity, req.user.id],
            function(err) {
              if (err) {
                db.run('ROLLBACK');
                return res.status(500).json({ error: 'Failed to create batch record' });
              }
              
              const batchId = this.lastID;
              
              // Update order to production state
              db.run(
                `UPDATE production_orders 
                 SET workflow_stage = 'in_progress',
                     status = 'in_progress',
                     batch_number = $1,
                     operator_id = $2,
                     started_at = CURRENT_TIMESTAMP,
                     updated_at = CURRENT_TIMESTAMP
                 WHERE id = $3`,
                [batch_number, req.user.id, id],
                (err) => {
                  if (err) {
                    db.run('ROLLBACK');
                    return res.status(500).json({ error: 'Failed to start production' });
                  }
                  
                  // Update machine status
                  db.run(
                    'UPDATE machines SET status = $1 WHERE id = $2',
                    ['in_use', order.machine_id],
                    (err) => {
                      if (err) {
                        db.run('ROLLBACK');
                        return res.status(500).json({ error: 'Failed to update machine' });
                      }
                      
                      // Record environmental conditions if provided
                      if (environmental_conditions) {
                        db.run(
                          `INSERT INTO production_conditions 
                           (order_id, temperature, humidity, pressure, operator_id)
                           VALUES ($1, $2, $3, $4, $5)`,
                          [id, environmental_conditions.temperature, 
                           environmental_conditions.humidity, environmental_conditions.pressure, req.user.id],
                          (err) => {
                            if (err) console.error('Failed to record conditions:', err);
                          }
                        );
                      }
                      
                      db.run('COMMIT');
                      broadcast('production_started_enhanced', { 
                        order_id: id,
                        batch_number,
                        operator: req.user.username,
                        machine: order.machine_name 
                      });
                      
                      res.json({ 
                        message: 'Production started successfully',
                        batch_number,
                        batch_id: batchId 
                      });
                    }
                  );
                }
              );
            }
          );
        }
      );
    });
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
app.get('/api/orders/:id/enhanced', authenticateToken, (req, res) => {
  const { id } = req.params;
  
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
  
  Promise.all([
    new Promise((resolve, reject) => db.get(orderQuery, [id], (err, result) => err ? reject(err) : resolve(result))),
    new Promise((resolve, reject) => db.all(materialQuery, [id], (err, result) => err ? reject(err) : resolve(result))),
    new Promise((resolve, reject) => db.all(qualityQuery, [id], (err, result) => err ? reject(err) : resolve(result))),
    new Promise((resolve, reject) => db.get(setupQuery, [id], (err, result) => err ? reject(err) : resolve(result)))
  ])
  .then(([order, materials, quality_checks, setup]) => {
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
  })
  .catch(err => {
    console.error('Enhanced order details error:', err);
    res.status(500).json({ error: 'Failed to fetch order details' });
  });
});

// Enhanced Production Complete with Quality Approval
app.post('/api/orders/:id/complete-enhanced',
  authenticateToken,
  requireRole(['admin', 'supervisor']),
  body('actual_quantity').isInt().optional(),
  body('quality_approved').isBoolean(),
  (req, res) => {
    const { id } = req.params;
    const { actual_quantity, quality_approved, final_notes, waste_details } = req.body;
    
    if (!quality_approved) {
      return res.status(400).json({ error: 'Quality approval required for completion' });
    }
    
    db.serialize(() => {
      db.run('BEGIN TRANSACTION');
      
      db.get('SELECT * FROM production_orders WHERE id = $1', [id], (err, order) => {
        if (err) {
          db.run('ROLLBACK');
          return res.status(500).json({ error: 'Database error' });
        }
        
        if (!order || order.workflow_stage !== 'in_progress') {
          db.run('ROLLBACK');
          return res.status(400).json({ error: 'Order not in correct stage for completion' });
        }
        
        const finalQuantity = actual_quantity || order.quantity;
        const efficiency = (finalQuantity / order.quantity) * 100;
        
        // Complete the order
        db.run(
          `UPDATE production_orders 
           SET workflow_stage = 'completed',
               status = 'completed',
               actual_quantity = $1,
               efficiency_percentage = $2,
               quality_approved = TRUE,
               quality_approved_by = $3,
               quality_check_time = CURRENT_TIMESTAMP,
               completed_time = CURRENT_TIMESTAMP,
               notes = COALESCE(notes, '') || ' | ' || $4,
               updated_at = CURRENT_TIMESTAMP
           WHERE id = $5`,
          [finalQuantity, efficiency, req.user.id, final_notes || 'Production completed', id],
          (err) => {
            if (err) {
              db.run('ROLLBACK');
              return res.status(500).json({ error: 'Failed to complete order' });
            }
            
            // Release machine
            if (order.machine_id) {
              db.run(
                'UPDATE machines SET status = $1 WHERE id = $2',
                ['available', order.machine_id],
                (err) => {
                  if (err) console.error('Failed to update machine:', err);
                }
              );
            }
            
            // Complete batch record
            db.run(
              `UPDATE production_batches 
               SET status = 'completed' 
               WHERE order_id = $1`,
              [id],
              (err) => {
                if (err) console.error('Failed to update batch:', err);
              }
            );
            
            db.run('COMMIT');
            broadcast('production_completed_enhanced', { 
              order_id: id,
              efficiency,
              actual_quantity: finalQuantity,
              completed_by: req.user.username 
            });
            
            res.json({ 
              message: 'Production completed successfully',
              efficiency,
              actual_quantity: finalQuantity 
            });
          }
        );
      });
    });
  }
);

console.log('✨ Enhanced Production Workflow Endpoints Loaded');

}; // End of module.exports