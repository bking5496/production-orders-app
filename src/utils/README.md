# utils/ - Utility Functions Layer

## 🛠️ **Overview**
The utils layer provides reusable utility functions and common operations that are used across the entire application. These utilities abstract complex operations into simple, testable functions.

## 🏗️ **Utilities Architecture**

### **Design Principles**
- **Pure Functions:** No side effects, predictable inputs/outputs
- **Reusability:** Functions can be used across multiple services and routes
- **Consistency:** Standardized patterns and interfaces
- **Performance:** Optimized for common operations
- **Testability:** Easy to unit test in isolation

### **Utility Pattern**
```javascript
// Pure utility functions
const utilityFunction = (input, options = {}) => {
  // 1. Validate inputs
  if (!input) throw new Error('Input required');
  
  // 2. Process data
  const result = processData(input, options);
  
  // 3. Return processed result
  return result;
};

// Export for reuse
module.exports = { utilityFunction };
```

## 🛠️ **Utility Modules**

### 🗄️ **database.js** - Database Operations Utilities
**Purpose:** Standardized CRUD operations, query utilities, and database connection management

#### **Core Features:**
- Standardized database operations
- Connection pooling management
- Transaction support
- Query optimization
- Error handling and logging

#### **Database Connection Management:**

##### **Pool Management**
```javascript
const { Pool } = require('pg');
const { getSecret } = require('../../security/secrets-manager');

class DatabaseUtils {
  constructor() {
    this.pool = new Pool({
      host: 'localhost',
      port: 5432,
      user: 'postgres',
      password: getSecret('DB_PASSWORD'),
      database: 'production_orders',
      max: 20,          // Maximum pool size
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000
    });

    this.pool.on('connect', () => {
      console.log('✅ New PostgreSQL client connected');
    });

    this.pool.on('error', (err) => {
      console.error('❌ Unexpected error on idle client', err);
    });
  }
}
```

#### **CRUD Operations:**

##### **`select`** - Read Operations
```javascript
async select(table, conditions = {}, options = {}) {
  const { 
    columns = '*', 
    orderBy = null, 
    limit = null, 
    offset = null 
  } = options;
  
  let query = `SELECT ${columns} FROM ${table}`;
  let values = [];
  let valueIndex = 1;
  
  // Add WHERE conditions
  if (Object.keys(conditions).length > 0) {
    const whereClause = Object.keys(conditions)
      .map(key => `${key} = $${valueIndex++}`)
      .join(' AND ');
    query += ` WHERE ${whereClause}`;
    values = Object.values(conditions);
  }
  
  // Add ORDER BY
  if (orderBy) {
    query += ` ORDER BY ${orderBy}`;
  }
  
  // Add LIMIT and OFFSET
  if (limit) {
    query += ` LIMIT ${limit}`;
  }
  if (offset) {
    query += ` OFFSET ${offset}`;
  }
  
  const result = await this.query(query, values);
  return result.rows;
}
```

##### **`insert`** - Create Operations
```javascript
async insert(table, data, returning = 'id') {
  const keys = Object.keys(data);
  const values = Object.values(data);
  const placeholders = keys.map((_, index) => `$${index + 1}`);
  
  const query = `
    INSERT INTO ${table} (${keys.join(', ')}) 
    VALUES (${placeholders.join(', ')})
    ${returning ? `RETURNING ${returning}` : ''}
  `;
  
  const result = await this.query(query, values);
  return returning ? result.rows[0] : result;
}
```

##### **`update`** - Update Operations
```javascript
async update(table, data, conditions, returning = null) {
  const dataKeys = Object.keys(data);
  const conditionKeys = Object.keys(conditions);
  
  const setClause = dataKeys
    .map((key, index) => `${key} = $${index + 1}`)
    .join(', ');
    
  const whereClause = conditionKeys
    .map((key, index) => `${key} = $${dataKeys.length + index + 1}`)
    .join(' AND ');
  
  const query = `
    UPDATE ${table} 
    SET ${setClause} 
    WHERE ${whereClause}
    ${returning ? `RETURNING ${returning}` : ''}
  `;
  
  const values = [...Object.values(data), ...Object.values(conditions)];
  const result = await this.query(query, values);
  return returning ? result.rows : result;
}
```

