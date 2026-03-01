const prisma = require('../config/database');
const { logAction } = require('../services/auditService');

// Romanian condition labels and colors
const CONDITION_LABELS = {
    putere: 'Putere',
    schimbare_putere: 'Schimbare de Putere',
    abundenta: 'Abundență',
    normal: 'Normal',
    urgenta: 'Urgență',
    pericol_conducere: 'Pericol de Conducere',
    pericol_personal: 'Pericol Personal',
    non_existenta: 'Non-Existență',
    non_existenta_extinsa: 'Non-Existență Extinsă',
};

const CONDITION_COLORS = {
    putere: '#6d28d9',
    schimbare_putere: '#7c3aed',
    abundenta: '#2563eb',
    normal: '#16a34a',
    urgenta: '#f59e0b',
    pericol_conducere: '#ea580c',
    pericol_personal: '#dc2626',
    non_existenta: '#991b1b',
    non_existenta_extinsa: '#450a0a',
};

const CONDITION_ORDER = [
    'putere', 'schimbare_putere', 'abundenta', 'normal',
    'urgenta', 'pericol_conducere', 'pericol_personal',
    'non_existenta', 'non_existenta_extinsa',
];

// GET - Conditions list
exports.index = async (req, res) => {
    try {
        const orgId = req.orgId;
        const filterUser = req.query.user || '';
        const filterStat = req.query.stat || '';

        const where = { organizationId: orgId };
        if (filterUser) where.userId = parseInt(filterUser);
        if (filterStat) where.statisticId = parseInt(filterStat);

        const [conditions, users, statistics] = await Promise.all([
            prisma.statisticCondition.findMany({
                where,
                include: {
                    user: { select: { id: true, name: true } },
                    statistic: { select: { id: true, title: true } },
                },
                orderBy: { conditionDate: 'desc' },
                take: 100,
            }),
            prisma.user.findMany({
                where: { organizationId: orgId },
                select: { id: true, name: true },
                orderBy: { name: 'asc' },
            }),
            prisma.statistic.findMany({
                where: { organizationId: orgId, status: 'active' },
                select: { id: true, title: true },
                orderBy: { title: 'asc' },
            }),
        ]);

        res.render('statistics/conditions', {
            title: 'Stări de funcționare',
            conditions,
            users,
            statistics,
            filterUser,
            filterStat,
            CONDITION_LABELS,
            CONDITION_COLORS,
            CONDITION_ORDER,
            orgId: orgId.toString(),
        });
    } catch (err) {
        console.error('Conditions error:', err);
        req.flash('error', 'Eroare la încărcarea stărilor.');
        res.redirect(`/${req.orgId}/statistics`);
    }
};

// POST - Create condition
exports.create = async (req, res) => {
    try {
        const { condition_type, condition_date, statistic_id } = req.body;
        await prisma.statisticCondition.create({
            data: {
                organizationId: req.orgId,
                userId: req.user.id,
                conditionType: condition_type,
                conditionDate: new Date(condition_date),
                statisticId: statistic_id ? parseInt(statistic_id) : null,
            },
        });
        logAction(req.orgId, req.user.id, 'create', 'condition', null, { type: condition_type }, req.ip);
        req.flash('success', 'Stare salvată cu succes.');
        res.redirect(`/${req.orgId}/statistics/conditions`);
    } catch (err) {
        console.error('Create condition error:', err);
        req.flash('error', 'Eroare la salvarea stării.');
        res.redirect(`/${req.orgId}/statistics/conditions`);
    }
};

// POST - Update condition
exports.update = async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const { condition_type, condition_date, statistic_id } = req.body;
        await prisma.statisticCondition.updateMany({
            where: { id, organizationId: req.orgId },
            data: {
                conditionType: condition_type,
                conditionDate: new Date(condition_date),
                statisticId: statistic_id ? parseInt(statistic_id) : null,
            },
        });
        req.flash('success', 'Stare actualizată.');
        res.redirect(`/${req.orgId}/statistics/conditions`);
    } catch (err) {
        console.error('Update condition error:', err);
        req.flash('error', 'Eroare la actualizare.');
        res.redirect(`/${req.orgId}/statistics/conditions`);
    }
};

// POST - Delete condition
exports.remove = async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        await prisma.statisticCondition.deleteMany({
            where: { id, organizationId: req.orgId },
        });
        req.flash('success', 'Stare ștearsă.');
        res.redirect(`/${req.orgId}/statistics/conditions`);
    } catch (err) {
        console.error('Delete condition error:', err);
        req.flash('error', 'Eroare la ștergere.');
        res.redirect(`/${req.orgId}/statistics/conditions`);
    }
};

