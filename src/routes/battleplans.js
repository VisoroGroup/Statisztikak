const express = require('express');
const router = express.Router();
const { ensureAuthenticated, ensureOrg } = require('../middleware/auth');
const prisma = require('../config/database');

// Battleplans list
router.get('/:orgId/battleplans', ensureAuthenticated, ensureOrg, async (req, res) => {
    try {
        const battleplans = await prisma.battleplan.findMany({
            where: { organizationId: req.orgId },
            orderBy: { createdAt: 'desc' },
        });
        res.render('battleplans/index', {
            title: 'Plan de bătălie',
            battleplans,
            orgId: req.orgId.toString(),
        });
    } catch (err) {
        console.error('Battleplans error:', err);
        req.flash('error', 'Eroare la încărcarea planurilor.');
        res.redirect(`/${req.orgId}/statistics`);
    }
});

// Create battleplan
router.post('/:orgId/battleplans', ensureAuthenticated, ensureOrg, async (req, res) => {
    try {
        const { title, description } = req.body;
        await prisma.battleplan.create({
            data: {
                title: title.trim(),
                description: description || null,
                organizationId: req.orgId,
            },
        });
        req.flash('success', `Plan "${title}" creat cu succes.`);
        res.redirect(`/${req.orgId}/battleplans`);
    } catch (err) {
        console.error('Create battleplan error:', err);
        req.flash('error', 'Eroare la crearea planului.');
        res.redirect(`/${req.orgId}/battleplans`);
    }
});

// Update battleplan
router.post('/:orgId/battleplans/:id/edit', ensureAuthenticated, ensureOrg, async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const { title, description, status } = req.body;
        await prisma.battleplan.updateMany({
            where: { id, organizationId: req.orgId },
            data: { title: title.trim(), description: description || null, status: status || 'active' },
        });
        req.flash('success', 'Plan actualizat.');
        res.redirect(`/${req.orgId}/battleplans`);
    } catch (err) {
        console.error('Update battleplan error:', err);
        req.flash('error', 'Eroare la actualizare.');
        res.redirect(`/${req.orgId}/battleplans`);
    }
});

// Delete battleplan
router.post('/:orgId/battleplans/:id/delete', ensureAuthenticated, ensureOrg, async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        await prisma.battleplan.deleteMany({
            where: { id, organizationId: req.orgId },
        });
        req.flash('success', 'Plan șters.');
        res.redirect(`/${req.orgId}/battleplans`);
    } catch (err) {
        console.error('Delete battleplan error:', err);
        req.flash('error', 'Eroare la ștergere.');
        res.redirect(`/${req.orgId}/battleplans`);
    }
});

module.exports = router;