##### **`delete`** - Delete Operations
```javascript
async delete(table, conditions) {
  const keys = Object.keys(conditions);
  const values = Object.values(conditions);
  
  const whereClause = keys
    .map((key, index) => `${key} = $${index + 1}`)
    .join(' AND ');
  
  const query = `DELETE FROM ${table} WHERE ${whereClause}`;
  
  const result = await this.query(query, values);
  return result.rowCount;
}
```

#### **Advanced Operations:**

##### **`transaction`** - Transaction Support
```javascript
async transaction(operations) {
  const client = await this.pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const results = [];
    for (const operation of operations) {
      const result = await client.query(operation.text, operation.params);
      results.push(result);
    }
    
    await client.query('COMMIT');
    return results;
    
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
```

##### **`findOne`** - Single Record Retrieval
```javascript
async findOne(table, conditions) {
  const results = await this.select(table, conditions, { limit: 1 });
  return results.length > 0 ? results[0] : null;
}
```

##### **`exists`** - Record Existence Check
```javascript
async exists(table, conditions) {
  const result = await this.query(
    `SELECT EXISTS(SELECT 1 FROM ${table} WHERE ${
      Object.keys(conditions)
        .map((key, index) => `${key} = $${index + 1}`)
        .join(' AND ')
    })`,
    Object.values(conditions)
  );
  
  return result.rows[0].exists;
}
```

##### **`raw`** - Raw Query Execution
```javascript
async raw(query, params = []) {
  return await this.query(query, params);
}
```

#### **Usage Examples:**
```javascript
const DatabaseUtils = require('./src/utils/database');

// Select operations
const activeUsers = await DatabaseUtils.select('users', 
  { is_active: true }, 
  { orderBy: 'created_at DESC', limit: 10 }
);

// Insert operations
const newOrder = await DatabaseUtils.insert('production_orders', {
  order_number: 'ORD001',
  product_name: 'Product A',
  quantity: 100,
  created_at: new Date()
}, '*');

// Update operations
await DatabaseUtils.update('production_orders', 
  { status: 'completed', completed_at: new Date() },
  { id: orderId },
  '*'
);

// Transaction example
await DatabaseUtils.transaction([
  {
    text: 'INSERT INTO production_orders (order_number, quantity) VALUES ($1, $2)',
    params: ['ORD002', 200]
  },
  {
    text: 'UPDATE inventory SET quantity = quantity - $1 WHERE product_id = $2',
    params: [200, 1]
  }
]);
```

---

### 📤 **response.js** - API Response Utilities
**Purpose:** Consistent API response formatting and standardized response patterns

#### **Core Features:**
- Standardized response formats
- Consistent error handling
- Validation error formatting
- Pagination support
- Status code management

#### **Response Classes:**

##### **`ResponseUtils`** - Static Response Methods
```javascript
class ResponseUtils {
  /**
   * Success response with data
   */
  static success(res, data = null, message = 'Success', statusCode = 200) {
    return res.status(statusCode).json({
      success: true,
      message,
      data,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Error response
   */
  static error(res, message = 'Internal Server Error', statusCode = 500, details = null) {
    return res.status(statusCode).json({
      success: false,
      message,
      error: details,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Validation error response
   */
  static validationError(res, errors, message = 'Validation failed') {
    return res.status(400).json({
      success: false,
      message,
      errors: this.formatValidationErrors(errors),
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Paginated response
   */
  static paginated(res, data, pagination, message = 'Data retrieved successfully') {
    return res.status(200).json({
      success: true,
      message,
      data,
      pagination: {
        currentPage: pagination.page || 1,
        totalPages: Math.ceil(pagination.total / pagination.limit),
        totalItems: pagination.total,
        itemsPerPage: pagination.limit,
        hasNextPage: (pagination.page || 1) < Math.ceil(pagination.total / pagination.limit),
        hasPreviousPage: (pagination.page || 1) > 1
      },
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Not found response
   */
  static notFound(res, resource = 'Resource') {
    return res.status(404).json({
      success: false,
      message: `${resource} not found`,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Created response
   */
  static created(res, data, message = 'Resource created successfully') {
    return res.status(201).json({
      success: true,
      message,
      data,
      timestamp: new Date().toISOString()
    });
  }
}
```