// GET - Write-up page
exports.writeup = async (req, res) => {
    try {
        const conditionId = parseInt(req.params.id);
        const condition = await prisma.statisticCondition.findFirst({
            where: { id: conditionId, organizationId: req.orgId },
            include: {
                user: { select: { name: true } },
                statistic: { select: { id: true, title: true } },
                writeupAnswers: true,
            },
        });

        if (!condition) {
            req.flash('error', 'Stare negăsită.');
            return res.redirect(`/${req.orgId}/statistics/conditions`);
        }

        // Get formula steps for this condition type
        const steps = await prisma.conditionFormulaStep.findMany({
            where: { conditionType: condition.conditionType, language: 'ro' },
            orderBy: { stepNumber: 'asc' },
        });

        // Map existing answers
        const answersMap = {};
        condition.writeupAnswers.forEach(a => {
            answersMap[a.stepNumber] = a.answerText;
        });

        // Get battleplans for linking
        const battleplans = await prisma.battleplan.findMany({
            where: { organizationId: req.orgId, status: 'active' },
            select: { id: true, title: true },
            orderBy: { title: 'asc' },
        });

        // Get linked battleplans
        const linkedBattleplans = await prisma.conditionStepBattleplan.findMany({
            where: { conditionId },
            include: { battleplan: { select: { id: true, title: true } } },
        });

        const linkedMap = {};
        linkedBattleplans.forEach(lb => {
            if (!linkedMap[lb.stepNumber]) linkedMap[lb.stepNumber] = [];
            linkedMap[lb.stepNumber].push(lb.battleplan);
        });

        const isPrint = req.query.print === 'yes';
        const org = await prisma.organization.findUnique({ where: { id: req.orgId } });

        res.render('statistics/writeup', {
            title: `${CONDITION_LABELS[condition.conditionType]} Formula Write-Up`,
            condition,
            steps,
            answersMap,
            battleplans,
            linkedMap,
            CONDITION_LABELS,
            CONDITION_COLORS,
            isPrint,
            org,
            orgId: req.orgId.toString(),
        });
    } catch (err) {
        console.error('Writeup error:', err);
        req.flash('error', 'Eroare la încărcarea write-up.');
        res.redirect(`/${req.orgId}/statistics/conditions`);
    }
};

// POST - Save write-up answers
exports.saveWriteup = async (req, res) => {
    try {
        const conditionId = parseInt(req.params.id);
        const condition = await prisma.statisticCondition.findFirst({
            where: { id: conditionId, organizationId: req.orgId },
        });
        if (!condition) {
            req.flash('error', 'Stare negăsită.');
            return res.redirect(`/${req.orgId}/statistics/conditions`);
        }

        // Save all answers - body fields are like answer_1, answer_2, etc.
        const steps = await prisma.conditionFormulaStep.findMany({
            where: { conditionType: condition.conditionType, language: 'ro' },
        });

        for (const step of steps) {
            const answerText = req.body[`answer_${step.stepNumber}`] || '';
            if (answerText.trim()) {
                await prisma.writeupAnswer.upsert({
                    where: {
                        conditionId_stepNumber: {
                            conditionId,
                            stepNumber: step.stepNumber,
                        },
                    },
                    update: { answerText: answerText.trim() },
                    create: {
                        conditionId,
                        stepNumber: step.stepNumber,
                        answerText: answerText.trim(),
                    },
                });
            }
        }

        // Handle battleplan links
        for (const step of steps) {
            const bpId = req.body[`battleplan_${step.stepNumber}`];
            if (bpId) {
                // Check if already linked
                const existing = await prisma.conditionStepBattleplan.findFirst({
                    where: { conditionId, stepNumber: step.stepNumber, battleplanId: parseInt(bpId) },
                });
                if (!existing) {
                    await prisma.conditionStepBattleplan.create({
                        data: {
                            conditionId,
                            stepNumber: step.stepNumber,
                            battleplanId: parseInt(bpId),
                        },
                    });
                }
            }
        }

        logAction(req.orgId, req.user.id, 'update', 'writeup', conditionId, null, req.ip);
        req.flash('success', 'Write-up salvat cu succes. Superiorul dvs. va primi o notificare.');
        res.redirect(`/${req.orgId}/statistics/graph-condition/${conditionId}`);
    } catch (err) {
        console.error('Save writeup error:', err);
        req.flash('error', 'Eroare la salvarea write-up.');
        res.redirect(`/${req.orgId}/statistics/graph-condition/${req.params.id}`);
    }
};

module.exports.CONDITION_LABELS = CONDITION_LABELS;
module.exports.CONDITION_COLORS = CONDITION_COLORS;
module.exports.CONDITION_ORDER = CONDITION_ORDER;
