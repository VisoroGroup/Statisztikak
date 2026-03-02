const express = require('express');
const router = express.Router();
const { ensureAuthenticated, ensureOrg } = require('../middleware/auth');
const prisma = require('../config/database');
const statsService = require('../services/statisticsService');

// Overlay view - multiple statistics on one chart
router.get('/:orgId/statistics/overlay', ensureAuthenticated, ensureOrg, async (req, res) => {
    try {
        const statistics = await prisma.statistic.findMany({
            where: { organizationId: req.orgId, status: 'active' },
            select: { id: true, title: true, measurementType: true },
            orderBy: { title: 'asc' },
        });

        const selectedIds = req.query.ids ? req.query.ids.split(',').map(Number) : [];
        const viewType = req.query.view || 'daily';
        const dateFrom = req.query.from || null;
        const dateTo = req.query.to || null;

        const chartDatasets = [];
        const colors = [
            '#2563eb', '#dc2626', '#16a34a', '#f59e0b', '#8b5cf6',
            '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1',
        ];

        for (let i = 0; i < selectedIds.length; i++) {
            const stat = statistics.find(s => s.id === selectedIds[i]);
            if (!stat) continue;
            const data = await statsService.getChartData(selectedIds[i], viewType, dateFrom, dateTo);
            chartDatasets.push({
                id: stat.id,
                title: stat.title,
                labels: data.labels,
                values: data.values,
                color: colors[i % colors.length],
            });
        }

        res.render('statistics/overlay', {
            title: 'Suprapunere',
            statistics,
            selectedIds,
            chartDatasets,
            viewType,
            dateFrom: dateFrom || '',
            dateTo: dateTo || '',
            orgId: req.orgId.toString(),
        });
    } catch (err) {
        console.error('Overlay error:', err);
        req.flash('error', 'Hiba az átfedéses nézet betöltése közben.');
        res.redirect(`/${req.orgId}/statistics`);
    }
});

// CSV Export
router.get('/:orgId/statistics/export/:id', ensureAuthenticated, ensureOrg, async (req, res) => {
    try {
        const statId = parseInt(req.params.id);
        const stat = await prisma.statistic.findFirst({
            where: { id: statId, organizationId: req.orgId },
        });
        if (!stat) {
            req.flash('error', 'Statisztika nem található.');
            return res.redirect(`/${req.orgId}/statistics`);
        }

        const values = await prisma.statisticValue.findMany({
            where: { statisticId: statId },
            include: { author: { select: { name: true } } },
            orderBy: { recordDate: 'asc' },
        });

        // Build CSV
        const BOM = '\uFEFF'; // UTF-8 BOM for Excel
        let csv = BOM + 'Dátum;Érték;Szerző;Típus;Megjegyzés\n';
        values.forEach(v => {
            csv += `${new Date(v.recordDate).toLocaleDateString('hu-HU')};${v.value};${v.author ? v.author.name : 'Rendszer'};${v.authorType};${v.note || ''}\n`;
        });

        const filename = `${stat.title.replace(/[^a-zA-Z0-9áéíóöőúüű]/gi, '_')}_export.csv`;
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(csv);
    } catch (err) {
        console.error('Export error:', err);
        req.flash('error', 'Hiba az exportálás közben.');
        res.redirect(`/${req.orgId}/statistics`);
    }
});

// CSV Export ALL statistics
router.get('/:orgId/statistics/export-all', ensureAuthenticated, ensureOrg, async (req, res) => {
    try {
        const statistics = await prisma.statistic.findMany({
            where: { organizationId: req.orgId, status: 'active' },
            include: {
                values: {
                    include: { author: { select: { name: true } } },
                    orderBy: { recordDate: 'asc' },
                },
            },
            orderBy: { title: 'asc' },
        });

        const BOM = '\uFEFF';
        let csv = BOM + 'Statisztika;Dátum;Érték;Szerző;Típus;Megjegyzés\n';
        statistics.forEach(stat => {
            stat.values.forEach(v => {
                csv += `${stat.title};${new Date(v.recordDate).toLocaleDateString('hu-HU')};${v.value};${v.author ? v.author.name : 'Rendszer'};${v.authorType};${v.note || ''}\n`;
            });
        });

        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', 'attachment; filename="statistics_export_all.csv"');
        res.send(csv);
    } catch (err) {
        console.error('Export all error:', err);
        req.flash('error', 'Hiba az exportálás közben.');
        res.redirect(`/${req.orgId}/statistics`);
    }
});

// CSV Import
router.post('/:orgId/statistics/import/:id', ensureAuthenticated, ensureOrg, async (req, res) => {
    try {
        const statId = parseInt(req.params.id);
        const stat = await prisma.statistic.findFirst({
            where: { id: statId, organizationId: req.orgId },
        });
        if (!stat) {
            req.flash('error', 'Statisztika nem található.');
            return res.redirect(`/${req.orgId}/statistics`);
        }

        const csvData = req.body.csv_data;
        if (!csvData || !csvData.trim()) {
            req.flash('error', 'Üres CSV adat.');
            return res.redirect(`/${req.orgId}/statistics/detail-graph/${statId}`);
        }

        const lines = csvData.trim().split('\n');
        let imported = 0;

        for (const line of lines) {
            const parts = line.split(';');
            if (parts.length < 2) continue;

            const dateParts = parts[0].trim().split('.');
            let date;
            if (dateParts.length === 3) {
                date = new Date(`${dateParts[0]}-${dateParts[1].padStart(2, '0')}-${dateParts[2].padStart(2, '0')}`);
            } else {
                date = new Date(parts[0].trim());
            }
            const value = parseFloat(parts[1].trim().replace(',', '.'));

            if (isNaN(date.getTime()) || isNaN(value)) continue;

            await prisma.statisticValue.upsert({
                where: {
                    statisticId_recordDate: {
                        statisticId: statId,
                        recordDate: date,
                    },
                },
                update: { value },
                create: {
                    statisticId: statId,
                    organizationId: req.orgId,
                    recordDate: date,
                    value,
                    authorId: req.user.id,
                    authorType: 'user',
                },
            });
            imported++;
        }

        req.flash('success', `${imported} érték sikeresen importálva.`);
        res.redirect(`/${req.orgId}/statistics/detail-graph/${statId}`);
    } catch (err) {
        console.error('Import error:', err);
        req.flash('error', 'Hiba az importálás közben.');
        res.redirect(`/${req.orgId}/statistics`);
    }
});

module.exports = router;
