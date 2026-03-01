const express = require('express');
const router = express.Router();
const { ensureAuthenticated, ensureOrg } = require('../middleware/auth');
const controller = require('../controllers/conditionsController');

// Conditions list
router.get('/:orgId/statistics/conditions', ensureAuthenticated, ensureOrg, controller.index);

// Create condition
router.post('/:orgId/statistics/conditions', ensureAuthenticated, ensureOrg, controller.create);

// Update condition
router.post('/:orgId/statistics/conditions/:id/edit', ensureAuthenticated, ensureOrg, controller.update);

// Delete condition
router.post('/:orgId/statistics/conditions/:id/delete', ensureAuthenticated, ensureOrg, controller.remove);

// Write-up page (GET + POST)
router.get('/:orgId/statistics/graph-condition/:id', ensureAuthenticated, ensureOrg, controller.writeup);
router.post('/:orgId/statistics/graph-condition/:id', ensureAuthenticated, ensureOrg, controller.saveWriteup);

module.exports = router;
