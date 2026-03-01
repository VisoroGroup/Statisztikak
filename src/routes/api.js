const express = require('express');
const router = express.Router();
const prisma = require('../config/database');

// External API endpoint for value input
// POST /api/external/statistics/value
router.post('/external/statistics/value', async (req, res) => {
    try {
        const apiKey = req.headers['x-api-key'];
        if (!apiKey) {
            return res.status(401).json({ success: false, error: 'Missing API key' });
        }

        const statistic = await prisma.statistic.findUnique({
            where: { apiKey },
        });

        if (!statistic) {
            return res.status(401).json({ success: false, error: 'Invalid API key' });
        }

        const { date, value } = req.body;
        if (!date || value === undefined) {
            return res.status(400).json({ success: false, error: 'Missing date or value' });
        }

        const recordDate = new Date(date);
        if (isNaN(recordDate.getTime())) {
            return res.status(400).json({ success: false, error: 'Invalid date format. Use YYYY-MM-DD.' });
        }

        // Upsert: if value exists for this date, update; otherwise insert
        await prisma.statisticValue.upsert({
            where: {
                statisticId_recordDate: {
                    statisticId: statistic.id,
                    recordDate,
                },
            },
            update: {
                value: parseFloat(value),
                authorType: 'api',
                updatedAt: new Date(),
            },
            create: {
                statisticId: statistic.id,
                organizationId: statistic.organizationId,
                recordDate,
                value: parseFloat(value),
                authorType: 'api',
            },
        });

        return res.json({ success: true, message: 'Value recorded successfully' });
    } catch (err) {
        console.error('API error:', err);
        return res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

module.exports = router;
