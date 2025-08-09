// Orders Service - Business Logic Layer
const DatabaseUtils = require('../utils/database');
const { NotFoundError, ValidationError } = require('../middleware/error-handler');

class OrdersService {
  
  /**
   * Get all orders with optional filtering
   */
  async getAllOrders(filters = {}) {
    const { 
      environment, 
      status, 
      machine_id, 
      include_archived = false,
      page = 1, 
      limit = 100 
    } = filters;

    let conditions = {};
    
    if (!include_archived) {
      conditions.archived = false;
    }
    
    if (environment) {
      conditions.environment = environment;
    }
    
    if (status) {
      conditions.status = status;
    }
    
    if (machine_id) {
      conditions.machine_id = machine_id;
    }

    const offset = (page - 1) * limit;
    const orders = await DatabaseUtils.select(
      'production_orders', 
      conditions,
      { 
        orderBy: 'created_at DESC', 
        limit,
        offset 
      }
    );

    return orders;
  }

  /**
   * Get archived orders
   */
  async getArchivedOrders(filters = {}) {
    return await this.getAllOrders({ ...filters, include_archived: true });
  }

  /**
   * Get order by ID
   */
  async getOrderById(id) {
    const order = await DatabaseUtils.findOne('production_orders', { id });
    if (!order) {
      throw new NotFoundError('Order');
    }
    return order;
  }

  /**
   * Create new order
   */
  async createOrder(orderData, userId) {
    const {
      order_number,
      product_name,
      quantity,
      due_date,
      priority = 'medium',
      customer_info = {},
      specifications = {},
      environment = 'production',
      machine_id = null,
      scheduled_start_date = null,
      scheduled_start_shift = null,
      scheduled_end_date = null,
      scheduled_end_shift = null,
      notes = ''
    } = orderData;

    // Validate required fields
    if (!order_number || !product_name || !quantity) {
      throw new ValidationError('Order number, product name, and quantity are required');
    }

    // Check for duplicate order number
    const existingOrder = await DatabaseUtils.findOne('production_orders', { order_number });
    if (existingOrder) {
      throw new ValidationError('Order number already exists');
    }

    const newOrder = await DatabaseUtils.insert('production_orders', {
      order_number,
      product_name,
      quantity,
      due_date,
      priority,
      customer_info: JSON.stringify(customer_info),
      specifications: JSON.stringify(specifications),
      environment,
      machine_id,
      scheduled_start_date,
      scheduled_start_shift,
      scheduled_end_date,
      scheduled_end_shift,
      notes,
      status: 'pending',
      created_by: userId,
      created_at: new Date(),
      updated_at: new Date()
    });

    return newOrder;
  }

  /**
   * Update order
   */
  async updateOrder(id, updateData, userId) {
    const order = await this.getOrderById(id);
    
    // Prevent updates to completed or cancelled orders
    if (['completed', 'cancelled'].includes(order.status)) {
      throw new ValidationError('Cannot update completed or cancelled orders');
    }

    const updatedOrder = await DatabaseUtils.update(
      'production_orders',
      {
        ...updateData,
        updated_at: new Date(),
        updated_by: userId
      },
      { id },
      '*'
    );

    return updatedOrder[0];
  }

  /**
   * Delete order
   */
  async deleteOrder(id, userId) {
    const order = await this.getOrderById(id);
    
    // Check if order can be deleted
    if (['in_progress', 'completed'].includes(order.status)) {
      throw new ValidationError('Cannot delete orders that are in progress or completed');
    }

    // Soft delete by archiving
    await DatabaseUtils.update(
      'production_orders',
      {
        archived: true,
        archived_at: new Date(),
        archived_by: userId
      },
      { id }
    );

    return true;
  }

  /**
   * Start order production
   */
  async startOrder(id, machineId, userId) {
    const order = await this.getOrderById(id);
    
    if (order.status !== 'pending') {
      throw new ValidationError('Only pending orders can be started');
    }

    // Verify machine is available
    const machine = await DatabaseUtils.findOne('machines', { 
      id: machineId, 
      status: 'available' 
    });
    
    if (!machine) {
      throw new NotFoundError('Available machine');
    }

    // Start transaction to update both order and machine
    const results = await DatabaseUtils.transaction([
      {
        text: 'UPDATE production_orders SET status = $1, machine_id = $2, start_time = $3, updated_at = $4, updated_by = $5 WHERE id = $6',
        params: ['in_progress', machineId, new Date(), new Date(), userId, id]
      },
      {
        text: 'UPDATE machines SET status = $1, updated_at = $2 WHERE id = $3',
        params: ['in_use', new Date(), machineId]
      }
    ]);

    return await this.getOrderById(id);
  }

