// Users Service - Business Logic Layer
const bcrypt = require('bcrypt');
const DatabaseUtils = require('../utils/database');
const { NotFoundError, ValidationError } = require('../middleware/error-handler');

class UsersService {
  
  /**
   * Helper method to get the standard user fields with proper employee code formatting
   */
  getUserSelectFields() {
    return `
      id, 
      username, 
      full_name,
      CASE 
        WHEN employee_code IS NOT NULL AND employee_code != '' THEN employee_code
        WHEN profile_data->>'employee_code' IS NOT NULL AND profile_data->>'employee_code' != '' THEN profile_data->>'employee_code'
        ELSE LPAD(id::text, 4, '0')
      END as employee_code,
      role, 
      email, 
      phone, 
      profile_data, 
      is_active, 
      created_at, 
      last_login
    `;
  }

  /**
   * Get all users with optional filtering
   */
  async getAllUsers(filters = {}) {
    const { role, include_inactive = false } = filters;
    
    let conditions = {};
    
    if (!include_inactive) {
      conditions.is_active = true;
    }
    
    if (role) {
      const roles = role.split(',').map(r => r.trim());
      // For multiple roles, we need to use raw query
      if (roles.length > 1) {
        let query = `
          SELECT ${this.getUserSelectFields().trim()}
          FROM users 
        `;
        
        const params = [];
        let whereConditions = [];
        
        if (!include_inactive) {
          whereConditions.push('is_active = true');
        }
        
        whereConditions.push('role = ANY($' + (params.length + 1) + ')');
        params.push(roles);
        
        if (whereConditions.length > 0) {
          query += 'WHERE ' + whereConditions.join(' AND ');
        }
        
        query += ' ORDER BY full_name, username';
        
        const result = await DatabaseUtils.raw(query, params);
        return result.rows;
      } else {
        conditions.role = roles[0];
      }
    }
    
    // Use raw query for consistent employee code formatting
    let query = `
      SELECT ${this.getUserSelectFields().trim()}
      FROM users 
    `;
    
    const params = [];
    let whereConditions = [];
    
    if (!include_inactive) {
      whereConditions.push('is_active = true');
    }
    
    if (conditions.role) {
      whereConditions.push('role = $' + (params.length + 1));
      params.push(conditions.role);
    }
    
    if (whereConditions.length > 0) {
      query += 'WHERE ' + whereConditions.join(' AND ') + ' ';
    }
    
    query += 'ORDER BY full_name, username';
    
    const result = await DatabaseUtils.raw(query, params);
    return result.rows;
  }

  /**
   * Get user by ID
   */
  async getUserById(id) {
    const query = `
      SELECT ${this.getUserSelectFields().trim()}
      FROM users
      WHERE id = $1
    `;
    
    const result = await DatabaseUtils.raw(query, [id]);
    
    if (!result.rows.length) {
      throw new NotFoundError('User');
    }
    return result.rows[0];
  }

  /**
   * Create new user (admin function)
   */
  async createUser(userData, createdByUserId) {
    const {
      username,
      email,
      password,
      role,
      full_name,
      employee_code,
      phone,
      profile_data = {}
    } = userData;

    // Validate required fields
    if (!username || !email || !password || !role) {
      throw new ValidationError('Username, email, password, and role are required');
    }

    // Validate role
    const validRoles = ['admin', 'supervisor', 'operator', 'viewer'];
    if (!validRoles.includes(role)) {
      throw new ValidationError('Invalid role. Must be one of: ' + validRoles.join(', '));
    }

    // Validate username length
    if (username.length < 3) {
      throw new ValidationError('Username must be at least 3 characters long');
    }

    // Validate password length
    if (password.length < 6) {
      throw new ValidationError('Password must be at least 6 characters long');
    }

    // Check for duplicate username
    const existingUser = await DatabaseUtils.findOne('users', { username });
    if (existingUser) {
      throw new ValidationError('Username already exists');
    }

    // Check for duplicate email
    const existingEmail = await DatabaseUtils.findOne('users', { email });
    if (existingEmail) {
      throw new ValidationError('Email already exists');
    }

    // Hash password
    const password_hash = await bcrypt.hash(password, 12);

    // Create user
    const newUser = await DatabaseUtils.insert('users', {
      username: username.trim(),
      email: email.toLowerCase().trim(),
      password_hash,
      role,
      full_name: full_name ? full_name.trim() : null,
      employee_code: employee_code ? employee_code.trim() : null,
      phone: phone ? phone.trim() : null,
      profile_data: JSON.stringify(profile_data),
      is_active: true,
      created_at: new Date(),
      created_by: createdByUserId
    });

    // Return user without password hash
    const { password_hash: _, ...userWithoutPassword } = newUser;
    return userWithoutPassword;
  }