#### **Helper Functions:**

##### **Validation Error Formatting**
```javascript
static formatValidationErrors(errors) {
  if (Array.isArray(errors)) {
    return errors.map(error => ({
      field: error.param || error.path,
      message: error.msg || error.message,
      value: error.value,
      location: error.location || 'body'
    }));
  }
  
  return errors;
}
```

##### **Pagination Helper**
```javascript
static calculatePagination(page = 1, limit = 25, total = 0) {
  const currentPage = Math.max(1, parseInt(page));
  const itemsPerPage = Math.min(100, Math.max(1, parseInt(limit)));
  const totalPages = Math.ceil(total / itemsPerPage);
  const offset = (currentPage - 1) * itemsPerPage;

  return {
    page: currentPage,
    limit: itemsPerPage,
    offset,
    total,
    totalPages,
    hasNextPage: currentPage < totalPages,
    hasPreviousPage: currentPage > 1
  };
}
```

#### **Express Middleware Integration:**

##### **`addResponseUtils`** - Middleware Function
```javascript
const addResponseUtils = (req, res, next) => {
  // Add response utility methods to res object
  res.success = (data, message, statusCode) => 
    ResponseUtils.success(res, data, message, statusCode);
    
  res.error = (message, statusCode, details) => 
    ResponseUtils.error(res, message, statusCode, details);
    
  res.validationError = (errors, message) => 
    ResponseUtils.validationError(res, errors, message);
    
  res.paginated = (data, pagination, message) => 
    ResponseUtils.paginated(res, data, pagination, message);
    
  res.notFound = (resource) => 
    ResponseUtils.notFound(res, resource);
    
  res.created = (data, message) => 
    ResponseUtils.created(res, data, message);

  next();
};
```

#### **Usage Examples:**
```javascript
// In route handlers
router.get('/orders', asyncHandler(async (req, res) => {
  const orders = await ordersService.getOrders();
  return res.success(orders, 'Orders retrieved successfully');
}));

router.post('/orders', asyncHandler(async (req, res) => {
  const order = await ordersService.createOrder(req.body);
  return res.created(order, 'Order created successfully');
}));

// Error responses
router.get('/orders/:id', asyncHandler(async (req, res) => {
  const order = await ordersService.getOrderById(req.params.id);
  
  if (!order) {
    return res.notFound('Order');
  }
  
  return res.success(order);
}));

// Validation errors (automatically handled by middleware)
router.post('/orders', 
  [
    body('order_number').notEmpty(),
    body('quantity').isInt({ min: 1 })
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.validationError(errors.array());
    }
    
    // Process valid request...
  })
);

// Paginated responses
router.get('/orders', asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 25;
  
  const { orders, total } = await ordersService.getOrdersPaginated(page, limit);
  const pagination = ResponseUtils.calculatePagination(page, limit, total);
  
  return res.paginated(orders, pagination);
}));
```

#### **Response Format Examples:**

##### **Success Response:**
```json
{
  "success": true,
  "message": "Orders retrieved successfully",
  "data": [
    {
      "id": 1,
      "order_number": "ORD001",
      "status": "in_progress"
    }
  ],
  "timestamp": "2025-08-07T22:00:00.000Z"
}
```

##### **Error Response:**
```json
{
  "success": false,
  "message": "Order not found",
  "error": {
    "type": "not_found",
    "resource": "Order"
  },
  "timestamp": "2025-08-07T22:00:00.000Z"
}
```

