const prisma = require('../config/database');
const statsService = require('../services/statisticsService');
const { logAction } = require('../services/auditService');
const { recalculateFormulas } = require('../services/formulaService');
const { body, validationResult } = require('express-validator');

// GET /:orgId/statistics - Main page with card grid
exports.index = async (req, res) => {
    try {
        const orgId = req.orgId;
        const { group, search } = req.query;

        let where = { organizationId: orgId, status: 'active' };

        // Filter by group
        if (group && group !== 'all') {
            where.groupAssignments = {
                some: { group: { name: group } },
            };
        }

        // Filter by search
        if (search) {
            where.title = { contains: search, mode: 'insensitive' };
        }

        const statistics = await prisma.statistic.findMany({
            where,
            include: {
                responsiblePerson: { select: { name: true } },
                groupAssignments: { include: { group: true } },
            },
            orderBy: { displayOrder: 'asc' },
        });

        // Get groups for filter dropdown
        const groups = await prisma.statisticGroup.findMany({
            where: { organizationId: orgId },
            orderBy: { displayOrder: 'asc' },
        });

        res.render('statistics/index', {
            title: 'Teljesítménymérő Statisztikák',
            statistics,
            groups,
            currentGroup: group || 'all',
            search: search || '',
            orgId: orgId.toString(),
        });
    } catch (err) {
        console.error('Index error:', err);
        req.flash('error', 'Eroare la încărcarea graficelor.');
        res.redirect('/');
    }
};

// POST /:orgId/statistics/page-graph-data - AJAX graph data
exports.pageGraphData = async (req, res) => {
    try {
        const orgId = req.orgId;
        const statistics = await prisma.statistic.findMany({
            where: { organizationId: orgId, status: 'active' },
            select: { id: true, aggregationType: true, measurementType: true },
        });

        const graphData = {};
        for (const stat of statistics) {
            const data = await statsService.getChartData(stat.id, stat.aggregationType);
            graphData[stat.id] = data;
        }

        res.json({ success: true, data: graphData });
    } catch (err) {
        console.error('Graph data error:', err);
        res.status(500).json({ success: false, error: 'Eroare la încărcarea datelor.' });
    }
};

// GET /:orgId/statistics/detail-graph/:id - Detail view
exports.detail = async (req, res) => {
    try {
        const orgId = req.orgId;
        const statId = parseInt(req.params.id);

        const statistic = await prisma.statistic.findFirst({
            where: { id: statId, organizationId: orgId },
            include: {
                responsiblePerson: { select: { name: true } },
                groupAssignments: { include: { group: true } },
                quotas: { orderBy: { periodStart: 'desc' }, take: 1 },
            },
        });

        if (!statistic) {
            req.flash('error', 'Graficul nu a fost găsit.');
            return res.redirect(`/${orgId}/statistics`);
        }

        // Determine view type from URL hash or default
        const viewType = req.query.view || statistic.aggregationType || 'daily';
        const chartData = await statsService.getChartData(statId, viewType);

        // Get all statistics for overlay dropdown
        const allStatistics = await prisma.statistic.findMany({
            where: { organizationId: orgId, status: 'active', id: { not: statId } },
            select: { id: true, title: true },
            orderBy: { title: 'asc' },
        });

        res.render('statistics/detail', {
            title: statistic.title,
            statistic,
            chartData,
            viewType,
            allStatistics,
            orgId: orgId.toString(),
        });
    } catch (err) {
        console.error('Detail error:', err);
        req.flash('error', 'Eroare la încărcarea graficului.');
        res.redirect(`/${req.orgId}/statistics`);
    }
};

// POST /:orgId/statistics/detail-graph/:id - Add value, quota, notes
exports.detailAction = async (req, res) => {
    try {
        const orgId = req.orgId;
        const statId = parseInt(req.params.id);
        const { form_type } = req.body;

        const statistic = await prisma.statistic.findFirst({
            where: { id: statId, organizationId: orgId },
        });

        if (!statistic) {
            return res.status(404).json({ success: false, error: 'Nem található.' });
        }

        if (form_type === 'add_value') {
            const { value, for_date, when_weekend } = req.body;
            const parsedValue = parseFloat(value);
            if (isNaN(parsedValue)) {
                req.flash('error', 'Valoare invalidă.');
                return res.redirect(`/${orgId}/statistics/detail-graph/${statId}`);
            }

            const forDate = new Date(for_date);
            const workDays = typeof statistic.workDays === 'string'
                ? JSON.parse(statistic.workDays) : statistic.workDays;
            const recordDate = statsService.resolveRecordDate(forDate, when_weekend || 'after', workDays);

            await prisma.statisticValue.upsert({
                where: {
                    statisticId_recordDate: { statisticId: statId, recordDate },
                },
                update: {
                    value: parsedValue,
                    authorId: req.user.id,
                    authorType: 'user',
                },
                create: {
                    statisticId: statId,
                    organizationId: orgId,
                    recordDate,
                    value: parsedValue,
                    authorId: req.user.id,
                    authorType: 'user',
                },
            });

            logAction(orgId, req.user.id, 'create', 'statistic_value', statId, { value: parsedValue, date: recordDate.toISOString() }, req.ip);
            req.flash('success', 'Valoare înregistrată cu succes.');
        } else if (form_type === 'quota') {
            const { quota_value, period_start, period_end } = req.body;
            await prisma.statisticQuota.create({
                data: {
                    statisticId: statId,
                    quotaValue: parseFloat(quota_value),
                    periodStart: new Date(period_start),
                    periodEnd: new Date(period_end),
                    createdById: req.user.id,
                },
            });
            req.flash('success', 'Cotă setată cu succes.');
        } else if (form_type === 'notes') {
            const { note_text } = req.body;
            // Store note as a value with today's date and note field
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const existing = await prisma.statisticValue.findUnique({
                where: { statisticId_recordDate: { statisticId: statId, recordDate: today } },
            });

            if (existing) {
                await prisma.statisticValue.update({
                    where: { id: existing.id },
                    data: { note: note_text },
                });
            }
            req.flash('success', 'Notiță salvată.');
        }

        res.redirect(`/${orgId}/statistics/detail-graph/${statId}`);
    } catch (err) {
        console.error('Detail action error:', err);
        req.flash('error', 'Eroare la efectuarea operațiunii.');
        res.redirect(`/${req.orgId}/statistics/detail-graph/${req.params.id}`);
    }
};