  /**
   * Update user (admin function)
   */
  async updateUser(id, updateData, updatedByUserId) {
    const user = await this.getUserById(id);
    
    // Prevent updating password through this method (use change password endpoint)
    if (updateData.password || updateData.password_hash) {
      throw new ValidationError('Use change-password endpoint to update passwords');
    }

    // Validate role if provided
    if (updateData.role) {
      const validRoles = ['admin', 'supervisor', 'operator', 'viewer'];
      if (!validRoles.includes(updateData.role)) {
        throw new ValidationError('Invalid role. Must be one of: ' + validRoles.join(', '));
      }
    }

    // Check for duplicate username if changing
    if (updateData.username && updateData.username !== user.username) {
      const existingUser = await DatabaseUtils.findOne('users', { username: updateData.username });
      if (existingUser) {
        throw new ValidationError('Username already exists');
      }
    }

    // Check for duplicate email if changing
    if (updateData.email && updateData.email !== user.email) {
      const existingEmail = await DatabaseUtils.findOne('users', { email: updateData.email.toLowerCase() });
      if (existingEmail) {
        throw new ValidationError('Email already exists');
      }
    }

    // Prepare update data
    const cleanUpdateData = { ...updateData };
    
    // Remove fields that shouldn't be updated directly
    delete cleanUpdateData.id;
    delete cleanUpdateData.password; // Password updates should use separate endpoint
    delete cleanUpdateData.password_hash;
    delete cleanUpdateData.created_at;
    delete cleanUpdateData.updated_at;
    delete cleanUpdateData.updated_by;
    
    // Trim string fields
    if (cleanUpdateData.username) cleanUpdateData.username = cleanUpdateData.username.trim();
    if (cleanUpdateData.email) cleanUpdateData.email = cleanUpdateData.email.toLowerCase().trim();
    if (cleanUpdateData.full_name) cleanUpdateData.full_name = cleanUpdateData.full_name.trim();
    if (cleanUpdateData.employee_code) cleanUpdateData.employee_code = cleanUpdateData.employee_code.trim();
    if (cleanUpdateData.phone) cleanUpdateData.phone = cleanUpdateData.phone.trim();
    
    // Handle profile_data
    if (cleanUpdateData.profile_data && typeof cleanUpdateData.profile_data === 'object') {
      cleanUpdateData.profile_data = JSON.stringify(cleanUpdateData.profile_data);
    }

    await DatabaseUtils.update(
      'users',
      {
        ...cleanUpdateData,
        updated_at: new Date(),
        updated_by: updatedByUserId
      },
      { id }
    );

    // Return user with properly formatted employee code
    return await this.getUserById(id);
  }

  /**
   * Deactivate user (soft delete)
   */
  async deactivateUser(id, deactivatedByUserId) {
    const user = await this.getUserById(id);
    
    // Prevent deactivating the last admin
    if (user.role === 'admin') {
      const adminCount = await DatabaseUtils.raw(
        'SELECT COUNT(*) as count FROM users WHERE role = $1 AND is_active = true',
        ['admin']
      );
      
      if (parseInt(adminCount.rows[0].count) <= 1) {
        throw new ValidationError('Cannot deactivate the last admin user');
      }
    }

    await DatabaseUtils.update(
      'users',
      {
        is_active: false,
        deactivated_at: new Date(),
        deactivated_by: deactivatedByUserId
      },
      { id }
    );

    // Return user with properly formatted employee code
    return await this.getUserById(id);
  }

