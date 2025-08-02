// Configuration Management API Endpoints
// Dynamic configuration system for all lists and step-by-step processes

const { body, validationResult } = require('express-validator');

module.exports = function(app, db, authenticateToken, requireRole, broadcastFn) {
  
  // ================================
  // CONFIGURATION CATEGORIES API
  // ================================
  
  // Get all configuration categories
  app.get('/api/config/categories', authenticateToken, requireRole(['admin', 'supervisor']), (req, res) => {
    db.all(`
      SELECT cc.*, 
             COUNT(ci.id) as item_count
      FROM configuration_categories cc
      LEFT JOIN configuration_items ci ON cc.id = ci.category_id AND ci.is_active = true
      WHERE cc.is_active = true
      GROUP BY cc.id
      ORDER BY cc.sort_order, cc.display_name
    `, [], (err, categories) => {
      if (err) {
        console.error('Error fetching configuration categories:', err);
        return res.status(500).json({ error: 'Failed to fetch configuration categories' });
      }
      res.json(categories);
    });
  });
  
  // ================================
  // CONFIGURATION ITEMS API
  // ================================
  
  // Get all configuration items for a category
  app.get('/api/config/categories/:categoryId/items', authenticateToken, requireRole(['admin', 'supervisor']), (req, res) => {
    const { categoryId } = req.params;
    
    db.all(`
      SELECT ci.*, cc.name as category_name, cc.display_name as category_display_name
      FROM configuration_items ci
      JOIN configuration_categories cc ON ci.category_id = cc.id
      WHERE ci.category_id = ? AND ci.is_active = true
      ORDER BY ci.sort_order, ci.display_name
    `, [categoryId], (err, items) => {
      if (err) {
        console.error('Error fetching configuration items:', err);
        return res.status(500).json({ error: 'Failed to fetch configuration items' });
      }
      res.json(items);
    });
  });
  
  // Get a specific configuration item
  app.get('/api/config/items/:itemId', authenticateToken, requireRole(['admin', 'supervisor']), (req, res) => {
    const { itemId } = req.params;
    
    db.get(`
      SELECT ci.*, cc.name as category_name, cc.display_name as category_display_name
      FROM configuration_items ci
      JOIN configuration_categories cc ON ci.category_id = cc.id
      WHERE ci.id = ?
    `, [itemId], (err, item) => {
      if (err) {
        console.error('Error fetching configuration item:', err);
        return res.status(500).json({ error: 'Failed to fetch configuration item' });
      }
      if (!item) {
        return res.status(404).json({ error: 'Configuration item not found' });
      }
      res.json(item);
    });
  });
  
  // Update a configuration item
  app.put('/api/config/items/:itemId', 
    authenticateToken, 
    requireRole(['admin']),
    [
      body('current_value').notEmpty().withMessage('Current value is required'),
      body('change_reason').optional().isString().withMessage('Change reason must be a string')
    ],
    (req, res) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      
      const { itemId } = req.params;
      const { current_value, change_reason } = req.body;
      
      // First get the current item to track history
      db.get('SELECT * FROM configuration_items WHERE id = ?', [itemId], (err, currentItem) => {
        if (err) {
          console.error('Error fetching current configuration item:', err);
          return res.status(500).json({ error: 'Failed to fetch current configuration' });
        }
        
        if (!currentItem) {
          return res.status(404).json({ error: 'Configuration item not found' });
        }
        
        if (!currentItem.is_editable) {
          return res.status(403).json({ error: 'This configuration item is not editable' });
        }
        
        // Validate the new value based on value_type
        let validatedValue;
        try {
          validatedValue = validateConfigurationValue(current_value, currentItem.value_type, currentItem.validation_rules);
        } catch (validationError) {
          return res.status(400).json({ error: validationError.message });
        }
        
        // Start transaction
        db.serialize(() => {
          db.run('BEGIN TRANSACTION');
          
          // Update the configuration item
          db.run(`
            UPDATE configuration_items 
            SET current_value = ?, updated_at = NOW(), updated_by = ?
            WHERE id = ?
          `, [JSON.stringify(validatedValue), req.user.id, itemId], function(updateErr) {
            if (updateErr) {
              db.run('ROLLBACK');
              console.error('Error updating configuration item:', updateErr);
              return res.status(500).json({ error: 'Failed to update configuration item' });
            }
            
            // Log the change in history
            db.run(`
              INSERT INTO configuration_history (config_item_id, old_value, new_value, changed_by, change_reason)
              VALUES (?, ?, ?, ?, ?)
            `, [itemId, JSON.stringify(currentItem.current_value), JSON.stringify(validatedValue), req.user.id, change_reason || 'Configuration updated'], function(historyErr) {
              if (historyErr) {
                db.run('ROLLBACK');
                console.error('Error logging configuration history:', historyErr);
                return res.status(500).json({ error: 'Failed to log configuration change' });
              }
              
              db.run('COMMIT');
              
              // Broadcast configuration change to all connected clients
              if (broadcastFn) {
                broadcastFn('configuration_updated', {
                  category: currentItem.category_id,
                  key: currentItem.key,
                  old_value: currentItem.current_value,
                  new_value: validatedValue,
                  updated_by: req.user.username,
                  requires_restart: currentItem.requires_restart
                });
              }
              
              res.json({ 
                message: 'Configuration updated successfully',
                requires_restart: currentItem.requires_restart,
                item: {
                  ...currentItem,
                  current_value: validatedValue,
                  updated_at: new Date().toISOString(),
                  updated_by: req.user.id
                }
              });
            });
          });
        });
      });
    }
  );
  
  // Get configuration history for an item
  app.get('/api/config/items/:itemId/history', authenticateToken, requireRole(['admin', 'supervisor']), (req, res) => {
    const { itemId } = req.params;
    const { limit = 50, offset = 0 } = req.query;
    
    db.all(`
      SELECT ch.*, u.username as changed_by_username
      FROM configuration_history ch
      JOIN users u ON ch.changed_by = u.id
      WHERE ch.config_item_id = ?
      ORDER BY ch.created_at DESC
      LIMIT ? OFFSET ?
    `, [itemId, limit, offset], (err, history) => {
      if (err) {
        console.error('Error fetching configuration history:', err);
        return res.status(500).json({ error: 'Failed to fetch configuration history' });
      }
      res.json(history);
    });
  });
  
  // ================================
  // PUBLIC CONFIGURATION API
  // ================================
  
  // Get public configuration (for frontend use)
  app.get('/api/config/public', (req, res) => {
    db.all(`
      SELECT ci.key, ci.current_value, cc.name as category
      FROM configuration_items ci
      JOIN configuration_categories cc ON ci.category_id = cc.id
      WHERE ci.is_active = true AND ci.key IN (
        'order_statuses', 'order_priorities', 'order_status_transitions',
        'machine_statuses', 'machine_types', 'environments', 'machine_status_transitions',
        'user_roles', 'stop_reasons', 'waste_types', 'quality_checkpoints'
      )
      ORDER BY cc.sort_order, ci.sort_order
    `, [], (err, items) => {
      if (err) {
        console.error('Error fetching public configuration:', err);
        return res.status(500).json({ error: 'Failed to fetch configuration' });
      }
      
      // Transform into a structured object
      const config = {};
      items.forEach(item => {
        if (!config[item.category]) {
          config[item.category] = {};
        }
        config[item.category][item.key] = item.current_value;
      });
      
      res.json(config);
    });
  });
  
  // Get specific configuration value by key
  app.get('/api/config/:category/:key', (req, res) => {
    const { category, key } = req.params;
    
    db.get(`
      SELECT ci.current_value, ci.value_type
      FROM configuration_items ci
      JOIN configuration_categories cc ON ci.category_id = cc.id
      WHERE cc.name = ? AND ci.key = ? AND ci.is_active = true
    `, [category, key], (err, item) => {
      if (err) {
        console.error('Error fetching configuration value:', err);
        return res.status(500).json({ error: 'Failed to fetch configuration value' });
      }
      
      if (!item) {
        return res.status(404).json({ error: 'Configuration not found' });
      }
      
      res.json({
        value: item.current_value,
        type: item.value_type
      });
    });
  });
  
  // ================================
  // CONFIGURATION EXPORT/IMPORT
  // ================================
  
  // Export all configurations
  app.get('/api/config/export', authenticateToken, requireRole(['admin']), (req, res) => {
    db.all(`
      SELECT cc.name as category, ci.key, ci.display_name, ci.description, 
             ci.value_type, ci.current_value, ci.default_value, ci.validation_rules,
             ci.enum_options, ci.is_editable, ci.requires_restart
      FROM configuration_items ci
      JOIN configuration_categories cc ON ci.category_id = cc.id
      WHERE ci.is_active = true
      ORDER BY cc.sort_order, ci.sort_order
    `, [], (err, items) => {
      if (err) {
        console.error('Error exporting configurations:', err);
        return res.status(500).json({ error: 'Failed to export configurations' });
      }
      
      const exportData = {
        export_timestamp: new Date().toISOString(),
        exported_by: req.user.username,
        version: '1.0',
        configurations: items
      };
      
      res.setHeader('Content-Disposition', 'attachment; filename=configuration-export.json');
      res.setHeader('Content-Type', 'application/json');
      res.json(exportData);
    });
  });
  
  // ================================
  // VALIDATION HELPERS
  // ================================
  
  function validateConfigurationValue(value, valueType, validationRules) {
    const rules = typeof validationRules === 'string' ? JSON.parse(validationRules) : validationRules || {};
    
    switch (valueType) {
      case 'string':
        if (typeof value !== 'string') {
          throw new Error('Value must be a string');
        }
        if (rules.minLength && value.length < rules.minLength) {
          throw new Error(`Value must be at least ${rules.minLength} characters long`);
        }
        if (rules.maxLength && value.length > rules.maxLength) {
          throw new Error(`Value must be no more than ${rules.maxLength} characters long`);
        }
        if (rules.pattern && !new RegExp(rules.pattern).test(value)) {
          throw new Error('Value does not match the required pattern');
        }
        break;
        
      case 'number':
        if (typeof value !== 'number') {
          throw new Error('Value must be a number');
        }
        if (rules.min !== undefined && value < rules.min) {
          throw new Error(`Value must be at least ${rules.min}`);
        }
        if (rules.max !== undefined && value > rules.max) {
          throw new Error(`Value must be no more than ${rules.max}`);
        }
        break;
        
      case 'boolean':
        if (typeof value !== 'boolean') {
          throw new Error('Value must be a boolean');
        }
        break;
        
      case 'array':
        if (!Array.isArray(value)) {
          throw new Error('Value must be an array');
        }
        if (rules.minItems && value.length < rules.minItems) {
          throw new Error(`Array must have at least ${rules.minItems} items`);
        }
        if (rules.maxItems && value.length > rules.maxItems) {
          throw new Error(`Array must have no more than ${rules.maxItems} items`);
        }
        break;
        
      case 'object':
        if (typeof value !== 'object' || value === null || Array.isArray(value)) {
          throw new Error('Value must be an object');
        }
        break;
        
      case 'json':
        // Value should already be parsed JSON
        break;
        
      default:
        throw new Error(`Unknown value type: ${valueType}`);
    }
    
    return value;
  }
};