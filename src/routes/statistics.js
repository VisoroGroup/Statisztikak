const express = require('express');
const router = express.Router();
const { ensureAuthenticated, ensureOrg } = require('../middleware/auth');
const statisticsController = require('../controllers/statisticsController');

// All statistics routes require authentication
router.use('/:orgId/statistics', ensureAuthenticated, ensureOrg);

// Main page - statistics card grid
router.get('/:orgId/statistics', statisticsController.index);

// AJAX: get all graph data for main page
router.post('/:orgId/statistics/page-graph-data', statisticsController.pageGraphData);

// Create new statistic
router.get('/:orgId/statistics/create-graph', statisticsController.createForm);
router.post('/:orgId/statistics/create-graph', statisticsController.create);

// Summary page
router.get('/:orgId/statistics/summary', statisticsController.summary);
router.post('/:orgId/statistics/summary', statisticsController.saveSummary);

// Detail view
router.get('/:orgId/statistics/detail-graph/:id', statisticsController.detail);
router.post('/:orgId/statistics/detail-graph/:id', statisticsController.detailAction);

// AJAX: paginated values table
router.post('/:orgId/statistics/detail-graph-values/:id', statisticsController.detailValues);

// Delete value
router.post('/:orgId/statistics/delete-value/:id', statisticsController.deleteValue);

// Settings
router.get('/:orgId/statistics/update-graph/:id', statisticsController.settingsForm);
router.post('/:orgId/statistics/update-graph/:id', statisticsController.updateSettings);

// Delete statistic
router.post('/:orgId/statistics/delete-graph/:id', statisticsController.deleteStatistic);

module.exports = router;