  /**
   * Reactivate user
   */
  async reactivateUser(id, reactivatedByUserId) {
    await this.getUserById(id); // Ensure user exists
    
    await DatabaseUtils.update(
      'users',
      {
        is_active: true,
        reactivated_at: new Date(),
        reactivated_by: reactivatedByUserId,
        deactivated_at: null,
        deactivated_by: null
      },
      { id }
    );

    // Return user with properly formatted employee code
    return await this.getUserById(id);
  }

  /**
   * Get user statistics by role
   */
  async getUserStats() {
    const query = `
      SELECT 
        role,
        COUNT(*) as total,
        SUM(CASE WHEN is_active = true THEN 1 ELSE 0 END) as active,
        SUM(CASE WHEN is_active = false THEN 1 ELSE 0 END) as inactive,
        SUM(CASE WHEN last_login > (NOW() - INTERVAL '30 days') AND is_active = true THEN 1 ELSE 0 END) as active_last_30_days
      FROM users
      GROUP BY role
      ORDER BY role
    `;

    const result = await DatabaseUtils.raw(query);
    return result.rows;
  }

  /**
   * Search users by name, username, or employee code
   */
  async searchUsers(searchTerm, filters = {}) {
    if (!searchTerm || searchTerm.length < 2) {
      throw new ValidationError('Search term must be at least 2 characters long');
    }

    const { role, include_inactive = false } = filters;
    
    let query = `
      SELECT 
        id, 
        username, 
        full_name,
        CASE 
          WHEN employee_code IS NOT NULL AND employee_code != '' THEN employee_code
          WHEN profile_data->>'employee_code' IS NOT NULL AND profile_data->>'employee_code' != '' THEN profile_data->>'employee_code'
          ELSE LPAD(id::text, 4, '0')
        END as employee_code,
        role, 
        email, 
        phone, 
        is_active
      FROM users 
      WHERE (
        LOWER(username) LIKE LOWER($1) OR
        LOWER(full_name) LIKE LOWER($1) OR
        LOWER(COALESCE(employee_code, profile_data->>'employee_code', LPAD(id::text, 4, '0'))) LIKE LOWER($1) OR
        LOWER(email) LIKE LOWER($1)
      )
    `;

    const params = [`%${searchTerm}%`];
    let paramIndex = 2;

    if (!include_inactive) {
      query += ` AND is_active = true`;
    }

    if (role) {
      const roles = role.split(',').map(r => r.trim());
      query += ` AND role = ANY($${paramIndex})`;
      params.push(roles);
    }

    query += ` ORDER BY full_name, username LIMIT 50`;

    const result = await DatabaseUtils.raw(query, params);
    return result.rows;
  }

  /**
   * Get users by role (for dropdowns and selections)
   */
  async getUsersByRole(role) {
    if (!role) {
      throw new ValidationError('Role is required');
    }

    const validRoles = ['admin', 'supervisor', 'operator', 'viewer'];
    if (!validRoles.includes(role)) {
      throw new ValidationError('Invalid role');
    }

    const query = `
      SELECT 
        id, 
        username, 
        full_name,
        CASE 
          WHEN employee_code IS NOT NULL AND employee_code != '' THEN employee_code
          WHEN profile_data->>'employee_code' IS NOT NULL AND profile_data->>'employee_code' != '' THEN profile_data->>'employee_code'
          ELSE LPAD(id::text, 4, '0')
        END as employee_code,
        role
      FROM users
      WHERE role = $1 AND is_active = true
      ORDER BY full_name, username
    `;

    const result = await DatabaseUtils.raw(query, [role]);
    return result.rows;
  }
}

module.exports = new UsersService();