  /**
   * Complete order production
   */
  async completeOrder(id, completionData, userId) {
    const order = await this.getOrderById(id);
    
    if (order.status !== 'in_progress') {
      throw new ValidationError('Only in-progress orders can be completed');
    }

    const {
      actual_quantity = order.quantity,
      waste_quantity = 0,
      quality_notes = '',
      completion_notes = ''
    } = completionData;

    // Complete transaction
    const results = await DatabaseUtils.transaction([
      {
        text: `UPDATE production_orders SET 
               status = $1, 
               stop_time = $2, 
               actual_quantity = $3,
               waste_quantity = $4,
               quality_notes = $5,
               completion_notes = $6,
               updated_at = $7,
               updated_by = $8
               WHERE id = $9`,
        params: [
          'completed', 
          new Date(), 
          actual_quantity, 
          waste_quantity,
          quality_notes,
          completion_notes,
          new Date(), 
          userId, 
          id
        ]
      },
      {
        text: 'UPDATE machines SET status = $1, updated_at = $2 WHERE id = $3',
        params: ['available', new Date(), order.machine_id]
      }
    ]);

    return await this.getOrderById(id);
  }

  /**
   * Pause order production
   */
  async pauseOrder(id, reason, userId) {
    const order = await this.getOrderById(id);
    
    if (order.status !== 'in_progress') {
      throw new ValidationError('Only in-progress orders can be paused');
    }

    const updatedOrder = await DatabaseUtils.update(
      'production_orders',
      {
        status: 'paused',
        pause_reason: reason,
        pause_time: new Date(),
        updated_at: new Date(),
        updated_by: userId
      },
      { id },
      '*'
    );

    return updatedOrder[0];
  }

  /**
   * Stop order production
   */
  async stopOrder(id, stopData, userId) {
    const { reason, notes, category } = stopData;
    
    const order = await this.getOrderById(id);
    
    if (!['pending', 'in_progress'].includes(order.status)) {
      throw new ValidationError('Only pending or in-progress orders can be stopped');
    }

    // Start transaction for atomic operations
    const queries = [
      // Update order status to stopped
      {
        text: `
          UPDATE production_orders 
          SET status = 'stopped',
              stop_time = NOW(),
              stop_reason = $1,
              notes = COALESCE(notes, '') || CASE WHEN COALESCE(notes, '') = '' THEN '' ELSE ' | ' END || 'Stopped: ' || COALESCE($2, ''),
              updated_at = NOW(),
              updated_by = $3
          WHERE id = $4 AND status IN ('pending', 'in_progress')
          RETURNING *
        `,
        params: [reason || null, notes || '', userId, parseInt(id)]
      },
      // Create downtime record
      {
        text: `
          INSERT INTO production_stops 
          (order_id, start_time, reason, category, notes, operator_id, created_at)
          VALUES ($1, NOW(), $2, $3, $4, $5, NOW())
          RETURNING id
        `,
        params: [parseInt(id), reason || 'Manual Stop', category || 'Other', notes || '', userId]
      }
    ];

    const results = await DatabaseUtils.transaction(queries);
    
    if (results[0].rowCount === 0) {
      throw new ValidationError('Order not found or cannot be stopped');
    }

    return results[0].rows[0];
  }

  /**
   * Resume paused order
   */
  async resumeOrder(id, userId) {
    const order = await this.getOrderById(id);
    
    if (!['paused', 'stopped'].includes(order.status)) {
      throw new ValidationError('Only paused or stopped orders can be resumed');
    }

    // Start transaction for atomic operations
    const queries = [
      // Update order status back to in_progress
      {
        text: `
          UPDATE production_orders 
          SET status = 'in_progress',
              stop_time = NULL,
              stop_reason = NULL,
              resume_time = NOW(),
              updated_at = NOW(),
              updated_by = $2
          WHERE id = $1 AND status IN ('stopped', 'paused')
          RETURNING *
        `,
        params: [parseInt(id), userId]
      },
      // Update the latest stop record with resolution info
      {
        text: `
          UPDATE production_stops 
          SET end_time = NOW(),
              resolved_at = NOW(),
              duration = EXTRACT(EPOCH FROM (NOW() - start_time)) / 60,
              resolved_by = $2
          WHERE order_id = $1 AND end_time IS NULL
          RETURNING id, duration, start_time
        `,
        params: [parseInt(id), userId]
      }
    ];

    const results = await DatabaseUtils.transaction(queries);
    
    if (results[0].rowCount === 0) {
      throw new ValidationError('Order not found or not stopped/paused');
    }

    return results[0].rows[0];
  }

  /**
   * Get active orders
   */
  async getActiveOrders(environment) {
    let conditions = {
      status: ['in_progress', 'paused']
    };
    
    if (environment) {
      conditions.environment = environment;
    }

    // Use raw query for IN condition
    let query = `
      SELECT po.*, m.name as machine_name 
      FROM production_orders po
      LEFT JOIN machines m ON po.machine_id = m.id
      WHERE po.status IN ('in_progress', 'paused')
    `;
    
    const params = [];
    if (environment) {
      query += ` AND po.environment = $1`;
      params.push(environment);
    }
    
    query += ` ORDER BY po.start_time DESC`;

    const result = await DatabaseUtils.raw(query, params);
    return result.rows;
  }

  /**
   * Get order statistics
   */
  async getOrderStats(environment = null) {
    let query = `
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
        COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress,
        COUNT(CASE WHEN status = 'paused' THEN 1 END) as paused,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
        COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled
      FROM production_orders
      WHERE archived = false
    `;

    const params = [];
    if (environment) {
      query += ` AND environment = $1`;
      params.push(environment);
    }

    const result = await DatabaseUtils.raw(query, params);
    return result.rows[0];
  }
}

module.exports = new OrdersService();