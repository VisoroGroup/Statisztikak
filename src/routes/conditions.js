const express = require('express');
const router = express.Router();
const { ensureAuthenticated, ensureOrg } = require('../middleware/auth');
const conditionsController = require('../controllers/conditionsController');

// All conditions routes require authentication
router.use('/:orgId/statistics/conditions', ensureAuthenticated, ensureOrg);

// List conditions
router.get('/:orgId/statistics/conditions', conditionsController.index);

// Create condition
router.post('/:orgId/statistics/conditions', conditionsController.create);

// Update condition
router.post('/:orgId/statistics/conditions/:id/edit', conditionsController.update);

// Delete condition
router.post('/:orgId/statistics/conditions/:id/delete', conditionsController.remove);

module.exports = router;