// POST /:orgId/statistics/detail-graph-values/:id - AJAX paginated values
exports.detailValues = async (req, res) => {
    try {
        const statId = parseInt(req.params.id);
        const page = parseInt(req.query.page) || 1;
        const perPage = 20;
        const viewType = req.body.view_type || 'daily';

        const chartData = await statsService.getChartData(statId, viewType);

        const totalItems = chartData.tableData.length;
        const totalPages = Math.ceil(totalItems / perPage);
        const start = (page - 1) * perPage;
        const pageData = chartData.tableData.slice(start, start + perPage);

        res.json({
            success: true,
            data: pageData,
            pagination: { page, perPage, totalItems, totalPages },
        });
    } catch (err) {
        console.error('Values error:', err);
        res.status(500).json({ success: false, error: 'Hiba az értékek betöltése közben.' });
    }
};

// POST /:orgId/statistics/delete-value/:id - Delete a value
exports.deleteValue = async (req, res) => {
    try {
        const valueId = BigInt(req.params.id);
        const orgId = req.orgId;

        const value = await prisma.statisticValue.findFirst({
            where: { id: valueId, organizationId: orgId },
        });

        if (!value) {
            return res.status(404).json({ success: false, error: 'Nem található.' });
        }

        await prisma.statisticValue.delete({ where: { id: valueId } });
        res.json({ success: true });
    } catch (err) {
        console.error('Delete value error:', err);
        res.status(500).json({ success: false, error: 'Hiba a törlés közben.' });
    }
};

// GET /:orgId/statistics/create-graph - New statistic form
exports.createForm = async (req, res) => {
    try {
        const orgId = req.orgId;
        const groups = await prisma.statisticGroup.findMany({
            where: { organizationId: orgId },
            orderBy: { displayOrder: 'asc' },
        });
        const users = await prisma.user.findMany({
            where: { organizationId: orgId },
            select: { id: true, name: true },
        });

        res.render('statistics/settings', {
            title: 'Új Statisztika',
            statistic: null,
            groups,
            users,
            isNew: true,
            orgId: orgId.toString(),
        });
    } catch (err) {
        console.error('Create form error:', err);
        req.flash('error', 'Eroare la încărcarea formularului.');
        res.redirect(`/${req.orgId}/statistics`);
    }
};

// POST /:orgId/statistics/create-graph - Create new statistic
exports.create = async (req, res) => {
    try {
        const orgId = req.orgId;
        const data = parseStatisticForm(req.body, orgId);

        const statistic = await prisma.statistic.create({
            data: {
                ...data,
                apiKey: statsService.generateApiKey(),
            },
        });

        // Assign groups
        if (req.body.groups && req.body.groups.length > 0) {
            const groupIds = Array.isArray(req.body.groups) ? req.body.groups : [req.body.groups];
            await prisma.statisticGroupAssignment.createMany({
                data: groupIds.map(gId => ({
                    statisticId: statistic.id,
                    groupId: parseInt(gId),
                })),
            });
        }

        req.flash('success', 'Grafic creat cu succes.');
        logAction(orgId, req.user.id, 'create', 'statistic', statistic.id, { title: req.body.title }, req.ip);
        res.redirect(`/${orgId}/statistics/detail-graph/${statistic.id}`);
    } catch (err) {
        console.error('Create error:', err);
        req.flash('error', 'Eroare la crearea graficului.');
        res.redirect(`/${req.orgId}/statistics/create-graph`);
    }
};

