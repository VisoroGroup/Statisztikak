const prisma = require('../config/database');

const CONDITION_LABELS = {
    power: 'Hatalom (Power)',
    power_change: 'Tevékenységi Bőség (Power Change)',
    affluence: 'Bőség (Affluence)',
    normal: 'Normál (Normal)',
    emergency: 'Válság (Emergency)',
    danger: 'Vezetői Veszély (Danger)',
    personal_danger: 'Személyes Veszély (Personal Danger)',
    non_existence: 'Nem-Létezés (Non-Existence)',
    extended_non_existence: 'Kibővített Nem-Létezés (Extended Non-Existence)',
};

const CONDITION_ORDER = [
    'power', 'power_change', 'affluence', 'normal', 'emergency',
    'danger', 'personal_danger', 'non_existence', 'extended_non_existence',
];

const CONDITION_COLORS = {
    power: '#16a34a',
    power_change: '#22c55e',
    affluence: '#84cc16',
    normal: '#2563eb',
    emergency: '#f59e0b',
    danger: '#f97316',
    personal_danger: '#ef4444',
    non_existence: '#dc2626',
    extended_non_existence: '#991b1b',
};

// GET /:orgId/statistics/conditions - List conditions
exports.index = async (req, res) => {
    try {
        const orgId = req.orgId;
        const { user_filter, graph_filter } = req.query;

        let where = { organizationId: orgId };

        // Filter by user
        if (user_filter && user_filter !== 'all') {
            where.userId = parseInt(user_filter);
        }

        // Filter by graph
        if (graph_filter && graph_filter !== 'all') {
            where.statisticId = parseInt(graph_filter);
        }

        const conditions = await prisma.statisticCondition.findMany({
            where,
            include: {
                user: { select: { name: true } },
                statistic: { select: { id: true, title: true } },
            },
            orderBy: { conditionDate: 'desc' },
        });

        const users = await prisma.user.findMany({
            where: { organizationId: orgId },
            select: { id: true, name: true },
        });

        const statistics = await prisma.statistic.findMany({
            where: { organizationId: orgId, status: 'active' },
            select: { id: true, title: true },
            orderBy: { title: 'asc' },
        });

        res.render('statistics/conditions', {
            title: 'Működési Állapotok',
            conditions,
            users,
            statistics,
            conditionLabels: CONDITION_LABELS,
            conditionOrder: CONDITION_ORDER,
            conditionColors: CONDITION_COLORS,
            currentUser: user_filter || 'all',
            currentGraph: graph_filter || 'all',
            orgId: orgId.toString(),
        });
    } catch (err) {
        console.error('Conditions index error:', err);
        req.flash('error', 'Hiba az állapotok betöltése közben.');
        res.redirect(`/${req.orgId}/statistics`);
    }
};

// POST /:orgId/statistics/conditions - Create condition
exports.create = async (req, res) => {
    try {
        const orgId = req.orgId;
        const { condition_date, condition_type, statistic_id } = req.body;

        await prisma.statisticCondition.create({
            data: {
                organizationId: orgId,
                userId: req.user.id,
                conditionType: condition_type,
                conditionDate: new Date(condition_date),
                statisticId: statistic_id ? parseInt(statistic_id) : null,
            },
        });

        req.flash('success', 'Állapot sikeresen rögzítve.');
        res.redirect(`/${orgId}/statistics/conditions`);
    } catch (err) {
        console.error('Create condition error:', err);
        req.flash('error', 'Hiba az állapot rögzítése közben.');
        res.redirect(`/${req.orgId}/statistics/conditions`);
    }
};

// POST /:orgId/statistics/conditions/:id/edit - Update condition
exports.update = async (req, res) => {
    try {
        const orgId = req.orgId;
        const id = parseInt(req.params.id);
        const { condition_date, condition_type, statistic_id } = req.body;

        await prisma.statisticCondition.updateMany({
            where: { id, organizationId: orgId },
            data: {
                conditionType: condition_type,
                conditionDate: new Date(condition_date),
                statisticId: statistic_id ? parseInt(statistic_id) : null,
            },
        });

        req.flash('success', 'Állapot frissítve.');
        res.redirect(`/${orgId}/statistics/conditions`);
    } catch (err) {
        console.error('Update condition error:', err);
        req.flash('error', 'Hiba a frissítés közben.');
        res.redirect(`/${req.orgId}/statistics/conditions`);
    }
};

// POST /:orgId/statistics/conditions/:id/delete - Delete condition
exports.remove = async (req, res) => {
    try {
        const orgId = req.orgId;
        const id = parseInt(req.params.id);

        await prisma.statisticCondition.deleteMany({
            where: { id, organizationId: orgId },
        });

        req.flash('success', 'Állapot törölve.');
        res.redirect(`/${orgId}/statistics/conditions`);
    } catch (err) {
        console.error('Delete condition error:', err);
        req.flash('error', 'Hiba a törlés közben.');
        res.redirect(`/${req.orgId}/statistics/conditions`);
    }
};
