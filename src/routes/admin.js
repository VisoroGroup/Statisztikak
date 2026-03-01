const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const { ensureAuthenticated, ensureAdmin, ensureOrg } = require('../middleware/auth');
const prisma = require('../config/database');

// All admin routes require auth + admin role
router.use('/:orgId/admin', ensureAuthenticated, ensureOrg, ensureAdmin);

// ==================== USERS ====================

// GET - Users list
router.get('/:orgId/admin/users', async (req, res) => {
    try {
        const users = await prisma.user.findMany({
            where: { organizationId: req.orgId },
            orderBy: { createdAt: 'desc' },
        });
        res.render('admin/users', {
            title: 'Felhasználók kezelése',
            users,
            orgId: req.orgId.toString(),
        });
    } catch (err) {
        console.error('Admin users error:', err);
        req.flash('error', 'Hiba a felhasználók betöltése közben.');
        res.redirect(`/${req.orgId}/statistics`);
    }
});

// POST - Create user
router.post('/:orgId/admin/users', [
    body('name').trim().isLength({ min: 2 }),
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 6 }),
    body('role').isIn(['admin', 'user']),
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            req.flash('error', errors.array().map(e => e.msg).join(', '));
            return res.redirect(`/${req.orgId}/admin/users`);
        }

        const { name, email, password, role } = req.body;

        const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
        if (existing) {
            req.flash('error', 'Ez az email cím már regisztrálva van.');
            return res.redirect(`/${req.orgId}/admin/users`);
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        await prisma.user.create({
            data: {
                name,
                email: email.toLowerCase(),
                password: hashedPassword,
                organizationId: req.orgId,
                role,
            },
        });

        req.flash('success', `Felhasználó "${name}" sikeresen létrehozva.`);
        res.redirect(`/${req.orgId}/admin/users`);
    } catch (err) {
        console.error('Create user error:', err);
        req.flash('error', 'Hiba a felhasználó létrehozása közben.');
        res.redirect(`/${req.orgId}/admin/users`);
    }
});

// POST - Update user
router.post('/:orgId/admin/users/:id/edit', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const { name, email, role, password } = req.body;

        const data = { name, email: email.toLowerCase(), role };

        if (password && password.length >= 6) {
            const salt = await bcrypt.genSalt(10);
            data.password = await bcrypt.hash(password, salt);
        }

        await prisma.user.updateMany({
            where: { id, organizationId: req.orgId },
            data,
        });

        req.flash('success', 'Felhasználó frissítve.');
        res.redirect(`/${req.orgId}/admin/users`);
    } catch (err) {
        console.error('Update user error:', err);
        req.flash('error', 'Hiba a frissítés közben.');
        res.redirect(`/${req.orgId}/admin/users`);
    }
});

// POST - Delete user
router.post('/:orgId/admin/users/:id/delete', async (req, res) => {
    try {
        const id = parseInt(req.params.id);

        if (id === req.user.id) {
            req.flash('error', 'Nem törölheti saját magát.');
            return res.redirect(`/${req.orgId}/admin/users`);
        }

        await prisma.user.deleteMany({
            where: { id, organizationId: req.orgId },
        });

        req.flash('success', 'Felhasználó törölve.');
        res.redirect(`/${req.orgId}/admin/users`);
    } catch (err) {
        console.error('Delete user error:', err);
        req.flash('error', 'Hiba a törlés közben.');
        res.redirect(`/${req.orgId}/admin/users`);
    }
});

// ==================== GROUPS ====================

// GET - Groups list
router.get('/:orgId/admin/groups', async (req, res) => {
    try {
        const groups = await prisma.statisticGroup.findMany({
            where: { organizationId: req.orgId },
            include: { _count: { select: { assignments: true } } },
            orderBy: { displayOrder: 'asc' },
        });
        res.render('admin/groups', {
            title: 'Csoportok kezelése',
            groups,
            orgId: req.orgId.toString(),
        });
    } catch (err) {
        console.error('Admin groups error:', err);
        req.flash('error', 'Hiba a csoportok betöltése közben.');
        res.redirect(`/${req.orgId}/statistics`);
    }
});