// GET /:orgId/statistics/update-graph/:id - Settings form
exports.settingsForm = async (req, res) => {
    try {
        const orgId = req.orgId;
        const statId = parseInt(req.params.id);

        const statistic = await prisma.statistic.findFirst({
            where: { id: statId, organizationId: orgId },
            include: {
                groupAssignments: { include: { group: true } },
            },
        });

        if (!statistic) {
            req.flash('error', 'Graficul nu a fost găsit.');
            return res.redirect(`/${orgId}/statistics`);
        }

        const groups = await prisma.statisticGroup.findMany({
            where: { organizationId: orgId },
            orderBy: { displayOrder: 'asc' },
        });
        const users = await prisma.user.findMany({
            where: { organizationId: orgId },
            select: { id: true, name: true },
        });

        res.render('statistics/settings', {
            title: `Beállítások - ${statistic.title}`,
            statistic,
            groups,
            users,
            isNew: false,
            orgId: orgId.toString(),
        });
    } catch (err) {
        console.error('Settings form error:', err);
        req.flash('error', 'Eroare la încărcarea setărilor.');
        res.redirect(`/${req.orgId}/statistics`);
    }
};

// POST /:orgId/statistics/update-graph/:id - Update settings
exports.updateSettings = async (req, res) => {
    try {
        const orgId = req.orgId;
        const statId = parseInt(req.params.id);
        const data = parseStatisticForm(req.body, orgId);

        await prisma.statistic.update({
            where: { id: statId },
            data,
        });

        // Update group assignments
        await prisma.statisticGroupAssignment.deleteMany({
            where: { statisticId: statId },
        });

        if (req.body.groups && req.body.groups.length > 0) {
            const groupIds = Array.isArray(req.body.groups) ? req.body.groups : [req.body.groups];
            await prisma.statisticGroupAssignment.createMany({
                data: groupIds.map(gId => ({
                    statisticId: statId,
                    groupId: parseInt(gId),
                })),
            });
        }

        req.flash('success', 'Setări salvate cu succes.');
        logAction(orgId, req.user.id, 'update', 'statistic', statId, { title: req.body.title }, req.ip);
        res.redirect(`/${orgId}/statistics/detail-graph/${statId}`);
    } catch (err) {
        console.error('Update settings error:', err);
        req.flash('error', 'Eroare la salvarea setărilor.');
        res.redirect(`/${req.orgId}/statistics/update-graph/${req.params.id}`);
    }
};

// POST /:orgId/statistics/delete-graph/:id - Delete statistic
exports.deleteStatistic = async (req, res) => {
    try {
        const statId = parseInt(req.params.id);
        await prisma.statistic.delete({ where: { id: statId } });
        logAction(req.orgId, req.user.id, 'delete', 'statistic', statId, null, req.ip);
        req.flash('success', 'Grafic șters.');
        res.redirect(`/${req.orgId}/statistics`);
    } catch (err) {
        console.error('Delete error:', err);
        req.flash('error', 'Eroare la ștergere.');
        res.redirect(`/${req.orgId}/statistics`);
    }
};

// GET /:orgId/statistics/summary - Summary page
exports.summary = async (req, res) => {
    try {
        const orgId = req.orgId;
        const groups = await prisma.statisticGroup.findMany({
            where: { organizationId: orgId },
            orderBy: { displayOrder: 'asc' },
        });

        res.render('statistics/summary', {
            title: 'Sumar',
            groups,
            orgId: orgId.toString(),
        });
    } catch (err) {
        console.error('Summary error:', err);
        req.flash('error', 'Eroare la încărcarea sumarului.');
        res.redirect(`/${req.orgId}/statistics`);
    }
};

// POST /:orgId/statistics/summary - Save summary settings
exports.saveSummary = async (req, res) => {
    try {
        // Trigger formula recalculation
        await recalculateFormulas(req.orgId);
        logAction(req.orgId, req.user.id, 'recalculate', 'formula', null, null, req.ip);
        req.flash('success', 'Graficele de tip formulă au fost recalculate cu succes.');
        res.redirect(`/${req.orgId}/statistics/summary`);
    } catch (err) {
        console.error('Save summary error:', err);
        req.flash('error', 'Eroare la salvare.');
        res.redirect(`/${req.orgId}/statistics/summary`);
    }
};

/**
 * Parse statistic form body into Prisma-compatible data
 */
function parseStatisticForm(body, orgId) {
    const workDays = {
        mon: body.work_mon === 'on',
        tue: body.work_tue === 'on',
        wed: body.work_wed === 'on',
        thu: body.work_thu === 'on',
        fri: body.work_fri === 'on',
        sat: body.work_sat === 'on',
        sun: body.work_sun === 'on',
    };

    return {
        organizationId: orgId,
        title: body.title,
        description: body.description || null,
        aggregationType: body.aggregation_type || 'daily',
        measurementType: body.measurement_type || 'numeric',
        displayOrder: parseInt(body.display_order) || 0,
        responsiblePersonId: body.responsible_person_id ? parseInt(body.responsible_person_id) : null,
        viabilityThreshold: body.viability_threshold ? parseFloat(body.viability_threshold) : null,
        isInverted: body.is_inverted === 'on',
        axisMode: body.axis_mode || 'auto',
        axisMin: body.axis_min ? parseFloat(body.axis_min) : null,
        axisMax: body.axis_max ? parseFloat(body.axis_max) : null,
        workDays,
        graphType: body.graph_type || 'normal',
        formula: body.formula || null,
    };
}
