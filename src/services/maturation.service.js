// Maturation Room Service - Business Logic Layer
const DatabaseUtils = require('../utils/database');
const { NotFoundError, ValidationError } = require('../middleware/error-handler');

class MaturationService {
  
  /**
   * Get all maturation room records with detailed information
   */
  async getAllMaturationRecords() {
    const query = `
      SELECT 
        mr.*,
        po.order_number,
        po.product_name,
        u.username as confirmed_by_name,
        qc_user.username as quality_checked_by_name,
        CASE 
          WHEN mr.quantity_expected > 0 THEN 
            ROUND(((mr.quantity_produced - mr.quantity_expected) / mr.quantity_expected * 100)::numeric, 2)
          ELSE 0 
        END as variance_percentage,
        (mr.maturation_date + INTERVAL '1 day' * mr.expected_maturation_days) as estimated_completion_date
      FROM maturation_room mr
      LEFT JOIN production_orders po ON mr.production_order_id = po.id
      LEFT JOIN users u ON mr.confirmed_by = u.id
      LEFT JOIN users qc_user ON mr.quality_checked_by = qc_user.id
      ORDER BY mr.maturation_date DESC, mr.id DESC
    `;
    
    const result = await DatabaseUtils.raw(query);
    return result.rows;
  }

  /**
   * Get maturation record by ID
   */
  async getMaturationRecordById(id) {
    const query = `
      SELECT 
        mr.*,
        po.order_number,
        po.product_name,
        u.username as confirmed_by_name,
        qc_user.username as quality_checked_by_name,
        CASE 
          WHEN mr.quantity_expected > 0 THEN 
            ROUND(((mr.quantity_produced - mr.quantity_expected) / mr.quantity_expected * 100)::numeric, 2)
          ELSE 0 
        END as variance_percentage,
        (mr.maturation_date + INTERVAL '1 day' * mr.expected_maturation_days) as estimated_completion_date
      FROM maturation_room mr
      LEFT JOIN production_orders po ON mr.production_order_id = po.id
      LEFT JOIN users u ON mr.confirmed_by = u.id
      LEFT JOIN users qc_user ON mr.quality_checked_by = qc_user.id
      WHERE mr.id = $1
    `;
    
    const result = await DatabaseUtils.raw(query, [parseInt(id)]);
    if (result.rows.length === 0) {
      throw new NotFoundError('Maturation record not found');
    }
    return result.rows[0];
  }

  /**
   * Add new maturation room record
   */
  async addMaturationRecord(maturationData, userId) {
    // Validate required fields
    const { production_order_id, maturation_date, expected_maturation_days } = maturationData;
    
    if (!production_order_id) {
      throw new ValidationError('Production order ID is required');
    }
    
    if (!maturation_date) {
      throw new ValidationError('Maturation date is required');
    }
    
    if (!expected_maturation_days || expected_maturation_days <= 0) {
      throw new ValidationError('Expected maturation days must be a positive number');
    }
    
    // Check if production order exists
    const orderExists = await DatabaseUtils.findOne('production_orders', { id: production_order_id });
    if (!orderExists) {
      throw new ValidationError('Production order not found');
    }
    
    // Prepare maturation record
    const maturationRecord = {
      ...maturationData,
      status: 'maturing',
      confirmed_by: userId,
      created_at: new Date()
    };
    
    const result = await DatabaseUtils.insert('maturation_room', maturationRecord, '*');
    return result;
  }

  /**
   * Update maturation room record
   */
  async updateMaturationRecord(id, updateData, userId) {
    // Check if record exists
    await this.getMaturationRecordById(id);
    
    // Prepare update data
    const updatedRecord = {
      ...updateData,
      updated_at: new Date(),
      updated_by: userId
    };
    
    const result = await DatabaseUtils.update('maturation_room', { id: parseInt(id) }, updatedRecord, '*');
    if (result.length === 0) {
      throw new NotFoundError('Maturation record not found');
    }
    return result[0];
  }

  /**
   * Complete maturation process (quality check)
   */
  async completeMaturation(id, completionData, userId) {
    // Check if record exists
    const record = await this.getMaturationRecordById(id);
    
    if (record.status === 'completed') {
      throw new ValidationError('Maturation process already completed');
    }
    
    // Prepare completion data
    const completionRecord = {
      status: 'completed',
      quality_checked_by: userId,
      quality_check_date: new Date(),
      actual_completion_date: new Date(),
      ...completionData,
      updated_at: new Date(),
      updated_by: userId
    };
    
    const result = await DatabaseUtils.update('maturation_room', { id: parseInt(id) }, completionRecord, '*');
    return result[0];
  }

  /**
   * Get maturation records by status
   */
  async getMaturationRecordsByStatus(status) {
    const query = `
      SELECT 
        mr.*,
        po.order_number,
        po.product_name,
        u.username as confirmed_by_name,
        qc_user.username as quality_checked_by_name,
        CASE 
          WHEN mr.quantity_expected > 0 THEN 
            ROUND(((mr.quantity_produced - mr.quantity_expected) / mr.quantity_expected * 100)::numeric, 2)
          ELSE 0 
        END as variance_percentage,
        (mr.maturation_date + INTERVAL '1 day' * mr.expected_maturation_days) as estimated_completion_date
      FROM maturation_room mr
      LEFT JOIN production_orders po ON mr.production_order_id = po.id
      LEFT JOIN users u ON mr.confirmed_by = u.id
      LEFT JOIN users qc_user ON mr.quality_checked_by = qc_user.id
      WHERE mr.status = $1
      ORDER BY mr.maturation_date DESC, mr.id DESC
    `;
    
    const result = await DatabaseUtils.raw(query, [status]);
    return result.rows;
  }

  /**
   * Get maturation statistics
   */
  async getMaturationStatistics() {
    const query = `
      SELECT 
        status,
        COUNT(*) as count,
        AVG(CASE 
          WHEN quantity_expected > 0 THEN 
            ABS((quantity_produced - quantity_expected) / quantity_expected * 100)
          ELSE 0 
        END) as avg_variance_percentage
      FROM maturation_room
      GROUP BY status
      ORDER BY status
    `;
    
    const result = await DatabaseUtils.raw(query);
    
    // Also get overdue items
    const overdueQuery = `
      SELECT COUNT(*) as overdue_count
      FROM maturation_room
      WHERE status = 'maturing' 
        AND (maturation_date + INTERVAL '1 day' * expected_maturation_days) < NOW()
    `;
    
    const overdueResult = await DatabaseUtils.raw(overdueQuery);
    
    return {
      statusBreakdown: result.rows,
      overdueCount: overdueResult.rows[0]?.overdue_count || 0
    };
  }
}

module.exports = new MaturationService();