// POST - Create group
router.post('/:orgId/admin/groups', async (req, res) => {
    try {
        const { name, display_order } = req.body;
        await prisma.statisticGroup.create({
            data: {
                name: name.trim(),
                displayOrder: parseInt(display_order) || 0,
                organizationId: req.orgId,
            },
        });
        req.flash('success', `Csoport "${name}" létrehozva.`);
        res.redirect(`/${req.orgId}/admin/groups`);
    } catch (err) {
        console.error('Create group error:', err);
        req.flash('error', 'Hiba a csoport létrehozása közben.');
        res.redirect(`/${req.orgId}/admin/groups`);
    }
});

// POST - Update group
router.post('/:orgId/admin/groups/:id/edit', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const { name, display_order } = req.body;
        await prisma.statisticGroup.updateMany({
            where: { id, organizationId: req.orgId },
            data: { name: name.trim(), displayOrder: parseInt(display_order) || 0 },
        });
        req.flash('success', 'Csoport frissítve.');
        res.redirect(`/${req.orgId}/admin/groups`);
    } catch (err) {
        console.error('Update group error:', err);
        req.flash('error', 'Hiba a frissítés közben.');
        res.redirect(`/${req.orgId}/admin/groups`);
    }
});

// POST - Delete group
router.post('/:orgId/admin/groups/:id/delete', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        await prisma.statisticGroup.deleteMany({
            where: { id, organizationId: req.orgId },
        });
        req.flash('success', 'Csoport törölve.');
        res.redirect(`/${req.orgId}/admin/groups`);
    } catch (err) {
        console.error('Delete group error:', err);
        req.flash('error', 'Hiba a törlés közben.');
        res.redirect(`/${req.orgId}/admin/groups`);
    }
});

// ==================== AUDIT LOG ====================

// GET - Audit log
router.get('/:orgId/admin/audit', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 50;
        const skip = (page - 1) * limit;

        const [logs, total] = await Promise.all([
            prisma.auditLog.findMany({
                where: { organizationId: req.orgId },
                include: { user: { select: { name: true, email: true } } },
                orderBy: { createdAt: 'desc' },
                take: limit,
                skip,
            }),
            prisma.auditLog.count({ where: { organizationId: req.orgId } }),
        ]);

        res.render('admin/audit', {
            title: 'Audit Napló',
            logs,
            orgId: req.orgId.toString(),
            page,
            totalPages: Math.ceil(total / limit),
            total,
        });
    } catch (err) {
        console.error('Audit log error:', err);
        req.flash('error', 'Hiba az audit napló betöltése közben.');
        res.redirect(`/${req.orgId}/statistics`);
    }
});

// ==================== ORGANIZATION SETTINGS ====================

// GET - Organization settings
router.get('/:orgId/admin/settings', async (req, res) => {
    try {
        const org = await prisma.organization.findUnique({
            where: { id: req.orgId },
        });
        res.render('admin/settings', {
            title: 'Szervezet beállítások',
            org,
            orgId: req.orgId.toString(),
        });
    } catch (err) {
        console.error('Org settings error:', err);
        req.flash('error', 'Hiba.');
        res.redirect(`/${req.orgId}/statistics`);
    }
});

// POST - Update organization settings
router.post('/:orgId/admin/settings', async (req, res) => {
    try {
        const { name } = req.body;
        await prisma.organization.update({
            where: { id: req.orgId },
            data: { name: name.trim() },
        });
        req.flash('success', 'Szervezet beállítások mentve.');
        res.redirect(`/${req.orgId}/admin/settings`);
    } catch (err) {
        console.error('Update org error:', err);
        req.flash('error', 'Hiba a mentés közben.');
        res.redirect(`/${req.orgId}/admin/settings`);
    }
});

module.exports = router;