##### **Validation Error Response:**
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "order_number",
      "message": "Order number is required",
      "value": "",
      "location": "body"
    }
  ],
  "timestamp": "2025-08-07T22:00:00.000Z"
}
```

##### **Paginated Response:**
```json
{
  "success": true,
  "message": "Orders retrieved successfully",
  "data": [...],
  "pagination": {
    "currentPage": 2,
    "totalPages": 5,
    "totalItems": 123,
    "itemsPerPage": 25,
    "hasNextPage": true,
    "hasPreviousPage": true
  },
  "timestamp": "2025-08-07T22:00:00.000Z"
}
```

---

## 🔄 **Utility Integration**

### **Cross-Service Usage**
```javascript
// In service classes
class OrdersService {
  async getOrders(filters = {}) {
    // Use DatabaseUtils for data operations
    const orders = await DatabaseUtils.select('production_orders', filters);
    return orders;
  }
  
  async createOrder(orderData) {
    // Database transaction for complex operations
    return await DatabaseUtils.transaction([
      {
        text: 'INSERT INTO production_orders (...) VALUES (...)',
        params: [...]
      },
      {
        text: 'UPDATE inventory SET quantity = quantity - $1 WHERE product_id = $2',
        params: [orderData.quantity, orderData.product_id]
      }
    ]);
  }
}
```

### **Route Integration**
```javascript
// In route handlers
router.get('/orders', 
  addResponseUtils,    // Add response utilities
  asyncHandler(async (req, res) => {
    const orders = await ordersService.getOrders();
    return res.success(orders);  // Use response utilities
  })
);
```

## 🧪 **Testing Utilities**

### **Database Utils Testing**
```javascript
describe('DatabaseUtils', () => {
  test('should insert record and return it', async () => {
    const testData = { name: 'Test', value: 123 };
    const result = await DatabaseUtils.insert('test_table', testData, '*');
    
    expect(result).toBeDefined();
    expect(result.name).toBe('Test');
  });
  
  test('should handle transaction rollback on error', async () => {
    const operations = [
      { text: 'INSERT INTO table1 VALUES ($1)', params: ['value1'] },
      { text: 'INVALID SQL', params: [] }  // This will cause rollback
    ];
    
    await expect(DatabaseUtils.transaction(operations)).rejects.toThrow();
  });
});
```

### **Response Utils Testing**
```javascript
describe('ResponseUtils', () => {
  test('should format success response correctly', () => {
    const mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    
    ResponseUtils.success(mockRes, { test: 'data' }, 'Success');
    
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        message: 'Success',
        data: { test: 'data' }
      })
    );
  });
});
```

## 📊 **Performance Optimizations**

### **Database Performance**
- Connection pooling for efficient resource usage
- Prepared statements for query optimization
- Index-aware query patterns
- Transaction batching for bulk operations

### **Response Performance**
- Minimal object creation in response formatting
- Efficient error message formatting
- Optimized pagination calculations
- Response caching where appropriate

## 🚀 **Best Practices**

### **Database Utilities**
1. **Connection Management** - Always use connection pooling
2. **Error Handling** - Handle database errors gracefully
3. **Query Optimization** - Use efficient query patterns
4. **Transaction Safety** - Use transactions for multi-step operations
5. **Input Validation** - Validate all inputs before queries

### **Response Utilities**
1. **Consistency** - Always use standardized response formats
2. **Error Details** - Provide helpful error messages
3. **Status Codes** - Use appropriate HTTP status codes
4. **Pagination** - Implement pagination for large datasets
5. **Security** - Don't expose sensitive information in responses

### **General Utilities**
1. **Pure Functions** - Write side-effect-free functions
2. **Reusability** - Design for cross-module usage
3. **Testing** - Write comprehensive unit tests
4. **Documentation** - Document all public functions
5. **Performance** - Optimize for common use cases

---

*The utilities layer provides the foundation for efficient, consistent, and maintainable operations across the entire application architecture.*