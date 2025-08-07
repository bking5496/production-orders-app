// System Routes - Settings, health, environments, and machine types
const express = require('express');
const router = express.Router();
const systemService = require('../services/system.service');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/error-handler');
const { ResponseUtils, addResponseUtils } = require('../utils/response');
const { body, param, query } = require('express-validator');

// Middleware setup
router.use(addResponseUtils);

// Health endpoints
router.get('/health', asyncHandler(async (req, res) => {
  const healthData = await systemService.getSystemHealth();
  return res.success(healthData, 'System health check completed');
}));

router.get('/health/detailed', authenticateToken, requireRole(['admin']), asyncHandler(async (req, res) => {
  const healthData = await systemService.getSystemHealth();
  const statistics = await systemService.getSystemStatistics();
  
  return res.success({
    health: healthData,
    statistics: statistics
  }, 'Detailed system health check completed');
}));

// General settings endpoints
router.get('/settings/general', authenticateToken, asyncHandler(async (req, res) => {
  const settings = await systemService.getGeneralSettings();
  return res.success(settings, 'General settings retrieved successfully');
}));

router.put('/settings/general', 
  authenticateToken, 
  requireRole(['admin', 'supervisor']),
  [
    body('theme').optional().isIn(['light', 'dark']).withMessage('Theme must be light or dark'),
    body('language').optional().isLength({ min: 2, max: 5 }).withMessage('Language must be 2-5 characters'),
    body('timezone').optional().isString().withMessage('Timezone must be a string'),
    body('pageSize').optional().isInt({ min: 10, max: 100 }).withMessage('Page size must be between 10 and 100'),
    body('refreshInterval').optional().isInt({ min: 5000, max: 300000 }).withMessage('Refresh interval must be between 5s and 5min')
  ],
  asyncHandler(async (req, res) => {
    const result = await systemService.updateGeneralSettings(req.body, req.user.id);
    return res.success(result, 'Settings updated successfully');
  })
);

// Environment management endpoints
router.get('/environments', authenticateToken, asyncHandler(async (req, res) => {
  const environments = await systemService.getEnvironments();
  return res.success(environments, 'Environments retrieved successfully');
}));

router.post('/environments', 
  authenticateToken, 
  requireRole(['admin']),
  [
    body('name').trim().isLength({ min: 1, max: 100 }).withMessage('Environment name is required (max 100 chars)'),
    body('code').trim().isLength({ min: 1, max: 20 }).withMessage('Environment code is required (max 20 chars)'),
    body('description').optional().trim().isLength({ max: 500 }).withMessage('Description must be less than 500 characters'),
    body('color').optional().isIn(['blue', 'green', 'red', 'yellow', 'purple', 'gray']).withMessage('Invalid color'),
    body('machine_types').optional().isArray().withMessage('Machine types must be an array')
  ],
  asyncHandler(async (req, res) => {
    const newEnvironment = await systemService.createEnvironment(req.body, req.user.id);
    return res.success(newEnvironment, 'Environment created successfully', 201);
  })
);

router.put('/environments/:id', 
  authenticateToken, 
  requireRole(['admin']),
  [
    param('id').isInt({ min: 1 }).withMessage('Invalid environment ID'),
    body('name').optional().trim().isLength({ min: 1, max: 100 }).withMessage('Environment name must be 1-100 chars'),
    body('code').optional().trim().isLength({ min: 1, max: 20 }).withMessage('Environment code must be 1-20 chars'),
    body('description').optional().trim().isLength({ max: 500 }).withMessage('Description must be less than 500 characters'),
    body('color').optional().isIn(['blue', 'green', 'red', 'yellow', 'purple', 'gray']).withMessage('Invalid color'),
    body('machine_types').optional().isArray().withMessage('Machine types must be an array')
  ],
  asyncHandler(async (req, res) => {
    const updatedEnvironment = await systemService.updateEnvironment(
      parseInt(req.params.id), 
      req.body, 
      req.user.id
    );
    return res.success(updatedEnvironment, 'Environment updated successfully');
  })
);

router.delete('/environments/:id', 
  authenticateToken, 
  requireRole(['admin']),
  [
    param('id').isInt({ min: 1 }).withMessage('Invalid environment ID')
  ],
  asyncHandler(async (req, res) => {
    await systemService.deleteEnvironment(parseInt(req.params.id), req.user.id);
    return res.success(null, 'Environment deleted successfully');
  })
);

// Machine types management endpoints
router.get('/machine-types', authenticateToken, asyncHandler(async (req, res) => {
  const machineTypes = await systemService.getMachineTypes();
  return res.success(machineTypes, 'Machine types retrieved successfully');
}));

router.post('/machine-types', 
  authenticateToken, 
  requireRole(['admin']),
  [
    body('name').trim().isLength({ min: 1, max: 100 }).withMessage('Machine type name is required (max 100 chars)'),
    body('description').optional().trim().isLength({ max: 500 }).withMessage('Description must be less than 500 characters'),
    body('category').optional().trim().isLength({ max: 50 }).withMessage('Category must be less than 50 characters'),
    body('specifications').optional().isObject().withMessage('Specifications must be an object')
  ],
  asyncHandler(async (req, res) => {
    const newMachineType = await systemService.createMachineType(req.body, req.user.id);
    return res.success(newMachineType, 'Machine type created successfully', 201);
  })
);

router.put('/machine-types/:id', 
  authenticateToken, 
  requireRole(['admin']),
  [
    param('id').isInt({ min: 1 }).withMessage('Invalid machine type ID'),
    body('name').optional().trim().isLength({ min: 1, max: 100 }).withMessage('Machine type name must be 1-100 chars'),
    body('description').optional().trim().isLength({ max: 500 }).withMessage('Description must be less than 500 characters'),
    body('category').optional().trim().isLength({ max: 50 }).withMessage('Category must be less than 50 characters'),
    body('specifications').optional().isObject().withMessage('Specifications must be an object')
  ],
  asyncHandler(async (req, res) => {
    const updatedMachineType = await systemService.updateMachineType(
      parseInt(req.params.id), 
      req.body, 
      req.user.id
    );
    return res.success(updatedMachineType, 'Machine type updated successfully');
  })
);

router.delete('/machine-types/:id', 
  authenticateToken, 
  requireRole(['admin']),
  [
    param('id').isInt({ min: 1 }).withMessage('Invalid machine type ID')
  ],
  asyncHandler(async (req, res) => {
    await systemService.deleteMachineType(parseInt(req.params.id), req.user.id);
    return res.success(null, 'Machine type deleted successfully');
  })
);

// System statistics endpoint
router.get('/statistics', 
  authenticateToken, 
  requireRole(['admin', 'supervisor']), 
  asyncHandler(async (req, res) => {
    const statistics = await systemService.getSystemStatistics();
    return res.success(statistics, 'System statistics retrieved successfully');
  })
);

module.exports = router;