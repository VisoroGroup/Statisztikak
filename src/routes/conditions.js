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

// Auto-suggest condition (AJAX)
router.get('/:orgId/statistics/conditions/suggest/:statId', ensureAuthenticated, ensureOrg, async (req, res) => {
    try {
        const { suggestCondition } = require('../services/conditionSuggestionService');
        const result = await suggestCondition(req.params.statId);
        res.json({ success: true, ...result });
    } catch (err) {
        console.error('Suggest condition error:', err);
        res.json({ success: false, message: 'Eroare la calcularea sugestiei.' });
    }
});

module.exports = router;
